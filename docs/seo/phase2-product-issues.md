# Casinova Gaming: product and trust issues found during the SEO review

Date: 2026-11-25. These were investigated in the code only. **Nothing here has been changed.** Each item says what the code does, why it matters for trust, and what I recommend. Items marked "product logic" or "financial logic" need your approval before anyone touches them.

## 1. Redeem rule conflict (3x/8x versus 7x/15x): resolved, no conflict in practice

- **What the code does.** Every load and redeem uses `GAME_BONUS_RULES` (3x threshold, 8x cap): `src/lib/wallet/deposit-redeem-rollover.ts:4-5`, enforced in `src/lib/actions/game-loads.ts:533-569` and again in the database function in `supabase/fresh-migrations/032-remove-bonus-wallet-and-daily-tasks.sql:183-184`.
- **The 7x/15x rule is unused.** `GAME_BONUS_REDEEM_RULES` is referenced only by `src/lib/wallet/bonus-redeem-rollover.ts`, and nothing imports that file. It belonged to the bonus wallet, which was retired: loads must use the Total Deposit wallet (`game-loads.ts:398`) and bonus-wallet redeems are refused.
- **The deposit match falls under 3x/8x.** The match is not tracked as separate money. A $50 load from a first deposit puts $100 in the game; the stored load amount is $50, so redeem opens at $150 and total redeems cap at $400. The worked examples in the posts are correct.
- **Three details the site does not explain today:**
  1. The threshold and cap are calculated from the most recent completed load only. A later $5 load resets them to $15 and $40.
  2. A redeem is refused until the player has pressed Check Balance at least once.
  3. A partial redeem must be $5 to $500, and only one request can be open at a time.
- **Recommendation.** Delete the unused 7x/15x constant and file so nobody quotes it by mistake (financial logic file, but dead code; needs your approval). Add the three details to the redeem guide.
- **Open question for you.** What happens to in-game balance above the 8x cap? The panel offers "Redeem all (zero out game account)", which suggests the excess is removed. The posts now avoid stating either way.

## 2. Hard-coded player counts and star ratings

- **What the code does.** Each game in `src/lib/games.ts` has a fixed `players` number (25,053, 20,902, 20,047 and so on). Game cards print it next to a people icon (`src/components/home/compact-game-card.tsx:83-88`). The admin page labels it "display stat". The same card shows a star rating of 4.9, 4.8, 4.7 or 4.5 chosen from the game's `topRated`, `popular` and `trending` flags (`compact-game-card.tsx:22-27`), not from any reviews.
- **Why it matters.** Both read as real measurements and neither is. Invented popularity figures and ratings are the kind of claim that review sites and regulators single out, and they undercut the accurate content elsewhere.
- **Recommendation.** Remove both from the cards, or replace the count with a real figure if you have one you can stand behind. Visible UI change: needs your approval.

## 3. Support email address cannot receive mail

- **What the code does.** `/support` shows and links `support@casinovagaming.com` (`src/app/support/page.tsx:67-69`), without the "s" in the site's domain.
- **What I checked.** `casinovagaming.com` does not exist as a domain (DNS returns "non-existent domain"). The real domain, `casinovasgaming.com`, has no MX record, so `support@casinovasgaming.com` would not receive mail either. Outgoing mail is sent as `hello@casinovasgaming.com` through Resend.
- **Why it matters.** A player who emails support gets a bounce. A dead contact address is also a negative trust signal for reviewers.
- **Recommendation.** Set up inbound mail for `casinovasgaming.com` (for example Cloudflare Email Routing, since DNS is already on Cloudflare), then correct the address on `/support`. Until then, remove the email option and leave chat. The DNS change is yours to make; the page edit needs your approval.

## 4. Response-time and availability claims

| Claim | Where | Evidence in code |
|---|---|---|
| "Average response under 5 minutes" | `src/app/support/page.tsx:77`, `src/app/contact/page.tsx:58` | None. No response-time measurement exists |
| "Instant Account Setup" | `src/app/(auth)/layout.tsx:63`, `src/components/home/popular-games.tsx:26` | Account creation is automated but not instant; the panel has a "taking longer than usual" state |
| "Game requests ... within 24 hours" | `src/app/support/page.tsx:15`, geo page template | No such figure in the game-page flow |
| "24/7 live chat" / "24/7 support" | Home, footer, about, support, contact, `llms.txt` | The chat widget separates "Instant 24/7 AI Bot Answers" from "Direct line to Real Support Agents" (`src/components/chat/user-quick-chat.tsx:178-181`). The 24/7 part is the AI bot |

