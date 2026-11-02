# Casinova Gaming — Organic Search Growth System

Owner: marketing + eng. Goal: organic search traffic. Status: living doc.

## 1. Where we are

Google Search Console, first 3 weeks (from 2026-10-06): 0 clicks, ~4 impressions, ~339 pages indexed, ~208 not indexed. Of the not-indexed pages, **202 are "Alternate page with proper canonical tag"** — the single biggest problem, and it was a technical bug (see §2).

What already works, on almost no domain authority: comparison and how-to posts rank positions 1–10 ("gameroom vs orion stars", "how to deposit cashapp fish table", "game vault vs juwa"). That is the content model to scale.

The ceiling to accept: gambling/sweepstakes content gets limited visibility from Google. Even perfect SEO will grow slower here than in a neutral niche, and some pages may never rank. Plan around long-tail informational intent, not head gambling terms.

## 2. Technical foundation (done in code)

- **One canonical host.** `www.casinovasgaming.com` now 301s to the apex `casinovasgaming.com` (`next.config.ts`). This collapses the 202 duplicate "alternate" URLs. Also set the same redirect in Vercel → Domains (apex as primary, www → redirect) so it runs at the edge.
- **Blog post metadata.** Each post now emits OpenGraph + Twitter cards and `BlogPosting` JSON-LD (`src/app/blog/[slug]/page.tsx`, `src/lib/seo/json-ld.tsx`). Breadcrumb JSON-LD was already present.
- **AI posts default to draft.** Template-fallback articles (identical boilerplate paragraphs) never auto-publish — they are held as drafts for review (`src/lib/ai/blog-generator.ts`). This protects against Google's scaled-content-abuse policy.

Post-deploy checklist is in the plan file's Verification section (preview redirect test, Rich Results Test, GSC URL Inspection + validate).

## 3. Site architecture: hub and spoke

- **Hubs** = `/games/[slug]` (Juwa, Fire Kirin, Orion Stars, Game Vault, Vegas Sweeps, Panda Master). These target the commercial "[game]" and "[game] account/download" intent.
- **Spokes** = `/blog` posts that each link up to one hub and across to two sibling posts. Spoke types:
  - **Comparisons**: "X vs Y" (the proven winner).
  - **How-to**: create account, deposit, redeem/cashout, by game.
  - **Beginner guides** and **alternatives** ("[game] alternatives").
- Every spoke links to its hub with descriptive anchor text; every hub links to its top 3–5 spokes. This passes authority down and keeps crawl depth shallow.

## 4. Keyword & content model

Scale the formats that already rank. Build the target list from:
1. GSC "Queries" and "Pages" (what already gets impressions — go deeper on those).
2. Long-tail variants of the game names with low competition.

Each post must carry first-hand detail a generic AI post can't fake: real step screenshots, actual deposit/redeem times, named payment methods, specific bonus numbers. This is the E-E-A-T difference that moves thin posts out of "Crawled, currently not indexed".

Cadence: **3–5 strong posts per week**, not an AI firehose. Refresh the top 20 posts monthly (update dates, numbers, internal links).

## 5. AI search (answer-engine optimization)

- Lead each post with a 2–3 sentence direct answer to the title question.
- Add an FAQ block with `FAQPage` schema (an `HomeFaqSchema` helper already exists — generalize it for posts).
- Use comparison tables for "vs" posts.
- Keep entity names consistent (always "Game Vault", never "gamevault") so LLM answers attribute correctly.

## 6. Authority & links

- Niche community presence, review-site and directory listings, and digital PR built on original data (e.g. a payout-speed comparison across platforms).
- Do **not** buy links in a gambling niche — high penalty risk.

## 7. Compliance as an SEO asset

- Site-wide 18+/21+ notice and a persistent link to `/responsible-play` (the route exists).
- **State pages that imply legality** (e.g. "fish table games texas") are a policy and legal risk. Reword to informational framing or `noindex` them until a legal review clears the claim. This is flagged for the owner, not an SEO decision.
- Persuasion stays to clarity, trust, and genuine social proof. No fake urgency, countdowns, or loss-chasing mechanics.

## 8. Measurement

