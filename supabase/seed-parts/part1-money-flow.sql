-- Part 1: money flow (deposit, load, redeem, bonus, limits)

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'wallet-deposit-guide-casinovasgaming',
  'How to Deposit at Casinova Gaming by Card (Step by Step)',
  'To deposit at Casinova Gaming, log in, open Deposit in your dashboard, pick a card amount between $10.99 and $199.99, and finish the checkout on our payment partner page. The money lands in your Total Deposit wallet within the same session, ready to load into Juwa, Game Vault or any other live game.',
  $t$<p>To deposit at Casinova Gaming, log in, open Deposit in your dashboard, pick a card amount between $10.99 and $199.99, and finish the checkout on our payment partner page. The money lands in your Total Deposit wallet within the same session, ready to load into Juwa, Game Vault or any other live game.</p>

<h2>What you need before you deposit</h2>
<p>Three things, and you probably have all of them already.</p>
<ul>
<li><strong>A verified Casinova account.</strong> You confirm your email once after signup. Until you click that link the dashboard stays locked.</li>
<li><strong>A debit or credit card in your own name.</strong> Card is the one deposit method we run right now. There is no manual transfer step and nothing to screenshot.</li>
<li><strong>A plan for the amount.</strong> Your first deposit gets a 100% match when you load a game, your second gets 50%, and later deposits get no match. That makes the first two deposits worth thinking about. The <a href="/blog/maximize-fish-table-bonus">deposit bonus guide</a> walks through the math.</li>
</ul>

<h2>Step by step: deposit by card</h2>
<ol>
<li><strong>Log in and open Deposit.</strong> It sits in the dashboard menu, or go straight to <a href="/dashboard/deposit">casinovasgaming.com/dashboard/deposit</a>.</li>
<li><strong>Choose Card under Instant payment.</strong> The amounts shown are fixed presets: $10.99, $11.99, $12.99, $13.99, $14.99, $17.99, $19.99, $24.99, $29.99, $30.99, $39.99, $49.99, $59.99, $99.99, $124.99, $129.99, $149.99 and $199.99.</li>
<li><strong>Tap the amount.</strong> A checkout page from our payment partner opens. Enter your card details there, not on Casinova. We never see or store your card number.</li>
<li><strong>Finish the checkout.</strong> When the partner confirms the payment, your Total Deposit wallet updates. If the page sits on "processing", give it a minute and refresh your dashboard before paying again.</li>
<li><strong>Load a game.</strong> Open <a href="/games/juwa">Juwa</a>, <a href="/games/game-vault">Game Vault</a> or another live game and use Load to move credits from the wallet into the game. The <a href="/blog/how-to-load-credits-from-wallet">load guide</a> covers that screen.</li>
</ol>

<h2>How the wallet and the game balance relate</h2>
<p>A deposit does not go into a game directly. It goes into your Casinova wallet, which has two balances: Total Deposit and Deposit Redeem. Card deposits fill Total Deposit. Loading a game moves money out of Total Deposit and into that game. Redeems come back the other way, into Deposit Redeem, after review.</p>
<p>This split matters for the bonus. The match is applied at the moment you load, not at the moment you deposit. So a $19.99 first deposit sits in your wallet as $19.99, and when you load it into Game Vault the game receives $40 (we round $19.99 up to $20, then double it).</p>

<blockquote>Your first deposit is matched 100% and your second 50% when you load a game. A $20 first deposit puts $40 into the game; a $20 second deposit puts $30 in.</blockquote>

<h2>Amounts, minimums and maximums</h2>
<ul>
<li><strong>Smallest card deposit:</strong> $10.99. The smallest game load is $5, so one deposit can be split across two small loads if you like.</li>
<li><strong>Largest single load:</strong> $500. You can deposit more than once, but each load into a game is capped at $500.</li>
<li><strong>Cents round up at load time.</strong> $14.99 in the wallet loads as $15. You are never charged more than you deposited; the rounding only applies to the game load.</li>
</ul>
<p>For the full table, read <a href="/blog/deposit-amounts-and-limits-casinova">deposit amounts and limits</a>.</p>

