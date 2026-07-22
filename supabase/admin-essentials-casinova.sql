-- =============================================================================
-- CASINOVA ADMIN ESSENTIALS — run AFTER CASINOVA-FULL-SCHEMA.sql
-- Empty feature tables for Spinora-like admin modules (no Spinora data).
-- Idempotent: safe to re-run.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared updated_at helper (schema may already define update_updated_at)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- NOTE: status/category/priority fields below use TEXT + CHECK constraints
-- instead of native Postgres ENUMs so future value changes stay a one-line
-- idempotent ALTER instead of a type migration.

-- ---------- Audit ----------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "Admins insert audit_logs" ON public.audit_logs;
CREATE POLICY "Admins insert audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ---------- Site settings ----------
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage site_settings" ON public.site_settings;
CREATE POLICY "Admins manage site_settings" ON public.site_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);

-- ---------- Promotions ----------
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  badge_text TEXT,
  bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  code TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
-- Drop policies before ALTER TYPE (Postgres blocks altering columns used by policies)
DROP POLICY IF EXISTS "Public read active promotions" ON public.promotions;
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
ALTER TABLE public.promotions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.promotions ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE public.promotions ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.promotions DROP CONSTRAINT IF EXISTS promotions_status_check;
ALTER TABLE public.promotions ADD CONSTRAINT promotions_status_check
  CHECK (status IN ('draft', 'scheduled', 'active', 'expired', 'archived'));
DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active promotions" ON public.promotions FOR SELECT TO anon, authenticated
  USING (status = 'active');
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Rewards ----------
CREATE TABLE IF NOT EXISTS public.reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  reward_type TEXT NOT NULL DEFAULT 'manual',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  wallet_type TEXT NOT NULL DEFAULT 'current' CHECK (wallet_type IN ('current', 'cashout')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reward_rules ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.reward_rules ADD COLUMN IF NOT EXISTS reward_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.reward_rules ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reward_rules DROP CONSTRAINT IF EXISTS reward_rules_reward_type_check;
ALTER TABLE public.reward_rules ADD CONSTRAINT reward_rules_reward_type_check
  CHECK (reward_type IN ('daily', 'weekly', 'monthly', 'streak_milestone', 'referral', 'seasonal', 'promotional', 'manual'));
DROP TRIGGER IF EXISTS trg_reward_rules_updated_at ON public.reward_rules;
CREATE TRIGGER trg_reward_rules_updated_at BEFORE UPDATE ON public.reward_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage reward_rules" ON public.reward_rules;
CREATE POLICY "Admins manage reward_rules" ON public.reward_rules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.reward_rules(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'current' CHECK (wallet_type IN ('current', 'cashout')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own reward_claims" ON public.reward_claims;
CREATE POLICY "Users read own reward_claims" ON public.reward_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage reward_claims" ON public.reward_claims;
CREATE POLICY "Admins manage reward_claims" ON public.reward_claims FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Achievements ----------
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'milestone',
  rarity TEXT NOT NULL DEFAULT 'common',
  icon TEXT NOT NULL DEFAULT 'trophy',
  condition_type TEXT NOT NULL DEFAULT 'manual',
  condition_value NUMERIC(14,2) NOT NULL DEFAULT 1,
  reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'milestone';
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS rarity TEXT NOT NULL DEFAULT 'common';
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS condition_type TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS condition_value NUMERIC(14,2) NOT NULL DEFAULT 1;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.achievements ALTER COLUMN icon SET DEFAULT 'trophy';
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_category_check;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_category_check
  CHECK (category IN ('gameplay', 'social', 'loyalty', 'milestone', 'seasonal', 'special'));
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_rarity_check;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_rarity_check
  CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));
ALTER TABLE public.achievements DROP CONSTRAINT IF EXISTS achievements_condition_type_check;
ALTER TABLE public.achievements ADD CONSTRAINT achievements_condition_type_check
  CHECK (condition_type IN ('vip_points', 'total_deposits', 'total_deposit_amount', 'total_referrals', 'total_spins', 'manual'));
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone read achievements" ON public.achievements;
CREATE POLICY "Anyone read achievements" ON public.achievements FOR SELECT TO anon, authenticated USING (is_active);
DROP POLICY IF EXISTS "Admins manage achievements" ON public.achievements;
CREATE POLICY "Admins manage achievements" ON public.achievements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users read own achievements" ON public.user_achievements;
CREATE POLICY "Users read own achievements" ON public.user_achievements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage user_achievements" ON public.user_achievements;
CREATE POLICY "Admins manage user_achievements" ON public.user_achievements FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Leaderboards ----------
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL DEFAULT 'all_time',
  metric TEXT NOT NULL DEFAULT 'deposits',
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(14,2) NOT NULL DEFAULT 0,
  rank INTEGER,
  finalized BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, metric, user_id)
);
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'all_time';
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS metric TEXT NOT NULL DEFAULT 'deposits';
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS finalized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.leaderboard_entries ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_period_check;
ALTER TABLE public.leaderboard_entries ADD CONSTRAINT leaderboard_entries_period_check
  CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time'));