Weekly in GSC:
- Not-indexed count (watch the "alternate" 202 fall after the redirect ships).
- Impressions and clicks by cluster (game hub vs blog type).
- Pages ranking positions 4–15 → these are the monthly-refresh targets (closest to page-1 wins).

30-day expectation: the alternate-canonical count drops sharply once Google recrawls; impressions grow off the near-zero baseline. Hold ranking-time claims loosely — new domain + gambling niche means months, not weeks, for competitive terms.

## Open items (need owner input)

- Real `SOCIAL_LINKS` URLs (TikTok currently points to the old `@spinora09`; WhatsApp is a `1234567890` placeholder) — `src/lib/constants.ts`.
- Legal review of state-targeted pages.
- Confirm the Vercel domain redirect is set (belt-and-suspenders with the code redirect).

## 9. 2026-10-27 cleanup (what changed and why)

Live DB on 2026-10-27: 281 posts, 278 published. 176 were templated AI posts (7 titles x 12 games, random suffix, fabricated "RTP / secret payout / 5-minute cashout" claims); 102 were July seed posts stored as markdown but rendered as raw HTML; 49 state pages + cities were bulk-generated doorway pages. Search Console: ~339 indexed, ~0 impressions after 3+ months, no manual action. That pattern is algorithmic quality suppression, so the fix is prune + honest content, not more pages.

- **SQL** `supabase/blog-seed-2026-10-quality-30.sql` (paste into Supabase SQL editor, idempotent): sets `telegram_sent = true` on legacy rows, archives the templated posts and 43 thin/false/doorway posts by slug, prepends a coming-soon notice to 15 kept posts about unloadable games, and upserts 30 HTML posts (19 into already-indexed thin slugs, 11 new). Facts in those posts come from code: 100% first-deposit / 50% second-deposit match, $5-$500 loads, 3x redeem threshold / 8x cap, card-only deposits, 18+.
- **Geo pages** noindex,follow and out of the sitemap until a state is allow-listed in `src/lib/seo/geo-index.ts` after legal review. Copy reworded to informational framing with the compliance line.
- **Archived slugs with a replacement** 301 via `src/lib/seo/retired-posts.ts` -> `next.config.ts`. The rest 404.
- **Blog rendering**: markdown bodies converted at render time (`src/lib/blog/markdown.ts`), FAQ parsed into FAQPage JSON-LD (`src/lib/blog/faq.ts`), one bonus strip before the 2nd H2 (`src/lib/blog/promo-strip.ts`), `dateModified` on BlogPosting, brand suffix on titles, ISR (5 min) with `POST /api/revalidate` for SQL batches (`REVALIDATE_SECRET`).
- **Single source for the bonus**: `DEPOSIT_BONUS_SCHEDULE` in `src/lib/games.ts` feeds both the real payout (`deposit-load-bonus.ts`) and every marketing string (`offers.ts`). Old "50% first deposit" and "100% deposit bonus / weekend boost / regular bonus 10%" copy removed.
- **Fabricated proof removed**: live winners, activity toast, "10K+ players / 99.9% uptime" stats, random "recent winners" on game pages, cashback tiers that did not exist, placeholder WhatsApp in Organization schema. "Spinora" leaks fixed.
- **Metadata**: auth pages noindex with real titles; coming-soon game pages noindex and no `Offer`; FAQPage on /support; OG/Twitter on contact, leaderboard, terms, privacy, blog; homepage H1 names the games; footer has Terms/Privacy/Responsible Play and the 18+ line; intro gate cut from 8.5s to 2.2s and remembered in localStorage.
- **AI layer**: robots.ts allows AI search crawlers explicitly; `/llms.txt` is built from constants and published guides.
- **Signup**: Google sign-in on register, ID upload optional at signup (redeem still requires approval), bonus and trust line shown above the form.
- **Quality gate**: `npm run check:blog` (`scripts/check-blog-content.mjs`) fails on invented numbers, coming-soon games as playable, payment methods not offered, markdown in HTML, missing FAQ, retired links, thin bodies.

Brand facts for writers live in `S:\casinovas\.claude\skills\_brand\casinovas-facts.md`; Search Console notes in `S:\casinovas\.claude\skills\blog-post\search-console-data.md`.
