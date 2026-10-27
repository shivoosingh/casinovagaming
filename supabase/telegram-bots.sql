-- ============================================================================
-- Telegram command bots: identity linking tables
-- ============================================================================
-- One-time /start codes minted from an authenticated web session, resolved to
-- a durable telegram-identity -> Casinova-user map. Two bots share the tables,
-- told apart by `purpose`: 'admin' (staff command bot) and 'player' (customer
-- command bot). Service-role only: RLS is enabled with NO policies and direct
-- table grants are revoked, so only the bot webhooks and the link-code server
-- action (both using SUPABASE_SERVICE_ROLE_KEY) can touch them.
--
-- Idempotent and safe on a database where final-file-features-casinova.sql
-- already created these tables. Run once in Supabase -> SQL Editor BEFORE
-- deploying the bot code (the webhooks answer "not linked" until it exists).

CREATE TABLE IF NOT EXISTS public.telegram_link_codes (
  code        TEXT PRIMARY KEY,
  purpose     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.telegram_links (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose           TEXT NOT NULL,
  telegram_user_id  BIGINT NOT NULL,
  chat_id           BIGINT NOT NULL,
  telegram_username TEXT,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (purpose, telegram_user_id)
);

-- Purpose values are 'admin' | 'player' (Casinova naming). Re-create the CHECK
-- so an older copy of these tables gets the same rule.
ALTER TABLE public.telegram_link_codes DROP CONSTRAINT IF EXISTS telegram_link_codes_purpose_check;
ALTER TABLE public.telegram_link_codes
  ADD CONSTRAINT telegram_link_codes_purpose_check CHECK (purpose IN ('admin', 'player'));
ALTER TABLE public.telegram_links DROP CONSTRAINT IF EXISTS telegram_links_purpose_check;
ALTER TABLE public.telegram_links
  ADD CONSTRAINT telegram_links_purpose_check CHECK (purpose IN ('admin', 'player'));

CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expiry ON public.telegram_link_codes (expires_at);
CREATE INDEX IF NOT EXISTS idx_telegram_links_user ON public.telegram_links (user_id, purpose);

-- RLS on, no policies: nothing but the service role reads or writes these.
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.telegram_link_codes FROM anon, authenticated;
REVOKE ALL ON public.telegram_links FROM anon, authenticated;

COMMENT ON TABLE public.telegram_link_codes IS
  'One-time Telegram /start codes (10 min TTL). Service-role only; written by generateTelegramLinkCode, consumed by the bot webhooks.';
COMMENT ON TABLE public.telegram_links IS
  'Telegram identity -> Casinova user, per bot (purpose admin|player). Service-role only; read by the admin and customer command bots.';
