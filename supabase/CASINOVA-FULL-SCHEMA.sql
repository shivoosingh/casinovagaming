-- =============================================================================
-- CASINOVA FULL SCHEMA — run once on a NEW empty Supabase project
-- Idempotent reviews policies; bonus_redeem before remove-bonus
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- 001-schema.sql
-- ---------------------------------------------------------------------------

-- Spinora Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  vip_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (vip_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  vip_points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES profiles(id),
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game requests
CREATE TABLE IF NOT EXISTS game_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  admin_notes TEXT,
  credentials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'file')),
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'promo')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'promotion' CHECK (type IN ('promotion', 'update', 'system')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_game_requests_user_id ON game_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_game_requests_status ON game_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_requests_updated_at BEFORE UPDATE ON game_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles SET vip_points = vip_points + 100 WHERE id = referrer;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;

-- VIP tier auto-update
CREATE OR REPLACE FUNCTION update_vip_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vip_points >= 5000 THEN NEW.vip_tier = 'platinum';
  ELSIF NEW.vip_points >= 2000 THEN NEW.vip_tier = 'gold';
  ELSIF NEW.vip_points >= 500 THEN NEW.vip_tier = 'silver';
  ELSE NEW.vip_tier = 'bronze';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vip_tier_update BEFORE UPDATE OF vip_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_vip_tier();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Service can insert profiles on signup" ON public.profiles;
CREATE POLICY "Service can insert profiles on signup"
  ON profiles FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Game requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON public.game_requests;
CREATE POLICY "Users can view own requests"
  ON game_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can create requests" ON public.game_requests;
CREATE POLICY "Users can create requests"
  ON game_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update requests" ON public.game_requests;
CREATE POLICY "Admins can update requests"
  ON game_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update conversations" ON public.conversations;
CREATE POLICY "Admins can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark messages read" ON public.messages;
CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trusted inserts from server actions (spin prizes, wallet updates, etc.)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_type NOT IN ('info', 'success', 'warning', 'promo') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Announcements policies
DROP POLICY IF EXISTS "Anyone can view active announcements" ON public.announcements;
CREATE POLICY "Anyone can view active announcements"
  ON announcements FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Referrals policies
DROP POLICY IF EXISTS "Service can insert referrals on signup" ON public.referrals;
CREATE POLICY "Service can insert referrals on signup"
  ON referrals FOR INSERT TO authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Seed announcements
INSERT INTO announcements (title, content, type) VALUES
  ('Welcome to Spinora!', 'Join our premium gaming platform and get exclusive access to top games with 24/7 support.', 'promotion'),
  ('VIP Double Points Weekend', 'Earn 2x VIP points on all game requests this weekend only!', 'promotion'),
  ('New Games Added', 'We have added Fire Kirin, Juwa, and Panda Master to our platform.', 'update');


-- ---------------------------------------------------------------------------
-- 002-signup-email-phone.sql
-- ---------------------------------------------------------------------------

-- Email signup: save phone on profile + auth user + welcome message
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/drpitkvjcwrbzzufwwjt/sql/new
--
-- WHERE TO CHECK PHONE AFTER SIGNUP:
--   Table Editor â†’ public.profiles â†’ "phone" column (NOT Authentication â†’ Users phone filter only)
--
-- ALSO in Dashboard â†’ Authentication â†’ Providers â†’ Email:
--   â€¢ Enable "Confirm email"
--   â€¢ Confirm signup template must use {{ .ConfirmationURL }} (link), NOT {{ .Token }}
--   â€¢ Redirect URLs: http://localhost:3000/auth/callback and https://spinoras.vercel.app/auth/callback

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
  admin_user UUID;
  conv_id UUID;
  welcome_msg TEXT := 'Hey! Welcome to Spinora â€” we''re genuinely glad you joined us. Browse games, try your daily spin, and message us anytime if you need help with accounts, deposits, or VIP rewards. Our team is here for you!';
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 10);

    UPDATE public.profiles
    SET vip_points = vip_points + 10
    WHERE id = referrer;
  END IF;

  SELECT id INTO admin_user
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user IS NOT NULL THEN
    INSERT INTO public.conversations (user_id, admin_id)
    VALUES (NEW.id, admin_user)
    RETURNING id INTO conv_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (conv_id, admin_user, welcome_msg, false);

    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (
      NEW.id,
      'Welcome to Spinora!',
      'Our team sent you a welcome message. Open Messages to read it.',
      'info',
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ---------------------------------------------------------------------------
-- 003-auth-phone.sql
-- ---------------------------------------------------------------------------

-- Phone & WhatsApp auth support for Spinora profiles
-- Run in Supabase SQL Editor after main schema

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles (whatsapp) WHERE whatsapp IS NOT NULL;

-- Update signup trigger to store phone / WhatsApp from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles
    SET vip_points = vip_points + 100
    WHERE id = referrer;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ---------------------------------------------------------------------------
-- 004-auth-email-otp.sql
-- ---------------------------------------------------------------------------

-- Email OTP login (phone identifies account, code sent to email)
-- Optional: only needed if SUPABASE_SERVICE_ROLE_KEY is not set on the server.
-- With service role in .env, the app resolves phone â†’ email without this file.

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_email TEXT;
BEGIN
  p_identifier := TRIM(p_identifier);
  IF p_identifier = '' THEN RETURN NULL; END IF;

  IF p_identifier LIKE '%@%' THEN
    RETURN LOWER(p_identifier);
  END IF;

  v_phone := '+' || regexp_replace(p_identifier, '\D', '', 'g');
  IF length(regexp_replace(v_phone, '\D', '', 'g')) < 8 THEN RETURN NULL; END IF;

  SELECT email INTO v_email
  FROM public.profiles
  WHERE phone = v_phone
  LIMIT 1;

  IF v_email IS NULL OR v_email LIKE '%@phone.spinora.local' THEN
    RETURN NULL;
  END IF;

  RETURN LOWER(v_email);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 005-auth-email-confirm.sql
-- ---------------------------------------------------------------------------

-- Email confirmation fix â€” use token_hash links (works on any device, no PKCE cookie required)
--
-- 1. Supabase Dashboard â†’ Authentication â†’ URL Configuration:
--    Site URL: https://spinoracasinos.com
--    Redirect URLs (add all):
--      https://spinoracasinos.com/auth/callback
--      http://localhost:3000/auth/callback
--
-- 2. Authentication â†’ Email Templates â†’ Confirm signup:
--    Paste body from supabase/email-templates/confirm-signup.html
--    Link must use token_hash (NOT {{ .ConfirmationURL }} alone):
--    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&redirect=/dashboard
--
-- 3. Authentication â†’ Providers â†’ Email â†’ Enable "Confirm email"


-- ---------------------------------------------------------------------------
-- 006-welcome-message.sql
-- ---------------------------------------------------------------------------

-- Admin proactive chat + automatic welcome message on signup
-- Run in Supabase SQL Editor

-- Allow admins to start conversations with any user
DROP POLICY IF EXISTS "Admins can create conversations for users" ON public.conversations;
CREATE POLICY "Admins can create conversations for users"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Signup: create profile + welcome conversation/message from first admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
  admin_user UUID;
  conv_id UUID;
  welcome_msg TEXT := 'Hey! Welcome to Spinora â€” we''re genuinely glad you joined us. Browse games, try your daily spin, and message us anytime if you need help with accounts, deposits, or VIP rewards. Our team is here for you!';
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles
    SET vip_points = vip_points + 100
    WHERE id = referrer;
  END IF;

  -- Welcome chat from first admin account
  SELECT id INTO admin_user
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user IS NOT NULL THEN
    INSERT INTO public.conversations (user_id, admin_id)
    VALUES (NEW.id, admin_user)
    RETURNING id INTO conv_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (conv_id, admin_user, welcome_msg, false);

    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (
      NEW.id,
      'Welcome to Spinora!',
      'Our team sent you a welcome message. Open Messages to read it.',
      'info',
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ---------------------------------------------------------------------------
-- 007-chat-attachments.sql
-- ---------------------------------------------------------------------------

-- Chat attachments: run in Supabase SQL Editor
-- Safe to re-run (idempotent)

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_attachment_type_check'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_attachment_type_check
      CHECK (attachment_type IN ('image', 'file'));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can read attachments" ON storage.objects;

CREATE POLICY "Chat participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Chat participants can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);


-- ---------------------------------------------------------------------------
-- 008-deposit-requests.sql
-- ---------------------------------------------------------------------------

-- Deposit requests + proof storage â€” run in Supabase SQL Editor once.
-- Requires: chat-attachments bucket (supabase/chat-attachments.sql)

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_slug TEXT,
  game_name TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('paypal', 'chime', 'cashapp', 'bitcoin', 'usdt', 'venmo')
  ),
  amount NUMERIC(10, 2),
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'rejected')
  ),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON public.deposit_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests (status);

CREATE TRIGGER deposit_requests_updated_at
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own deposits" ON public.deposit_requests;
CREATE POLICY "Users view own deposits"
  ON public.deposit_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own deposits" ON public.deposit_requests;
CREATE POLICY "Users create own deposits"
  ON public.deposit_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all deposits" ON public.deposit_requests;
CREATE POLICY "Admins view all deposits"
  ON public.deposit_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins update deposits" ON public.deposit_requests;
CREATE POLICY "Admins update deposits"
  ON public.deposit_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;

-- Storage: deposit-proofs/{user_id}/...
DROP POLICY IF EXISTS "Users can upload deposit proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can read deposit proofs" ON storage.objects;

CREATE POLICY "Users can upload deposit proof images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'deposit-proofs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users and admins can read deposit proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'deposit-proofs'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);


-- ---------------------------------------------------------------------------
-- 009-deposit-usdt-payment.sql
-- ---------------------------------------------------------------------------

-- Add USDT to deposit payment methods (run once if deposit_requests already exists)
ALTER TABLE public.deposit_requests
  DROP CONSTRAINT IF EXISTS deposit_requests_payment_method_check;

ALTER TABLE public.deposit_requests
  ADD CONSTRAINT deposit_requests_payment_method_check
  CHECK (payment_method IN ('paypal', 'chime', 'cashapp', 'bitcoin', 'usdt', 'venmo'));


-- ---------------------------------------------------------------------------
-- 010-wheel-spins.sql
-- ---------------------------------------------------------------------------

-- Run this in Supabase SQL Editor after main schema

CREATE TABLE IF NOT EXISTS wheel_spins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prize_label TEXT NOT NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'luck', 'points')),
  prize_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_id ON wheel_spins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_created_at ON wheel_spins(created_at);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wheel spins" ON public.wheel_spins;
