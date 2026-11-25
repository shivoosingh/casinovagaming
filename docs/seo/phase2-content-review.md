# Phase 2 blog rewrites: questions for the owner

Each rewritten post lists what the writer could not verify from the code. Answer these before or after the SQL is applied; none of them blocks the corrections already made.

## casinovasgaming-leaderboard-guide

Title: Casinova Leaderboard Guide: How Rankings Are Calculated

- The old post described daily/weekly/monthly/all-time boards ranked by XP, with a top-10 achievement bonus. None of that exists on the site: there is one all-time top-50 table by VIP points. Confirm no period boards or prizes are planned before this goes live.
- The leaderboard page says 'Sign in to track your rank' but there is no personal rank display, only the points total on the dashboard VIP Status page. The post sends members outside the top 50 there. Should the page wording change?
- The code does not award deposit points or the referral share on card deposits (only on the retired manual-deposit flow). Posts now omit both. Decide whether to wire them up or drop them from the VIP page.
- Referral points: the app awards 10 per referral but a signup trigger in the repo awards 100. The post says 'each referral adds VIP points' without a number. Which value is live?
- The post publishes exact VIP point values: check-in 5 to 11 by streak, 5 for the spin mission, 10 per $1 of spin prize. The published VIP tiers post keeps these vague. OK to publish the exact numbers?
- Points from a spin prize are added to the total but the tier label is not recalculated at that moment, so a member can pass a threshold and still show the old tier until their next check-in. The post does not mention this; flagging for a fix.
- Tag 'leaderboard rewards' kept from the old post even though rank pays no reward. Remove it if you prefer.

## casinovasgaming-next-generation-gaming-platform

Title: Casinova Gaming: How the Platform Works, End to End

- Old post claimed: XP/level tracking, VIP multipliers up to 2x, a 40% uncapped referral reward, a weekly leaderboard prize pool, CashApp/Zelle/crypto deposits, a 20% deposit bonus, $2 to $3 Free Play and Happy Hour. None are supported by the site; all removed.
- The slug says 'next-generation gaming platform'. I dropped that claim from the title because it cannot be verified. OK?
- The code does not award deposit points or the referral share on card deposits (only on the retired manual-deposit flow). Posts now omit both. Decide whether to wire them up or drop them from the VIP page.
- Referral points: the app awards 10 per referral but a signup trigger in the repo awards 100. The post says 'each referral adds VIP points' without a number. Which value is live?
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.
- The AI assistant's built-in answers and the Telegram promo text name payment methods and cashout times the site does not offer. Fix or disable them.
- The repo also defines a separate redeem rule (7x to 15x) for loads from the bonus balance. The post states only the 3x/8x rule. Should posts mention the bonus-balance rule?

## casinovasgaming-telegram-support-guide

Title: Casinova Gaming Telegram and Support: How to Get Help

- The slug promises support via Telegram, but the site has no customer-facing Telegram support inbox: Telegram is a footer link plus internal staff alerts. The post directs support to the site chat. Do staff actually answer direct messages at t.me/casinovagaming? If yes, the post should say so.
- What is the public channel at t.me/casinovagaming used for (promotions, announcements, nothing yet)? The post only says the footer links to it.
- The AI assistant's built-in answers and the Telegram promo text name payment methods and cashout times the site does not offer. Fix or disable them.
- Old post mentioned 'Diamond and Elite' tiers with sub-minute response times, a ticket system with reference numbers, and payment screenshots. None exist; removed.
- The support page prints 'Average response under 5 minutes' and an email address that does not work. The post repeats neither. Fix or remove both on the support page?
- The post says the logged-in chat has 'AI Assistant' and 'Real Agent' tabs and that the visitor chat bubble asks for a login. Confirm that matches what members see today.
- VIP support benefits (basic, priority, 24/7 VIP support, dedicated account manager) are quoted from the VIP page. Are these actually delivered as described?

## casinovasgaming-vs-online-casinos

Title: Casinova Gaming vs Online Casinos: What Is the Difference?

