# Phase 2 blog rewrites: questions for the owner

Each rewritten post lists what the writer could not verify from the code. Answer these before or after the SQL is applied; none of them blocks the corrections already made.

## casinovasgaming-leaderboard-guide

Title: Casinova Leaderboard Guide: How Rankings Are Calculated

- The old post described daily/weekly/monthly/all-time boards ranked by XP, with a top-10 achievement bonus. None of that exists in src/app/leaderboard/page.tsx (one all-time top-50 table by profiles.vip_points). Rewrite describes the code. Confirm no period boards or prizes are planned before this goes live.
- The leaderboard page says 'Sign in to track your rank' but I found no dashboard view that shows a personal rank, only the points total on the VIP page. Is there a personal rank display somewhere? The post says members outside the top 50 should check their points on the VIP page.
- The leaderboard query does not filter by role, so admin or staff profiles with points could appear on the public board. Intended?
- The post publishes exact VIP point values read from code: 1 per deposit dollar (deposit-rewards.ts), check-in 5 to 11 by streak and +5 spin mission (rewards/daily.ts), 10 per $1 of spin prize (actions/spin.ts), 50 per completed game request (actions/game-requests.ts), 10 per referral. The published VIP tiers post keeps these vague. OK to publish the exact numbers?
- Code note: spin prizes and completed game requests add vip_points without recalculating vip_tier (only deposits, check-ins and referrals call vipTierForPoints). A member could cross 500 points via a spin and still show Bronze until their next check-in or deposit. The post does not mention this; flagging for a fix.
- Tag 'leaderboard rewards' kept from the old post even though rank pays no reward. Remove it if you prefer.

## casinovasgaming-next-generation-gaming-platform

Title: Casinova Gaming: How the Platform Works, End to End

- Old post claimed: XP/level tracking, VIP multipliers up to 2x, a 40% uncapped referral reward, a weekly leaderboard prize pool, CashApp/Zelle/crypto deposits, a 20% deposit bonus, $2 to $3 Free Play and Happy Hour. None are in the code or facts sheet; all removed.
- The slug says 'next-generation gaming platform'. I dropped that claim from the title because it cannot be verified. OK?
- deposit-rewards.ts can credit a one-time 'active promotion' bonus (promotions table, bonus_amount > 0) on a deposit. Not mentioned in the post because the brief lists no such bonus. Is any promotion with a bonus amount currently active?
- games.ts also defines GAME_BONUS_REDEEM_RULES (7x to 15x) for loads from the bonus wallet. The post states only the 3x/8x rule from the brief. Should posts mention the bonus-wallet redeem rule?

## casinovasgaming-telegram-support-guide

Title: Casinova Gaming Telegram and Support: How to Get Help

- The slug promises support via Telegram, but in code Telegram is (a) a footer social link to t.me/casinovagaming, (b) a promo chat that receives blog and promotion posts (lib/telegram/auto-post.ts, promo-broadcast.ts), and (c) internal staff alerts when a customer messages and no admin is online (notify-admin-message.ts). I found no customer-facing Telegram support inbox, so the post directs support to the site chat. Do staff actually answer direct messages at t.me/casinovagaming? If yes, the post should say so.
- Is t.me/casinovagaming a channel, a group or a personal/support account? The post says promotions and new guides are announced there, based on the auto-post code. Confirm the promo chat that the bot posts to is the same public t.me/casinovagaming.
- Old post mentioned 'Diamond and Elite' tiers with sub-minute response times, a ticket system with reference numbers, and payment screenshots. None exist; removed.
- The /support page shows 'Average response under 5 minutes' and an email support@casinovagaming.com (domain without the 's', unlike casinovasgaming.com). I did not repeat either. Is the email address correct and is the 5-minute figure something you stand behind?
- The post says the logged-in chat has 'AI Assistant' and 'Real Agent' tabs (components/chat/user-quick-chat.tsx). Confirm that widget is the one members currently see.
- VIP support benefits (priority support, 24/7 VIP support, dedicated account manager) are taken from VIP_TIERS in constants.ts. Are these actually delivered as described?

## casinovasgaming-vs-online-casinos

Title: Casinova Gaming vs Online Casinos: What Is the Difference?

