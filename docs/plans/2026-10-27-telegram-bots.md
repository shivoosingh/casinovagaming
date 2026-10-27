# Plan: WinSweeps-style three-bot Telegram system for Casinova

Spec: the user's request in this session (2026-10-27): "i need telegram bot only set
system according to that ... i have one bot with everything but i want as winsweeps".
Reference implementation: `C:\Users\shivoo\Desktop\WinSweeps-main\src\lib\telegram*`
(read-only). Target repo: `S:\casinovas\Casinova`.

## Global constraints
- Work on branch `telegram-bots`; never push. Do not touch `supabase/seed-parts/*`
  (unrelated uncommitted work).
- No test framework exists. Tests are plain-node assert scripts run with
  `node --experimental-strip-types scripts/check-telegram-bots.ts`; pure modules under
  test must not import `server-only` or `@/` paths and must import siblings with an
  explicit `.ts` extension or not at all. `npx tsc --noEmit -p .` is the type gate.
- Casinova vocabulary: link purpose values are `'admin' | 'player'` (the existing SQL in
  `supabase/final-file-features-casinova.sql` already uses `player`, not WinSweeps'
  `customer`).
- Every Telegram send is best-effort and never throws into a caller. Every webhook
  answers 200. Keys stay in env, never in `site_settings`.
- Existing single-bot setups must keep working after deploy: a missing channel chat id
  falls back to `TELEGRAM_ADMIN_CHAT_ID`; a missing customer-bot token falls back to
  `TELEGRAM_BOT_TOKEN` for promo posts.
- Per-task test command: `bash -lc "node --experimental-strip-types scripts/check-telegram-bots.ts && npx tsc --noEmit -p ."`