- Old post said Casinova is available 'nationwide', in 'any state', and listed CashApp, Zelle, PayPal, Venmo, Bitcoin, USDT and others. All removed. It also linked to retired posts.
- The licensed-casino column is intentionally generic ('depends on the operator/regulator'). Please have whoever handles legal wording read 'The model is the real difference'; it calls the sweepstakes model 'a different category' without saying it is permitted anywhere.
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.

## casinovasgaming-xp-leveling-explained

Title: Casinova XP and Levels Explained: VIP Points and Tiers

- There is no XP or level system on the site; only VIP points and tiers exist. The old post's XP curve, streak milestones, Weekly Chest, Monthly Vault and coin bonuses were all invented. The rewrite says so and covers VIP points. Consider whether this slug should eventually redirect to the VIP tiers post.
- The code does not award deposit points or the referral share on card deposits (only on the retired manual-deposit flow). Posts now omit both. Decide whether to wire them up or drop them from the VIP page.
- Referral points: the app awards 10 per referral but a signup trigger in the repo awards 100. The post says 'each referral adds VIP points' without a number. Which value is live?
- The post publishes exact point values: check-in 5 to 11 by streak, 5 for the spin mission, 10 per $1 of spin prize. OK to publish? If the values change, the post goes stale.
- The public VIP page shows '+50 game request' and 'Monthly Activity Bonus +200' lines that are not implemented. The post does not repeat them. Remove them from the VIP page?
- Points from a spin prize are added to the total but the tier label is not recalculated at that moment, so a member can pass a threshold and keep the old tier label until the next check-in.
- I wrote that nothing removes points for inactivity (no decay found). Confirm there is no manual or database-side points reset.
- The post says the check-in and mission use the UTC calendar day, while the published daily spin post describes the spin window as a rolling 24 hours. Confirm both descriptions.

## welcome-to-casinova

Title: Welcome to Casinova Gaming: How to Get Started

- The current title contains broken characters; the new title uses a colon.
- Old post said 'Submit a deposit request, wait for approval'. The rewrite describes card checkout with the wallet credited after the payment is confirmed. Correct for all deposits today?
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.
- The code does not award deposit points or the referral share on card deposits (only on the retired manual-deposit flow). Posts now omit both. Decide whether to wire them up or drop them from the VIP page.
- Referral points: the app awards 10 per referral but a signup trigger in the repo awards 100. The post says 'each referral adds VIP points' without a number. Which value is live?
- The AI assistant's built-in answers and the Telegram promo text name payment methods and cashout times the site does not offer. Fix or disable them.
- Step 2 says deposits, logins and loads work before ID approval and only redeem is locked (taken from the published ID guide). Confirm still true.
- Old post mentioned 'better support and bonuses' at higher VIP tiers. Tiers do not change the deposit bonus, so I left that out.

## win-sweeps-vs-other-fish-table-platforms

Title: How Casinova Gaming Differs From Other Fish Table Platforms

- The slug still contains the old brand name. The body never uses it. Do you want a redirect to a cleaner slug at some point?
- Old post claimed: account setup under 1 hour (9 AM to 10 PM EST), 'all 12 games', a 50% bonus on the first deposit, 5 tiers 'Silver to Elite', support via WhatsApp/Messenger, and payouts via CashApp/Zelle/crypto. All removed.
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.
- The AI assistant's built-in answers and the Telegram promo text name payment methods and cashout times the site does not offer. Fix or disable them.
- I wrote that a card payment 'leaves a record with your card issuer'. This is a general statement, not a claim about chargebacks or protection. Happy for it to stay?
- Tag 'best fish table platform' kept from the old post although the article explicitly does not rank platforms. Remove if you prefer.

## sweepstakes-no-deposit-bonus-explained

Title: Sweepstakes No Deposit Bonus: Does Casinova Offer One?