<h2>If something goes wrong</h2>
<ul>
<li><strong>The checkout page never opened.</strong> Pop-up blockers are the usual cause on mobile. Allow pop-ups for casinovasgaming.com and tap the amount again.</li>
<li><strong>Card declined.</strong> Prepaid cards and some bank cards block online gaming merchants. Try another card or ask your bank to allow the charge.</li>
<li><strong>Paid, but the wallet did not change.</strong> Wait two minutes and refresh. If it still shows the old balance, open live chat (the bubble in the corner, or <a href="/support">Support</a>) with the time of payment and the last four digits of the card. The team can match it to the partner record.</li>
</ul>

<h2>FAQ</h2>
<h3>Can I deposit with Cash App, Zelle or crypto?</h3>
<p>Not at the moment. Card through our instant payment partner is the only deposit method. If that changes it will show on the Deposit page first.</p>
<h3>Is there a fee to deposit?</h3>
<p>Casinova does not add a fee. The amount you pick is the amount charged to your card. Your bank may treat it as a card-not-present purchase, so check your own card terms.</p>
<h3>Do I have to deposit to create a game account?</h3>
<p>No. You can create your Juwa or Game Vault login first and deposit later. The bonus only applies once you load.</p>

<p><a href="/register?src=blog_wallet-deposit-guide-casinovasgaming&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=wallet-deposit-guide-casinovasgaming">Create your free account</a>, deposit by card, and your first load is doubled.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['deposit','card deposit','wallet','getting started']::text[],
  'published', true, true,
  now() - interval '2 hours',
  'How to Deposit by Card at Casinova Gaming | Casinova Gaming',
  'Deposit at Casinova Gaming by card in five steps: presets from $10.99 to $199.99, how the Total Deposit wallet works, and what to do if the payment does not show.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'how-to-load-credits-from-wallet',
  'How to Load Game Credits From Your Casinova Wallet',
  'To load credits, open the game page for Juwa, Game Vault or any live game, tap Create Account if you have no login yet, then use Load in the game panel. Pick an amount from $5 to $500 and the credits move from your Total Deposit wallet into the game, with your first or second deposit bonus added on top.',
  $t$<p>To load credits, open the game page for Juwa, Game Vault or any live game, tap Create Account if you have no login yet, then use Load in the game panel. Pick an amount from $5 to $500 and the credits move from your Total Deposit wallet into the game, with your first or second deposit bonus added on top.</p>

<h2>Why loading is a separate step</h2>
<p>Casinova keeps one wallet for all eight live games. You deposit once by card, then decide which game gets the money and when. That lets you split a deposit between <a href="/games/vegas-sweeps">Vegas Sweeps</a> and <a href="/games/cash-frenzy">Cash Frenzy</a>, or hold part of it for later. It also means the deposit bonus is calculated at load time, against the deposit the money came from.</p>

<h2>Step by step: load a game</h2>
<ol>
<li><strong>Make sure your Total Deposit wallet has funds.</strong> If it reads $0.00, follow the <a href="/blog/wallet-deposit-guide-casinovasgaming">card deposit guide</a> first.</li>
<li><strong>Open the game page.</strong> From <a href="/games">All Games</a>, choose a game without a "Coming Soon" badge. Orion Stars, Fire Kirin, Panda Master, Vblink, Milky Way and Ultrapanda are not loadable yet.</li>
<li><strong>Tap Create Account if this is your first time in that game.</strong> The panel opens and your game login appears there once it is ready. Account requests are handled by the team, usually within 24 hours.</li>
<li><strong>Switch the panel to Load.</strong> Enter an amount between $5 and $500. The panel shows exactly what will go into the game, including any bonus, before you confirm.</li>
<li><strong>Confirm.</strong> The wallet is debited, the game balance is credited, and the load shows in your dashboard history as pending, then completed.</li>
<li><strong>Open the game.</strong> Use Download App or the web player link on the same page and sign in with the credentials from the panel.</li>
</ol>

