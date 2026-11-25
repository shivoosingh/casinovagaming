-- ============================================================================
-- Casinova Gaming blog: expansion batch 1 (3 posts). Generated 2026-11-02.
-- Paste into the Supabase SQL Editor and run once. Idempotent (ON CONFLICT upsert).
--
-- These three fix live internal-link 404s referenced by the 30-post seed:
--   is-casinovasgaming-legit, what-are-sweepstakes-games, gameroom-game-guide.
-- Facts come from code (deposit-load-bonus.ts, games.ts): 100%/50% match,
-- $5-$500 loads, 3x redeem threshold / 8x cap, card-only deposits, 18+.
-- No legality claims, no guaranteed wins, no fabricated RTP/odds.
-- Internal links point only to already-published slugs or these three.
-- ============================================================================

BEGIN;

-- 1) is-casinovasgaming-legit ------------------------------------------------
INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'is-casinovasgaming-legit',
  'Is Casinova Gaming Legit? What to Check Before You Deposit',
  'Casinova Gaming is a real sweepstakes gaming platform: card deposits run through a payment partner, redeems need approved ID and are reviewed by staff, and support answers in live chat. It is not a licensed casino and does not claim to be legal in any particular place. Here is exactly how to judge it for yourself.',
  $t$<p>Casinova Gaming is a real sweepstakes gaming platform: card deposits run through a payment partner, redeems need approved ID and are reviewed by staff, and support answers in live chat. It is not a licensed casino, and it does not claim to be legal in any particular place. Below is exactly what you can verify before you spend anything.</p>

<h2>What "legit" means for a sweepstakes app</h2>
<p>There is a difference between <em>real</em> and <em>licensed</em>. Casinova runs under a sweepstakes model, not as a licensed casino, which is why availability varies by jurisdiction and why we never tell you it is legal where you live. What you can check is whether the platform is transparent, has real support, verifies identity before paying out, and keeps your card details off its own servers. Casinova does all four, and you can confirm each one yourself.</p>

<h2>Signs you can verify on Casinova</h2>
<ul>
<li><strong>Card details are handled by a payment partner, not stored by us.</strong> When you deposit, checkout opens on the partner's page. Casinova never sees or stores your card number. See the <a href="/blog/wallet-deposit-guide-casinovasgaming">deposit guide</a>.</li>
<li><strong>Identity is verified before a redeem.</strong> Every redeem needs an approved government ID and is reviewed by a person. That is a cost to the operator and a protection for you. See <a href="/blog/casinova-id-verification-guide">ID verification</a>.</li>
<li><strong>The money rules are published and fixed.</strong> Loads are $5 to $500, the first deposit is matched 100% and the second 50%, and a redeem opens at 3x the load with an 8x cap. Nothing is hidden in the small print. See <a href="/blog/how-to-redeem-winnings-fast">how redeem works</a>.</li>
<li><strong>Support is reachable.</strong> Live chat is on every page, and there is a <a href="/support">Support</a> page. A platform that answers is one you can hold to account.</li>
</ul>

<h2>Honest limits — what Casinova does not do</h2>
<ul>
<li><strong>No guaranteed wins.</strong> Outcomes are set by each game's software. No guide, including ours, can promise a result.</li>
<li><strong>No published RTP or odds.</strong> The game providers do not publish payout percentages. Any RTP figure you see quoted for these apps is invented. See <a href="/blog/are-online-fish-table-games-safe">are these games safe</a>.</li>
<li><strong>No legality claim.</strong> We do not say sweepstakes play is legal in your state. That is yours to check.</li>
<li><strong>Card only.</strong> Deposits are by card through the partner. Cash App, Zelle, Venmo, PayPal and crypto are not offered, so anyone asking for those in Casinova's name is not us.</li>
</ul>

<h2>How to protect yourself with any gaming app</h2>
<p>Start with the smallest load ($5) the first time, confirm a deposit shows in your wallet before loading, and complete ID verification early so a later redeem is not held up. Only deposit what you are comfortable losing, and if play stops being fun, step away. Our <a href="/blog/best-fish-table-games-beginners">beginner guide</a> and the <a href="/blog/fish-table-glossary">glossary</a> cover the basics.</p>

