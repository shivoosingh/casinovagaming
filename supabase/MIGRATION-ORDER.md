# Casinova database setup

## One-file setup (recommended)

Run this **once** in Supabase → SQL Editor on a **new empty** project:

**[`CASINOVA-FULL-SCHEMA.sql`](./CASINOVA-FULL-SCHEMA.sql)**

That file is the full schema (auth profiles, wallets, deposits, game loads, chat, reviews, spin, blog, etc.).

Then:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL@example.com';
```

Point `.env.local` at the new project URL + anon + service role keys.

## Phase 2 — admin essentials (recommended, run after the file above)

**[`admin-essentials-casinova.sql`](./admin-essentials-casinova.sql)**

Adds the Phase 2 admin modules on top of the schema above: RBAC tables
(roles/permissions — `profiles.role = 'admin'` still works as the primary
bypass), `audit_logs`, `site_settings`, `promotions` (+ `broadcasts` history),
`reward_rules` / `reward_claims`, `achievements` / `user_achievements`,
`leaderboard_entries` + `compute_leaderboard`, `geo_states` / `geo_cities`,
`support_tickets` / `ticket_messages`, `newsletter_campaigns`,
`payment_methods`, and the `admin_payout_cashout` RPC used by
`/admin/payouts`. It is idempotent (`IF NOT EXISTS` / `DROP POLICY IF EXISTS`)
and safe to re-run. No Spinora marketing/seed content is migrated — new
tables start empty and are managed from `/admin`.

Run it once, in order, right after `CASINOVA-FULL-SCHEMA.sql`:

```sql
-- 1) CASINOVA-FULL-SCHEMA.sql   (base schema)
-- 2) admin-essentials-casinova.sql   (Phase 2 admin modules)
```

## Phase 2b — Payments + Settings upgrade (run after essentials)

**[`admin-payments-settings-upgrade.sql`](./admin-payments-settings-upgrade.sql)**

Widens `payment_methods` (QR, pay link, kind), seeds default methods + site settings
(maintenance, registration, telegram promo, social links), and creates
`telegram_promo_messages`.

## Phase 3 — Final-file admin features (AI / Telegram / KYC / bot health)

**[`final-file-features-casinova.sql`](./final-file-features-casinova.sql)**

Adds (idempotent, safe on existing live DBs):

- KYC: `kyc_submissions`, `profiles.kyc_status` / `kyc_document_url` (review UI only — **no** redeem lock)
- AI: `ai_blog_settings`, `ai_telegram_settings`, `ai_chatbot_settings`, `ai_chat_logs`, `system_health_logs`
- Blog: `blog_posts.status` + sync with `is_published`, `telegram_sent`
- Telegram link tables + Casinova promo seeds

```sql
-- 1) CASINOVA-FULL-SCHEMA.sql
-- 2) admin-essentials-casinova.sql
-- 3) admin-payments-settings-upgrade.sql
-- 4) final-file-features-casinova.sql
```

Then set env keys (`GEMINI_API_KEY` / `OPENAI` / `OPENROUTER` / `GROQ`, `CRON_SECRET`,
`TELEGRAM_*`, `NOWPAYMENTS_*`) and redeploy. Admin pages soft-fail until this SQL runs.

## Phase 4 — Blog + geo content (optional)

**[`final-file-blog-seed-casinova.sql`](./final-file-blog-seed-casinova.sql)**

Seeds the same marketing blog posts as final-file, rebranded to **Casinova Gaming / casinovasgaming**
(Spinora / Win Sweeps replaced). Safe to re-run where statements use `ON CONFLICT (slug)`.

For all 50 US state/city landing pages: open **Admin → Geo** and click **Generate All 50 States**
(uses `geo-all-50-states.ts`). Public routes are `/[state]` and `/[state]/[city]`.

```sql
-- 5) final-file-blog-seed-casinova.sql
```

## Phase 5 — Bot redeem fallback (required for workers)

**[`bot-redeem-fallback-casinova.sql`](./bot-redeem-fallback-casinova.sql)**

Adds `credit_redeem_completion` so game bots can finish redeems if `complete_game_load` fails.
Workers under `workers/` match final-file (shared `create-bot-worker`, CAPTCHA, session keeper).
See [`workers/README.md`](../workers/README.md).

```sql
-- 6) bot-redeem-fallback-casinova.sql
```

## Split files (optional)

Numbered pieces still live in [`fresh-migrations/`](./fresh-migrations/) if you prefer running step-by-step.
