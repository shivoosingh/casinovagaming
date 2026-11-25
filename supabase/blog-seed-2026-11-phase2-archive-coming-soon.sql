-- ============================================================================
-- Casinova Gaming blog: phase 2, archive ten posts about coming-soon games.
--
-- These posts tell readers to create an account, deposit or use strategies for
-- games that cannot be loaded at Casinova. Each game keeps one honest status
-- page, and src/lib/seo/retired-posts.ts 301s these slugs to it.
--
-- Run AFTER blog-seed-2026-11-phase2.sql (which rewrites the redirect targets)
-- and together with the code deploy (which carries the redirects).
-- Idempotent and reversible: archiving is a status change, nothing is deleted.
-- To undo: UPDATE public.blog_posts SET status = 'published' WHERE slug IN (...);
-- ============================================================================

BEGIN;

UPDATE public.blog_posts
SET status = 'archived'
WHERE status <> 'archived'
  AND slug IN (
    'how-to-win-at-fire-kirin',                 -- 301 -> fire-kirin-online
    'how-to-create-fire-kirin-account-online',  -- 301 -> fire-kirin-online
    'fire-kirin-advanced-tips',                 -- 301 -> fire-kirin-online
    'how-to-win-at-orion-stars',                -- 301 -> orion-stars-online
    'how-to-create-orion-stars-account',        -- 301 -> orion-stars-online
    'orion-stars-advanced-guide',               -- 301 -> orion-stars-online
    'gameroom-vs-orion-stars',                  -- 301 -> orion-stars-online
    'panda-master-vs-ultrapanda',               -- 301 -> panda-master-online-guide
    'vblink-vs-milky-way',                      -- 301 -> milky-way-fish-table-guide
    'fire-kirin-vs-juwa-vs-orion-stars'         -- 301 -> fire-kirin-orion-stars-alternatives
  );

COMMIT;