<h2>FAQ</h2>
<h3>Is Casinova Gaming a licensed casino?</h3>
<p>No. It runs under a sweepstakes model, not a casino license. Availability varies by jurisdiction and we make no legality claim.</p>
<h3>Will I definitely get paid if I redeem?</h3>
<p>A redeem that meets the rules (3x the load to open, 8x cap, approved ID) is reviewed and processed by staff. There is no guaranteed payout time, and the review is a real step, not a formality.</p>
<h3>How do I know a message is really from Casinova?</h3>
<p>Official contact is live chat on the site and the <a href="/support">Support</a> page. Casinova never asks for Cash App, Zelle or crypto, and never asks for your full card number.</p>

<p><a href="/register?src=blog_is-casinovasgaming-legit&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=is-casinovasgaming-legit">Create a free account</a> and check the deposit, ID and redeem screens yourself before you spend a dollar.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['trust','is it legit','sweepstakes','safety']::text[],
  'published', true, true,
  now() - interval '3 hours',
  'Is Casinova Gaming Legit? What to Check First | Casinova Gaming',
  'Is Casinova Gaming legit? How to verify it yourself: card handled by a payment partner, ID-reviewed redeems, fixed money rules, real support. Not a licensed casino.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

-- 2) what-are-sweepstakes-games ----------------------------------------------
INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'what-are-sweepstakes-games',
  'What Are Sweepstakes Games? A Plain Explanation',
  'Sweepstakes games are online games played under a sweepstakes model rather than as licensed casino gambling. You add money to a platform wallet, load credits into a game, and can redeem a balance back after review. At Casinova that means card deposits, one wallet, and 8 live games. Here is how the model actually works.',
  $t$<p>Sweepstakes games are online games played under a sweepstakes model rather than as licensed casino gambling. You add money to a platform wallet, load credits into a game, and can redeem a balance back after review. At Casinova Gaming that means card deposits, one wallet, and eight live games. Here is how the model actually works, without the jargon.</p>

<h2>The idea in one paragraph</h2>
<p>A licensed casino is regulated as gambling. A sweepstakes platform operates under a different legal model, which is why these apps exist outside the usual casino framework and why availability depends on where you are. The games look and feel like slots, fish tables and arcade shooters, but the platform around them (the wallet, the loads, the redeems) is sweepstakes-style. We do not claim this is legal in any specific place; that depends on your jurisdiction.</p>

<h2>How the model works at Casinova, step by step</h2>
<ol>
<li><strong>One wallet.</strong> You deposit by card and the money lands in your Total Deposit wallet. See the <a href="/blog/wallet-deposit-guide-casinovasgaming">deposit guide</a>.</li>
<li><strong>Load a game.</strong> You move credits from the wallet into a game such as <a href="/games/juwa">Juwa</a> or <a href="/games/game-vault">Game Vault</a>. Loads are $5 to $500. See <a href="/blog/how-to-load-credits-from-wallet">how to load</a>.</li>
<li><strong>Bonus on load.</strong> Your first deposit is matched 100% and your second 50%, applied when you load. See the <a href="/blog/maximize-fish-table-bonus">bonus guide</a>.</li>
<li><strong>Play.</strong> Credits become your in-game balance in the provider's app or web player.</li>
<li><strong>Redeem.</strong> A balance at 3x the load (8x cap) can be redeemed back after an ID-checked review. See <a href="/blog/how-to-redeem-winnings-fast">how to redeem</a>.</li>
</ol>

<h2>What sweepstakes games are not</h2>
<ul>
<li><strong>Not a licensed casino.</strong> Different legal model; no casino license, no legality claim from us.</li>
<li><strong>Not "provably fair" with published odds.</strong> The game providers do not publish RTP or odds. Treat any quoted figure as invented.</li>
<li><strong>Not free play.</strong> Casinova has no no-deposit credits; the smallest real load is $5.</li>
</ul>

<h2>Common terms you will meet</h2>
<p>Bet per shot, boss, room, Total Deposit wallet, redeem threshold. The <a href="/blog/fish-table-glossary">glossary</a> defines each, and <a href="/blog/what-is-a-fish-table-game">what a fish table game is</a> explains the most popular format in two minutes.</p>