## Env vars (final set)
Ops-alert bot: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_FINANCE`, `TELEGRAM_CHAT_USERS`,
`TELEGRAM_CHAT_SWEEPSTAKES`, `TELEGRAM_CHAT_ERRORS`, `TELEGRAM_CHAT_REPORTS`
(fallback for all five: `TELEGRAM_ADMIN_CHAT_ID`).
Admin command bot: `TELEGRAM_ADMIN_BOT_TOKEN`, `TELEGRAM_ADMIN_BOT_USERNAME`,
`TELEGRAM_ADMIN_WEBHOOK_SECRET`.
Customer command bot: `TELEGRAM_CUSTOMER_BOT_TOKEN`, `TELEGRAM_CUSTOMER_BOT_USERNAME`,
`TELEGRAM_CUSTOMER_WEBHOOK_SECRET`, `TELEGRAM_CHAT_PROMO` (fallback `TELEGRAM_PROMO_CHAT_ID`).

## Channel routing of existing alerts
| Alert | Channel |
|---|---|
| deposit proof, wallet load/reload/redeem, game-worker fulfilled | finance |
| signup, new game-account request, customer chat message, human-agent escalation, live-bot escalation, new ticket from the bot | users |
| AI health report | reports |
| cron failures, Telegram send failures | errors |
| promo rotation, blog posts, manual broadcast `channel:"promo"` | promo (customer bot) |

## Task 1: Pure modules + check script

Files: `src/lib/telegram/types.ts`, `src/lib/telegram/channels.ts`,
`src/lib/telegram/bot-policy.ts`, `src/lib/telegram/verify.ts`,
`scripts/check-telegram-bots.ts`.

Interfaces:
```ts
// types.ts
export type TelegramUpdate = { message?: { text?: string; chat: { id: number }; from?: { id: number; username?: string; first_name?: string } } };
export function parseCommand(text: string): { command: string; args: string } | null;
// channels.ts
export type OpsChannel = "finance" | "users" | "sweepstakes" | "errors" | "reports";
export type OutboundChannel = OpsChannel | "admin" | "promo";
export const OPS_CHANNELS: readonly OpsChannel[];
export function splitChatIds(raw: string | undefined): string[]; // comma-separated, trimmed, empty removed
export function resolveChatIds(env: Record<string, string | undefined>, channel: OutboundChannel): string[];
//   finance→TELEGRAM_CHAT_FINANCE … reports→TELEGRAM_CHAT_REPORTS, each falling back to TELEGRAM_ADMIN_CHAT_ID;
//   admin→TELEGRAM_ADMIN_CHAT_ID; promo→TELEGRAM_CHAT_PROMO, then TELEGRAM_PROMO_CHAT_ID, then TELEGRAM_ADMIN_CHAT_ID.
export function resolveBotToken(env: Record<string, string | undefined>, channel: OutboundChannel): string | null;
//   promo→TELEGRAM_CUSTOMER_BOT_TOKEN then TELEGRAM_BOT_TOKEN; everything else→TELEGRAM_BOT_TOKEN. Empty/whitespace = null.
// bot-policy.ts
export const ADMIN_COMMAND_PERMISSIONS: Record<string, string>;
export type CommandDecision = "unlinked" | "not_staff" | "unknown" | "forbidden" | "ok";
export function decideAdminCommand(i: { command: string; known: boolean; linked: boolean; isStaff: boolean; hasPermission: (p: string) => boolean }): CommandDecision;
//   order: unlinked → not_staff → unknown → forbidden (only when ADMIN_COMMAND_PERMISSIONS has the command) → ok
export function decideCustomerCommand(i: { known: boolean; linked: boolean }): "unlinked" | "unknown" | "ok";
export function money(n: number | string | null | undefined): string; // "$1,234.50"
// verify.ts
export function safeEqual(a: string, b: string): boolean; // constant-time over code units, false on length mismatch
```
ADMIN_COMMAND_PERMISSIONS (Casinova keys): users/newusers/activeusers/banned/find → `users.manage`;
vip → `vip.manage`; wallet/deposits/cashouts/loads/transactions/finance → `requests.manage`;
campaigns → `promotions.manage`; tickets/support → `support.manage`; blogs/seo → `cms.manage`;
kyc → `cms.manage`; analytics/traffic/conversion/revenue → `analytics.read`; settings → `settings.manage`.
help/dashboard/today/weekly/monthly need any staff.

Steps:
1. Write `scripts/check-telegram-bots.ts` first (imports `../src/lib/telegram/{types,channels,bot-policy,verify}.ts` relatively, `node:assert/strict`). Cases: parseCommand("/wallet@CasinovaBot  abc def") → {command:"wallet",args:"abc def"}; parseCommand("hello") → null; parseCommand("/Start code1") → {command:"start",args:"code1"}; splitChatIds(" 1, 2 ,,3") → ["1","2","3"]; resolveChatIds with only TELEGRAM_ADMIN_CHAT_ID="-1" → finance ["-1"]; with TELEGRAM_CHAT_FINANCE="-2" → finance ["-2"], users ["-1"]; promo order (CHAT_PROMO over PROMO_CHAT_ID over ADMIN); resolveBotToken promo prefers customer token, falls back to bot token, returns null when both blank; decideAdminCommand each branch in order; forbidden only for a command in the map; decideCustomerCommand branches; money(1234.5)="$1,234.50", money("7")="$7.00", money(null)="$0.00"; safeEqual("abc","abc") true, ("abc","abd") false, ("a","ab") false. Print `check-telegram-bots: N checks ok` at the end.
   Run: `node --experimental-strip-types scripts/check-telegram-bots.ts`
   Expected: fails with ERR_MODULE_NOT_FOUND (modules don't exist yet).
2. Implement the four modules per the interfaces (no imports in channels/bot-policy/verify; types.ts has none).
   Run the script again. Expected: `check-telegram-bots: <N> checks ok`.
3. `npx tsc --noEmit -p .` Expected: no output (exit 0). `npx eslint src/lib/telegram scripts/check-telegram-bots.ts` Expected: clean.
4. Commit: `Add pure Telegram bot helpers and self-check script`.

## Task 2: Ops-alert bot with five channels

Files: `src/lib/telegram/index.ts` (rewrite), `src/lib/telegram/client.ts` (edit),
`src/lib/telegram/notify-admin-*.ts`, `src/lib/telegram/auto-post.ts`,
`src/lib/telegram/promo-broadcast.ts`, `src/app/api/chat/after-send/route.ts`,
`src/app/api/chat/live-bot/route.ts`, `src/app/api/cron/ai-self-analyze/route.ts`,
`src/lib/game-automation/game-worker-engine.ts`, `src/app/api/cron/telegram-promo/route.ts`.

Interfaces:
```ts
// index.ts (keeps its current exports; implementation now uses channels.ts)
export function tgEsc(s: string): string;
export function adminLink(path: string, label: string): string; // SITE_URL + path, SITE_URL from "@/lib/constants"
export function isOpsChannelConfigured(channel: OpsChannel): boolean;
export async function tgNotify(channel: OpsChannel, text: string): Promise<void>;   // every chat id in the channel; failures logged + mirrored to errors (never recursing from errors)
export async function tgNotifyPhoto(channel: OpsChannel, caption: string, photo: { data: ArrayBuffer; filename: string; contentType: string }): Promise<void>;
// client.ts: TelegramOutboundChannel becomes OutboundChannel from channels.ts;
//   getChatIds/getBotToken go through resolveChatIds/resolveBotToken(process.env, channel);
//   sendTelegramMessage/sendTelegramPhoto signatures unchanged; isTelegramConfigured() = ops token + at least one of admin/finance/users/errors chat ids;
//   isTelegramPromoConfigured() = resolveBotToken(promo) && resolveChatIds(promo).length.
```
Steps:
1. Rewrite `index.ts` on top of `channels.ts`; `client.ts` channel resolution on top of `channels.ts` (keep `blogBroadcastChatIds` semantics: promo ids minus admin ids).
2. Reroute callers per the routing table: pass `{ channel: "finance" | "users" | "reports" }` to `sendTelegramMessage/Photo`. `notify-admin-wallet-activity`: `create_account` → users, others → finance. The telegram-promo cron wraps `runTelegramPromoBroadcast` in try/catch and reports a thrown error to `tgNotify("errors", …)`.
3. `npx tsc --noEmit -p .` Expected: exit 0. `npx eslint src/lib/telegram src/app/api/chat src/app/api/cron src/lib/game-automation/game-worker-engine.ts` Expected: clean.
4. Run the check script. Expected: still `checks ok`.
5. Commit: `Route Telegram ops alerts into finance/users/errors/reports channels`.

## Task 3: Link tables, linking helpers, staff lookup, link-code action

Files: `supabase/telegram-bots.sql` (new), `supabase/MIGRATION-ORDER.md` (append section),
`src/lib/telegram/linking.ts` (new), `src/lib/data/admin.ts` (add export),
`src/lib/actions/telegram.ts` (new), `src/lib/telegram/send.ts` (new).

Interfaces:
```ts
export type TelegramBotPurpose = "admin" | "player";               // linking.ts
export async function consumeLinkCode(p: { purpose; code; telegramUserId: number; chatId: number; telegramUsername?: string }): Promise<{ ok: true } | { ok: false; error: string }>;
export async function findLinkedUser(purpose, telegramUserId: number): Promise<string | null>;
export async function getStaffContextForUserId(userId: string): Promise<StaffContext | null>; // data/admin.ts, service role; RBAC rows first, legacy profiles.role==='admin' fallback
export async function generateTelegramLinkCode(purpose: TelegramBotPurpose): Promise<{ ok: true; deepLink: string; expiresInMinutes: number } | { ok: false; error: string }>; // "use server"; admin purpose requires getStaffContext() non-null; player purpose requires a session; TTL 10 min; code = randomUUID without dashes
export async function tgReply(botToken: string, chatId: number, text: string): Promise<void>;               // send.ts
export async function tgBroadcast(botToken: string, chatId: string, text: string, imageUrl?: string): Promise<void>;
```
SQL (idempotent): `CREATE TABLE IF NOT EXISTS public.telegram_link_codes` / `public.telegram_links`
exactly as in `final-file-features-casinova.sql`; then drop + re-add both `purpose` CHECK
constraints as `purpose IN ('admin','player')`; indexes IF NOT EXISTS; RLS enabled, no policies;
`REVOKE ALL ON both tables FROM anon, authenticated;` and a comment explaining service-role-only.
Steps:
1. Write SQL + MIGRATION-ORDER section "Phase 4 — Telegram command bots".
2. Write linking.ts, send.ts, actions/telegram.ts, add `getStaffContextForUserId` (refactor the role-row parsing into a shared helper used by both context functions).
3. `npx tsc --noEmit -p .` Expected: exit 0. eslint on the new files: clean. Check script: ok.
4. Commit: `Add Telegram link tables, linking helpers and staff lookup by user id`.

## Task 4: Admin command bot + webhook

Files: `src/lib/telegram/admin-bot.ts` (new), `src/app/api/telegram/admin/route.ts` (new).

Commands (Casinova data): help; dashboard/today/weekly/monthly (`getDashboardStats`:
members, new, credits issued, pending deposit requests, open tickets); users; newusers;
activeusers (`last_seen_at` 24h); vip (count per `profiles.vip_tier`); banned (`is_suspended`);
wallet <email|name> (`ilike` on email then full_name; wallet_balance, cashout_wallet, vip_tier,
vip_points); find <email|name> (profile summary + kyc_status + created_at); deposits (latest 10
`deposit_requests` + pending count); cashouts (profiles with cashout_wallet > 0, total owed);
loads (`game_load_requests` pending/processing, latest 10); transactions (latest 10
`wallet_transactions`); finance (24h credited deposits from `wallet_transactions` source='deposit',
cash-out owed, pending loads); campaigns (active `promotions`); tickets/support (open
`support_tickets`); kyc (pending `kyc_submissions`); blogs (latest 10 `blog_posts`); seo
(published blog count, active geo cities); analytics/traffic/conversion/revenue (30d signups,
30d deposit total, referral count); settings (`site_settings` first 20).
Flow in `handleAdminUpdate(update)`: no token → return; parse; `/start <code>` → consumeLinkCode
purpose 'admin'; else findLinkedUser; in-memory `rateLimit("tg-admin:" + telegramUserId, 30, 60_000)`;
`getStaffContextForUserId`; `decideAdminCommand`; reply per decision; on ok run handler,
reply, `writeAudit({ actorId, action: "telegram." + command, entityType: "telegram_bot" })`.
Route: POST only, `dynamic = "force-dynamic"`, compare `x-telegram-bot-api-secret-token` with
`TELEGRAM_ADMIN_WEBHOOK_SECRET` via `safeEqual`; wrong/missing → `{ ok: true }` 200 and nothing
else; bad JSON → 200; otherwise `await handleAdminUpdate`, 200.
Steps:
1. Write admin-bot.ts and the route.
2. `npx tsc --noEmit -p .` exit 0; eslint clean; check script ok.
3. Commit: `Add Telegram admin command bot and webhook`.

## Task 5: Customer command bot + webhook

Files: `src/lib/telegram/customer-bot.ts` (new), `src/app/api/telegram/customer/route.ts` (new).

Commands: help; wallet (wallet_balance, cashout_wallet, vip_tier, vip_points); games (completed
`new_account` rows in `game_load_requests` → game_name + game_username); loads (my latest 5
`game_load_requests` with status); deposits (my latest 5 `deposit_requests`); promos (active
`promotions` title + summary); referral (`referral_code` + count of `referrals` where
referrer_id = me + `adminLink("/dashboard/referrals")`); vip; ticket <msg> (insert
`support_tickets` {user_id, subject, category:'other'} + `ticket_messages` row, then
`tgNotify("users", …)` with `adminLink("/admin/support/" + id)`); status (my latest 5 tickets);
static: register `/register`, login `/login`, faq `/help`, terms `/terms`, privacy `/privacy`,
contact `/contact`, website `/`, support (how to use /ticket + `/dashboard/messages`).
Flow mirrors Task 4 with purpose 'player', `rateLimit("tg-player:" + id, 20, 60_000)`,
`decideCustomerCommand`. Route mirrors Task 4 with `TELEGRAM_CUSTOMER_WEBHOOK_SECRET`.
Steps: as Task 4. Commit: `Add Telegram customer command bot and webhook`.

## Task 6: UI, env docs, setup guide

Files: `src/components/shared/link-telegram-button.tsx` (new, client),
`src/components/dashboard/telegram-link-card.tsx` (new, client),
`src/app/dashboard/security/page.tsx` + `src/components/dashboard/security-page-client.tsx`
(render the card below the existing content; pass `botUsername` from
`process.env.TELEGRAM_CUSTOMER_BOT_USERNAME ?? null`), `src/app/admin/telegram/page.tsx`
(new "Command bots" section: three status cards — ops alert channels configured count,
admin bot token/secret/username present, customer bot token/secret/username present — plus a
`LinkTelegramButton purpose="admin"` and the webhook URLs `${SITE_URL}/api/telegram/admin`,
`${SITE_URL}/api/telegram/customer`; replace the single-bot setup guide with the three-bot guide),
`.env.example` (new Telegram block), `docs/telegram-bots.md` (new: BotFather steps, channel chat
ids, Vercel env names, `setWebhook` curl with `secret_token`, SQL to run, cron note),
`CLAUDE.md` (short "Telegram" paragraph pointing at the doc).
`LinkTelegramButton({ purpose })`: calls `generateTelegramLinkCode`, shows "Open in Telegram"
anchor with the deep link and the expiry note; errors via `toast.error`. Uses `Button` from
`@/components/ui/button`, lucide `Send`/`Loader2`/`ExternalLink`.
Steps:
1. Write components, wire pages, docs, env example.
2. `npx tsc --noEmit -p .` exit 0; eslint on changed files clean; check script ok.
3. Commit: `Add Telegram link UI, env docs and three-bot setup guide`.

## Review Focus
- Webhook routes must never return non-2xx and never act on an unverified request.
- No service-role client reachable from a client component; `linking.ts`, `send.ts`,
  `admin-bot.ts`, `customer-bot.ts` carry `import "server-only"`.
- A player can only read their own rows in the customer bot (every query filters by the
  linked `user_id`); the admin bot gates every data command on a permission.
- Fallbacks: with only the legacy `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` set, every
  existing alert still lands in that chat and promo posting still works.
- HTML escaping of every user-supplied string in replies and alerts.
