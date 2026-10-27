# Telegram bots

Casinova runs three Telegram bots, the same split as the WinSweeps reference system.
They are easy to conflate, so each has its own token and its own job.

| Bot | Token env var | Direction | Job |
|---|---|---|---|
| Ops-alert bot | `TELEGRAM_BOT_TOKEN` | one-way, out | Staff alerts into five fixed channels |
| Admin command bot | `TELEGRAM_ADMIN_BOT_TOKEN` | two-way (webhook) | Staff ask for numbers: `/dashboard`, `/wallet`, `/tickets`… |
| Customer command bot | `TELEGRAM_CUSTOMER_BOT_TOKEN` | two-way (webhook) + out | Players ask `/wallet`, `/games`, `/ticket`…; also posts the public promo channel |

Code: `src/lib/telegram/` (`index.ts` ops alerts, `admin-bot.ts`, `customer-bot.ts`,
`channels.ts` env resolution, `bot-policy.ts` command gating, `linking.ts` account
linking). Webhooks: `src/app/api/telegram/admin` and `src/app/api/telegram/customer`.
Pure rules are checked by `node --experimental-strip-types scripts/check-telegram-bots.ts`.

## 1. Ops-alert bot and its five channels

`tgNotify(channel, html)` and the older `sendTelegramMessage(text, { channel })` post
through `TELEGRAM_BOT_TOKEN` into one chat id per channel:

| Channel | Env var | What lands there |
|---|---|---|
| finance | `TELEGRAM_CHAT_FINANCE` | deposit proofs, wallet loads / reloads / redeems, game-worker fulfilments |
| users | `TELEGRAM_CHAT_USERS` | signups, new game-account requests, customer chat messages, human-agent escalations, tickets opened from the bot |
| sweepstakes | `TELEGRAM_CHAT_SWEEPSTAKES` | promotion / sweepstakes ops (reserved) |
| errors | `TELEGRAM_CHAT_ERRORS` | cron failures, Telegram sends that Telegram itself rejected |
| reports | `TELEGRAM_CHAT_REPORTS` | AI health report |

**Fallback.** Any channel whose env var is unset falls back to `TELEGRAM_ADMIN_CHAT_ID`,
so the old single-chat setup keeps working until you create the groups. A missing token
or an empty channel is a silent no-op, so "no alert arrived" is first an env question.
Failed sends are logged and mirrored into `errors` (never recursively).

## 2. Admin command bot

Staff link their account once: **Admin → Telegram Bot → Link Telegram** mints a
10-minute one-time code and opens `https://t.me/<AdminBot>?start=<code>`; pressing
Start in Telegram redeems it (`telegram_links`, purpose `admin`). From then on the bot
answers commands, each gated on the same permission the matching admin page uses and
written to `audit_logs` as `telegram.<command>`:

- `/dashboard` `/today` `/weekly` `/monthly` (any staff)
- `/users` `/newusers` `/activeusers` `/banned` `/find <email|name>` — `users.manage`
- `/vip` — `vip.manage`
- `/wallet <email|name>` `/deposits` `/cashouts` `/loads` `/transactions` `/finance` — `requests.manage`
- `/campaigns` — `promotions.manage`; `/tickets` `/support` — `support.manage`; `/kyc` `/blogs` `/seo` — `cms.manage`
- `/analytics` `/traffic` `/conversion` `/revenue` — `analytics.read`; `/settings` — `settings.manage`

Everything is read-only. Rate limit: 30 commands per minute per Telegram user.

## 3. Customer command bot

Players link from **Dashboard → Security → Link Telegram** (purpose `player`). Commands:
`/wallet` `/games` `/loads` `/deposits` `/promos` `/referral` `/vip` `/ticket <message>`
`/status` `/support` plus link shortcuts (`/register` `/login` `/faq` `/terms` `/privacy`
`/contact` `/website`). Every query is scoped to the linked user id. `/ticket` creates a
`support_tickets` row and alerts the `users` channel. Rate limit: 20 per minute.

The same bot owns the **promo channel**: `/api/cron/telegram-promo` rotates
`telegram_promo_messages` into `TELEGRAM_CHAT_PROMO` (falls back to
`TELEGRAM_PROMO_CHAT_ID`, then the admin chat) through
`TELEGRAM_CUSTOMER_BOT_TOKEN` (falls back to the ops bot token). Blog auto-posts and the
admin broadcast panel's "promo" target use the same path.

## Setup, once per environment

1. **BotFather.** `/newbot` three times: alerts bot, admin bot, player bot. Keep the tokens
   and the usernames (without `@`).
2. **Chats.** Create the staff groups (finance, users, sweepstakes, errors, reports) and
   the public promo channel. Add the alerts bot to the staff groups and the player bot to
   the promo channel, as admins. Get each chat id from `@getidsbot` (forward a message
   from the group, or add the bot to it). Group ids are negative, e.g. `-1001234567890`.
3. **Env (Vercel → Production).** See the Telegram block in `.env.example`:
   `TELEGRAM_BOT_TOKEN`, the five `TELEGRAM_CHAT_*`, `TELEGRAM_ADMIN_BOT_TOKEN` /
   `_USERNAME` / `_WEBHOOK_SECRET`, `TELEGRAM_CUSTOMER_BOT_TOKEN` / `_USERNAME` /
   `_WEBHOOK_SECRET`, `TELEGRAM_CHAT_PROMO`. Webhook secrets are any long random
   strings (`openssl rand -hex 32`). Redeploy.
4. **SQL.** Run `supabase/telegram-bots.sql` in the Supabase SQL Editor (creates or aligns
   `telegram_link_codes` and `telegram_links`; idempotent). Do this before players try to link.
5. **Webhooks.** Register each once (Telegram sends the secret back as
   `X-Telegram-Bot-Api-Secret-Token`; the routes fail closed without it):

   ```bash
   curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/setWebhook" \
     -d "url=https://casinovasgaming.com/api/telegram/admin" \
     -d "secret_token=<TELEGRAM_ADMIN_WEBHOOK_SECRET>"

   curl "https://api.telegram.org/bot<CUSTOMER_BOT_TOKEN>/setWebhook" \
     -d "url=https://casinovasgaming.com/api/telegram/customer" \
     -d "secret_token=<TELEGRAM_CUSTOMER_WEBHOOK_SECRET>"
   ```

   Check with `curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"`. Changing the
   domain or the secret means running setWebhook again.
6. **Try it.** Admin → Telegram Bot → Link Telegram, press Start, send `/help`. On the
   dashboard, Security → Link Telegram, then `/wallet`.

## Rules worth keeping

- Webhooks **always answer 200** and do nothing on a bad secret: Telegram disables a
  webhook that keeps returning non-2xx.
- Tokens and secrets live in env only, never in `site_settings`.
- Both command bots use the service role, so every player query must filter on the
  linked `user_id`, and every admin command must sit in `ADMIN_COMMAND_PERMISSIONS`
  (`bot-policy.ts`) unless any staff member may run it.
- Escape every user-supplied string with `tgEsc` / `escapeTelegramHtml` before it goes
  into an HTML-mode message.