- **Recommendation.** Keep "24/7 chat" only if you describe it accurately (an AI assistant around the clock, staff during stated hours), or confirm that staff cover is genuinely 24/7. Drop "under 5 minutes" and "instant" unless you measure them. Copy changes on visible pages: need your approval.

## 5. VIP points and referral share are promised but not paid on card deposits (reward logic)

This is the most important finding in this file.

- **What the site says.** The VIP page, `llms.txt` and several posts say players earn VIP points on deposits and that a referrer receives 5% to 25% of a referred friend's first deposit.
- **What the code does.** The function that awards both, `awardDepositRewards` (`src/lib/rewards/deposit-rewards.ts:11`), is called from one place only: `src/lib/actions/deposits.ts:183`, when an admin confirms a deposit in the old manual proof-of-payment flow. The live card flow (`src/lib/payments/paydora-wallet.ts`, `creditPaydoraDeposit`) credits the wallet through `credit_system_wallet` and does nothing else. I found no database trigger in the repo that would do it instead.
- **Effect.** As the code stands, a card deposit earns no VIP points and pays no referral share. Players and referrers are being told otherwise.
- **Not verified.** Whether a database function outside the repo awards them. One query against production would settle it: compare recent card deposits with the depositor's point history and the referrer's wallet credits.
- **Related gaps:**
  - Spin prizes and the retired game-request flow add `vip_points` without updating `vip_tier` (`src/lib/actions/spin.ts:199`, `src/lib/actions/game-requests.ts:126`), so a player can pass a threshold and keep the old tier label until their next daily check-in.
  - The app awards 10 points per referral (`src/lib/rewards/attach-referral.ts`), but a signup trigger in `supabase/fresh-migrations/038-fix-signup.sql:34-40` awards 100. Which one is live cannot be told from the repo.
  - The VIP page lists "Game Account Request +50" and "Monthly Activity Bonus +200" (`src/app/vip/page.tsx:106-108`). The game-request page has been removed and nothing awards a monthly bonus. It also lists benefits such as "Exclusive games access" and "Custom rewards" that no code implements.
- **What I did.** The rewrites no longer say deposits earn points or that a referral share is paid. Nothing else was changed.
- **Recommendation.** Decide whether the rewards are meant to exist. If yes, call the reward function from the card-deposit path (reward and wallet logic: needs your approval and a test on a small deposit). If no, remove the promises from the VIP page, `llms.txt` and the live VIP and referral posts.

## 6. Public leaderboard has no staff filter (product logic)

- **What the code does.** `src/app/leaderboard/page.tsx:46-50` selects the top 50 profiles by `vip_points`, excluding only suspended accounts. There is no filter on `role`.
- **Effect.** Admin or staff accounts with points appear on the public board. Names are masked, but test accounts with large point totals would sit at the top.
- **Recommendation.** Filter to player accounts. Needs your approval.

## 7. Coming-soon game pages still show a download button

- **What the code does.** On a coming-soon game page the Play link, load panel and deposit section are hidden and Create Account is disabled. The "Download App" button and the "How it works" steps are not hidden (`src/components/games/game-landing-client.tsx:307-327`, `365-391`), so the page links to the provider's download and explains how to create an account and deposit.
- **Why it matters.** It contradicts "cannot be loaded yet". The rewritten posts say nothing about downloads, because "no download is offered" would be false today.
- **Not an issue after all.** The old game-request form lists all 14 games, but its page now redirects to the dashboard (`src/app/dashboard/requests/page.tsx`), so players cannot reach it.
- **Recommendation.** Hide the Download App button and How it works block when a game is coming soon. Needs your approval.

## 8. "No free credits / no-deposit bonus" versus the daily spin

- **What the code does.** `DAILY_SPIN_ENABLED` is `true` (`src/lib/constants.ts:4`). A spin credits $1 to $10 (or nothing) to the Total Deposit wallet, which can be loaded into a game, and the gate requires no deposit (`src/lib/actions/spin.ts:188-209`). `/spin` advertises "One free spin a day".
- **The contradiction.** The site's fact sheet (`llms.txt`) said "Not offered: ... free credits, no-deposit bonuses" on the same page that describes the spin. Eight live posts also say there is no no-deposit bonus.
- **What I did.** Removed that phrase from `llms.txt` (on the branch) and from all 24 rewrites. The eight live posts are unchanged.
- **Question for you.** Is the daily spin live for all players in production? If yes, the eight live posts need one sentence each corrected.