ALTER TABLE public.leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_metric_check;
ALTER TABLE public.leaderboard_entries ADD CONSTRAINT leaderboard_entries_metric_check
  CHECK (metric IN ('deposits', 'referrals', 'spins'));
DROP INDEX IF EXISTS idx_leaderboard_board;
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_metric ON public.leaderboard_entries (period, metric, rank);
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Public read leaderboard" ON public.leaderboard_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Admins manage leaderboard" ON public.leaderboard_entries FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Recomputes one (period, metric) leaderboard from live Casinova data.
-- p_key is reserved for future per-game boards; unused today.
CREATE OR REPLACE FUNCTION public.compute_leaderboard(
  p_period TEXT DEFAULT 'all_time',
  p_metric TEXT DEFAULT 'deposits',
  p_key TEXT DEFAULT NULL,
  p_finalize BOOLEAN DEFAULT false
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER := 0;
  v_since TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  v_since := CASE p_period
    WHEN 'daily' THEN NOW() - INTERVAL '1 day'
    WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
    WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
    ELSE NULL
  END;

  DELETE FROM public.leaderboard_entries WHERE period = p_period AND metric = p_metric;

  IF p_metric = 'deposits' THEN
    INSERT INTO public.leaderboard_entries (period, metric, user_id, score, rank, finalized, computed_at)
    SELECT p_period, p_metric, user_id, SUM(amount)::NUMERIC,
           ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC), p_finalize, NOW()
    FROM public.deposit_requests
    WHERE status = 'completed' AND (v_since IS NULL OR created_at >= v_since)
    GROUP BY user_id
    ORDER BY SUM(amount) DESC
    LIMIT 100;
  ELSIF p_metric = 'referrals' THEN
    INSERT INTO public.leaderboard_entries (period, metric, user_id, score, rank, finalized, computed_at)
    SELECT p_period, p_metric, referrer_id, COUNT(*)::NUMERIC,
           ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC), p_finalize, NOW()
    FROM public.referrals
    WHERE (v_since IS NULL OR created_at >= v_since)
    GROUP BY referrer_id
    ORDER BY COUNT(*) DESC
    LIMIT 100;
  ELSIF p_metric = 'spins' THEN
    INSERT INTO public.leaderboard_entries (period, metric, user_id, score, rank, finalized, computed_at)
    SELECT p_period, p_metric, user_id, SUM(prize_value)::NUMERIC,
           ROW_NUMBER() OVER (ORDER BY SUM(prize_value) DESC), p_finalize, NOW()
    FROM public.wheel_spins
    WHERE prize_type = 'cash' AND (v_since IS NULL OR created_at >= v_since)
    GROUP BY user_id
    ORDER BY SUM(prize_value) DESC
    LIMIT 100;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.compute_leaderboard(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

-- ---------- Geo ----------
CREATE TABLE IF NOT EXISTS public.geo_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  abbr TEXT NOT NULL DEFAULT '',
  hero_lede TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.geo_states ADD COLUMN IF NOT EXISTS abbr TEXT NOT NULL DEFAULT '';
ALTER TABLE public.geo_states ADD COLUMN IF NOT EXISTS hero_lede TEXT NOT NULL DEFAULT '';
ALTER TABLE public.geo_states ADD COLUMN IF NOT EXISTS meta_description TEXT NOT NULL DEFAULT '';
ALTER TABLE public.geo_states ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.geo_states ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS public.geo_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.geo_states(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description_snippet TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (state_id, slug)
);
ALTER TABLE public.geo_cities ADD COLUMN IF NOT EXISTS description_snippet TEXT NOT NULL DEFAULT '';
ALTER TABLE public.geo_cities ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.geo_cities ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.geo_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read geo_states" ON public.geo_states;
CREATE POLICY "Public read geo_states" ON public.geo_states FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage geo_states" ON public.geo_states;
CREATE POLICY "Admins manage geo_states" ON public.geo_states FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public read geo_cities" ON public.geo_cities;
CREATE POLICY "Public read geo_cities" ON public.geo_cities FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage geo_cities" ON public.geo_cities;
CREATE POLICY "Admins manage geo_cities" ON public.geo_cities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Support tickets ----------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
-- Drop policies before ALTER TYPE on columns they reference
DROP POLICY IF EXISTS "Users own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Ticket messages access" ON public.ticket_messages;
ALTER TABLE public.support_tickets ALTER COLUMN category DROP DEFAULT;
ALTER TABLE public.support_tickets ALTER COLUMN category TYPE TEXT USING category::text;
ALTER TABLE public.support_tickets ALTER COLUMN category SET DEFAULT 'other';
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_category_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_category_check
  CHECK (category IN ('account', 'rewards', 'deposits', 'payouts', 'technical', 'other'));
ALTER TABLE public.support_tickets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.support_tickets ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE public.support_tickets ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check
  CHECK (status IN ('open', 'pending', 'in_progress', 'resolved', 'closed'));
ALTER TABLE public.support_tickets ALTER COLUMN priority DROP DEFAULT;
ALTER TABLE public.support_tickets ALTER COLUMN priority TYPE TEXT USING priority::text;
ALTER TABLE public.support_tickets ALTER COLUMN priority SET DEFAULT 'normal';
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_priority_check;
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_priority_check
  CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Ticket messages access" ON public.ticket_messages FOR ALL TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- Keeps last_message_at fresh and auto-flips a new ticket to in_progress
-- the moment staff sends the first reply.
CREATE OR REPLACE FUNCTION public.touch_ticket_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.support_tickets
  SET last_message_at = NOW(),
      updated_at = NOW(),
      status = CASE WHEN NEW.is_staff AND status = 'open' THEN 'in_progress' ELSE status END
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ticket_messages_touch ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_touch AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_ticket_on_message();

-- ---------- Newsletters ----------
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL,
  heading TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT 'Play Now',
  cta_href TEXT NOT NULL DEFAULT '/',
  segment TEXT NOT NULL DEFAULT 'test',
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INTEGER NOT NULL DEFAULT 0,
  total_recipients INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS heading TEXT NOT NULL DEFAULT '';
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS cta_label TEXT NOT NULL DEFAULT 'Play Now';
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS cta_href TEXT NOT NULL DEFAULT '/';
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'test';
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS sent_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.newsletter_campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.newsletter_campaigns ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.newsletter_campaigns DROP CONSTRAINT IF EXISTS newsletter_campaigns_status_check;
ALTER TABLE public.newsletter_campaigns ADD CONSTRAINT newsletter_campaigns_status_check
  CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed'));
ALTER TABLE public.newsletter_campaigns DROP CONSTRAINT IF EXISTS newsletter_campaigns_segment_check;
ALTER TABLE public.newsletter_campaigns ADD CONSTRAINT newsletter_campaigns_segment_check
  CHECK (segment IN ('all', 'test'));
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage newsletters" ON public.newsletter_campaigns;
CREATE POLICY "Admins manage newsletters" ON public.newsletter_campaigns FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Payment methods (DB override of env constants) ----------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  handle TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read payment_methods" ON public.payment_methods;
CREATE POLICY "Public read payment_methods" ON public.payment_methods FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage payment_methods" ON public.payment_methods;
CREATE POLICY "Admins manage payment_methods" ON public.payment_methods FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Broadcasts history ----------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.broadcasts ALTER COLUMN segment TYPE TEXT;
ALTER TABLE public.broadcasts ALTER COLUMN segment SET DEFAULT 'all';
ALTER TABLE public.broadcasts DROP CONSTRAINT IF EXISTS broadcasts_segment_check;
ALTER TABLE public.broadcasts ADD CONSTRAINT broadcasts_segment_check
  CHECK (segment IN ('all', 'vip', 'new', 'active'));
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage broadcasts" ON public.broadcasts;
CREATE POLICY "Admins manage broadcasts" ON public.broadcasts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Minimal RBAC (optional; profiles.role=admin still works) ----------
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage permissions" ON public.permissions;
CREATE POLICY "Admins manage permissions" ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage roles" ON public.roles;
CREATE POLICY "Admins manage roles" ON public.roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
CREATE POLICY "Admins manage user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Users read own user_roles" ON public.user_roles;
CREATE POLICY "Users read own user_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- ---------- Cash-out payout RPC (Casinova wallet_transactions) ----------
CREATE OR REPLACE FUNCTION public.admin_payout_cashout(
  p_user UUID,
  p_amount NUMERIC,
  p_note TEXT DEFAULT NULL
) RETURNS NUMERIC
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bal NUMERIC;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payout amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  UPDATE public.profiles
  SET cashout_wallet = cashout_wallet - p_amount
  WHERE id = p_user AND cashout_wallet >= p_amount
  RETURNING cashout_wallet INTO v_bal;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient cash-out balance';
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, amount, wallet_type, transaction_type, source, description
  ) VALUES (
    p_user, p_amount, 'cashout', 'debit', 'payout',
    COALESCE(NULLIF(TRIM(p_note), ''), 'Cash-out payout')
  );

  RETURN v_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_payout_cashout(UUID, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_payout_cashout(UUID, NUMERIC, TEXT) TO service_role;

-- Done
SELECT 'admin-essentials-casinova applied' AS status;
