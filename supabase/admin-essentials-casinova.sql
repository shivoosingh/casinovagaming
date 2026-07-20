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

-- ---------- Enums (create if missing) ----------
DO $$ BEGIN
  CREATE TYPE public.promo_status AS ENUM ('draft', 'active', 'paused', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM ('account', 'deposit', 'withdrawal', 'game', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.broadcast_segment AS ENUM ('all', 'vip', 'new', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
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
  code TEXT UNIQUE,
  status public.promo_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_promotions_updated_at ON public.promotions;
CREATE TRIGGER trg_promotions_updated_at BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active promotions" ON public.promotions;
CREATE POLICY "Public read active promotions" ON public.promotions FOR SELECT TO anon, authenticated
  USING (status = 'active');
DROP POLICY IF EXISTS "Admins manage promotions" ON public.promotions;
CREATE POLICY "Admins manage promotions" ON public.promotions FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Rewards ----------
CREATE TABLE IF NOT EXISTS public.reward_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  wallet_type TEXT NOT NULL DEFAULT 'current' CHECK (wallet_type IN ('current', 'cashout')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
DROP TRIGGER IF EXISTS trg_reward_rules_updated_at ON public.reward_rules;
CREATE TRIGGER trg_reward_rules_updated_at BEFORE UPDATE ON public.reward_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.reward_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage reward_rules" ON public.reward_rules;
CREATE POLICY "Admins manage reward_rules" ON public.reward_rules FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Achievements ----------
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  board_key TEXT NOT NULL DEFAULT 'deposits',
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC(14,2) NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_key, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_board ON public.leaderboard_entries (board_key, score DESC);
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Public read leaderboard" ON public.leaderboard_entries FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage leaderboard" ON public.leaderboard_entries;
CREATE POLICY "Admins manage leaderboard" ON public.leaderboard_entries FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.compute_leaderboard(p_board TEXT DEFAULT 'deposits')
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER := 0;
BEGIN
  DELETE FROM public.leaderboard_entries WHERE board_key = p_board;

  IF p_board = 'deposits' THEN
    INSERT INTO public.leaderboard_entries (board_key, user_id, score, rank, updated_at)
    SELECT 'deposits', user_id, SUM(amount)::NUMERIC, ROW_NUMBER() OVER (ORDER BY SUM(amount) DESC), NOW()
    FROM public.deposit_requests
    WHERE status = 'approved'
    GROUP BY user_id
    ORDER BY SUM(amount) DESC
    LIMIT 100;
  ELSIF p_board = 'referrals' THEN
    INSERT INTO public.leaderboard_entries (board_key, user_id, score, rank, updated_at)
    SELECT 'referrals', referrer_id, COUNT(*)::NUMERIC, ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC), NOW()
    FROM public.referrals
    GROUP BY referrer_id
    ORDER BY COUNT(*) DESC
    LIMIT 100;
  ELSE
    INSERT INTO public.leaderboard_entries (board_key, user_id, score, rank, updated_at)
    SELECT p_board, id, COALESCE(vip_points, 0)::NUMERIC, ROW_NUMBER() OVER (ORDER BY COALESCE(vip_points,0) DESC), NOW()
    FROM public.profiles
    WHERE role = 'user' OR role IS NULL OR role <> 'admin'
    ORDER BY COALESCE(vip_points, 0) DESC
    LIMIT 100;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.compute_leaderboard(TEXT) TO authenticated, service_role;

-- ---------- Geo ----------
CREATE TABLE IF NOT EXISTS public.geo_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.geo_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.geo_states(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (state_id, slug)
);
ALTER TABLE public.geo_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read geo_states" ON public.geo_states;
CREATE POLICY "Public read geo_states" ON public.geo_states FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage geo_states" ON public.geo_states;
CREATE POLICY "Admins manage geo_states" ON public.geo_states FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "Public read geo_cities" ON public.geo_cities;
CREATE POLICY "Public read geo_cities" ON public.geo_cities FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin());
DROP POLICY IF EXISTS "Admins manage geo_cities" ON public.geo_cities;
CREATE POLICY "Admins manage geo_cities" ON public.geo_cities FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------- Support tickets ----------
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_no BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category public.ticket_category NOT NULL DEFAULT 'other',
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);
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
DROP POLICY IF EXISTS "Users own tickets" ON public.support_tickets;
CREATE POLICY "Users own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()) WITH CHECK (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Ticket messages access" ON public.ticket_messages;
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

-- ---------- Newsletters ----------
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'cancelled')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
  segment public.broadcast_segment NOT NULL DEFAULT 'all',
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
