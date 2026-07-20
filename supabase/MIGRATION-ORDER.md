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

## Split files (optional)

Numbered pieces still live in [`fresh-migrations/`](./fresh-migrations/) if you prefer running step-by-step.