- Old post said Casinova is available 'nationwide', in 'any state', and listed CashApp, Zelle, Chime, PayPal, Venmo, Bitcoin and USDT. All removed. It also linked to retired posts (sweepstakes-games-us-nationwide, how-cash-out-works-casinovasgaming).
- The licensed-casino column is intentionally generic ('depends on the operator/regulator'). Please have whoever handles legal wording read the 'legal model' section; it describes the sweepstakes model as 'a different category' without saying it is permitted anywhere.
- The post says each game holds its own balance and credits do not move between games. That is my reading of the per-game panel flow; confirm there is no game-to-game transfer.
- The $20 example ($60 threshold, $160 cap) assumes 3x and 8x are measured against the load amount. Is the multiple applied to the loaded amount including the deposit match, or the amount before the match?

## casinovasgaming-xp-leveling-explained

Title: Casinova XP and Levels Explained: VIP Points and Tiers

- There is no XP or level system anywhere in the code (searched src for xp/level; only VIP points and tiers exist). The old post's XP curve, streak milestones, Weekly Chest, Monthly Vault and coin bonuses were all invented. The rewrite says so and covers VIP points instead. Consider whether this slug should eventually redirect to the VIP tiers post.
- Exact point values come from code: 1 per deposit dollar (lib/rewards/deposit-rewards.ts), check-in 5 to 11 by streak and +5 spin mission (lib/rewards/daily.ts), 10 per $1 spin prize (lib/actions/spin.ts), 50 per completed game request (lib/actions/game-requests.ts), 10 per referral (constants.ts). OK to publish these numbers? Server-side values can change and the post would go stale.
- 'Game account request completed: 50 points' is awarded in updateGameRequestStatus when staff mark a request completed. If game logins are now created automatically without that step, do players still receive the 50 points?
- Code note: spin-prize points and game-request points update vip_points but not vip_tier, so a member can pass a threshold and keep the old tier label until the next deposit, check-in or referral recalculates it.
- I wrote that nothing removes points for inactivity (no decay code found). Confirm there is no manual or database-side points reset.
- The published daily spin post says the spin window is a rolling 24 hours while the check-in and mission use the UTC calendar day. The post states UTC for the check-in. Confirm that is how you want it described.

## welcome-to-casinova

Title: Welcome to Casinova Gaming: How to Get Started

- The current title contains mojibake ('â€”'); new title uses a colon.
- Old post said 'Submit a deposit request, wait for approval'. I described card checkout through the payment partner with the wallet credited when checkout completes. Is there still any manual approval step on deposits?
- The bonus table shows $20 deposited giving a $20 bonus on the first deposit. Is the match calculated on the deposit amount or on the amount loaded? If someone deposits $100 and loads $20, what bonus applies?
- Step 2 says deposits, logins and loads work before ID approval and only redeem is locked (taken from the published ID guide). Confirm still true.
- Step 1 says 'one account per person' (the spin action calls an anti-multi-account gate, assert_freeplay_allowed). Confirm this is stated in the terms.
- Old post mentioned 'better support and bonuses' at higher VIP tiers. Tiers do not change the deposit bonus, so I left that out.

## win-sweeps-vs-other-fish-table-platforms

Title: How Casinova Gaming Differs From Other Fish Table Platforms

- The slug still contains the old brand name ('win-sweeps'). The body never uses it. Do you want a redirect to a cleaner slug at some point?
- Old post claimed: account setup under 1 hour (9 AM to 10 PM EST), 'all 12 games', a 50% first deposit bonus, 5 tiers 'Silver to Elite', support via WhatsApp/Messenger, and payouts via CashApp/Zelle/crypto. All removed.
- I wrote that the load and redeem rules are 'printed on each game page' (GAME_BONUS_RULES is described in games.ts as 'shown on every game landing page'). Confirm the live game pages display them.
- I wrote that a card payment 'leaves a record with your card issuer'. This is a general statement, not a claim about chargebacks or protection. Happy for it to stay?
- Tag 'best fish table platform' kept from the old post although the article explicitly does not rank platforms. Remove if you prefer.
- The $10 example ($30 threshold, $80 cap) assumes multiples are measured on the load amount. Same question as elsewhere: is the bonus included in the base for 3x/8x?

## sweepstakes-no-deposit-bonus-explained

Title: Sweepstakes No Deposit Bonus: Does Casinova Offer One?