<h2>Reading the load preview</h2>
<p>Before you confirm, the panel spells out the result in plain sentences. Three things to look for:</p>
<ul>
<li><strong>Rounding.</strong> "$14.99 counts as $15.00." Cents round up to the next dollar for the game load. Your wallet is charged the rounded dollar amount.</li>
<li><strong>Which deposit the bonus comes from.</strong> "First deposit bonus 100%: $20.00 + $20.00 bonus = $40.00 in the game." If part of a load comes from a later deposit, that part is listed separately with no bonus.</li>
<li><strong>Money that has already been bonused.</strong> If you redeemed and are loading again from the same deposit, the preview says so, and no bonus is added a second time.</li>
</ul>

<blockquote>Every load is between $5 and $500. The bonus is applied per deposit: 100% of your first deposit, 50% of your second, nothing on the third and later.</blockquote>

<h2>One wallet, eight games</h2>
<p>You can hold logins for several games at once. Each game page has its own panel, so loading <a href="/games/mr-all-in-one">MR All In One</a> does not touch your <a href="/games/juwa">Juwa</a> balance. Remember that redeem rules apply per game and per load: you redeem from the game you loaded, once that game balance is at least three times the load. The <a href="/blog/how-to-redeem-winnings-fast">redeem guide</a> explains the 3x and 8x rules.</p>

<h2>Common questions at the load screen</h2>
<ul>
<li><strong>Load is greyed out.</strong> Either the wallet balance is below $5, the game is marked coming soon, or a previous request for that game is still pending. The panel tells you which.</li>
<li><strong>The bonus is smaller than expected.</strong> Check which deposit the money came from. A third deposit has no match even if it is the first time you load that particular game.</li>
<li><strong>I loaded the wrong game.</strong> Loads cannot be reversed from the panel. Open live chat straight away and the team will look at the load record.</li>
</ul>

<h2>FAQ</h2>
<h3>Do I need a separate deposit for each game?</h3>
<p>No. One card deposit fills the Total Deposit wallet, and you can load any mix of live games from it.</p>
<h3>How long does a load take?</h3>
<p>The wallet debit is immediate. The game credit follows once the request is processed; your dashboard history shows the status. If it sits on pending for longer than you expect, message support from the dashboard.</p>
<h3>Can I load from my Deposit Redeem wallet?</h3>
<p>Redeemed funds sit in a separate balance. Payouts come from there; loading a game uses Total Deposit. Ask support if you want to move redeemed funds back into play.</p>

<p><a href="/register?src=blog_how-to-load-credits-from-wallet&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=how-to-load-credits-from-wallet">Create your free account</a> and your first game load is matched 100%.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['load credits','wallet','game account','getting started']::text[],
  'published', true, true,
  now() - interval '4 hours',
  'How to Load Game Credits From Your Wallet | Casinova Gaming',
  'Load credits into Juwa, Game Vault or any live game from one Casinova wallet. Amounts from $5 to $500, how the load preview reads, and why the bonus is applied at load.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'how-to-redeem-winnings-fast',
  'How to Redeem Winnings at Casinova Gaming: Rules, ID Check and Review',
  'To redeem at Casinova Gaming, open the panel of the game you loaded, switch to Redeem, and submit an amount. Your in-game balance must be at least 3x the load, total redeems are capped at 8x the load, and you need an approved ID. An admin reviews the request and approved funds land in your Deposit Redeem wallet.',
  $t$<p>To redeem at Casinova Gaming, open the panel of the game you loaded, switch to Redeem, and submit an amount. Your in-game balance must be at least 3x the load, total redeems are capped at 8x the load, and you need an approved ID. An admin reviews the request and approved funds land in your Deposit Redeem wallet.</p>

