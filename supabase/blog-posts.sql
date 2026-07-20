-- Casinova · blog_posts (CMS blog for /blog and /blog/[slug])
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
  'Welcome to Casinova — How to Get Started',
  'Create your account, request a game desk, deposit, and start playing with VIP rewards.',
  '<p>Casinova is your premium gaming desk for Juwa, Game Vault, fish tables, and more.</p><h2>1. Create an account</h2><p>Register with email, confirm if required, then complete your profile.</p><h2>2. Request a game account</h2><p>Open any live game page and create or load your platform account from the wallet panel.</p><h2>3. Deposit &amp; play</h2><p>Submit a deposit request, wait for approval, then load credits into your game.</p><h2>4. Earn VIP</h2><p>Points unlock Silver, Gold, and Platinum perks with better support and bonuses.</p>',
  'https://images.pexels.com/photos/8817671/pexels-photo-8817671.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  ARRAY['getting started', 'casinova guide'],
  true,
  NOW() - INTERVAL '3 days',
  'Welcome to Casinova — Getting Started Guide',
  'How to register, create game accounts, deposit, and earn VIP rewards at Casinova Gaming.'
),
(
  'how-to-deposit-casinova',
  'How to Deposit at Casinova',
  'Step-by-step deposit flow — request, proof, approval, and wallet credit.',
  '<p>Deposits are reviewed by our team for speed and security.</p><ol><li>Go to Dashboard → Deposit</li><li>Choose amount and payment method</li><li>Upload proof if required</li><li>Wait for approval — funds credit to your deposit wallet</li><li>Load credits into your game desk</li></ol><p>Need help? Open Live Chat or Contact Support anytime.</p>',
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
  'Bronze to Platinum — how VIP points work and what each tier unlocks.',
  '<p>VIP points come from play, referrals, and promotions.</p><ul><li><strong>Bronze</strong> — starter perks</li><li><strong>Silver (500+)</strong> — priority support</li><li><strong>Gold (2000+)</strong> — stronger bonuses</li><li><strong>Platinum (5000+)</strong> — top-tier handling</li></ul><p>Check your progress anytime under Dashboard → VIP Status.</p>',
  'https://images.pexels.com/photos/7584353/pexels-photo-7584353.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  ARRAY['vip', 'rewards'],
  true,
  NOW() - INTERVAL '1 day',
  'Casinova VIP Tiers & Rewards Explained',
  'Learn how Casinova VIP points work and what Silver, Gold, and Platinum unlock.'
)
ON CONFLICT (slug) DO NOTHING;