- Old post claimed a 250-coin welcome bonus, 100 coins per daily claim, 1,000 coins per referral, streak milestones up to 15,000 coins and a 50% bonus on the first deposit. None exist; removed.
- Framing used: no signup credit and no promo code, but the daily spin can add $1 to $10 to the wallet without a deposit. Is that the framing you want across the site?
- Can spin winnings be loaded into a game with no deposit history at all, once the wallet reaches $5? The post says yes, following the published daily spin post. Please confirm.
- The post says a spin needs 'an account, not a deposit'. Is anything else required before a first spin, such as a verified email, phone or ID?
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.
- The code does not award deposit points or the referral share on card deposits (only on the retired manual-deposit flow). Posts now omit both. Decide whether to wire them up or drop them from the VIP page.
- If a first deposit is loaded in several parts, is every part matched 100% until that deposit is used up, or only the first load? The post says the match applies to the amount you load and points readers to the load guide.
- The post says the referral code is the only code on the site and that Casinova issues no bonus codes. Confirm the checkout page shows no coupon box.
- Tag 'free sweepstakes coins' kept from the old post; Casinova has no coins. Remove if you prefer.
- The repo defines a separate redeem rule (7x to 15x) for loads from the bonus balance. Does any part of the deposit match fall under that rule? The post states only 3x.

## fish-table-sweepstakes-explained

Title: Fish Table Sweepstakes Games Explained

- Old post said fish table sweepstakes gaming is legal, linked to coming-soon game pages (Fire Kirin, Orion Stars, Panda Master, Ultrapanda) as playable, named CashApp/Zelle/crypto and a 50% bonus on the first deposit. All removed.
- Which live apps include fish games is taken from the game descriptions on the site (Juwa, Game Vault, MR All In One, Vegas Sweeps, Gameroom). Mafia is described as 'slots and arcade'. Does Mafia include fish games?
- The FAQ suggests Juwa as a live option for fish games while Fire Kirin is coming soon. Agree?
- The description of fish table mechanics (rooms sorted by stake, bet per shot, bigger targets pay more) is generic genre knowledge, not something the site states. Comfortable with it?
- Deposits are fixed checkout amounts (the code carries card amounts from $10.99 to $199.99). The post does not quote a smallest deposit. Please confirm the amounts actually shown at checkout.

## beginner-guide-fish-table-games

Title: Fish Table Games for Beginners: Your First Session, Step by Step

- This post is positioned as a first-session walkthrough so it does not repeat what-is-a-fish-table-game (format) or best-fish-table-games-beginners (ranking). Confirm that split is what you want.
- The description of fish table controls (aiming by tap or drag, plus and minus bet buttons, lock-on, special weapons) is generic to the genre and was not checked against any specific live app. Confirm it is acceptable.

## best-fish-table-games-online

Title: Fish Table Games Online: The Five Live Options at Casinova

- Per the fact-check, this post no longer ranks anything: it lists the five live games whose stated mix (game-seo.ts GAME_MIX and games.ts bios) includes fish games, in games.ts order. The slug still says 'best'; the title was changed to 'Fish Table Games Online: The Five Live Options at Casinova'. Confirm the new title.
- Removed the tag 'fish table online 2025' (stale year) and replaced it with 'fish table online'.
- The old post rated 12 games with stars for 'consistency' and 'excitement'. Those ratings had no source and were dropped; the six coming-soon games are named only as not loadable.

## boss-fish-jackpot-timing-guide

Title: Boss Fish and Jackpot Timing: What Is Real and What Is Not

- The old post listed boss names and timers per game (Dragon Boss every 3 to 5 minutes, Dragon Storm, Street Boss, Godfather and so on), including for coming-soon games and for Mafia. Nothing in the code or facts sheet supports them, so they were removed. Confirm you are happy for this post to say timing cannot be predicted.
- What happens to in-game balance above the 8x redeem cap for a load? The post says only that a redeem request cannot exceed what is left under the cap. The panel also has a 'Redeem all (zero out game account)' option; please state the rule.
- Do any of the five live fish lobbies show jackpot counters, and are they provider-run? The post describes jackpots only generically.
- The description of what a boss fish is (large target, higher multiplier, many shots, credited to the player whose shot takes it) is generic to the genre and not checked against a specific live app.

