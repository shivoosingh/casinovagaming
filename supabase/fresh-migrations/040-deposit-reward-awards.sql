-- ============================================================================
-- 040: VIP points and referral share for every confirmed deposit, exactly once.
--
-- Before this migration the rewards were paid from application code that only
-- the manual deposit approval called, so card deposits earned nothing. This
-- moves the award into one database function that both deposit paths call.
--
-- Business rules are unchanged (they come from src/lib/rewards/deposit-rewards.ts
-- and src/lib/constants.ts as they were):
--   * VIP points: greatest(1, round(deposit amount)) per confirmed deposit.
--   * Referral share: only on the depositor's first completed deposit, paid to
--     the account in profiles.referred_by, amount x the referrer's tier rate,
--     credited to the referrer's Total Deposit wallet, once per referred player.
--   * The tier is recalculated by the existing vip_tier_update trigger.
--
-- Additive and idempotent: creates one table, one index, two functions and one
-- trigger. Changes no existing rows. Safe to run more than once.
-- Rollback: see the bottom of this file.
-- ============================================================================

BEGIN;

-- 1. Ledger: one row per deposit that has been rewarded. The primary key is the
--    idempotency guard: a second award for the same deposit cannot be inserted.
CREATE TABLE IF NOT EXISTS public.deposit_reward_awards (
  deposit_request_id uuid PRIMARY KEY REFERENCES public.deposit_requests(id) ON DELETE RESTRICT,
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deposit_amount     numeric NOT NULL CHECK (deposit_amount > 0),
  vip_points         integer NOT NULL CHECK (vip_points >= 0),
  referrer_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  referral_rate      numeric CHECK (referral_rate IS NULL OR (referral_rate > 0 AND referral_rate <= 1)),
  referral_bonus     numeric NOT NULL DEFAULT 0 CHECK (referral_bonus >= 0),
  source             text NOT NULL DEFAULT 'live' CHECK (source IN ('live', 'reconciliation')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposit_reward_awards_user ON public.deposit_reward_awards (user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_reward_awards_referrer ON public.deposit_reward_awards (referrer_id) WHERE referrer_id IS NOT NULL;
-- At most one referral share can ever be recorded per referred player.
CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_reward_awards_one_referral_per_user
  ON public.deposit_reward_awards (user_id) WHERE referral_bonus > 0;

ALTER TABLE public.deposit_reward_awards ENABLE ROW LEVEL SECURITY;
-- No policies: players cannot read or write this table through the API.
REVOKE ALL ON public.deposit_reward_awards FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deposit_reward_awards TO service_role;

-- 2. One card payment = one deposit row. Two simultaneous confirmations of the
--    same payment can no longer create two rows (and so two awards).
CREATE UNIQUE INDEX IF NOT EXISTS uq_deposit_requests_paydora_proof
  ON public.deposit_requests (proof_url) WHERE proof_url LIKE 'paydora/%';

-- 3. Players must not be able to edit their own reward fields. The existing
--    protect_wallet_columns trigger covers wallet balances only.
--    current_user is 'authenticated' / 'anon' for requests made with a player's
--    session; server code (service_role) and SECURITY DEFINER functions are not
--    affected. Admins keep the ability to adjust points from the admin panel.
CREATE OR REPLACE FUNCTION public.protect_reward_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.vip_points IS DISTINCT FROM OLD.vip_points
          OR NEW.vip_tier IS DISTINCT FROM OLD.vip_tier
          OR NEW.referred_by IS DISTINCT FROM OLD.referred_by)
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  THEN
    NEW.vip_points := OLD.vip_points;
    NEW.vip_tier := OLD.vip_tier;
    NEW.referred_by := OLD.referred_by;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_reward_columns_trigger ON public.profiles;
CREATE TRIGGER protect_reward_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_reward_columns();

-- 4. The award itself. Everything happens in the caller's transaction: either
--    the ledger row, the points and the referral credit all commit, or none do.
--
--    p_referral_rates: {"bronze":0.05,"silver":0.1,"gold":0.15,"platinum":0.25}
--    passed by the server from VIP_TIERS so the rates live in one place.
CREATE OR REPLACE FUNCTION public.award_deposit_rewards(
  p_deposit_request_id uuid,
  p_referral_rates jsonb,
  p_source text DEFAULT 'live'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dep        public.deposit_requests;
  v_amount     numeric;
  v_points     integer;
  v_rows       integer;
  v_completed  integer;
  v_referrer   uuid;
  v_tier       text;
  v_rate       numeric;
  v_bonus      numeric := 0;
BEGIN
  IF p_deposit_request_id IS NULL THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Lock the deposit so its status cannot change underneath us.
  SELECT * INTO v_dep
  FROM public.deposit_requests
  WHERE id = p_deposit_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Only a confirmed, credited deposit with a positive amount earns anything.
  -- Pending, processing, rejected and refunded (status = 'rejected') do not.
  IF v_dep.status <> 'completed' OR NOT v_dep.wallet_credited
     OR v_dep.amount IS NULL OR v_dep.amount <= 0 THEN
    RETURN jsonb_build_object('status', 'not_eligible', 'deposit_status', v_dep.status);
  END IF;

  -- One award at a time per depositor, so "is this their first deposit" is
  -- answered consistently even when two of their deposits confirm together.
  PERFORM pg_advisory_xact_lock(hashtextextended('deposit_reward:' || v_dep.user_id::text, 0));

  v_amount := round(v_dep.amount::numeric, 2);
  v_points := GREATEST(1, round(v_amount)::integer);

  INSERT INTO public.deposit_reward_awards (deposit_request_id, user_id, deposit_amount, vip_points, source)
  VALUES (v_dep.id, v_dep.user_id, v_amount, v_points, COALESCE(NULLIF(p_source, ''), 'live'))
  ON CONFLICT (deposit_request_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('status', 'already_awarded');
  END IF;

  -- VIP points. vip_tier_update recalculates the tier.
  UPDATE public.profiles
  SET vip_points = vip_points + v_points
  WHERE id = v_dep.user_id;

  -- Referral share: first completed deposit only, once per referred player.
  SELECT count(*) INTO v_completed
  FROM public.deposit_requests
  WHERE user_id = v_dep.user_id AND status = 'completed';

  IF v_completed = 1 THEN
    SELECT referred_by INTO v_referrer FROM public.profiles WHERE id = v_dep.user_id;

    IF v_referrer IS NOT NULL
       AND v_referrer <> v_dep.user_id
       -- Same marker the earlier application code wrote, so a share paid by
       -- the old flow is never paid a second time.
       AND NOT EXISTS (
         SELECT 1 FROM public.wallet_transactions
         WHERE user_id = v_referrer
           AND source = 'referral_bonus'
           AND description ILIKE '%referred user ' || v_dep.user_id::text || '%'
       )
    THEN
      SELECT vip_tier INTO v_tier FROM public.profiles WHERE id = v_referrer FOR UPDATE;

      IF FOUND THEN
        v_rate := COALESCE(
          NULLIF(p_referral_rates ->> v_tier, '')::numeric,
          NULLIF(p_referral_rates ->> 'bronze', '')::numeric
        );

        IF v_rate IS NOT NULL AND v_rate > 0 AND v_rate <= 1 THEN
          v_bonus := round(v_amount * v_rate, 2);
        END IF;

        IF v_bonus > 0 THEN
          PERFORM set_config('app.wallet_update', 'true', true);

          UPDATE public.profiles
          SET wallet_balance = wallet_balance + v_bonus
          WHERE id = v_referrer;

          INSERT INTO public.wallet_transactions (
            user_id, amount, wallet_type, transaction_type, source, description, created_by
          ) VALUES (
            v_referrer, v_bonus, 'current', 'credit', 'referral_bonus',
            format('Referral bonus $%s from first deposit %s (referred user %s)',
                   to_char(v_bonus, 'FM999999990.00'), v_dep.id, v_dep.user_id),
            NULL
          );

          INSERT INTO public.notifications (user_id, title, message, type, is_read)
          VALUES (
            v_referrer,
            'Referral bonus',
            format('$%s was added to your Total Deposit wallet from a friend''s first deposit.',
                   to_char(v_bonus, 'FM999999990.00')),
            'success',
            false
          );

          UPDATE public.deposit_reward_awards
          SET referrer_id = v_referrer, referral_rate = v_rate, referral_bonus = v_bonus
          WHERE deposit_request_id = v_dep.id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'awarded',
    'vip_points', v_points,
    'referral_bonus', v_bonus,
    'referrer_id', CASE WHEN v_bonus > 0 THEN v_referrer ELSE NULL END
  );
END;
$$;

-- Server-side only. Players can never call this, with or without a session.
REVOKE ALL ON FUNCTION public.award_deposit_rewards(uuid, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_deposit_rewards(uuid, jsonb, text) TO service_role;

COMMIT;

-- ============================================================================
-- Rollback (keeps every ledger row, wallet transaction and point already paid):
--
--   BEGIN;
--   DROP TRIGGER IF EXISTS protect_reward_columns_trigger ON public.profiles;
--   DROP FUNCTION IF EXISTS public.protect_reward_columns();
--   REVOKE EXECUTE ON FUNCTION public.award_deposit_rewards(uuid, jsonb, text) FROM service_role;
--   DROP INDEX IF EXISTS public.uq_deposit_requests_paydora_proof;
--   COMMIT;
--
-- Revoking execute stops new awards without deleting history. Do NOT drop
-- public.deposit_reward_awards: it is the record of what was paid.
-- ============================================================================