<h2>Why the model exists</h2>
<p>Licensed online casinos are available in only a handful of US states, and getting licensed is slow and expensive. The sweepstakes model is a different legal route that lets game studios reach players where a full casino licence is not practical. The practical effect for you is that the games feel familiar, but the platform rules (wallet, loads, redeems, ID review) replace the regulated-casino framework. It also means your protections and recourse are whatever the operator offers, which is why checking the operator matters more here than at a licensed site. Our <a href="/blog/is-casinovasgaming-legit">how to judge whether a platform is legit</a> guide covers what to look for.</p>

<h2>How it differs from a licensed casino</h2>
<ul>
<li><strong>Legal basis:</strong> sweepstakes rules, not a casino licence.</li>
<li><strong>Availability:</strong> varies by jurisdiction; a licensed casino is tied to specific regulated states.</li>
<li><strong>Payouts:</strong> redeems are reviewed by the operator rather than overseen by a state regulator.</li>
<li><strong>Transparency:</strong> providers do not publish RTP or odds, where regulated casinos often must.</li>
</ul>
<p>None of this makes sweepstakes play automatically good or bad. It makes choosing a transparent operator the most important decision you make.</p>

<h2>FAQ</h2>
<h3>Are sweepstakes games the same as a casino?</h3>
<p>No. They run under a sweepstakes model, not a casino license. The games feel similar; the legal framework is different.</p>
<h3>Can I lose money?</h3>
<p>Yes. You load real money, and outcomes are set by the game software. Only load what you are comfortable losing, and read <a href="/blog/are-online-fish-table-games-safe">are these games safe</a> first.</p>
<h3>Which games can I actually play now?</h3>
<p>Eight are live, including Juwa, Game Vault, Vegas Sweeps and Gameroom. Some well-known fish apps are listed as coming soon and cannot be loaded yet.</p>

<p><a href="/register?src=blog_what-are-sweepstakes-games&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=what-are-sweepstakes-games">Create a free account</a> and try one live game with a first deposit matched 100%.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['sweepstakes','explainer','how it works','getting started']::text[],
  'published', true, true,
  now() - interval '4 hours',
  'What Are Sweepstakes Games? Plain Explanation | Casinova Gaming',
  'What are sweepstakes games? Online games played under a sweepstakes model, not a casino license. How the wallet, loads, bonus and redeem work at Casinova.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

-- 3) gameroom-game-guide -----------------------------------------------------
INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'gameroom-game-guide',
  'Gameroom Guide: Slots, Fish and Keno in One Arcade Lobby',
  'Gameroom is a live game at Casinova Gaming: a classic arcade-style lobby with slots, fish tables and keno under one login. It runs on the same terms as every Casinova game ($5 to $500 loads, 100% first-deposit and 50% second match, 3x redeem). Here is how to start and what the lobby is like.',
  $t$<p>Gameroom is a live game at Casinova Gaming: a classic arcade-style lobby with slots, fish tables and keno under one login. It runs on the same terms as every other Casinova game, so if you have loaded one you already know the money flow. This guide covers what Gameroom is, how to start, and who it suits.</p>

<h2>What Gameroom is</h2>
<p>Gameroom is a compact, Vegas-style arcade lobby, sometimes shown as "Gameroom 777" in the provider's branding. The "777" is part of the app name, not a payout or a version to hunt for. Inside you get three types of play in one place: slots, fish tables and keno. Compared with a large catalog like <a href="/games/game-vault">Game Vault</a>, Gameroom is smaller and easier to learn, and it gives fish tables more prominence. The full side-by-side is in <a href="/blog/gameroom-vs-game-vault">Gameroom vs Game Vault</a>.</p>