## fish-em-up-online-alternatives

Title: Looking for Fish Em Up? Not at Casinova, and What to Play Instead

- Casinova has no data on Fish Em Up, so the post says only that it is not offered here and that its name suggests a fish shooter. If you know who publishes it and want that stated, tell us; otherwise it stays generic.
- Is it worth keeping a post that targets a game Casinova does not offer? It is honest as written, but the search intent is only partly served. Consider retiring or redirecting it to best-fish-table-games-online.
- The old post linked the six coming-soon games as alternatives and named peer-to-peer and crypto deposit methods. Both were removed.

## game-vault-online-guide

Title: Game Vault Online: How to Get In, Sign In and Play Through Casinova

- This post overlaps with game-vault-all-games-breakdown (what is inside Game Vault) and how-to-create-game-vault-account (signup steps). It was written around access: web player vs download, sign-in and panel troubleshooting. If that is still too close, consider redirecting this slug to game-vault-all-games-breakdown.
- The post tells readers to reach the provider's web player and download only through the Play Game Vault and Download App buttons on the Casinova game page, and does not print the provider URLs. Confirm you prefer that.
- Does the Game Vault web player work in a phone browser on both iPhone and Android? The post defers to the mobile guide instead of stating device support.
- The old post claimed a 'HOT badge' with 'consistently high payout activity' and that the bonus 'applies across all Game Vault games'. Both were removed as unsupported.

## how-to-create-game-vault-account

Title: How to Create a Game Vault Account at Casinova Gaming

- Steps were taken from the code: register form fields (email-auth-form.tsx), the Create Account button and panel (game-landing-client.tsx, game-wallet-load-section.tsx). No time estimate is given for account creation. Other published posts say 'usually within 24 hours'; confirm which wording you want sitewide.
- Replace Account: what happens to credits still on the old Game Vault login? The post tells players to redeem or ask support before replacing.
- The post says only that the register page 'may also offer social sign-in'. Is social sign-in enabled in production, and should it be named?
- The old post asked for a payment screenshot and promised login details by WhatsApp or Telegram within the hour. All of that was removed as it does not fit the current flow.

## how-to-create-juwa-account-online

Title: How to Create a Juwa Account Online Through Casinova Gaming

- Steps were taken from the code (email-auth-form.tsx, game-landing-client.tsx, game-wallet-load-section.tsx). No time estimate is given for account creation; other published posts say 'usually within 24 hours'. Confirm the wording you want.
- In games.ts, Juwa's playUrl and downloadUrl are the same address, so the post says both the Play Juwa and Download App buttons open the provider's Juwa page and does not claim a separate web player. Is there a real Juwa web player that should be linked?
- The post says a Juwa login obtained somewhere else is not connected to the Casinova wallet and to ask support. Is there any process to attach an existing Juwa login?
- The post says only that the register page 'may also offer social sign-in'. Is social sign-in enabled in production, and should it be named?
- This post and how-to-create-game-vault-account follow the same flow by necessity. They are written with different emphasis (this one answers common Juwa signup questions), but the core steps are the same.
- The old post promised login details by WhatsApp or Telegram within the hour, named peer-to-peer and crypto deposit methods, and had a payment screenshot step. All removed.

## juwa-fish-table-game

Title: Juwa Fish Table Game: What It Is and How to Play It at Casinova

- This post is the overview of Juwa (what it is, what a room is like, how access works). how-to-win-at-juwa covers session rules and how-to-create-juwa-account-online covers signup. Some overlap with how-to-win-at-juwa's 'First, what Juwa is' section is unavoidable.
- The old post named Juwa features (Dragon Storm with a 2x multiplier for 30 seconds, Boss Battle worth 50 to 200 credits, Chain Reaction). They are not in games.ts or the facts sheet, so they were removed. If Juwa really has named features you want mentioned, supply them.
- In games.ts, Juwa's playUrl equals its downloadUrl, so the post does not claim a separate browser-based web player for Juwa. Confirm whether one exists.
- The description of fish room controls (rooms grouped by stake, bet per shot, lock-on, special weapons 'in many fish tables') is generic to the genre, not verified against the current Juwa app.
- 'Juwa 777' is used once as an alternative spelling because game-seo.ts uses it in the Juwa page title. Confirm.