<h2>The three rules that decide whether you can redeem</h2>
<ul>
<li><strong>You loaded from Total Deposit.</strong> Redeem is tied to a real deposit load into that game. If you have not loaded the game from your wallet, the Redeem tab tells you to load first.</li>
<li><strong>Your game balance is at least 3x the load.</strong> Load $50 into <a href="/games/game-vault">Game Vault</a> and you can submit a redeem once Game Vault shows $150 or more. The panel displays the exact threshold for your load.</li>
<li><strong>Total redeems stay within 8x the load.</strong> On that $50 load, redeems add up to $400 at most. The panel shows "maximum redeem remaining" so you can see how much of the 8x is left.</li>
</ul>
<p>Loads from the bonus wallet follow a wider band, 7x to 15x. The panel always shows which rule applies to the load you are redeeming against.</p>

<h2>Step by step: submit a redeem</h2>
<ol>
<li><strong>Check your ID status.</strong> Go to <a href="/dashboard/kyc">dashboard, ID verification</a>. It must read Approved. If it reads In review or you have not uploaded, redeem stays locked. The <a href="/blog/casinova-id-verification-guide">ID verification guide</a> covers what to upload.</li>
<li><strong>Note your live game balance.</strong> Open the game app and read the balance. The panel compares it against the 3x threshold.</li>
<li><strong>Open the game page on Casinova and switch the panel to Redeem.</strong></li>
<li><strong>Enter the amount, or choose Redeem all.</strong> Stay within the remaining 8x cap; the panel will not accept more.</li>
<li><strong>Submit.</strong> The request is held for admin approval. The cashout is not sent at this point, and the panel says so.</li>
<li><strong>Wait for the review.</strong> When an admin approves, the amount moves into your Deposit Redeem wallet and you get a dashboard notification. If it is not approved, the notification says so and nothing leaves the game.</li>
</ol>

<blockquote>Redeem threshold: game balance of at least 3x your load. Redeem cap: 8x your load in total. Both are shown in the game panel before you submit.</blockquote>

<h2>After approval: Deposit Redeem wallet to payout</h2>
<p>The Deposit Redeem balance is separate from Total Deposit. From there you request a payout to the method our payment partner has enabled for your account. If you would rather keep playing, ask support to move the balance back into play; we do not do that automatically.</p>
<p>We do not publish a payout time. Every redeem is reviewed by a person, and review time depends on queue and on whether your ID and load history line up. Posts that promise minutes are not describing our process.</p>

<h2>Why a redeem gets held or declined</h2>
<ul>
<li><strong>ID not approved.</strong> The most common reason. Upload a clear JPG or PNG of a government ID and wait for Approved.</li>
<li><strong>Balance below 3x.</strong> You submitted before the game balance reached the threshold. The panel blocks this when it knows your balance; if the balance it has is stale, use Check balance first.</li>
<li><strong>Cap reached.</strong> Earlier redeems already used the 8x allowance on that load. Load again from Total Deposit to open a new allowance.</li>
<li><strong>Account rule issue.</strong> Multiple accounts or self-referrals are prohibited under the <a href="/terms">terms</a>, and a review can catch that.</li>
</ul>

<h2>FAQ</h2>
<h3>Can I redeem bonus money?</h3>
<p>Bonus credits are played inside the game. What you redeem is your game balance, subject to the 3x threshold and 8x cap on the load that funded it.</p>
<h3>Why is there a 3x rule at all?</h3>
<p>It separates play from pass-through. A load that is redeemed straight back out would just be a card transaction with extra steps; the threshold keeps the game the point of the platform.</p>
<h3>Where do I see my redeem history?</h3>
<p>Dashboard, Requests. Each redeem shows pending, processing, completed or rejected, plus the admin note when there is one.</p>