CREATE POLICY "Users can view own wheel spins"
  ON wheel_spins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own wheel spins" ON public.wheel_spins;
CREATE POLICY "Users can insert own wheel spins"
  ON wheel_spins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all wheel spins" ON public.wheel_spins;
CREATE POLICY "Admins can view all wheel spins"
  ON wheel_spins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ---------------------------------------------------------------------------
-- 011-wheel-spin-caps.sql
-- ---------------------------------------------------------------------------

-- Platform-wide daily spin caps (for low win-rate algorithm)
-- Run in Supabase SQL Editor after wheel-spins.sql

CREATE OR REPLACE FUNCTION public.get_wheel_daily_stats()
RETURNS TABLE (
  spins_today BIGINT,
  ten_dollar_winners BIGINT,
  twenty_dollar_winners BIGINT,
  small_cash_winners BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH day AS (
    SELECT (date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') AS start
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM public.wheel_spins, day WHERE created_at >= day.start),
    (SELECT COUNT(*)::BIGINT FROM public.wheel_spins, day WHERE created_at >= day.start AND prize_value = 10),
    (SELECT COUNT(*)::BIGINT FROM public.wheel_spins, day WHERE created_at >= day.start AND prize_value = 7),
    (SELECT COUNT(*)::BIGINT FROM public.wheel_spins, day
      WHERE created_at >= day.start AND prize_type = 'cash' AND prize_value BETWEEN 1 AND 4);
$$;

GRANT EXECUTE ON FUNCTION public.get_wheel_daily_stats() TO authenticated;


-- ---------------------------------------------------------------------------
-- 012-wallets.sql
-- ---------------------------------------------------------------------------

-- Run in Supabase SQL Editor after schema.sql and wheel-spins.sql

-- Wallet balances on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashout_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('current', 'bonus', 'cashout')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'adjustment')),
  source TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Credit wallet (spin prizes, admin grants) â€” SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_wallet_type = 'bonus' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET bonus_wallet = bonus_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET cashout_wallet = cashout_wallet + p_amount WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, p_amount, p_wallet_type, 'credit', p_source, p_description, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Debit wallet (admin only when adjusting another user)
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT LEAST(bonus_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = GREATEST(0, bonus_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT LEAST(wallet_balance, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = GREATEST(0, wallet_balance - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT LEAST(cashout_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = GREATEST(0, cashout_wallet - p_amount) WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'debit', p_source, p_description, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Reset wallet balance to zero (admin only)
CREATE OR REPLACE FUNCTION public.reset_wallet(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT bonus_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT cashout_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = 0 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'adjustment', 'admin', COALESCE(p_description, 'Wallet reset to zero'), auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_wallet(UUID, TEXT, TEXT) TO authenticated;

-- Prevent users from manually editing wallet columns via profile update
CREATE OR REPLACE FUNCTION public.protect_wallet_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance
      OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
      OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet) THEN
    IF current_setting('app.wallet_update', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.bonus_wallet := OLD.bonus_wallet;
      NEW.cashout_wallet := OLD.cashout_wallet;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_wallet_columns_trigger ON profiles;
CREATE TRIGGER protect_wallet_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_columns();


-- ---------------------------------------------------------------------------
-- 013-wallet-cashout.sql
-- ---------------------------------------------------------------------------

-- Add Cashout wallet â€” run in Supabase SQL Editor (if wallets.sql already ran)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cashout_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_wallet_type_check
  CHECK (wallet_type IN ('current', 'bonus', 'cashout'));

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    UPDATE profiles SET bonus_wallet = bonus_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    UPDATE profiles SET cashout_wallet = cashout_wallet + p_amount WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, p_amount, p_wallet_type, 'credit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT LEAST(bonus_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = GREATEST(0, bonus_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT LEAST(wallet_balance, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = GREATEST(0, wallet_balance - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT LEAST(cashout_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = GREATEST(0, cashout_wallet - p_amount) WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'debit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_wallet(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT bonus_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT cashout_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = 0 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'adjustment', 'admin', COALESCE(p_description, 'Wallet reset to zero'), auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_wallet_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance
      OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
      OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet) THEN
    IF current_setting('app.wallet_update', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.bonus_wallet := OLD.bonus_wallet;
      NEW.cashout_wallet := OLD.cashout_wallet;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_wallet(UUID, TEXT, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 014-wallet-transactions-realtime.sql
-- ---------------------------------------------------------------------------

-- Live admin Transaction Management (new rows appear without refresh).
-- Run in Supabase SQL Editor after wallets.sql.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wallet_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
  END IF;
END $$;

ALTER TABLE public.wallet_transactions REPLICA IDENTITY FULL;


-- ---------------------------------------------------------------------------
-- 015-deposit-wallet-credit.sql
-- ---------------------------------------------------------------------------

-- Credit Total Deposit wallet when admin confirms a deposit request.
-- Run once in Supabase SQL Editor after deposit-requests.sql and wallets.sql

ALTER TABLE public.deposit_requests
  ADD COLUMN IF NOT EXISTS wallet_credited BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.complete_deposit_request(
  p_deposit_id UUID,
  p_amount NUMERIC DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.deposit_requests;
  v_amount NUMERIC;
  v_method TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT * INTO v_row
  FROM public.deposit_requests
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Deposit request not found';
  END IF;

  IF v_row.wallet_credited OR v_row.status = 'completed' THEN
    RAISE EXCEPTION 'Deposit already completed';
  END IF;

  v_amount := COALESCE(p_amount, v_row.amount);
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RAISE EXCEPTION 'Deposit amount is required';
  END IF;

  v_amount := round(v_amount::numeric, 2);

  PERFORM set_config('app.wallet_update', 'true', true);

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_amount
  WHERE id = v_row.user_id;

  v_method := COALESCE(v_row.payment_method, 'payment');

  INSERT INTO public.wallet_transactions (
    user_id, amount, wallet_type, transaction_type, source, description, created_by
  )
  VALUES (
    v_row.user_id,
    v_amount,
    'current',
    'credit',
    'deposit',
    format('Deposit confirmed â€” $%s via %s (%s)', v_amount, v_method, v_row.game_name),
    auth.uid()
  );

  UPDATE public.deposit_requests
  SET
    status = 'completed',
    amount = v_amount,
    wallet_credited = true,
    admin_notes = COALESCE(NULLIF(trim(p_admin_notes), ''), admin_notes),
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_deposit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_deposit_request(UUID, NUMERIC, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 016-deposit-redeem-rollover.sql
-- ---------------------------------------------------------------------------

-- Deposit-wallet redeem rollover: 3x min / 8x max per individual deposit load (not summed).
-- Run in Supabase SQL Editor after game-load-minimum-5.sql

DROP FUNCTION IF EXISTS public.get_deposit_rollover_totals(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_deposit_rollover_totals(
  p_user_id UUID,
  p_game_slug TEXT
)
RETURNS TABLE (active_load_amount NUMERIC, redeemed_since_active NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_amount NUMERIC := 0;
  v_active_at TIMESTAMPTZ;
  v_redeemed_since NUMERIC := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT amount, completed_at
  INTO v_active_amount, v_active_at
  FROM game_load_requests
  WHERE user_id = p_user_id
    AND game_slug = p_game_slug
    AND wallet_type = 'current'
    AND load_type IN ('load', 'reload')
    AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_active_amount IS NULL OR v_active_amount <= 0 THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_redeemed_since
  FROM game_load_requests
  WHERE user_id = p_user_id
    AND game_slug = p_game_slug
    AND wallet_type = 'current'
    AND load_type = 'redeem'
    AND status = 'completed'
    AND (v_active_at IS NULL OR completed_at >= v_active_at);

  RETURN QUERY SELECT v_active_amount, v_redeemed_since;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_deposit_rollover_totals(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_deposit_rollover_totals(UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_min_redeem NUMERIC := 5;
  v_active_load NUMERIC;
  v_redeemed_since NUMERIC;
  v_max_remaining NUMERIC;
  v_min_game_balance NUMERIC;
  v_last_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT p_redeem_all AND p_amount < v_min_redeem THEN
    RAISE EXCEPTION 'Minimum redeem amount is $5';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  IF p_wallet_type = 'current' THEN
    SELECT active_load_amount, redeemed_since_active
    INTO v_active_load, v_redeemed_since
    FROM public.get_deposit_rollover_totals(v_user_id, p_game_slug);

    IF v_active_load > 0 THEN
      v_min_game_balance := v_active_load * 3;
      v_max_remaining := GREATEST(0, v_active_load * 8 - v_redeemed_since);

      SELECT amount INTO v_last_balance
      FROM game_load_requests
      WHERE user_id = v_user_id
        AND game_slug = p_game_slug
        AND load_type = 'check_balance'
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
        RAISE EXCEPTION
          'Need at least $% in game (3x your $% deposit). Check your live game balance first.',
          v_min_game_balance,
          v_active_load;
      END IF;

      IF v_max_remaining <= 0 THEN
        RAISE EXCEPTION 'You have reached the 8x redeem limit for this deposit';
      END IF;

      IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
        RAISE EXCEPTION 'Maximum redeem is $% (8x this deposit minus prior redeems)', v_max_remaining;
      END IF;
    END IF;
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    p_wallet_type,
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 017-bonus-redeem-rollover.sql
-- ---------------------------------------------------------------------------

-- Bonus-wallet redeem rollover: 7x min / 15x max per individual bonus load (not summed).
-- Run in Supabase SQL Editor after deposit-redeem-rollover.sql

CREATE OR REPLACE FUNCTION public.get_bonus_rollover_totals(
  p_user_id UUID,
  p_game_slug TEXT
)
RETURNS TABLE (active_load_amount NUMERIC, redeemed_since_active NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_amount NUMERIC := 0;
  v_active_at TIMESTAMPTZ;
  v_redeemed_since NUMERIC := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT amount, completed_at
  INTO v_active_amount, v_active_at
  FROM game_load_requests
  WHERE user_id = p_user_id
    AND game_slug = p_game_slug
    AND wallet_type = 'bonus'
    AND load_type IN ('load', 'reload')
    AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_active_amount IS NULL OR v_active_amount <= 0 THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_redeemed_since
  FROM game_load_requests
  WHERE user_id = p_user_id
    AND game_slug = p_game_slug
    AND wallet_type = 'bonus'
    AND load_type = 'redeem'
    AND status = 'completed'
    AND (v_active_at IS NULL OR completed_at >= v_active_at);

  RETURN QUERY SELECT v_active_amount, v_redeemed_since;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_bonus_rollover_totals(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bonus_rollover_totals(UUID, TEXT) TO service_role;

-- Extend request_game_redeem with bonus-wallet 7x / 15x rules
CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_min_redeem NUMERIC := 5;
  v_active_load NUMERIC;
  v_redeemed_since NUMERIC;
  v_max_remaining NUMERIC;
  v_min_game_balance NUMERIC;
  v_last_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT p_redeem_all AND p_amount < v_min_redeem THEN
    RAISE EXCEPTION 'Minimum redeem amount is $5';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  IF p_wallet_type = 'current' THEN
    SELECT active_load_amount, redeemed_since_active
    INTO v_active_load, v_redeemed_since
    FROM public.get_deposit_rollover_totals(v_user_id, p_game_slug);

    IF v_active_load > 0 THEN
      v_min_game_balance := v_active_load * 3;
      v_max_remaining := GREATEST(0, v_active_load * 8 - v_redeemed_since);

      SELECT amount INTO v_last_balance
      FROM game_load_requests
      WHERE user_id = v_user_id
        AND game_slug = p_game_slug
        AND load_type = 'check_balance'
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
        RAISE EXCEPTION
          'Need at least $% in game (3x your $% deposit). Check your live game balance first.',
          v_min_game_balance,
          v_active_load;
      END IF;

      IF v_max_remaining <= 0 THEN
        RAISE EXCEPTION 'You have reached the 8x redeem limit for this deposit';
      END IF;

      IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
        RAISE EXCEPTION 'Maximum redeem is $% (8x this deposit minus prior redeems)', v_max_remaining;
      END IF;
    END IF;
  ELSIF p_wallet_type = 'bonus' THEN
    SELECT active_load_amount, redeemed_since_active
    INTO v_active_load, v_redeemed_since
    FROM public.get_bonus_rollover_totals(v_user_id, p_game_slug);

    IF v_active_load > 0 THEN
      v_min_game_balance := v_active_load * 7;
      v_max_remaining := GREATEST(0, v_active_load * 15 - v_redeemed_since);

      SELECT amount INTO v_last_balance
      FROM game_load_requests
      WHERE user_id = v_user_id
        AND game_slug = p_game_slug
        AND load_type = 'check_balance'
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
        RAISE EXCEPTION
          'Need at least $% in game (7x your $% bonus load). Check your live game balance first.',
          v_min_game_balance,
          v_active_load;
      END IF;

      IF v_max_remaining <= 0 THEN
        RAISE EXCEPTION 'You have reached the 15x redeem limit for this bonus load';
      END IF;

      IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
        RAISE EXCEPTION 'Maximum redeem is $% (15x this bonus load minus prior redeems)', v_max_remaining;
      END IF;
    END IF;
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    p_wallet_type,
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 018-redeem-wallet-source-guard.sql
-- ---------------------------------------------------------------------------

-- Require redeem destination to match load source (bonus load â†’ bonus redeem only).
-- Run in Supabase SQL Editor after bonus-redeem-rollover.sql

CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_min_redeem NUMERIC := 5;
  v_active_load NUMERIC;
  v_redeemed_since NUMERIC;
  v_max_remaining NUMERIC;
  v_min_game_balance NUMERIC;
  v_last_balance NUMERIC;
  v_has_deposit_load NUMERIC;
  v_has_bonus_load NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT p_redeem_all AND p_amount < v_min_redeem THEN
    RAISE EXCEPTION 'Minimum redeem amount is $5';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  SELECT active_load_amount INTO v_has_deposit_load
  FROM public.get_deposit_rollover_totals(v_user_id, p_game_slug);

  SELECT active_load_amount INTO v_has_bonus_load
  FROM public.get_bonus_rollover_totals(v_user_id, p_game_slug);

  IF p_wallet_type = 'current' THEN
    IF COALESCE(v_has_deposit_load, 0) <= 0 THEN
      IF COALESCE(v_has_bonus_load, 0) > 0 THEN
        RAISE EXCEPTION 'You loaded from your bonus wallet â€” redeem to Bonus Redeem only (7xâ€“15x rules).';
      END IF;
      RAISE EXCEPTION 'Load credits from Total Deposit into this game before redeeming to Deposit Redeem.';
    END IF;

    SELECT active_load_amount, redeemed_since_active
    INTO v_active_load, v_redeemed_since
    FROM public.get_deposit_rollover_totals(v_user_id, p_game_slug);

    IF v_active_load > 0 THEN
      v_min_game_balance := v_active_load * 3;
      v_max_remaining := GREATEST(0, v_active_load * 8 - v_redeemed_since);

      SELECT amount INTO v_last_balance
      FROM game_load_requests
      WHERE user_id = v_user_id
        AND game_slug = p_game_slug
        AND load_type = 'check_balance'
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
        RAISE EXCEPTION
          'Need at least $% in game (3x your $% deposit). Check your live game balance first.',
          v_min_game_balance,
          v_active_load;
      END IF;

      IF v_max_remaining <= 0 THEN
        RAISE EXCEPTION 'You have reached the 8x redeem limit for this deposit';
      END IF;

      IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
        RAISE EXCEPTION 'Maximum redeem is $% (8x this deposit minus prior redeems)', v_max_remaining;
      END IF;
    END IF;
  ELSIF p_wallet_type = 'bonus' THEN
    IF COALESCE(v_has_bonus_load, 0) <= 0 THEN
      IF COALESCE(v_has_deposit_load, 0) > 0 THEN
        RAISE EXCEPTION 'You loaded from Total Deposit â€” redeem to Deposit Redeem only (3xâ€“8x rules).';
      END IF;
      RAISE EXCEPTION 'Load credits from your bonus wallet into this game before redeeming to Bonus Redeem.';
    END IF;

    SELECT active_load_amount, redeemed_since_active
    INTO v_active_load, v_redeemed_since
    FROM public.get_bonus_rollover_totals(v_user_id, p_game_slug);

    IF v_active_load > 0 THEN
      v_min_game_balance := v_active_load * 7;
      v_max_remaining := GREATEST(0, v_active_load * 15 - v_redeemed_since);

      SELECT amount INTO v_last_balance
      FROM game_load_requests
      WHERE user_id = v_user_id
        AND game_slug = p_game_slug
        AND load_type = 'check_balance'
        AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, created_at DESC
      LIMIT 1;

      IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
        RAISE EXCEPTION
          'Need at least $% in game (7x your $% bonus load). Check your live game balance first.',
          v_min_game_balance,
          v_active_load;
      END IF;

      IF v_max_remaining <= 0 THEN
        RAISE EXCEPTION 'You have reached the 15x redeem limit for this bonus load';
      END IF;

      IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
        RAISE EXCEPTION 'Maximum redeem is $% (15x this bonus load minus prior redeems)', v_max_remaining;
      END IF;
    END IF;
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    p_wallet_type,
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 019-reviews.sql
-- ---------------------------------------------------------------------------

-- User reviews with star ratings â€” run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 3),
  admin_liked BOOLEAN NOT NULL DEFAULT false,
  admin_liked_at TIMESTAMPTZ,
  admin_comment TEXT,
  admin_commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_admin_liked ON public.reviews (admin_liked) WHERE admin_liked = true;

DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view reviews" ON public.reviews;
CREATE POLICY "Public can view reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create own review" ON public.reviews;
CREATE POLICY "Users can create own review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own review" ON public.reviews;
CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update any review" ON public.reviews;
CREATE POLICY "Admins can update any review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ---------------------------------------------------------------------------
-- 020-reviews-admin-comment.sql
-- ---------------------------------------------------------------------------

-- Add admin team reply on reviews â€” run in Supabase SQL Editor (if reviews table already exists)

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS admin_comment TEXT,
  ADD COLUMN IF NOT EXISTS admin_commented_at TIMESTAMPTZ;

UPDATE public.reviews
SET
  admin_comment = 'Thank you so much for sharing your review! â­ Your feedback helps us improve Spinora for everyone. We really appreciate you being part of our community â€” keep enjoying the games and message us anytime if you need help!',
  admin_commented_at = COALESCE(admin_commented_at, created_at)
WHERE admin_comment IS NULL;


-- ---------------------------------------------------------------------------
-- 021-reviews-public-read.sql
-- ---------------------------------------------------------------------------

-- Allow everyone (including visitors not logged in) to read reviews on the home page
-- (SELECT policy on reviews is defined in reviews.sql â€” do not recreate it here)

-- Let visitors see reviewer display names on the home page (only users with a review)
DROP POLICY IF EXISTS "Public can view reviewer profiles" ON public.profiles;
CREATE POLICY "Public can view reviewer profiles"
  ON public.profiles FOR SELECT
  TO anon
  USING (EXISTS (SELECT 1 FROM public.reviews WHERE user_id = profiles.id));


-- ---------------------------------------------------------------------------
-- 022-message-notifications.sql
-- ---------------------------------------------------------------------------

-- Run in Supabase SQL Editor so chat messages create bell notifications.

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_user_id UUID;
  conv_admin_id UUID;
  sender_role TEXT;
  sender_name TEXT;
  recipient_id UUID;
  preview TEXT;
BEGIN
  SELECT c.user_id, c.admin_id
  INTO conv_user_id, conv_admin_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  SELECT role, COALESCE(NULLIF(TRIM(full_name), ''), 'Customer')
  INTO sender_role, sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  IF sender_role = 'admin' THEN
    RETURN NEW;
  END IF;

  recipient_id := conv_admin_id;
  IF recipient_id IS NULL THEN
    SELECT id INTO recipient_id
    FROM profiles
    WHERE role = 'admin'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  preview := COALESCE(
    NULLIF(TRIM(NEW.content), ''),
    CASE
      WHEN NEW.attachment_type = 'image' THEN 'Sent you an image'
      WHEN NEW.attachment_type = 'file' THEN 'Sent you a file'
      ELSE 'Sent you a message'
    END
  );

  IF LENGTH(preview) > 140 THEN
    preview := LEFT(preview, 137) || '...';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    recipient_id,
    CASE
      WHEN sender_role = 'admin' THEN 'New message from Support'
      ELSE 'New message from ' || sender_name
    END,
    preview,
    'info'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_recipient();


-- ---------------------------------------------------------------------------
-- 023-notifications-rpc.sql
-- ---------------------------------------------------------------------------

-- Run in Supabase SQL Editor if spin/wallet notifications don't appear.
-- Root cause: RLS only allowed admins to INSERT into notifications.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_type NOT IN ('info', 'success', 'warning', 'promo') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 024-admin-presence.sql
-- ---------------------------------------------------------------------------

-- Admin presence for Telegram offline alerts.
-- Run in Supabase SQL Editor once.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_last_seen
  ON profiles (last_seen_at)
  WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_profiles_user_last_seen
  ON profiles (last_seen_at)
  WHERE role = 'user';


-- ---------------------------------------------------------------------------
-- 025-admin-broadcast-message.sql
-- ---------------------------------------------------------------------------

-- Broadcast a notice to every user (in-app notification + optional support chat message).
-- Run once in Supabase SQL Editor, then use Admin Panel â†’ Broadcast notice for future sends.

CREATE OR REPLACE FUNCTION public.admin_broadcast_to_all_users(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'warning',
  p_send_chat BOOLEAN DEFAULT true
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_user RECORD;
  v_conv_id UUID;
  v_count INTEGER := 0;
  v_chat_body TEXT;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF trim(p_title) = '' OR trim(p_message) = '' THEN
    RAISE EXCEPTION 'Title and message are required';
  END IF;

  IF p_type NOT IN ('info', 'success', 'warning', 'promo') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  v_chat_body := trim(p_title) || E'\n\n' || trim(p_message);

  FOR v_user IN
    SELECT id FROM public.profiles WHERE role IS DISTINCT FROM 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (v_user.id, trim(p_title), trim(p_message), p_type, false);

    IF p_send_chat THEN
      SELECT id INTO v_conv_id
      FROM public.conversations
      WHERE user_id = v_user.id AND is_active = true
      ORDER BY updated_at DESC NULLS LAST
      LIMIT 1;

      IF v_conv_id IS NULL THEN
        INSERT INTO public.conversations (user_id, admin_id)
        VALUES (v_user.id, v_admin_id)
        RETURNING id INTO v_conv_id;
      ELSE
        UPDATE public.conversations
        SET admin_id = v_admin_id, updated_at = NOW()
        WHERE id = v_conv_id;
      END IF;

      INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
      VALUES (v_conv_id, v_admin_id, v_chat_body, false);
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_broadcast_to_all_users(TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ---------------------------------------------------------------------------
-- ONE-TIME maintenance blast (SQL Editor â€” no website login needed)
-- Uncomment and run AFTER replacing the message if you want a different text.
-- ---------------------------------------------------------------------------
/*
DO $$
DECLARE
  v_admin_id UUID;
  v_user RECORD;
  v_conv_id UUID;
  v_title TEXT := 'Site under maintenance';
  v_message TEXT := 'Spinora is currently under maintenance. No requests (loads, redeems, new accounts, or deposits) will be approved until further notice. Thank you for your patience â€” we will update you when service resumes.';
  v_chat_body TEXT;
  v_count INTEGER := 0;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin account found in profiles';
  END IF;

  v_chat_body := v_title || E'\n\n' || v_message;

  FOR v_user IN
    SELECT id FROM public.profiles WHERE role IS DISTINCT FROM 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (v_user.id, v_title, v_message, 'warning', false);

    SELECT id INTO v_conv_id
    FROM public.conversations
    WHERE user_id = v_user.id AND is_active = true
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (user_id, admin_id)
      VALUES (v_user.id, v_admin_id)
      RETURNING id INTO v_conv_id;
    ELSE
      UPDATE public.conversations
      SET admin_id = v_admin_id, updated_at = NOW()
      WHERE id = v_conv_id;
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (v_conv_id, v_admin_id, v_chat_body, false);

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Maintenance notice sent to % users', v_count;
END $$;
*/


-- ---------------------------------------------------------------------------
-- 026-game-requests-realtime.sql
-- ---------------------------------------------------------------------------

-- Enable realtime popups for game account requests (admin + user).
-- Run in Supabase SQL Editor once.

ALTER TABLE game_requests REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE game_requests;


-- ---------------------------------------------------------------------------
-- 027-game-load-requests.sql
-- ---------------------------------------------------------------------------

-- Game load requests (wallet â†’ game credits) + user spend function
-- Run in Supabase SQL Editor after wallets.sql

CREATE TABLE IF NOT EXISTS public.game_load_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_slug TEXT NOT NULL,
  game_name TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('current', 'bonus')),
  load_type TEXT NOT NULL DEFAULT 'reload' CHECK (load_type IN ('new_account', 'reload')),
  game_username TEXT,
  game_password TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  error_message TEXT,
  bot_attempts INTEGER NOT NULL DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_game_load_requests_user_id ON public.game_load_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_game_load_requests_status ON public.game_load_requests(status);
CREATE INDEX IF NOT EXISTS idx_game_load_requests_game_slug ON public.game_load_requests(game_slug);
CREATE INDEX IF NOT EXISTS idx_game_load_requests_pending
  ON public.game_load_requests(created_at)
  WHERE status = 'pending';

ALTER TABLE public.game_load_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own game load requests" ON public.game_load_requests;
CREATE POLICY "Users can view own game load requests"
  ON public.game_load_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all game load requests" ON public.game_load_requests;
CREATE POLICY "Admins can view all game load requests"
  ON public.game_load_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update game load requests" ON public.game_load_requests;
CREATE POLICY "Admins can update game load requests"
  ON public.game_load_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users create loads via RPC only (atomic wallet debit)
DROP POLICY IF EXISTS "No direct insert on game load requests" ON public.game_load_requests;
CREATE POLICY "No direct insert on game load requests"
  ON public.game_load_requests FOR INSERT TO authenticated
  WITH CHECK (false);

ALTER PUBLICATION supabase_realtime ADD TABLE public.game_load_requests;

CREATE OR REPLACE FUNCTION public.request_game_load(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_load_type TEXT,
  p_game_username TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF p_load_type NOT IN ('new_account', 'reload') THEN
    RAISE EXCEPTION 'Invalid load type';
  END IF;

  IF p_load_type = 'reload' AND (p_game_username IS NULL OR trim(p_game_username) = '') THEN
    RAISE EXCEPTION 'Game username required for reload';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = v_user_id;
  ELSE
    SELECT bonus_wallet INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient bonus wallet balance';
    END IF;
    UPDATE profiles SET bonus_wallet = bonus_wallet - p_amount WHERE id = v_user_id;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (
    v_user_id,
    p_amount,
    p_wallet_type,
    'debit',
    'game_load',
    format('Load $%s to %s', p_amount, p_game_name),
    v_user_id
  );

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    p_amount,
    p_wallet_type,
    p_load_type,
    NULLIF(trim(p_game_username), ''),
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_load(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Bot worker claims next pending Juwa job (service role only)
CREATE OR REPLACE FUNCTION public.claim_next_game_load(p_game_slug TEXT)
RETURNS SETOF public.game_load_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE game_slug = p_game_slug
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.game_load_requests
  SET status = 'processing',
      bot_attempts = bot_attempts + 1,
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_game_load(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_game_load(
  p_request_id UUID,
  p_success BOOLEAN,
  p_game_username TEXT DEFAULT NULL,
  p_game_password TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.game_load_requests
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    game_username = COALESCE(p_game_username, game_username),
    game_password = COALESCE(p_game_password, game_password),
    error_message = p_error_message,
    completed_at = CASE WHEN p_success THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_request_id
    AND status IN ('pending', 'processing');
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_game_load(UUID, BOOLEAN, TEXT, TEXT, TEXT) TO service_role;


-- ---------------------------------------------------------------------------
-- 028-game-load-split-flow.sql
-- ---------------------------------------------------------------------------

-- Split Juwa flow: create_account (free) vs load (wallet debit + recharge)
-- Run in Supabase SQL Editor after game-load-requests.sql

ALTER TABLE public.game_load_requests DROP CONSTRAINT IF EXISTS game_load_requests_load_type_check;
ALTER TABLE public.game_load_requests ADD CONSTRAINT game_load_requests_load_type_check
  CHECK (load_type IN ('new_account', 'reload', 'create_account', 'load'));

ALTER TABLE public.game_load_requests DROP CONSTRAINT IF EXISTS game_load_requests_amount_check;
ALTER TABLE public.game_load_requests ADD CONSTRAINT game_load_requests_amount_check
  CHECK (amount >= 0);

CREATE OR REPLACE FUNCTION public.request_game_load(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_load_type TEXT,
  p_game_username TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_load_type NOT IN ('new_account', 'reload', 'create_account', 'load') THEN
    RAISE EXCEPTION 'Invalid load type';
  END IF;

  IF p_load_type = 'create_account' THEN
    IF p_amount <> 0 THEN
      RAISE EXCEPTION 'Create account does not charge wallet';
    END IF;

    IF EXISTS (
      SELECT 1 FROM game_load_requests
      WHERE user_id = v_user_id AND game_slug = p_game_slug
        AND load_type = 'create_account'
        AND status IN ('pending', 'processing')
    ) THEN
      RAISE EXCEPTION 'Account creation already in progress';
    END IF;

    INSERT INTO game_load_requests (
      user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
    )
    VALUES (
      v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', NULL, 'pending'
    )
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF p_load_type IN ('reload', 'load') AND (p_game_username IS NULL OR trim(p_game_username) = '') THEN
    RAISE EXCEPTION 'Game username required for load';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = v_user_id;
  ELSE
    SELECT bonus_wallet INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient bonus wallet balance';
    END IF;
    UPDATE profiles SET bonus_wallet = bonus_wallet - p_amount WHERE id = v_user_id;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (
    v_user_id,
    p_amount,
    p_wallet_type,
    'debit',
    'game_load',
    format('Load $%s to %s', p_amount, p_game_name),
    v_user_id
  );

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    p_amount,
    p_wallet_type,
    CASE WHEN p_load_type = 'reload' THEN 'load' ELSE p_load_type END,
    NULLIF(trim(p_game_username), ''),
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_load(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 029-game-load-redeem.sql
-- ---------------------------------------------------------------------------

-- Juwa redeem: pull credits from game account â†’ Spinora current wallet
-- Run in Supabase SQL Editor after game-load-split-flow.sql

ALTER TABLE public.game_load_requests DROP CONSTRAINT IF EXISTS game_load_requests_load_type_check;
ALTER TABLE public.game_load_requests ADD CONSTRAINT game_load_requests_load_type_check
  CHECK (load_type IN ('new_account', 'reload', 'create_account', 'load', 'redeem'));

ALTER TABLE public.game_load_requests
  ADD COLUMN IF NOT EXISTS redeem_all BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    'current',
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN) TO authenticated;

DROP FUNCTION IF EXISTS public.complete_game_load(UUID, BOOLEAN, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.complete_game_load(
  p_request_id UUID,
  p_success BOOLEAN,
  p_game_username TEXT DEFAULT NULL,
  p_game_password TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_redeemed_amount NUMERIC DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
  v_credit NUMERIC;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
    AND status IN ('pending', 'processing')
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  IF p_success AND v_row.load_type = 'redeem' THEN
    v_credit := COALESCE(p_redeemed_amount, NULLIF(v_row.amount, 0));
    IF v_credit IS NULL OR v_credit <= 0 THEN
      RAISE EXCEPTION 'Redeem completion requires a positive amount';
    END IF;

    PERFORM set_config('app.wallet_update', 'true', true);

    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_credit
    WHERE id = v_row.user_id;

    INSERT INTO public.wallet_transactions (
      user_id, amount, wallet_type, transaction_type, source, description, created_by
    )
    VALUES (
      v_row.user_id,
      v_credit,
      'current',
      'credit',
      'game_redeem',
      format('Redeem $%s from %s', v_credit, v_row.game_name),
      v_row.user_id
    );
  END IF;

  UPDATE public.game_load_requests
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    game_username = COALESCE(p_game_username, game_username),
    game_password = COALESCE(p_game_password, game_password),
    amount = CASE
      WHEN p_success AND v_row.load_type = 'redeem' THEN COALESCE(p_redeemed_amount, amount)
      ELSE amount
    END,
    error_message = p_error_message,
    completed_at = CASE WHEN p_success THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_game_load(UUID, BOOLEAN, TEXT, TEXT, TEXT, NUMERIC) TO service_role;


-- ---------------------------------------------------------------------------
-- 030-game-account-replace.sql
-- ---------------------------------------------------------------------------

-- One game account per user per slug: block duplicate creates, allow explicit replace.
-- Run in Supabase SQL Editor (updates request_game_account_create).

CREATE OR REPLACE FUNCTION public.request_game_account_create(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_replace BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_username TEXT := NULLIF(trim(p_username), '');
  v_password TEXT := NULLIF(p_password, '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND NOT COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'You already have a game account. Use Replace Account to get new login details.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'No account to replace yet. Create your first account instead.';
  END IF;

  IF v_username IS NOT NULL AND v_password IS NULL THEN
    RAISE EXCEPTION 'Password required when choosing a custom username';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, game_password, status, admin_notes
  )
  VALUES (
    v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', v_username, v_password, 'pending',
    CASE WHEN COALESCE(p_replace, FALSE) THEN 'account_replace' ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_account_create(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;


-- ---------------------------------------------------------------------------
-- 031-redeem-wallets-and-balance-check.sql
-- ---------------------------------------------------------------------------

-- Redeem wallets + balance check + custom account creation
-- Run in Supabase SQL Editor AFTER:
--   wallets.sql, wallet-cashout.sql, game-load-requests.sql,
--   game-load-split-flow.sql, game-load-redeem.sql
--
-- Adds:
--   * profiles.bonus_redeem_wallet  (Bonus Redeem balance)
--   * cashout_wallet is now surfaced as "Deposit Redeem" in the UI
--   * redeem now credits Deposit Redeem (when redeeming the Total Deposit side)
--     or Bonus Redeem (when redeeming the Bonus side)
--   * "check_balance" job type so the bot can read live game-server balance
--   * custom username/password account creation

-- 1) New wallet column ---------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_redeem_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 2) Allow the new transaction wallet types ------------------------------------
ALTER TABLE public.wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_type_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_wallet_type_check
  CHECK (wallet_type IN ('current', 'bonus', 'cashout', 'bonus_redeem'));

-- 3) Allow the new job type ----------------------------------------------------
ALTER TABLE public.game_load_requests DROP CONSTRAINT IF EXISTS game_load_requests_load_type_check;
ALTER TABLE public.game_load_requests ADD CONSTRAINT game_load_requests_load_type_check
  CHECK (load_type IN ('new_account', 'reload', 'create_account', 'load', 'redeem', 'check_balance'));

-- 4) Protect the new wallet column from direct client writes -------------------
CREATE OR REPLACE FUNCTION public.protect_wallet_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance
      OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
      OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet
      OR OLD.bonus_redeem_wallet IS DISTINCT FROM NEW.bonus_redeem_wallet) THEN
    IF current_setting('app.wallet_update', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.bonus_wallet := OLD.bonus_wallet;
      NEW.cashout_wallet := OLD.cashout_wallet;
      NEW.bonus_redeem_wallet := OLD.bonus_redeem_wallet;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5) credit/debit/reset support for the bonus_redeem wallet --------------------
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    UPDATE profiles SET bonus_wallet = bonus_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    UPDATE profiles SET cashout_wallet = cashout_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'bonus_redeem' THEN
    UPDATE profiles SET bonus_redeem_wallet = bonus_redeem_wallet + p_amount WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, p_amount, p_wallet_type, 'credit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT LEAST(bonus_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = GREATEST(0, bonus_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT LEAST(wallet_balance, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = GREATEST(0, wallet_balance - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT LEAST(cashout_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = GREATEST(0, cashout_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'bonus_redeem' THEN
    SELECT LEAST(bonus_redeem_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_redeem_wallet = GREATEST(0, bonus_redeem_wallet - p_amount) WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'debit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_wallet(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT bonus_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT cashout_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'bonus_redeem' THEN
    SELECT bonus_redeem_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_redeem_wallet = 0 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'adjustment', 'admin', COALESCE(p_description, 'Wallet reset to zero'), auth.uid());
END;
$$;

-- 6) Account creation with optional custom username/password ------------------
CREATE OR REPLACE FUNCTION public.request_game_account_create(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_replace BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_username TEXT := NULLIF(trim(p_username), '');
  v_password TEXT := NULLIF(p_password, '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND NOT COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'You already have a game account. Use Replace Account to get new login details.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'No account to replace yet. Create your first account instead.';
  END IF;

  IF v_username IS NOT NULL AND v_password IS NULL THEN
    RAISE EXCEPTION 'Password required when choosing a custom username';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, game_password, status, admin_notes
  )
  VALUES (
    v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', v_username, v_password, 'pending',
    CASE WHEN COALESCE(p_replace, FALSE) THEN 'account_replace' ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_account_create(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- 7) Check live game balance ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_game_check_balance(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_game_username TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required to check balance';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
  )
  VALUES (
    v_user_id, p_game_slug, p_game_name, 0, 'current', 'check_balance', NULLIF(trim(p_game_username), ''), 'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_check_balance(TEXT, TEXT, TEXT) TO authenticated;

-- 8) Redeem with wallet routing (Deposit side -> Deposit Redeem, Bonus -> Bonus Redeem)
DROP FUNCTION IF EXISTS public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    p_wallet_type,
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;

-- 9) Completion: route redeem credit to the right wallet, store check_balance result
CREATE OR REPLACE FUNCTION public.complete_game_load(
  p_request_id UUID,
  p_success BOOLEAN,
  p_game_username TEXT DEFAULT NULL,
  p_game_password TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_redeemed_amount NUMERIC DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
  v_credit NUMERIC;
  v_dest_wallet TEXT;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
    AND status IN ('pending', 'processing')
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  IF p_success AND v_row.load_type = 'redeem' THEN
    v_credit := COALESCE(p_redeemed_amount, NULLIF(v_row.amount, 0));
    IF v_credit IS NULL OR v_credit <= 0 THEN
      RAISE EXCEPTION 'Redeem completion requires a positive amount';
    END IF;

    -- Total Deposit side -> Deposit Redeem (cashout); Bonus side -> Bonus Redeem
    v_dest_wallet := CASE WHEN v_row.wallet_type = 'bonus' THEN 'bonus_redeem' ELSE 'cashout' END;

    PERFORM set_config('app.wallet_update', 'true', true);

    IF v_dest_wallet = 'bonus_redeem' THEN
      UPDATE public.profiles
      SET bonus_redeem_wallet = bonus_redeem_wallet + v_credit
      WHERE id = v_row.user_id;
    ELSE
      UPDATE public.profiles
      SET cashout_wallet = cashout_wallet + v_credit
      WHERE id = v_row.user_id;
    END IF;

    INSERT INTO public.wallet_transactions (
      user_id, amount, wallet_type, transaction_type, source, description, created_by
    )
    VALUES (
      v_row.user_id,
      v_credit,
      v_dest_wallet,
      'credit',
      'game_redeem',
      format('Redeem $%s from %s', v_credit, v_row.game_name),
      v_row.user_id
    );
  END IF;

  UPDATE public.game_load_requests
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    game_username = COALESCE(p_game_username, game_username),
    game_password = COALESCE(p_game_password, game_password),
    amount = CASE
      WHEN p_success AND v_row.load_type = 'redeem' THEN COALESCE(p_redeemed_amount, amount)
      WHEN p_success AND v_row.load_type = 'check_balance' THEN COALESCE(p_redeemed_amount, amount)
      ELSE amount
    END,
    error_message = p_error_message,
    completed_at = CASE WHEN p_success THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_game_load(UUID, BOOLEAN, TEXT, TEXT, TEXT, NUMERIC) TO service_role;


-- ---------------------------------------------------------------------------
-- 032-remove-bonus-wallet-and-daily-tasks.sql
-- ---------------------------------------------------------------------------

-- Remove bonus wallet balances (zero out) and block new bonus-wallet game loads/redeems.
-- Spin prizes and game loads use Total Deposit only after app deploy.
-- Run in Supabase SQL Editor.

-- Ensure columns exist (fresh DBs may not have bonus_redeem yet)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_redeem_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 1. Zero all bonus wallet balances
UPDATE profiles
SET bonus_wallet = 0,
    bonus_redeem_wallet = 0
WHERE bonus_wallet <> 0 OR bonus_redeem_wallet <> 0;

-- 2. Game loads: Total Deposit only
CREATE OR REPLACE FUNCTION public.request_game_load(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_load_type TEXT,
  p_game_username TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_request_id UUID;
  v_min_load NUMERIC := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_load_type NOT IN ('new_account', 'reload', 'create_account', 'load') THEN
    RAISE EXCEPTION 'Invalid load type';
  END IF;

  IF p_load_type = 'create_account' THEN
    IF p_amount <> 0 THEN
      RAISE EXCEPTION 'Create account does not charge wallet';
    END IF;

    IF EXISTS (
      SELECT 1 FROM game_load_requests
      WHERE user_id = v_user_id AND game_slug = p_game_slug
        AND load_type = 'create_account'
        AND status IN ('pending', 'processing')
    ) THEN
      RAISE EXCEPTION 'Account creation already in progress';
    END IF;

    INSERT INTO game_load_requests (
      user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
    )
    VALUES (
      v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', NULL, 'pending'
    )
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_amount < v_min_load THEN
    RAISE EXCEPTION 'Minimum load amount is $5';
  END IF;

  IF p_wallet_type <> 'current' THEN
    RAISE EXCEPTION 'Loads must use Total Deposit wallet';
  END IF;

  IF p_load_type IN ('reload', 'load') AND (p_game_username IS NULL OR trim(p_game_username) = '') THEN
    RAISE EXCEPTION 'Game username required for load';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;
  UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = v_user_id;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (
    v_user_id,
    p_amount,
    'current',
    'debit',
    'game_load',
    'Load to ' || p_game_name,
    v_user_id
  );

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    p_amount,
    'current',
    p_load_type,
    NULLIF(trim(p_game_username), ''),
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- 3. Game redeems: Deposit Redeem only (3x / 8x)
CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_min_redeem NUMERIC := 5;
  v_active_load NUMERIC;
  v_redeemed_since NUMERIC;
  v_max_remaining NUMERIC;
  v_min_game_balance NUMERIC;
  v_last_balance NUMERIC;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type <> 'current' THEN
    RAISE EXCEPTION 'Redeems go to Deposit Redeem wallet only';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT p_redeem_all AND p_amount < v_min_redeem THEN
    RAISE EXCEPTION 'Minimum redeem amount is $5';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  SELECT active_load_amount, redeemed_since_active
  INTO v_active_load, v_redeemed_since
  FROM public.get_deposit_rollover_totals(v_user_id, p_game_slug);

  IF COALESCE(v_active_load, 0) <= 0 THEN
    RAISE EXCEPTION 'Load credits from Total Deposit into this game before redeeming.';
  END IF;

  v_min_game_balance := v_active_load * 3;
  v_max_remaining := GREATEST(0, v_active_load * 8 - v_redeemed_since);

  SELECT amount INTO v_last_balance
  FROM game_load_requests
  WHERE user_id = v_user_id
    AND game_slug = p_game_slug
    AND load_type = 'check_balance'
    AND status = 'completed'
  ORDER BY completed_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  IF v_last_balance IS NULL OR v_last_balance < v_min_game_balance THEN
    RAISE EXCEPTION
      'Need at least $% in game (3x your $% deposit). Check your live game balance first.',
      v_min_game_balance,
      v_active_load;
  END IF;

  IF v_max_remaining <= 0 THEN
    RAISE EXCEPTION 'You have reached the 8x redeem limit for this deposit';
  END IF;

  IF NOT p_redeem_all AND p_amount > v_max_remaining THEN
    RAISE EXCEPTION 'Maximum redeem is $% (8x this deposit minus prior redeems)', v_max_remaining;
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    'current',
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;

-- 4. Freeplay message (spin only â€” daily tasks removed)
CREATE OR REPLACE FUNCTION public.assert_freeplay_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suspended BOOLEAN;
  v_blocked BOOLEAN;
  v_rewards_blocked BOOLEAN;
  v_risk SMALLINT;
BEGIN
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_suspended, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'suspended',
      'message', 'Your account is suspended. Contact support.'
    );
  END IF;

  SELECT blocked, rewards_blocked, risk_score
  INTO v_blocked, v_rewards_blocked, v_risk
  FROM public.fraud_scores
  WHERE user_id = p_user_id;

  IF COALESCE(v_blocked, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'This account cannot claim free rewards. Contact support.'
    );
  END IF;

  IF COALESCE(v_rewards_blocked, false) OR COALESCE(v_risk, 0) >= 50 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rewards_blocked',
      'message', 'Free spin rewards are not available on this account. Make a deposit or contact support.'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_freeplay_allowed TO service_role;


-- ---------------------------------------------------------------------------
-- 033-game-load-refund-on-failure.sql
-- ---------------------------------------------------------------------------

-- Refund Spinora wallet when a game load fails, is cancelled, or times out.
-- Wallet is debited at queue time (request_game_load); this puts it back if the bot fails.
-- Run in Supabase SQL Editor after game-load-split-flow.sql and redeem-wallets-and-balance-check.sql

ALTER TABLE public.game_load_requests
  ADD COLUMN IF NOT EXISTS wallet_refunded BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.refund_game_load_wallet(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  IF v_row.wallet_refunded THEN
    RETURN;
  END IF;

  IF v_row.load_type NOT IN ('load', 'reload') THEN
    RETURN;
  END IF;

  IF COALESCE(v_row.amount, 0) <= 0 THEN
    RETURN;
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF v_row.wallet_type = 'bonus' THEN
    UPDATE public.profiles
    SET bonus_wallet = bonus_wallet + v_row.amount
    WHERE id = v_row.user_id;
  ELSE
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_row.amount
    WHERE id = v_row.user_id;
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, amount, wallet_type, transaction_type, source, description, created_by
  )
  VALUES (
    v_row.user_id,
    v_row.amount,
    v_row.wallet_type,
    'credit',
    'game_load_refund',
    format('Refund failed load $%s to %s', v_row.amount, v_row.game_name),
    v_row.user_id
  );

  UPDATE public.game_load_requests
  SET wallet_refunded = true, updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_game_load_wallet(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_game_load(
  p_request_id UUID,
  p_success BOOLEAN,
  p_game_username TEXT DEFAULT NULL,
  p_game_password TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_redeemed_amount NUMERIC DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
  v_credit NUMERIC;
  v_dest_wallet TEXT;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
    AND status IN ('pending', 'processing')
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  IF NOT p_success AND v_row.load_type IN ('load', 'reload') THEN
    PERFORM public.refund_game_load_wallet(p_request_id);
  END IF;

  IF p_success AND v_row.load_type = 'redeem' THEN
    v_credit := COALESCE(p_redeemed_amount, NULLIF(v_row.amount, 0));
    IF v_credit IS NULL OR v_credit <= 0 THEN
      RAISE EXCEPTION 'Redeem completion requires a positive amount';
    END IF;

    v_dest_wallet := CASE WHEN v_row.wallet_type = 'bonus' THEN 'bonus_redeem' ELSE 'cashout' END;

    PERFORM set_config('app.wallet_update', 'true', true);

    IF v_dest_wallet = 'bonus_redeem' THEN
      UPDATE public.profiles
      SET bonus_redeem_wallet = bonus_redeem_wallet + v_credit
      WHERE id = v_row.user_id;
    ELSE
      UPDATE public.profiles
      SET cashout_wallet = cashout_wallet + v_credit
      WHERE id = v_row.user_id;
    END IF;

    INSERT INTO public.wallet_transactions (
      user_id, amount, wallet_type, transaction_type, source, description, created_by
    )
    VALUES (
      v_row.user_id,
      v_credit,
      v_dest_wallet,
      'credit',
      'game_redeem',
      format('Redeem $%s from %s', v_credit, v_row.game_name),
      v_row.user_id
    );
  END IF;

  UPDATE public.game_load_requests
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    game_username = COALESCE(p_game_username, game_username),
    game_password = COALESCE(p_game_password, game_password),
    amount = CASE
      WHEN p_success AND v_row.load_type = 'redeem' THEN COALESCE(p_redeemed_amount, amount)
      WHEN p_success AND v_row.load_type = 'check_balance' THEN COALESCE(p_redeemed_amount, amount)
      ELSE amount
    END,
    error_message = p_error_message,
    completed_at = CASE WHEN p_success THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_game_load(UUID, BOOLEAN, TEXT, TEXT, TEXT, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.fail_stale_game_loads(
  p_stale_minutes INTEGER DEFAULT 15,
  p_user_id UUID DEFAULT NULL,
  p_game_slug TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row public.game_load_requests;
BEGIN
  FOR v_row IN
    SELECT *
    FROM public.game_load_requests
    WHERE status IN ('pending', 'processing')
      AND updated_at < NOW() - make_interval(mins => GREATEST(p_stale_minutes, 5))
      AND (p_user_id IS NULL OR user_id = p_user_id)
      AND (p_game_slug IS NULL OR game_slug = p_game_slug)
    FOR UPDATE
  LOOP
    IF v_row.load_type IN ('load', 'reload') THEN
      PERFORM public.refund_game_load_wallet(v_row.id);
    END IF;

    UPDATE public.game_load_requests
    SET
      status = 'failed',
      error_message = COALESCE(
        NULLIF(trim(error_message), ''),
        'Timed out waiting for the game bot. Restart the bot on your PC, then try again.'
      ),
      updated_at = NOW()
    WHERE id = v_row.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fail_stale_game_loads(INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_stale_game_loads(INTEGER, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_my_game_load(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'processing')
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Request not found or already finished';
  END IF;

  IF v_row.load_type IN ('load', 'reload') THEN
    PERFORM public.refund_game_load_wallet(p_request_id);
  END IF;

  UPDATE public.game_load_requests
  SET
    status = 'cancelled',
    error_message = COALESCE(
      NULLIF(trim(error_message), ''),
      'Cancelled â€” you can start a new request.'
    ),
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_game_load(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 034-stale-game-load-recovery.sql
-- ---------------------------------------------------------------------------

-- Fail wallet-load jobs stuck in pending/processing so users can retry.
-- Also adds cancel_my_game_load for the game wallet UI.
-- Run in Supabase SQL Editor after game-load-requests.sql

CREATE OR REPLACE FUNCTION public.fail_stale_game_loads(
  p_stale_minutes INTEGER DEFAULT 15,
  p_user_id UUID DEFAULT NULL,
  p_game_slug TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.game_load_requests
  SET
    status = 'failed',
    error_message = COALESCE(
      NULLIF(trim(error_message), ''),
      'Timed out waiting for the game bot. Restart the bot on your PC, then try again.'
    ),
    updated_at = NOW()
  WHERE status IN ('pending', 'processing')
    AND updated_at < NOW() - make_interval(mins => GREATEST(p_stale_minutes, 5))
    AND (p_user_id IS NULL OR user_id = p_user_id)
    AND (p_game_slug IS NULL OR game_slug = p_game_slug);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fail_stale_game_loads(INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_stale_game_loads(INTEGER, UUID, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_my_game_load(p_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.game_load_requests
  SET
    status = 'cancelled',
    error_message = COALESCE(
      NULLIF(trim(error_message), ''),
      'Cancelled â€” you can start a new request.'
    ),
    updated_at = NOW()
  WHERE id = p_request_id
    AND user_id = auth.uid()
    AND status IN ('pending', 'processing');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already finished';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_my_game_load(UUID) TO authenticated;

-- Bot: fail very stale jobs for this game before claiming the next pending row.
CREATE OR REPLACE FUNCTION public.claim_next_game_load(p_game_slug TEXT)
RETURNS SETOF public.game_load_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
BEGIN
  PERFORM public.fail_stale_game_loads(15, NULL, p_game_slug);

  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE game_slug = p_game_slug
    AND status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_row.id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.game_load_requests
  SET status = 'processing',
      bot_attempts = bot_attempts + 1,
      updated_at = NOW()
  WHERE id = v_row.id
  RETURNING * INTO v_row;

  RETURN NEXT v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_next_game_load(TEXT) TO service_role;

-- Auto-fail stale jobs before checking "already in progress".
CREATE OR REPLACE FUNCTION public.request_game_account_create(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_username TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_replace BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_username TEXT := NULLIF(trim(p_username), '');
  v_password TEXT := NULLIF(p_password, '');
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.fail_stale_game_loads(15, v_user_id, p_game_slug);

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game. Cancel it under Recent activity, or wait for the bot.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND NOT COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'You already have a game account. Use Replace Account to get new login details.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id
      AND game_slug = p_game_slug
      AND status = 'completed'
      AND load_type IN ('create_account', 'new_account')
      AND game_username IS NOT NULL
  ) AND COALESCE(p_replace, FALSE) THEN
    RAISE EXCEPTION 'No account to replace yet. Create your first account instead.';
  END IF;

  IF v_username IS NOT NULL AND v_password IS NULL THEN
    RAISE EXCEPTION 'Password required when choosing a custom username';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, game_password, status, admin_notes
  )
  VALUES (
    v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', v_username, v_password, 'pending',
    CASE WHEN COALESCE(p_replace, FALSE) THEN 'account_replace' ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_account_create(TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;


-- ---------------------------------------------------------------------------
-- 035-game-load-minimum-5.sql
-- ---------------------------------------------------------------------------

-- Enforce $5 minimum for wallet â†’ game loads (and partial redeems).
-- Run in Supabase SQL Editor after game-load-split-flow.sql and redeem-wallets-and-balance-check.sql

CREATE OR REPLACE FUNCTION public.request_game_load(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_load_type TEXT,
  p_game_username TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_request_id UUID;
  v_min_load NUMERIC := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_load_type NOT IN ('new_account', 'reload', 'create_account', 'load') THEN
    RAISE EXCEPTION 'Invalid load type';
  END IF;

  IF p_load_type = 'create_account' THEN
    IF p_amount <> 0 THEN
      RAISE EXCEPTION 'Create account does not charge wallet';
    END IF;

    IF EXISTS (
      SELECT 1 FROM game_load_requests
      WHERE user_id = v_user_id AND game_slug = p_game_slug
        AND load_type = 'create_account'
        AND status IN ('pending', 'processing')
    ) THEN
      RAISE EXCEPTION 'Account creation already in progress';
    END IF;

    INSERT INTO game_load_requests (
      user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
    )
    VALUES (
      v_user_id, p_game_slug, p_game_name, 0, 'current', 'create_account', NULL, 'pending'
    )
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_amount < v_min_load THEN
    RAISE EXCEPTION 'Minimum load amount is $5';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF p_load_type IN ('reload', 'load') AND (p_game_username IS NULL OR trim(p_game_username) = '') THEN
    RAISE EXCEPTION 'Game username required for load';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    UPDATE profiles SET wallet_balance = wallet_balance - p_amount WHERE id = v_user_id;
  ELSE
    SELECT bonus_wallet INTO v_balance FROM profiles WHERE id = v_user_id FOR UPDATE;
    IF v_balance IS NULL OR v_balance < p_amount THEN
      RAISE EXCEPTION 'Insufficient bonus wallet balance';
    END IF;
    UPDATE profiles SET bonus_wallet = bonus_wallet - p_amount WHERE id = v_user_id;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (
    v_user_id,
    p_amount,
    p_wallet_type,
    'debit',
    'game_load',
    format('Load $%s to %s', p_amount, p_game_name),
    v_user_id
  );

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    p_amount,
    p_wallet_type,
    CASE WHEN p_load_type = 'reload' THEN 'load' ELSE p_load_type END,
    NULLIF(trim(p_game_username), ''),
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_load(TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_game_redeem(
  p_game_slug TEXT,
  p_game_name TEXT,
  p_amount NUMERIC,
  p_game_username TEXT,
  p_redeem_all BOOLEAN DEFAULT false,
  p_wallet_type TEXT DEFAULT 'current'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request_id UUID;
  v_min_redeem NUMERIC := 5;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_game_username IS NULL OR trim(p_game_username) = '' THEN
    RAISE EXCEPTION 'Game username required for redeem';
  END IF;

  IF p_wallet_type NOT IN ('current', 'bonus') THEN
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF NOT p_redeem_all AND (p_amount IS NULL OR p_amount <= 0) THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF NOT p_redeem_all AND p_amount < v_min_redeem THEN
    RAISE EXCEPTION 'Minimum redeem amount is $5';
  END IF;

  IF EXISTS (
    SELECT 1 FROM game_load_requests
    WHERE user_id = v_user_id AND game_slug = p_game_slug
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE EXCEPTION 'A request is already in progress for this game';
  END IF;

  INSERT INTO game_load_requests (
    user_id, game_slug, game_name, amount, wallet_type, load_type, game_username, redeem_all, status
  )
  VALUES (
    v_user_id,
    p_game_slug,
    p_game_name,
    CASE WHEN p_redeem_all THEN 0 ELSE p_amount END,
    p_wallet_type,
    'redeem',
    NULLIF(trim(p_game_username), ''),
    p_redeem_all,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_game_redeem(TEXT, TEXT, NUMERIC, TEXT, BOOLEAN, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 036-profiles-realtime.sql
-- ---------------------------------------------------------------------------

-- Live wallet updates for users (sidebar + game pages).
-- Without this, only a full page refresh shows new balances after admin grants or game loads.
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;

-- Send full row on UPDATE so wallet columns arrive in realtime payloads.
ALTER TABLE public.profiles REPLICA IDENTITY FULL;


-- ---------------------------------------------------------------------------
-- 037-anti-spam-multi-account.sql
-- ---------------------------------------------------------------------------

-- Spinora multi-account + freeplay abuse protection
-- Run in Supabase SQL Editor AFTER schema.sql / profiles exist.
--
-- Policy:
--   â€¢ 3+ accounts on same device â†’ block new signup
--   â€¢ 3+ signups from same IP in 7 days â†’ block new signup
--   â€¢ 2nd account on same device â†’ signup allowed but freeplay blocked (spin + daily task cash)
--   â€¢ Phone uniqueness stays in app (profiles.phone)
DO $$ BEGIN
  CREATE TYPE public.security_action AS ENUM (
    'signup',
    'login',
    'spin',
    'task_claim',
    'deposit',
    'withdraw'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  action public.security_action NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_logs_ip_created ON public.ip_logs (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_created ON public.ip_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_logs_signup_ip ON public.ip_logs (ip_address, created_at DESC)
  WHERE action = 'signup';

CREATE TABLE IF NOT EXISTS public.device_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_device_map_device ON public.device_map (device_id);
CREATE INDEX IF NOT EXISTS idx_device_map_user ON public.device_map (user_id);

CREATE TABLE IF NOT EXISTS public.fraud_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked BOOLEAN NOT NULL DEFAULT false,
  rewards_blocked BOOLEAN NOT NULL DEFAULT false,
  manual_review BOOLEAN NOT NULL DEFAULT false,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_scores_rewards_blocked
  ON public.fraud_scores (rewards_blocked) WHERE rewards_blocked = true;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY,
  action public.security_action NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.parse_client_ip(p_ip TEXT)
RETURNS INET
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := trim(split_part(COALESCE(p_ip, ''), ',', 1));
  IF v = '' THEN RETURN NULL; END IF;
  BEGIN
    RETURN v::inet;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key TEXT,
  p_action public.security_action,
  p_max_attempts INT,
  p_window_seconds INT,
  p_block_seconds INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_row FROM public.rate_limits WHERE bucket_key = p_bucket_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (bucket_key, action, attempt_count, window_start)
    VALUES (p_bucket_key, p_action, 1, v_now);
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'cooldown');
  END IF;

  IF v_row.window_start + make_interval(secs => p_window_seconds) < v_now THEN
    UPDATE public.rate_limits
    SET attempt_count = 1, window_start = v_now, blocked_until = NULL, updated_at = v_now
    WHERE bucket_key = p_bucket_key;
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    IF p_block_seconds > 0 THEN
      UPDATE public.rate_limits
      SET blocked_until = v_now + make_interval(secs => p_block_seconds), updated_at = v_now
      WHERE bucket_key = p_bucket_key;
    END IF;
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit');
  END IF;

  UPDATE public.rate_limits
  SET attempt_count = attempt_count + 1, updated_at = v_now
  WHERE bucket_key = p_bucket_key;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Count distinct accounts linked to a device
CREATE OR REPLACE FUNCTION public.device_account_count(p_device_id TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::INT
  FROM public.device_map
  WHERE device_id = p_device_id AND length(device_id) >= 16;
$$;

-- Signups from IP in last N days
CREATE OR REPLACE FUNCTION public.ip_signup_count(p_ip INET, p_days INT DEFAULT 7)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::INT
  FROM public.ip_logs
  WHERE action = 'signup'
    AND ip_address = p_ip
    AND user_id IS NOT NULL
    AND created_at > NOW() - make_interval(days => p_days);
$$;

-- Called from Next.js BEFORE sending OTP / creating auth user
CREATE OR REPLACE FUNCTION public.check_signup_allowed(
  p_ip TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET := public.parse_client_ip(p_ip);
  v_rl JSONB;
  v_device_users INT := 0;
  v_ip_signups INT := 0;
BEGIN
  IF v_ip IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  END IF;

  v_rl := public.check_rate_limit('signup:ip:' || host(v_ip), 'signup', 5, 86400, 3600);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'too_many_attempts',
      'message', 'Too many signup attempts from this network. Try again later.'
    );
  END IF;

  IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
    v_rl := public.check_rate_limit('signup:device:' || p_device_id, 'signup', 3, 86400, 7200);
    IF NOT (v_rl->>'allowed')::boolean THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'too_many_attempts',
        'message', 'Too many signup attempts from this device. Try again later.'
      );
    END IF;

    v_device_users := public.device_account_count(p_device_id);
    IF v_device_users >= 2 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'multi_account_device',
        'message', 'Only one Spinora account is allowed per device. Sign in to your existing account.'
      );
    END IF;
  END IF;

  v_ip_signups := public.ip_signup_count(v_ip, 7);
  IF v_ip_signups >= 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'multi_account_ip',
      'message', 'Too many accounts were created from this network recently. Contact support if you need help.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'secondary_device_account', COALESCE(v_device_users, 0) >= 1
  );
END;
$$;

-- Link device + IP after successful signup (profile must exist)
CREATE OR REPLACE FUNCTION public.link_user_signup(
  p_user_id UUID,
  p_ip TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET := public.parse_client_ip(p_ip);
  v_device_users INT := 0;
  v_flags JSONB := '[]'::jsonb;
  v_rewards_blocked BOOLEAN := false;
  v_risk SMALLINT := 0;
BEGIN
  IF p_user_id IS NULL OR v_ip IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  INSERT INTO public.fraud_scores (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.ip_logs
    WHERE user_id = p_user_id AND action = 'signup'
  ) THEN
    IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
      INSERT INTO public.device_map (device_id, user_id, user_agent, last_seen_at)
      VALUES (p_device_id, p_user_id, p_user_agent, NOW())
      ON CONFLICT (device_id, user_id)
      DO UPDATE SET last_seen_at = NOW(), user_agent = EXCLUDED.user_agent;
    END IF;
    RETURN jsonb_build_object('ok', true, 'already_linked', true);
  END IF;

  INSERT INTO public.ip_logs (user_id, ip_address, action, device_id, user_agent)
  VALUES (p_user_id, v_ip, 'signup', p_device_id, p_user_agent);

  IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
    INSERT INTO public.device_map (device_id, user_id, user_agent, last_seen_at)
    VALUES (p_device_id, p_user_id, p_user_agent, NOW())
    ON CONFLICT (device_id, user_id)
    DO UPDATE SET last_seen_at = NOW(), user_agent = EXCLUDED.user_agent;

    v_device_users := public.device_account_count(p_device_id);
    IF v_device_users >= 2 THEN
      v_rewards_blocked := true;
      v_flags := v_flags || jsonb_build_array('shared_device_multi_account');
      v_risk := 60;
    ELSIF v_device_users >= 1 THEN
      -- Should not happen if check_signup_allowed ran first; still flag
      v_rewards_blocked := true;
      v_flags := v_flags || jsonb_build_array('secondary_device_account');
      v_risk := 45;
    END IF;
  END IF;

  IF public.ip_signup_count(v_ip, 7) >= 2 THEN
    v_rewards_blocked := true;
    v_flags := v_flags || jsonb_build_array('shared_ip_multi_account');
    v_risk := GREATEST(v_risk, 50);
  END IF;

  UPDATE public.fraud_scores
  SET
    risk_score = GREATEST(risk_score, v_risk),
    flags = fraud_scores.flags || v_flags,
    rewards_blocked = rewards_blocked OR v_rewards_blocked,
    manual_review = manual_review OR v_rewards_blocked,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF p_device_id IS NOT NULL AND public.device_account_count(p_device_id) >= 3 THEN
    UPDATE public.profiles SET is_suspended = true WHERE id = p_user_id;
    UPDATE public.fraud_scores
    SET blocked = true, risk_score = GREATEST(risk_score, 90)
    WHERE user_id = p_user_id;
    v_rewards_blocked := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rewards_blocked', v_rewards_blocked,
    'risk_score', v_risk
  );
END;
$$;

-- Block daily spin + task cash claims for flagged / multi-account users
CREATE OR REPLACE FUNCTION public.assert_freeplay_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suspended BOOLEAN;
  v_blocked BOOLEAN;
  v_rewards_blocked BOOLEAN;
  v_risk SMALLINT;
BEGIN
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_suspended, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'suspended',
      'message', 'Your account is suspended. Contact support.'
    );
  END IF;

  SELECT blocked, rewards_blocked, risk_score
  INTO v_blocked, v_rewards_blocked, v_risk
  FROM public.fraud_scores
  WHERE user_id = p_user_id;

  IF COALESCE(v_blocked, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'This account cannot claim free rewards. Contact support.'
    );
  END IF;

  IF COALESCE(v_rewards_blocked, false) OR COALESCE(v_risk, 0) >= 50 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rewards_blocked',
      'message', 'Free spin and daily task rewards are not available on this account. Make a deposit or contact support.'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Auto-init fraud row when profile is created
CREATE OR REPLACE FUNCTION public.init_fraud_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fraud_scores (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS init_fraud_score_trigger ON public.profiles;
CREATE TRIGGER init_fraud_score_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_fraud_score();

-- ---------------------------------------------------------------------------
-- RLS â€” users cannot write security data; admins can read
-- ---------------------------------------------------------------------------

ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own fraud score" ON public.fraud_scores;
CREATE POLICY "Users read own fraud score"
  ON public.fraud_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read fraud_scores" ON public.fraud_scores;
CREATE POLICY "Admins read fraud_scores"
  ON public.fraud_scores FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update fraud_scores" ON public.fraud_scores;
CREATE POLICY "Admins update fraud_scores"
  ON public.fraud_scores FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read ip_logs" ON public.ip_logs;
CREATE POLICY "Admins read ip_logs"
  ON public.ip_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read device_map" ON public.device_map;
CREATE POLICY "Admins read device_map"
  ON public.device_map FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read rate_limits" ON public.rate_limits;
CREATE POLICY "Admins read rate_limits"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT EXECUTE ON FUNCTION public.check_signup_allowed TO service_role;
GRANT EXECUTE ON FUNCTION public.link_user_signup TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_freeplay_allowed TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;


-- ---------------------------------------------------------------------------
-- 038-fix-signup.sql
-- ---------------------------------------------------------------------------

-- FIX: "Database error saving new user"
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/drpitkvjcwrbzzufwwjt/sql/new

-- 1. Recreate the signup trigger function (with correct Supabase settings)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles
    SET vip_points = vip_points + 100
    WHERE id = referrer;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

-- 2. Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Grants required for auth to run the trigger
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT ALL ON public.referrals TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;

-- 4. Allow the trigger to insert profiles (RLS was blocking signup)
DROP POLICY IF EXISTS "Service can insert profiles on signup" ON public.profiles;
CREATE POLICY "Service can insert profiles on signup"
  ON public.profiles
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can insert referrals on signup" ON public.referrals;
CREATE POLICY "Service can insert referrals on signup"
  ON public.referrals
  FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);


-- ---------------------------------------------------------------------------
-- 039-blog-posts.sql
-- ---------------------------------------------------------------------------

-- Casinova Â· blog_posts (CMS blog for /blog and /blog/[slug])
-- Safe on fresh or existing DBs.

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title           TEXT NOT NULL,
  excerpt         TEXT NOT NULL DEFAULT '',
  content         TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  author_id       UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  is_published    BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  seo_title       TEXT,
  seo_description TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_blog_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_blog_posts_updated_at
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
EXCEPTION
  WHEN undefined_function THEN
    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS TRIGGER AS $fn$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $fn$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_blog_posts_updated_at
      BEFORE UPDATE ON public.blog_posts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
END $$;

CREATE INDEX IF NOT EXISTS idx_blog_published
  ON public.blog_posts (published_at DESC)
  WHERE is_published;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published blog posts" ON public.blog_posts;
CREATE POLICY "Public can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Admins manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins manage blog posts"
  ON public.blog_posts FOR ALL
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

-- Seed starter guides (idempotent)
INSERT INTO public.blog_posts (
  slug, title, excerpt, content, cover_image_url, tags,
  is_published, published_at, seo_title, seo_description
) VALUES
(
  'welcome-to-casinova',
  'Welcome to Casinova â€” How to Get Started',
  'Create your account, request a game desk, deposit, and start playing with VIP rewards.',
  '<p>Casinova is your premium gaming desk for Juwa, Game Vault, fish tables, and more.</p><h2>1. Create an account</h2><p>Register with email, confirm if required, then complete your profile.</p><h2>2. Request a game account</h2><p>Open any live game page and create or load your platform account from the wallet panel.</p><h2>3. Deposit &amp; play</h2><p>Submit a deposit request, wait for approval, then load credits into your game.</p><h2>4. Earn VIP</h2><p>Points unlock Silver, Gold, and Platinum perks with better support and bonuses.</p>',
  'https://images.pexels.com/photos/8817671/pexels-photo-8817671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  ARRAY['getting started', 'casinova guide'],
  true,
  NOW() - INTERVAL '3 days',
  'Welcome to Casinova â€” Getting Started Guide',
  'How to register, create game accounts, deposit, and earn VIP rewards at Casinova Gaming.'
),
(
  'how-to-deposit-casinova',
  'How to Deposit at Casinova',
  'Step-by-step deposit flow â€” request, proof, approval, and wallet credit.',
  '<p>Deposits are reviewed by our team for speed and security.</p><ol><li>Go to Dashboard â†’ Deposit</li><li>Choose amount and payment method</li><li>Upload proof if required</li><li>Wait for approval â€” funds credit to your deposit wallet</li><li>Load credits into your game desk</li></ol><p>Need help? Open Live Chat or Contact Support anytime.</p>',
  'https://images.pexels.com/photos/5437587/pexels-photo-5437587.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  ARRAY['deposit', 'payments'],
  true,
  NOW() - INTERVAL '2 days',
  'How to Deposit at Casinova Gaming',
  'Casinova deposit guide: submit a request, upload proof, get approved, and load your game wallet.'
),
(
  'casinova-vip-rewards-explained',
  'Casinova VIP Rewards Explained',
  'Bronze to Platinum â€” how VIP points work and what each tier unlocks.',
  '<p>VIP points come from play, referrals, and promotions.</p><ul><li><strong>Bronze</strong> â€” starter perks</li><li><strong>Silver (500+)</strong> â€” priority support</li><li><strong>Gold (2000+)</strong> â€” stronger bonuses</li><li><strong>Platinum (5000+)</strong> â€” top-tier handling</li></ul><p>Check your progress anytime under Dashboard â†’ VIP Status.</p>',
  'https://images.pexels.com/photos/7584353/pexels-photo-7584353.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  ARRAY['vip', 'rewards'],
  true,
  NOW() - INTERVAL '1 day',
  'Casinova VIP Tiers & Rewards Explained',
  'Learn how Casinova VIP points work and what Silver, Gold, and Platinum unlock.'
)
ON CONFLICT (slug) DO NOTHING;

-- AFTER: UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';
