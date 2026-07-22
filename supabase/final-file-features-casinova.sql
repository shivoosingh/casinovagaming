-- ============================================================================
-- Casinova · Final-file admin features (additive / idempotent)
-- Run AFTER: CASINOVA-FULL-SCHEMA.sql → admin-essentials-casinova.sql
--             → admin-payments-settings-upgrade.sql
-- Safe on existing live DBs. Does NOT install KYC redeem/cash-out locks.
-- ============================================================================

-- ── KYC on profiles ───────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_document_url TEXT;

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  document_name TEXT NOT NULL DEFAULT 'government_id.jpg',
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user_id ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_submissions_user_unique ON public.kyc_submissions(user_id);

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own kyc" ON public.kyc_submissions;
CREATE POLICY "users read own kyc"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "no direct kyc insert" ON public.kyc_submissions;
CREATE POLICY "no direct kyc insert"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "admins manage kyc" ON public.kyc_submissions;
CREATE POLICY "admins manage kyc"
  ON public.kyc_submissions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── AI automation settings + logs ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  topics TEXT[] NOT NULL DEFAULT ARRAY['Online Gaming', 'Fish Table Games', 'Slot Strategies', 'Casino Bonuses'],
  target_keywords TEXT[] NOT NULL DEFAULT ARRAY['casinova bonus', 'juwa 777 download', 'game vault tips'],
  posting_frequency_hours INT NOT NULL DEFAULT 24,
  ai_provider TEXT NOT NULL DEFAULT 'smart_auto',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  auto_publish BOOLEAN NOT NULL DEFAULT false,
  auto_telegram_broadcast BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_telegram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_post_blog BOOLEAN NOT NULL DEFAULT true,
  auto_post_promos BOOLEAN NOT NULL DEFAULT true,
  template_header TEXT NOT NULL DEFAULT '🔥 <b>CASINOVA GAMING UPDATE</b> 🔥',
  template_footer TEXT NOT NULL DEFAULT '👉 Join Casinova & load your game desk today! 🚀',
  autopilot_enabled BOOLEAN NOT NULL DEFAULT false,
  last_autopilot_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  bot_name TEXT NOT NULL DEFAULT 'Casinova AI Assistant',
  system_prompt TEXT NOT NULL DEFAULT 'You are Casinova AI Assistant, a friendly gaming support bot. Help with game accounts (Juwa, Game Vault, Vegas Sweeps), deposits, cashouts, VIP tiers, and bonuses. Keep answers concise. Audience is adults 18+.',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  human_handover_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.60,
  telegram_escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  personality TEXT NOT NULL DEFAULT 'standard',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_query TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_score INT NOT NULL DEFAULT 100,
  seo_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  cron_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  database_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_blog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

INSERT INTO public.ai_blog_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai_telegram_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ai_chatbot_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_created_at ON public.ai_chat_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_created_at ON public.system_health_logs (created_at DESC);

-- ── Blog status + telegram_sent (keeps is_published for existing RLS) ─────────
DO $$
BEGIN
  IF to_regclass('public.blog_posts') IS NULL THEN
    RAISE NOTICE 'blog_posts missing — skip status columns';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'blog_post_status' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.blog_post_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
  END IF;

  ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS status public.blog_post_status;

  -- Backfill nulls from is_published, then enforce NOT NULL
  UPDATE public.blog_posts
  SET status = CASE WHEN is_published THEN 'published'::public.blog_post_status ELSE 'draft'::public.blog_post_status END
  WHERE status IS NULL;

  ALTER TABLE public.blog_posts
    ALTER COLUMN status SET DEFAULT 'draft'::public.blog_post_status;

  ALTER TABLE public.blog_posts
    ALTER COLUMN status SET NOT NULL;

  ALTER TABLE public.blog_posts
    ADD COLUMN IF NOT EXISTS telegram_sent BOOLEAN NOT NULL DEFAULT false;
END $$;

CREATE OR REPLACE FUNCTION public.sync_blog_post_is_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.is_published := (NEW.status = 'published');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_sync_is_published ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_sync_is_published
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.sync_blog_post_is_published();

CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled
  ON public.blog_posts (published_at)
  WHERE status = 'scheduled';

-- ── Telegram identity linking ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code        TEXT PRIMARY KEY,
  purpose     TEXT NOT NULL CHECK (purpose IN ('admin', 'player')),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expiry
  ON public.telegram_link_codes (expires_at);

ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.telegram_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose           TEXT NOT NULL CHECK (purpose IN ('admin', 'player')),
  telegram_user_id  BIGINT NOT NULL,
  chat_id           BIGINT NOT NULL,
  telegram_username TEXT,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purpose, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_links_user
  ON public.telegram_links (user_id, purpose);

ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- telegram_promo_messages may already exist from admin-payments-settings-upgrade.sql
-- (columns: text, link, image_url, is_active, last_sent_at). Seed Casinova copy if empty.
INSERT INTO public.telegram_promo_messages (text, link, is_active)
SELECT * FROM (VALUES
  (
    E'🔥 Casinova Gaming — create your game desk, deposit, and load Juwa / Game Vault / more.',
    'https://www.casinovasgaming.com',
    true
  ),
  (
    E'👑 Climb VIP at Casinova — load credits, earn points, unlock better support.',
    'https://www.casinovasgaming.com/vip',
    true
  )
) AS v(text, link, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.telegram_promo_messages LIMIT 1);
