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

## Split files (optional)

Numbered pieces still live in [`fresh-migrations/`](./fresh-migrations/) if you prefer running step-by-step.