- Old post claimed a 250-coin welcome bonus, 100 coins per daily claim, 1,000 coins per referral, streak milestones up to 15,000 coins and a 50% first-deposit bonus. None exist; removed.
- The facts sheet lists 'free credits' as not offered, yet the daily spin credits $1 to $10 to the wallet with no deposit (lib/actions/spin.ts credits the 'current' wallet). I describe the spin as free wallet credit while saying there is no no-deposit bonus. Is that the framing you want?
- Can spin winnings be loaded into a game with no deposit history at all, once the wallet reaches $5? The post says yes, following the published daily spin post. Please confirm.
- The post says a spin needs 'an account, not a deposit'. The spin action also runs an anti-multi-account gate (assert_freeplay_allowed, defined in the database, which I could not read). Does that gate require anything else, such as a verified email, phone or ID?
- Bonus examples ($5 first deposit gives $5 bonus, $50 second deposit gives $25) assume the match is calculated on the full deposit when it is loaded. Confirm how the match is calculated if a deposit is loaded in parts.
- The post says checkout has no code field. I did not inspect the payment partner's hosted checkout page; confirm it shows no coupon box.
- The post says the referral code rewards the referrer only (10 VIP points plus a share of the first deposit) and gives the new account nothing. That is what attach-referral.ts and deposit-rewards.ts do. Confirm the referred player receives nothing.
- The post says 'Staff do not ask for your password'. Reasonable policy statement but not something code can confirm. OK?
- Tag 'free sweepstakes coins' kept from the old post; Casinova has no coins. Remove if you prefer.
- games.ts defines a separate bonus-wallet redeem rule (7x to 15x). Does the deposit match fall under that rule rather than 3x/8x? The post states only 3x as in the brief.

## fish-table-sweepstakes-explained

Title: Fish Table Sweepstakes Games Explained

- Old post said fish table sweepstakes gaming is legal, linked to coming-soon game pages (Fire Kirin, Orion Stars, Panda Master, Ultrapanda) as playable, named CashApp/Zelle/crypto and a 50% first deposit bonus. All removed.
- Which live apps include fish games is taken from the bios in games.ts (Juwa, Game Vault, MR All In One, Vegas Sweeps, Gameroom). Mafia's bio says 'slots and arcade'; I listed it as a slots app. Does Mafia include fish games?
- The FAQ says Juwa is the closest live option to Fire Kirin for fish games, following the published Game Vault vs Juwa post that calls Juwa fish-first. Agree?
- The general description of fish table mechanics (rooms sorted by stake, bet per shot, bigger targets take more hits, each shot independent, shared rooms) is generic genre knowledge, not from the code. I cannot verify that every provider's fish games resolve each shot independently; please confirm you are comfortable with 'each shot is independent' and 'a big fish is not due'.
- The $20 example ($60 threshold, $160 cap) assumes 3x/8x is measured on the load amount. Is the deposit match included in that base?
- I wrote that below the threshold 'the redeem button stays locked'. Confirm the panel blocks the request below 3x and does not merely reject it afterwards.

## beginner-guide-fish-table-games

Title: Fish Table Games for Beginners: Your First Session, Step by Step

- This post is positioned as a first-session walkthrough so it does not repeat what-is-a-fish-table-game (format) or best-fish-table-games-beginners (ranking). Confirm that split is what you want.
- It says five live games include fish tables (Juwa, Gameroom, MR All In One, Game Vault, Vegas Sweeps) and that Cash Machine, Cash Frenzy and Mafia do not, following the published what-is-a-fish-table-game post. Please confirm against the actual lobbies.

## best-fish-table-games-online

Title: Best Fish Table Games Online: The Live Casinova Lineup Ranked

- Ranking positions 2 to 5 (Gameroom, MR All In One, Game Vault, Vegas Sweeps) are ordered by how prominent fish tables are, based on games.ts bios and the published posts. Please confirm the order matches the real lobbies, especially Gameroom at number 2.
- States that Cash Machine, Cash Frenzy and Mafia have no fish tables (taken from the published what-is-a-fish-table-game post). Confirm.
- Removed the tag 'fish table online 2025' (stale year) and replaced it with 'fish table online'.
- The old post ranked 12 games with star ratings for 'consistency' and 'excitement'. Those ratings had no source and were dropped; the six coming-soon games are named only as not loadable.

## boss-fish-jackpot-timing-guide

Title: Boss Fish and Jackpot Timing: What Is Real and What Is Not

