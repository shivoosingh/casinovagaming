# CLAUDE.md — Casinova Gaming

Project context for Claude Code. Read this first.

## What this is
Casinova Gaming (`casinovasgaming.com`) — a sweepstakes / social-casino platform:
account provisioning for third-party game apps (Juwa, Orion Stars, Fire Kirin,
Game Vault, Vegas Sweeps, Panda Master, Cash Machine, etc.), wallet
deposits/redeems, VIP tiers, referrals, a blog, and a large admin panel
(deposits, payouts, KYC, agent balances, fraud, Telegram broadcast, AI blog).

Real-money/sweepstakes gambling niche. Keep marketing honest: no fake urgency,
no loss-chasing dark patterns. State-level legality claims are a compliance risk.

## Stack
- **Next.js (App Router) + TypeScript**, `src/app/*`. Deployed on **Vercel**.
- **Supabase** (auth, Postgres, storage). Static client: `@/lib/supabase/static`.
- **Tailwind**, framer-motion, lucide-react, radix, sonner.
- **@vercel/analytics** for pageviews + custom events.
- App code uses **npm** (not bun). `package-lock.json` is the lockfile.

## Build / verify
- Type check: `npx tsc --noEmit -p .`
- Build: `npm run build`
- Deploy: push to `main` → Vercel auto-deploys. A failed build is not promoted.

## Environment gotchas (important)
- **Line endings are CRLF** (`core.autocrlf` behavior). When editing files with
  scripts, match CRLF or edits silently fail to match. The Edit/Write tools
  handle this; raw `sed`/`perl`/`node` string matches must use `\r\n`.
- `NEXT_PUBLIC_SITE_URL` sets the canonical host; defaults to
  `https://casinovasgaming.com` (apex, **no www**). `SITE_NAME = "Casinova Gaming"`.
- Dev-env note: a `gstack` skill installed under `~/.claude/skills/` registers a
  `PreToolUse` hook that can block the Read tool for a whole session. If Read is
  denied with an `[autoplan]` message, restart Claude Code. (Unrelated to this repo.)

## SEO / growth conventions (established in this work)
- **One canonical host.** Everything self-canonicalizes to the apex domain.
  `www` → apex is a 301 in `next.config.ts` (also set it in Vercel → Domains).
- **`src/lib/offers.ts` is the single source of truth for bonus copy.** It derives
  the welcome-bonus % / min deposit from `lib/games.ts` (`GAME_BONUS_RULES`) and
  referral % from `lib/constants.ts` (`VIP_TIERS`). Never hard-code offer numbers
  in components — import from here so copy can't drift from what's actually paid.
- **CTA attribution uses `?src=` + UTM params, never `?ref=`.** `?ref` is the
  referral-code field on signup (`referralCodeFromUrl`). Blog→signup source is
  captured to a `cvg_src` cookie by `components/marketing/signup-attribution.tsx`.
- **Analytics events:** `cta_click`, `register_landed`, `scroll_prompt_shown`,
  `scroll_prompt_click` (Vercel custom events need a paid Vercel Analytics plan;
  they no-op safely otherwise).
- **AI blog posts:** template-fallback articles stay `draft` and never
  auto-publish (`lib/ai/blog-generator.ts`) — avoids scaled-content issues.

## SEO diagnosis (current, unresolved)
Search Console: ~339 pages indexed, ~208 not indexed, but ~0 clicks and a handful
of impressions. The site is 3+ months old, so this is **not** a new-site sandbox.
Technical SEO is sound (metadata, canonical, sitemap, robots, schema all correct).
The real causes are quality/authority, not a code bug:
- **Scaled AI content** (~200 templated posts) and **programmatic doorway pages**
  (`src/app/[state]/`, `src/app/[state]/[city]/` from `lib/geo-data.ts`, ~77 geo
  entries) — both are Google-penalized patterns that can suppress the whole domain.
- No backlinks / no authority. Gambling niche is structurally limited on Google.

**Open actions:** check GSC → Security & Manual Actions for a manual penalty;
check 16-month Performance for a drop vs flat-zero; `noindex`/consolidate the
doorway geo pages and the thinnest AI posts (biggest remaining code lever).
Full strategy: `docs/growth-system.md`.

## Work delivered so far (SEO + conversion system)
Pushed in commit `1bc9aaf` (on `main`): www→apex redirect, blog OG/Twitter +
`BlogPosting` JSON-LD, AI draft-gating, old TikTok link removed, `docs/growth-system.md`.

**Uncommitted** (built after, not pushed — awaiting the owner's go-ahead):
- **Conversion:** `components/marketing/blog-cta.tsx`, `blog-game-card.tsx`,
  `signup-sticky-bar.tsx`, `signup-attribution.tsx`, `tracked-link.tsx`;
  `lib/offers.ts`, `lib/seo/game-match.ts`.
- **Internal linking:** `lib/seo/autolink.ts` (game-name → `/games/[slug]`,
  anchor-safe, unit-tested), `components/marketing/related-posts.tsx`.
- **AEO:** `components/marketing/quick-answer.tsx`, `faq-block.tsx`, and a generic
  `FaqSchema` in `lib/seo/json-ld.tsx`.
- **Conversion aid:** `components/marketing/scroll-signup-prompt.tsx` (dismissible,
  ~60% scroll, not exit-intent).
- **Analytics:** `@vercel/analytics` + `<Analytics/>` in `app/layout.tsx`.
- Wired into `app/blog/[slug]/page.tsx` and `app/(auth)/register/page.tsx`.

**Deferred:** game-hub → related-blog-posts linking (needs editing the large
`components/games/game-page-shell.tsx` / `GameLandingClient`).

## Conventions when changing code here
- Prefer reusing existing components (`components/home/promo-banner.tsx`,
  `components/marketing/blog-post-card.tsx`, data helpers in `lib/data/marketing.ts`)
  over new ones.
- Public pages set metadata via `lib/seo/metadata.ts` `createMetadata` (self-canonical).
- Only `/admin` is `noindex`. Do not add `noindex` to public pages without reason.
- Run `npx tsc --noEmit` before claiming done. Do not commit/push unless asked.