## luckytap-slots-guide-casinovasgaming-alternative

Title: Twin Happiness, Smashing Sevens and LuckyTap Titles: Not at Casinova

- Casinova has no data on these four titles or on LuckyTap, so the post says only that they are third-party titles Casinova does not offer. If you want the studio or game type stated, please supply a source.
- Family Feud and Survivor are other parties' brand names. The post uses them only to say the titles are not offered. Confirm you are comfortable with them in a title and tags, or consider retiring this post.
- As with fish-em-up-online-alternatives, this post targets games Casinova does not carry. It is honest as written, but you may prefer to redirect it to a slots guide such as cash-machine-vs-cash-frenzy.
- The old post described specific mechanics of Casinova slots apps ('free-spin chains with a climbing cash meter', 'syndicate jackpot pools', 'progressive jackpot pools'). They are not supported by games.ts and were removed.
- The general description of how a slot works (pick a machine, set a bet, spin; themes and bonus rounds vary) is generic and not checked against a specific live app.

## win-at-fish-table-games-strategies

Title: How to Win at Fish Table Games: What You Can and Cannot Control

- The old post presented cannon power tiers, boss multipliers (10 to 100x), timed bonus events, room coordination and 'variance cycles' as strategies that work. They cannot be verified and were removed. The post now says plainly that outcomes are chance-based.
- Overlaps with how-to-win-at-juwa (same honest stance, Juwa specific) and with boss-fish-jackpot-timing-guide in this batch. This one is the general budget and session plan for any fish lobby; the Juwa post stays Juwa specific. If you would rather keep only one strategy post, this slug could redirect to how-to-win-at-juwa.
- What happens to in-game balance above the 8x redeem cap for a load? The post says only that a redeem request cannot exceed what is left under the cap. The panel also has a 'Redeem all (zero out game account)' option; please state the rule.
- The bet sizes in the shots table ($0.05 to $1.00 per shot) are labeled as examples. Real room ranges are set by each provider and were not verified.

## fire-kirin-online

Title: Fire Kirin Online at Casinova: Coming Soon, Not Loadable Yet

- The overview post says go-live announcements post first on the Telegram channel; I left that out because I could not verify it. Add it?
- Tag 'beginner guide' was replaced with 'coming soon' because the page is no longer a how-to-play guide. OK?
- Coming-soon game pages still show a Download App button. Decide whether to hide it; the post avoids the subject either way.

## orion-stars-online

Title: Orion Stars Online: Coming Soon at Casinova, Live Arcade Options

- Tag 'fish table' replaced with 'coming soon' because games.ts lists Orion Stars as Arcade, not a fish game. OK?
- Coming-soon game pages still show a Download App button. Decide whether to hide it; the post avoids the subject either way.

## panda-master-online-guide

Title: Panda Master Online: Status at Casinova and How to Prepare

- The post says Panda Master and Ultrapanda are separate entries and makes no claim about whether the two are related. Is there anything accurate you want said about that?
- Coming-soon game pages still show a Download App button. Decide whether to hide it; the post avoids the subject either way.

## milky-way-fish-table-guide

Title: Milky Way Game at Casinova: Coming Soon, Plus Vblink Status

- The slug and tags say 'fish table' but games.ts lists Milky Way as category Space with slots and fish games. The post says so plainly. Tags were kept; change them?
- Vblink is covered in one short section here as instructed. Confirm any old Vblink post will redirect to this page or the overview.
- Coming-soon game pages still show a Download App button. Decide whether to hide it; the post avoids the subject either way.

## ultrapanda-game-guide

Title: Ultrapanda Online: Coming Soon at Casinova, What to Load Now

- Coming-soon game pages still show a Download App button. Decide whether to hide it; the post avoids the subject either way.