<p><a href="/register?src=blog_how-to-redeem-winnings-fast&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=how-to-redeem-winnings-fast">Create your free account</a>, upload your ID early, and redeem is unlocked when you need it.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['redeem','cash out','3x rule','id verification']::text[],
  'published', true, true,
  now() - interval '6 hours',
  'How to Redeem Winnings at Casinova Gaming | Casinova Gaming',
  'Redeem at Casinova Gaming: the 3x balance threshold, the 8x cap per load, the approved-ID requirement, admin review, and where the money lands after approval.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'maximize-fish-table-bonus',
  'Casinova Deposit Bonus: 100% on Your First Deposit, 50% on Your Second',
  'Casinova Gaming matches your first deposit 100% and your second deposit 50% when you load a game. Deposit $20, load Juwa, and $40 goes into the game; a second $20 deposit loads $30. The match is applied at load time, there is no code to enter, and deposits after the second get no match.',
  $t$<p>Casinova Gaming matches your first deposit 100% and your second deposit 50% when you load a game. Deposit $20, load Juwa, and $40 goes into the game; a second $20 deposit loads $30. The match is applied at load time, there is no code to enter, and deposits after the second get no match.</p>

<h2>How the match works, in one table</h2>
<table>
<thead><tr><th>Deposit</th><th>Match</th><th>You pay</th><th>Game receives</th></tr></thead>
<tbody>
<tr><td>First</td><td>100%</td><td>$20</td><td>$40</td></tr>
<tr><td>Second</td><td>50%</td><td>$20</td><td>$30</td></tr>
<tr><td>Third and later</td><td>none</td><td>$20</td><td>$20</td></tr>
</tbody>
</table>
<p>The percentages are fixed by deposit order, not by game or by VIP tier. Your first deposit is matched 100% whether you load <a href="/games/game-vault">Game Vault</a>, <a href="/games/cash-machine">Cash Machine</a> or <a href="/games/mafia">Mafia</a>.</p>

<h2>Why the bonus appears at load, not at deposit</h2>
<p>A card deposit fills your Total Deposit wallet at face value. The match is added when you move money from that wallet into a game. Two reasons for that design:</p>
<ul>
<li><strong>You choose the game.</strong> The bonus follows the deposit into whichever game you pick, so you are not locked into a game before you have money in the wallet.</li>
<li><strong>Each deposit is bonused once.</strong> The load record notes which deposit funded it. If you redeem and load again from the same deposit, no second match is added. The <a href="/blog/how-to-load-credits-from-wallet">load guide</a> shows what the preview says in that case.</li>
</ul>

<h2>Worked examples with real amounts</h2>
<ul>
<li><strong>First deposit $10.99.</strong> The wallet shows $10.99. At load, cents round up: $11 is debited and the game receives $22.</li>
<li><strong>First deposit $49.99, loaded as two $25 loads.</strong> Each load is still part of the first deposit, so each is matched 100%: $25 becomes $50, twice. The rounding up to $50 total means you are not charged more than you deposited; the second load uses the remaining $24.99 rounded to $25.</li>
<li><strong>First $20, second $20, third $20, all loaded into Juwa.</strong> Game receives $40, then $30, then $20: $90 in play for $60 deposited.</li>
<li><strong>Split loads across deposits.</strong> If you load $30 and only $20 of your first deposit remains, the preview lists $20 at 100% and $10 from your second deposit at 50%: $40 + $15 = $55 into the game.</li>
</ul>

<blockquote>Three $20 deposits put $90 into the game: $40 from the first, $30 from the second, $20 from the third.</blockquote>

<h2>Getting the most from the two matched deposits</h2>
<ul>
<li><strong>Make the first deposit the larger one.</strong> The 100% match is the bigger lever. If you plan to put in $60 over a week, $40 first and $20 second gives $110 in play; $20 first and $40 second gives $100.</li>
<li><strong>Load everything from each matched deposit before the next.</strong> Loads are matched against the deposit they draw from, so leaving part of the first deposit in the wallet does not lose the match, but it is easier to track if you load it fully.</li>
<li><strong>Mind the $500 load cap.</strong> A single load tops out at $500. A larger first deposit can be loaded in more than one step and each step is still matched.</li>
<li><strong>Remember the redeem rules.</strong> Redeem opens at 3x your load and caps at 8x. A bigger load means a bigger threshold. Read <a href="/blog/how-to-redeem-winnings-fast">how to redeem</a> before you decide on size.</li>
</ul>