## 9. "Card only" is stated as fact but not enforced in code

- **What the code does.** The deposit window shows whatever methods the payment partner's API returns at runtime (`src/components/payments/dollarpay-deposit-modal.tsx:46-52`, `186-205`), with icons for card, Apple and Google wallets. `src/lib/payments/paydora.ts:8-22,80-85` carries amount tiers for Chime and for Apple/Google wallets as well as cards.
- **Why it matters.** The fact sheet and many posts say "card only" and list Chime as not offered. If the partner returns Apple Pay, Google Pay or Chime, those statements are wrong.
- **What I did.** The rewrites now say "Deposits are by card. Cash App, Zelle, Venmo, PayPal and crypto are not offered", with no "only" and no Chime.
- **Question for you.** Which methods does the live payment account actually show?

## 10. Responsible Play page has no limit tools

- **What the code does.** `/responsible-play` is four paragraphs of advice and a helpline number (`src/app/responsible-play/page.tsx:29-38`). There are no deposit limits, cool-off or self-exclusion tools anywhere in the code.
- **Where it is misdescribed.** Three live posts tell readers to "use the limits and help" on that page. The rewrites now say "advice and helpline number".
- **Recommendation.** Decide whether to build real limits (worth doing for trust, but a product feature), and fix the three live posts.

## 11. AI blog generator still carries the retired templates

- **What the code does.** `src/lib/ai/blog-generator.ts:47,61` still lists "How to Unlock VIP Rewards & Instant 5-Minute Cashouts" and "game vault instant cashout" as topics. Generated posts are saved as drafts unless someone uses "Generate & Publish" (`blog-generator.ts:627`).
- **Why it matters.** One click on "Generate & Publish" recreates the kind of post phase 1 archived 176 of.
- **Recommendation.** Remove the misleading topic templates or disable the publish shortcut. Needs your approval.

## 12. The AI assistant, Telegram posts and broadcast templates say things the site does not offer

- **AI chat assistant.** Its built-in answers (`src/lib/ai/chatbot.ts:14-48`) tell players deposits go through "USDT, Chime, PayPal, or Cash App", to "submit your proof of payment", that cashouts are fulfilled within minutes, and that VIP members get "higher deposit bonus multipliers".
- **Telegram promo post.** The scheduled promo text (`src/app/api/cron/telegram-auto-post/route.ts:76-77`) reads "Deposit today via USDT, Chime, PayPal, or Cash App to claim up to 100% bonus load!". Other templates use "#FreeCredits" and "Claim Exclusive Bonus Credits" (`src/lib/telegram/auto-post.ts`).
- **Admin broadcast templates.** `src/lib/data/promo-broadcast-templates.ts:23-100` contains promo codes (ROYALE100, WEEKEND50 and others), "Cash App, Zelle & USDT accepted", "all 14+ games" and "cashouts complete within 15-30 minutes".
- **Not verified.** Which of these are switched on. That depends on database settings and environment variables I did not read.
- **Why it matters.** These go straight to players and to a public channel. They contradict the site's own rules, and they are the exact claims phase 1 removed from the blog. Accurate articles do not help if the chat bot says the opposite.
- **Recommendation.** Rewrite the assistant's answers from the same facts as `llms.txt`, and correct or disable the promo texts and templates. Needs your approval.

## 13. Smaller inconsistencies

- **Deposit amounts.** The checkout offers fixed amounts (cards $10.99 to $199.99 in `src/lib/payments/paydora.ts:13-17`). $5 is the minimum load, not a deposit amount. The rewrites no longer give "$5 deposit" examples. Please confirm the amounts shown at checkout.
- **Two balances.** The wallet card shows "Total Deposit" and "Deposit Redeem" (`src/components/wallet/wallet-card.tsx:16-17`). Approved redeems go to Deposit Redeem. I found no player-facing step that pays that balance out, so the posts do not describe one.
- **Guests cannot chat.** The chat widget asks visitors to log in first (`src/components/chat/chat-widget.tsx:218-224`), while the support page presents live chat as open to anyone.
- **Support page FAQ is out of date.** It still describes game requests processed "within 24 hours" (`src/app/support/page.tsx:15`).

## 14. Default game login passwords

Covered separately in `S:\casinovas\security-notes\game-login-passwords.md`, which is kept outside the repository. Nothing about it is published in any post.