- The old post listed boss names and timers per game (Dragon Boss every 3 to 5 minutes, Dragon Storm, Street Boss, Godfather and so on), including for coming-soon games and for Mafia. None of that is supported by the code or facts sheet, so it was removed entirely. Confirm you are happy for this post to say timing cannot be predicted.
- What happens to in-game balance above the 8x redeem cap for a load? The post says balance above the cap cannot be redeemed against that load, which is how the panel's 'max redeem remaining' reads. Please confirm the exact rule.
- Do any of the five live fish lobbies show jackpot counters, and are they provider-run? The post describes jackpots only generically.

## fish-em-up-online-alternatives

Title: Looking for Fish Em Up? Not at Casinova, and What to Play Instead

- Casinova has no data on Fish Em Up, so the post describes it only as a third-party title whose name suggests a fish shooter. If you know who publishes it and want that stated, tell us; otherwise it stays generic.
- Is it worth keeping a post that targets a game Casinova does not offer? It is honest as written, but the search intent is only partly served. Consider retiring or redirecting it to best-fish-table-games-online.
- The old post linked the six coming-soon games as alternatives and named Cash App, Zelle and crypto as deposit methods. Both were removed.

## game-vault-online-guide

Title: Game Vault Online: How to Get In, Sign In and Play Through Casinova

- This post overlaps with game-vault-all-games-breakdown (what is inside Game Vault) and how-to-create-game-vault-account (signup steps). It was written around access: web player vs download, sign-in and panel troubleshooting. If that is still too close, consider redirecting this slug to game-vault-all-games-breakdown.
- The post tells readers to reach the provider's web player and download only through the Play Game Vault and Download App buttons on the Casinova game page, and does not print the provider URLs. Confirm you prefer that.
- Does the Game Vault web player work in a phone browser on both iPhone and Android? The post defers to the mobile guide instead of stating device support.
- The old post claimed a 'HOT badge' with 'consistently high payout activity' and that the bonus 'applies across all Game Vault games'. Both were removed as unsupported.

## how-to-create-game-vault-account

Title: How to Create a Game Vault Account at Casinova Gaming

- Steps were taken from the code: register form fields (email-auth-form.tsx), the Create Account button and panel (game-landing-client.tsx, game-wallet-load-section.tsx). No time estimate is given for account creation. Other published posts say 'usually within 24 hours'; confirm which wording you want sitewide.
- For Game Vault the code previews a numbered username (name followed by 1, then 2 on Replace). The post mentions the number. Confirm.
- Replace Account: what happens to credits still on the old Game Vault login? The post tells players to redeem or ask support before replacing.
- The register page shows Google and Facebook sign-in buttons. Are both enabled in production?
- The old post asked for a payment screenshot and promised login details by WhatsApp or Telegram within the hour. All of that was removed as it does not match the current flow.

## how-to-create-juwa-account-online

Title: How to Create a Juwa Account Online Through Casinova Gaming

- Steps were taken from the code (email-auth-form.tsx, game-landing-client.tsx, game-wallet-load-section.tsx). No time estimate is given for account creation; other published posts say 'usually within 24 hours'. Confirm the wording you want.
- In games.ts, Juwa's playUrl and downloadUrl are the same address, so the post says both the Play Juwa and Download App buttons open the provider's Juwa page and does not claim a separate web player. Is there a real Juwa web player that should be linked?
- The post says a Juwa login obtained somewhere else is not connected to the Casinova wallet and to ask support. Is there any process to attach an existing Juwa login?
- This post and how-to-create-game-vault-account follow the same flow by necessity. They are written with different emphasis (this one answers common Juwa signup questions), but the core steps are the same.
- The old post promised login details by WhatsApp or Telegram within the hour, named Cash App, Zelle and crypto, and a payment screenshot step. All removed.

## juwa-fish-table-game

Title: Juwa Fish Table Game: What It Is and How to Play It at Casinova

- This post is the overview of Juwa (what it is, what a room is like, how access works). how-to-win-at-juwa covers session rules and how-to-create-juwa-account-online covers signup. Some overlap with how-to-win-at-juwa's 'First, what Juwa is' section is unavoidable.
- The old post named Juwa features (Dragon Storm with a 2x multiplier for 30 seconds, Boss Battle worth 50 to 200 credits, Chain Reaction). None are in games.ts or the facts sheet, so they were removed. If Juwa really has named features you want mentioned, supply them.
- In games.ts, Juwa's playUrl equals its downloadUrl, so the post does not claim a separate browser-based web player for Juwa. Confirm whether one exists.
- The description of fish room controls (bet per shot, lock-on, special weapons 'in many fish tables') is generic to the genre, not verified against the current Juwa app.