<h2>How to start on Gameroom</h2>
<ol>
<li><strong>Create a free Casinova account</strong> and verify your email.</li>
<li><strong>Request a Gameroom login</strong> from the <a href="/games/gameroom">Gameroom game page</a> by tapping Create Account. The team issues your game login, usually within 24 hours.</li>
<li><strong>Deposit by card</strong> and <strong>load $5 to $500</strong> into Gameroom. Your first deposit is matched 100% and your second 50% on load. See the <a href="/blog/how-to-load-credits-from-wallet">load guide</a>.</li>
<li><strong>Play</strong> slots, fish or keno in the provider's app or web player.</li>
<li><strong>Redeem</strong> once your balance reaches 3x the load (8x cap), after an ID-checked review. See <a href="/blog/how-to-redeem-winnings-fast">how to redeem</a>.</li>
</ol>

<h2>What the lobby is like</h2>
<p>Gameroom is the pick if you want an arcade feel and a lobby you can learn in one evening. By your second session you will recognize most machines and know which fish rooms match your bet per shot. The trade-off versus a deep catalog is that when a session goes cold there are fewer places to move. If you mostly play fish tables, <a href="/blog/what-is-a-fish-table-game">what a fish table game is</a> explains bet per shot, rooms and bosses; if slots are your main game, a bigger catalog like Game Vault may suit you better.</p>

<h2>Money terms (same as every Casinova game)</h2>
<ul>
<li><strong>Loads:</strong> $5 to $500 each, from your one Total Deposit wallet.</li>
<li><strong>Bonus:</strong> 100% on your first deposit, 50% on your second, applied at load. See the <a href="/blog/maximize-fish-table-bonus">bonus guide</a>.</li>
<li><strong>Redeem:</strong> opens at 3x the load, capped at 8x, approved ID required.</li>
<li><strong>No published odds.</strong> The provider does not publish payout figures; ignore any that are quoted.</li>
</ul>

<h2>What is inside Gameroom</h2>
<p>Three kinds of play share the one lobby:</p>
<ul>
<li><strong>Slots.</strong> Spin-and-press reels, the fastest way to play and the easiest to pick up.</li>
<li><strong>Fish tables.</strong> Shared shooting rooms where you set a bet per shot and fire at fish for multipliers. Gameroom gives these more room than a slots-led catalog does.</li>
<li><strong>Keno.</strong> Pick numbers and watch the draw; a slower, lower-key option between sessions.</li>
</ul>
<p>Because all three sit behind one login and one balance, you can move between them without reloading credits. If fish tables are most of your play, <a href="/blog/what-is-a-fish-table-game">what a fish table game is</a> explains rooms and bosses; to compare fish-first apps, see <a href="/blog/game-vault-vs-juwa">Game Vault vs Juwa</a>.</p>

<h2>Getting the most from a compact lobby</h2>
<p>A smaller lobby rewards learning it well. Spend your first session trying each machine type at a low bet, note which fish rooms match your bet per shot, and settle on two or three you like rather than scrolling. Keep an eye on your load: with a 3x redeem threshold, a $20 load needs the balance to reach $60 before you can redeem, so pace your bet per shot to give a session room to run. The <a href="/blog/how-to-redeem-winnings-fast">redeem guide</a> has the full math.</p>

<h2>FAQ</h2>
<h3>Does Gameroom have fish tables?</h3>
<p>Yes. Gameroom includes slots, fish tables and keno, with fish given more prominence than in a slots-led catalog.</p>
<h3>What does "Gameroom 777" mean?</h3>
<p>It is part of the provider's branding in the app name. It is not a payout, a code or a version you need to find.</p>
<h3>Can I play Gameroom on my phone?</h3>
<p>Yes. The <a href="/games/gameroom">game page</a> links a provider download and a web player. The <a href="/blog/how-to-play-casinova-on-mobile">mobile guide</a> walks through setup.</p>

<p><a href="/register?src=blog_gameroom-game-guide&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=gameroom-game-guide">Create a free account</a> and load Gameroom with your first deposit matched 100%.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['gameroom','game guide','arcade','fish tables']::text[],
  'published', true, true,
  now() - interval '5 hours',
  'Gameroom Guide: Slots, Fish & Keno | Casinova Gaming',
  'Gameroom at Casinova Gaming: a compact arcade lobby with slots, fish tables and keno. How to start, the $5-$500 load and 100%/50% bonus terms, and who it suits.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

COMMIT;