<h2>What the bonus is not</h2>
<p>There is no promo code, no no-deposit bonus and no free credits. If you see those promised for Casinova anywhere, it is not us. Reload matches by VIP tier are also not part of the program; tiers change your referral share and your daily spins, which the <a href="/blog/casinovasgaming-vip-tiers-explained">VIP tiers guide</a> covers.</p>

<h2>FAQ</h2>
<h3>Does the bonus apply to every game?</h3>
<p>Yes, to every live game. The match is tied to the deposit, not the game. Coming-soon games cannot be loaded at all.</p>
<h3>What if my first deposit was months ago?</h3>
<p>Deposit order is what counts. If your first deposit is already fully loaded, your next deposit is your second and gets 50%.</p>
<h3>Can I withdraw the bonus itself?</h3>
<p>Bonus credits are played in the game. Redeems come from your game balance under the 3x and 8x rules.</p>

<p><a href="/register?src=blog_maximize-fish-table-bonus&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=maximize-fish-table-bonus">Create your free account</a> and your first deposit is doubled at load.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['deposit bonus','welcome bonus','first deposit','bonus rules']::text[],
  'published', true, true,
  now() - interval '8 hours',
  'Casinova Deposit Bonus: 100% First, 50% Second | Casinova Gaming',
  'How the Casinova Gaming deposit bonus works: 100% on your first deposit, 50% on your second, applied when you load a game. Worked examples, rounding, and the redeem rules.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO public.blog_posts (slug, title, excerpt, content, cover_image_url, tags, status, is_published, telegram_sent, published_at, seo_title, seo_description)