## luckytap-slots-guide-casinovasgaming-alternative

Title: Twin Happiness, Smashing Sevens and LuckyTap Titles: Not at Casinova

- Casinova has no data on these four titles or on LuckyTap, so the post says only that they are third-party titles commonly searched together under that name. If you want the studio or game type stated, please supply a source.
- Family Feud and Survivor are third-party brand names. The post uses them only to say the titles are not offered. Confirm you are comfortable with them in a title and tags, or consider retiring this post.
- As with fish-em-up-online-alternatives, this post targets games Casinova does not carry. It is honest as written, but you may prefer to redirect it to a slots guide such as cash-machine-vs-cash-frenzy.
- The old post described specific mechanics of Casinova slots apps ('free-spin chains with a climbing cash meter', 'syndicate jackpot pools', 'progressive jackpot pools'). None are supported by games.ts and were removed.
- Which live lobbies have keno is taken from games.ts bios (Game Vault, Vegas Sweeps, Gameroom, MR All In One). Confirm.

## win-at-fish-table-games-strategies

Title: How to Win at Fish Table Games: What You Can and Cannot Control

- The old post presented cannon power tiers, boss multipliers (10 to 100x), timed bonus events, room coordination and 'variance cycles' as strategies that work. None can be verified and all were removed. The post now says plainly that outcomes are chance-based.
- Overlaps with how-to-win-at-juwa (same honest stance, Juwa specific) and with boss-fish-jackpot-timing-guide in this batch. This one is the general budget and session plan for any fish lobby; the Juwa post stays Juwa specific. If you would rather keep only one strategy post, this slug could redirect to how-to-win-at-juwa.
- What happens to in-game balance above the 8x redeem cap for a load? The post advises redeeming before the cap because balance above it cannot be redeemed against that load. Please confirm the exact rule.
- Can a player make several partial redeems against one load until the 8x total is reached? The post says yes, following the published how-to-win-at-juwa FAQ and the panel's 'max redeem remaining' logic.
- The bet sizes in the shots table ($0.05 to $1.00 per shot) are labeled as examples. Real room ranges are set by each provider and were not verified.

## fire-kirin-online

Title: Fire Kirin Online at Casinova: Coming Soon, Not Loadable Yet

- Is there any waitlist or notify-me option for coming-soon games? The post says there is no Fire Kirin request form.
- The post says go-live status should be checked on /games. The overview post says announcements post first on the Telegram channel; I left that out because I could not verify it. Add it?
- Tag 'beginner guide' was replaced with 'coming soon' because the page is no longer a how-to-play guide. OK?

## orion-stars-online

Title: Orion Stars Online: Coming Soon at Casinova, Live Arcade Options

- Tag 'fish table' replaced with 'coming soon' because games.ts lists Orion Stars as Arcade, not a fish game. OK?
- games.ts bio for Orion Stars still says 'Create your Casinova Gaming account, download Orion Stars' and 'daily bonuses'. Should that bio be corrected so the game page matches this post?

## panda-master-online-guide

Title: Panda Master Online: Status at Casinova and How to Prepare

- The post says Panda Master and Ultrapanda are separate entries and makes no claim about whether the two providers are related. Is there anything accurate you want said about that?
- The worked example ($50 first-deposit load becomes $100, redeem opens at $150, caps at $400) is copied from the published Vegas Sweeps and MR All In One guides. games.ts also has GAME_BONUS_REDEEM_RULES (7x to 15x for the bonus wallet). Confirm the 3x and 8x figures are the right ones to quote for a matched load.

## milky-way-fish-table-guide

Title: Milky Way Game at Casinova: Coming Soon, Plus Vblink Status

- The slug and tags say 'fish table' but games.ts lists Milky Way as category Space with slots and fish games. The post says so plainly. Tags were kept; change them?
- Vblink is covered in one short section here as instructed. Confirm any old Vblink post will redirect to this page or the overview.

## ultrapanda-game-guide

Title: Ultrapanda Online: Coming Soon at Casinova, What to Load Now

- games.ts bio for Ultrapanda says 'Download Ultrapanda through Casinova Gaming, create your account'. That contradicts the coming-soon status; should the bio be corrected?
- Step 3 says a requested login 'appears in your panel when the team has issued it' with no time stated. Published guides say 'usually within 24 hours'. Add that figure or leave it out?
