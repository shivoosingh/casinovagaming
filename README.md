# Casinova Gaming

Premium gaming support platform built with Next.js 15, TypeScript, Tailwind CSS, Supabase, and Framer Motion.

## Features

- Authentication (email / phone OTP, Google OAuth)
- Game wallet loads, deposits, and redeem flows
- Live chat via Supabase Realtime
- VIP tiers, referrals, reviews, and spin wheel
- Admin dashboard (users, loads, chat, fraud, CMS modules)
- Public marketing pages (blog, leaderboard, contact)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/CASINOVA-FULL-SCHEMA.sql` in the SQL Editor (new empty project)
3. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Create an admin user

After registering:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Supabase (Auth, Postgres, Realtime, Storage)
- **Motion:** Framer Motion
