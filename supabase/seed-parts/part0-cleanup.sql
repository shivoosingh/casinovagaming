-- Part 0: cleanup that runs BEFORE the 30 upserts.
-- Everything here is idempotent. Re-running changes nothing the second time.

-- 0.1 Stop the Telegram auto-post cron from broadcasting legacy rows one by one.
--     (269 rows had telegram_sent = false on 2026-10-27.) Broadcast chosen posts manually later.
UPDATE public.blog_posts
SET telegram_sent = true
WHERE telegram_sent = false;

-- 0.2 Archive the templated AI posts (7 title templates x 12 games, random 4-digit suffix).
--     176 rows on 2026-10-27, including 3 drafts. None of the hand-written slugs end in -dddd.
--     The sync trigger flips is_published to false; RLS then hides them from /blog and the sitemap.
UPDATE public.blog_posts
SET status = 'archived'
WHERE slug ~ '-[0-9]{4}$'
  AND status <> 'archived';

-- 0.3 Archive by explicit slug, grouped by reason.
UPDATE public.blog_posts
SET status = 'archived'
WHERE status <> 'archived'
  AND slug IN (
    -- Geo "fish table games {state/city}" posts: doorway pattern + legality implication.
    'fish-table-games-arizona',
    'fish-table-games-atlanta-georgia',
    'fish-table-games-california',
    'fish-table-games-chicago-illinois',
    'fish-table-games-florida',
    'fish-table-games-georgia',
    'fish-table-games-houston-texas',
    'fish-table-games-illinois',
    'fish-table-games-los-angeles',
    'fish-table-games-michigan',
    'fish-table-games-nevada',
    'fish-table-games-new-york',
    'fish-table-games-north-carolina',
    'fish-table-games-ohio',
    'fish-table-games-online-texas',
    'fish-table-games-pennsylvania',
    'sweepstakes-games-available-all-states',   -- claims "legal in all 50 states"
    'sweepstakes-games-us-nationwide',          -- stub, same claim
    -- Payment methods that are not offered (card via payment partner is the only live method).
    'how-to-deposit-cashapp-fish-table',
    'how-to-deposit-zelle-fish-table',
    'how-to-deposit-bitcoin-fish-table',
    'crypto-deposits-fish-table',
    'casinovasgaming-payment-methods-compared',  -- 301 -> wallet-deposit-guide-casinovasgaming
    'how-to-deposit-casinova',                   -- 350-char starter; 301 -> wallet-deposit-guide-casinovasgaming
    -- Consolidated into a rewritten post (301 targets in src/lib/seo/retired-posts.ts).
    '50-percent-first-deposit-bonus-explained',  -- wrong number; 301 -> maximize-fish-table-bonus
    'how-cash-out-works-casinovasgaming',        -- 301 -> how-to-redeem-winnings-fast
    'refer-friends-earn-coins',                  -- 301 -> referral-program-earn-coins
    'daily-rewards-free-coins-guide',            -- 301 -> daily-rewards-coins-guide
    'vip-program-guide-casinovasgaming',         -- 301 -> casinovasgaming-vip-tiers-explained
    'casinova-vip-rewards-explained',            -- 368-char starter; 301 -> casinovasgaming-vip-tiers-explained
    'juwa-tips-and-strategies',                  -- 301 -> how-to-win-at-juwa
    'juwa-advanced-tips-strategies',             -- 301 -> how-to-win-at-juwa
    'vblink-cash-frenzy-guide',                  -- Vblink is coming soon; 301 -> cash-frenzy-guide-tips
    -- Coming-soon game stubs (under 200 chars). 301 -> fire-kirin-orion-stars-alternatives
    'fire-kirin-tips-and-tricks',
    'orion-stars-tips-strategies',
    'panda-master-tips-strategies',
    'milky-way-advanced-strategies',
    'vblink-game-guide',
    'orion-stars-vs-fire-kirin',
    'fire-kirin-vs-game-vault',
    'game-vault-vs-orion-stars',
    -- Stub with no honest redirect target (404).
    'how-to-win-at-sweepstakes-slots'
  );

-- 0.4 Coming-soon notice on the longer kept posts about games that cannot be loaded yet.
--     Bodies are markdown, so the notice is markdown too (the runtime converter renders both).
--     Guarded so a re-run does not add a second notice.
UPDATE public.blog_posts
SET content = '**Note:** Fire Kirin is coming soon at Casinova Gaming and cannot be loaded yet. Until it goes live, you can play [Juwa](/games/juwa), [Game Vault](/games/game-vault), [MR All In One](/games/mr-all-in-one) and [Vegas Sweeps](/games/vegas-sweeps) today. See [what to play while you wait](/blog/fire-kirin-orion-stars-alternatives).' || E'\n\n' || content
WHERE slug IN ('fire-kirin-online', 'how-to-win-at-fire-kirin', 'how-to-create-fire-kirin-account-online', 'fire-kirin-advanced-tips', 'fire-kirin-vs-juwa-vs-orion-stars')
  AND content NOT LIKE '%coming soon at Casinova%';

UPDATE public.blog_posts
SET content = '**Note:** Orion Stars is coming soon at Casinova Gaming and cannot be loaded yet. Until it goes live, you can play [Juwa](/games/juwa), [Game Vault](/games/game-vault), [Gameroom](/games/gameroom) and [Vegas Sweeps](/games/vegas-sweeps) today. See [what to play while you wait](/blog/fire-kirin-orion-stars-alternatives).' || E'\n\n' || content
WHERE slug IN ('orion-stars-online', 'how-to-win-at-orion-stars', 'how-to-create-orion-stars-account', 'orion-stars-advanced-guide', 'gameroom-vs-orion-stars')
  AND content NOT LIKE '%coming soon at Casinova%';

UPDATE public.blog_posts
SET content = '**Note:** Panda Master and Ultrapanda are coming soon at Casinova Gaming and cannot be loaded yet. Until they go live, you can play [Juwa](/games/juwa), [Game Vault](/games/game-vault) and [MR All In One](/games/mr-all-in-one) today. See [what to play while you wait](/blog/fire-kirin-orion-stars-alternatives).' || E'\n\n' || content
WHERE slug IN ('panda-master-online-guide', 'panda-master-vs-ultrapanda', 'ultrapanda-game-guide')
  AND content NOT LIKE '%coming soon at Casinova%';

UPDATE public.blog_posts
SET content = '**Note:** Milky Way and Vblink are coming soon at Casinova Gaming and cannot be loaded yet. Until they go live, you can play [Cash Frenzy](/games/cash-frenzy), [Cash Machine](/games/cash-machine), [Vegas Sweeps](/games/vegas-sweeps) and [Game Vault](/games/game-vault) today. See [what to play while you wait](/blog/fire-kirin-orion-stars-alternatives).' || E'\n\n' || content
WHERE slug IN ('milky-way-fish-table-guide', 'vblink-vs-milky-way')
  AND content NOT LIKE '%coming soon at Casinova%';