VALUES (
  'deposit-amounts-and-limits-casinova',
  'Minimum Deposit, Load Limits and Card Amounts at Casinova Gaming',
  'The minimum game load at Casinova Gaming is $5 and the maximum is $500 per load. Card deposits use fixed presets from $10.99 to $199.99, and cents round up to the next dollar when you load a game, so $14.99 loads as $15. There are no deposit fees from Casinova.',
  $t$<p>The minimum game load at Casinova Gaming is $5 and the maximum is $500 per load. Card deposits use fixed presets from $10.99 to $199.99, and cents round up to the next dollar when you load a game, so $14.99 loads as $15. There are no deposit fees from Casinova.</p>

<h2>Every number in one place</h2>
<table>
<thead><tr><th>Limit</th><th>Amount</th><th>Where it applies</th></tr></thead>
<tbody>
<tr><td>Smallest card deposit</td><td>$10.99</td><td>Deposit page, Card</td></tr>
<tr><td>Largest card deposit preset</td><td>$199.99</td><td>Deposit page, Card</td></tr>
<tr><td>Smallest game load</td><td>$5</td><td>Game panel, Load</td></tr>
<tr><td>Largest game load</td><td>$500</td><td>Game panel, Load</td></tr>
<tr><td>Rounding at load</td><td>cents round up</td><td>$4.99 counts as $5</td></tr>
<tr><td>First deposit match</td><td>100%</td><td>applied at load</td></tr>
<tr><td>Second deposit match</td><td>50%</td><td>applied at load</td></tr>
<tr><td>Redeem threshold</td><td>3x the load</td><td>game balance before redeem</td></tr>
<tr><td>Redeem cap</td><td>8x the load</td><td>total redeems per load</td></tr>
</tbody>
</table>

<h2>The card presets</h2>
<p>Card deposits are not free-form. You pick one of these: $10.99, $11.99, $12.99, $13.99, $14.99, $17.99, $19.99, $24.99, $29.99, $30.99, $39.99, $49.99, $59.99, $99.99, $124.99, $129.99, $149.99, $199.99. The odd cents are set by the payment partner. They do not cost you anything extra at load, because cents round up for the game credit while your wallet is only ever debited what you actually deposited, rounded to the dollar.</p>
<p>Want more than $199.99 in the wallet? Make two deposits. Keep in mind the deposit order rule from the <a href="/blog/maximize-fish-table-bonus">bonus guide</a>: the first deposit is matched 100%, the second 50%, so two $99.99 deposits are matched differently from one $199.99 deposit followed by a $99.99 one.</p>

<h2>Load minimum and maximum</h2>
<ul>
<li><strong>$5 minimum.</strong> Any live game, any time. If your wallet has $4.50 left, the Load button stays disabled until you top up.</li>
<li><strong>$500 maximum per load.</strong> Not per day and not per account; per load. Deposit $600 over several card payments and you can load $500 into <a href="/games/vegas-sweeps">Vegas Sweeps</a> now and $100 later.</li>
<li><strong>One wallet for all games.</strong> The limits apply per load into a game, so holding $300 in <a href="/games/gameroom">Gameroom</a> does not reduce what you can load into <a href="/games/cash-frenzy">Cash Frenzy</a>.</li>
</ul>

<blockquote>Loads run from $5 to $500 each. Cents round up at load: a $9.99 wallet balance loads as $10.</blockquote>

<h2>Rounding, explained with the preview</h2>
<p>Before you confirm a load, the game panel prints a sentence like "$14.99 counts as $15.00. First deposit bonus 100%: $15.00 + $15.00 bonus = $30.00 in the game. Your wallet is charged $15.00." Two details worth knowing:</p>
<ul>
<li><strong>Rounding is per load, up to the dollar.</strong> A $10.99 deposit loads as $11.</li>
<li><strong>Amounts already on a whole dollar stay there.</strong> $20 loads as $20.</li>
</ul>

<h2>Limits that come from your bank, not from us</h2>
<p>Casinova adds no deposit fee and sets no daily deposit cap. Your card issuer might. Prepaid cards often decline gaming merchants, and some banks hold a card-not-present charge for review the first time. If a payment fails, the <a href="/blog/wallet-deposit-guide-casinovasgaming">card deposit guide</a> lists what to check before you contact <a href="/support">support</a>.</p>

<h2>Picking an amount for a first session</h2>
<p>Match the load to the redeem rules. A $20 first load becomes $40 in the game and opens redeem once the balance reaches $60 (3x the $20 load), capped at $160 total (8x). A $100 first load becomes $200 in play, with redeem opening at $300 and capping at $800. Bigger loads mean bigger thresholds. Decide what you are comfortable playing to, set it before you deposit, and see <a href="/responsible-play">Responsible Play</a> for limits and help.</p>

<h2>FAQ</h2>
<h3>Why can I not type my own deposit amount?</h3>
<p>Card deposits go through our payment partner, which offers fixed amounts. Pick the closest preset, or combine two.</p>
<h3>Is there a withdrawal minimum?</h3>
<p>Redeem amounts are governed by the 3x threshold and 8x cap on your load, as shown in the game panel. Payout details depend on the method the payment partner enables for you.</p>
<h3>Do limits change with VIP tier?</h3>
<p>No. Load limits are the same for Bronze through Platinum. Tiers change your referral share and daily spins, not your load range.</p>

<p><a href="/register?src=blog_deposit-amounts-and-limits-casinova&amp;utm_source=blog&amp;utm_medium=cta&amp;utm_campaign=deposit-amounts-and-limits-casinova">Create your free account</a> and start with a load as small as $5.</p>
<p class="text-sm">Casinova Gaming is for players 18+. Sweepstakes availability varies by jurisdiction; void where prohibited.</p>$t$,
  NULL,
  ARRAY['minimum deposit','limits','card amounts','wallet']::text[],
  'published', true, true,
  now() - interval '10 hours',
  'Minimum Deposit and Load Limits at Casinova | Casinova Gaming',
  'Casinova Gaming limits in one table: $5 minimum and $500 maximum per load, card presets from $10.99 to $199.99, how cents round at load, and what your bank may add.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title, excerpt = EXCLUDED.excerpt, content = EXCLUDED.content,
  cover_image_url = EXCLUDED.cover_image_url, tags = EXCLUDED.tags,
  status = 'published', is_published = true, telegram_sent = true,
  published_at = COALESCE(public.blog_posts.published_at, EXCLUDED.published_at),
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description,
  updated_at = now();
