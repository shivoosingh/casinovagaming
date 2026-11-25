# Casinova Gaming: SEO phase 2 audit and work report

Date: 2026-11-25. Branch: `seo-phase2` (one local commit on top of `main`). Nothing in this phase has been deployed or written to the live database.

Status labels: **Completed** (done on the branch and verified locally), **Needs manual approval** (prepared, waiting for you), **Needs external action** (only you or a third party can do it), **Not started**.

## 1. How the audit was done

- Crawled production: all 96 sitemap URLs plus the 190 other internal URLs they link to. Recorded status, redirects, canonical, robots, title, description, headings, word count, images, JSON-LD and links for each.
- Exported the 74 published posts read-only and ran the repo's quality checker against them, extended with metadata checks.
- Read the SEO code: metadata helpers, sitemap, robots, structured data, blog and game page templates, redirects.
- Pulled every page and query with impressions from Search Console (16 months).
- Compared production with `main`: production serves commit `ae9f7b4`, and the phase 1 fixes were re-verified live (real 404s, auth canonicals, geo noindex, 96-URL sitemap, www redirect).

Not measured: Core Web Vitals. Search Console shows "No data" (too little traffic for field data) and the PageSpeed API was over quota when I ran it. See section 7.

## 2. What phase 1 got right (verified, no change needed)

| Check | Result |
|---|---|
| Sitemap URLs returning 200 | 96 of 96 |
| Self-referencing canonical on sitemap URLs | 96 of 96 |
| Noindex pages in the sitemap | 0 |
| Duplicate titles or descriptions | 0 |
| Missing descriptions, missing og:image | 0 |
| Pages with other than one H1 | 0 |
| Invalid JSON-LD | 0 |
| Orphan pages (no inbound link) | 0 |
| Redirect chains longer than one hop | 0 |
| Retired-post redirects | The 7 that are still linked from posts each resolve in one hop to a live post |

## 3. Problems found

### Fixed on the branch (Completed)

| # | Problem | Scale | Fix |
|---|---|---|---|
| 1 | A brand-name rewrite ran inside link URLs, so links to three core guides became `/blog/wallet-deposit-guide-Casinova Gaming` and returned 404 | 27 pages, including the deposit guide linked from 17 posts | The rewrite now only touches the standalone word, never a slug |
| 2 | Breadcrumb structured data pointed the last crumb at the homepage | Every blog post and breadcrumb page | Last crumb no longer carries a wrong URL; game pages gained the missing "Games" level |
| 3 | Game page titles repeated a word ("Game Vault Vault") and ran past 60 characters | 8 live game pages | New titles, all under 60 characters |
| 4 | Game page meta descriptions were 230 to 258 characters and reused marketing copy | 8 pages | Built from the real rules, 120 to 150 characters |
| 5 | Game descriptions made claims the code cannot support ("most trusted", "daily promos", "fast approval"), and coming-soon games read as playable | 14 games | Rewritten to the game type plus the published load and bonus rules |
| 6 | Game pages were thin (about 220 words) and did not link to their guides | 8 pages | Server-rendered FAQ (five questions answered from the rules, with matching FAQ schema) and a guides list |
| 7 | 404 page inherited the homepage canonical | All 404s | Canonical removed |
| 8 | Home and `/games` descriptions over 160 characters; `/games` title was just "All Games" | 2 pages | Shortened; clearer title |
| 9 | Organization schema contact point had no URL | Site-wide | Points to `/support` |
| 10 | Coming-soon game pages were titled "Account & Download" | 6 noindex pages | Titled "Coming Soon" |

### Content (prepared, Needs manual approval)

42 of the 74 posts failed the checker once metadata checks were added (37 on the original checks).

| Group | Posts | State |
|---|---|---|
| Thin legacy posts with false statements, rewritten | 24 | SQL ready, not applied |
| Good posts with a description a few characters too long | 6 | SQL ready, not applied |
| Coming-soon duplicates I recommend consolidating | 10 | Decision needed (section 5) |
| Checker false positives ("no guaranteed payout time") | 2 | No action |

What was wrong in the 24 rewritten posts, all removed: Cash App, Zelle, PayPal, Bitcoin and other payment methods that are not offered; a "50% first deposit bonus"; a 250-coin welcome bonus, daily coin claims and 1,000 coins per referral; an XP and level system that does not exist in the code; daily, weekly and monthly leaderboards with prizes (there is one all-time board, no prizes); "Diamond" and "Elite" VIP tiers; account setup "within the hour" by WhatsApp; "nationwide" availability and legality claims; named boss timers and payout multipliers; a "Best ... in 2025" title; and a title with broken characters.

Each rewrite is 745 to 1,196 words, opens with a direct answer, ends with an FAQ, links only to live pages, and passes the checker with zero findings. The writers flagged 105 points they could not verify from code: `docs/seo/phase2-content-review.md`.

### Flagged, not changed (Needs manual approval)

| # | Finding | Why I did not change it |
|---|---|---|
| A | Homepage section "Players across the US" links to 50 state pages that are all noindex, and its heading implies availability everywhere | Removing it is a visible homepage change |
| B | Game cards show hard-coded player counts (for example 25,053), labelled "display stat" in the admin page | Looks like invented social proof; removing it is a UI change |
| C | `/support` shows `support@casinovagaming.com`, which is a different domain from casinovasgaming.com (no "s") | I cannot tell whether that mailbox is real |
| D | `/support` and `/contact` promise "Average response under 5 minutes" | Unverified claim |
| F | VIP points and the referral share were not paid on card deposits | Fixed 2026-11-26, see `docs/rewards/deposit-rewards-fix.md`. (The tier itself is kept correct by a database trigger.) |
| G | The public leaderboard query has no role filter, so staff accounts could appear | Product behaviour |
| H | `games.ts` defines a second redeem rule (7x to 15x, bonus wallet) while every page and `llms.txt` state 3x and 8x | Confirm which applies to a matched load |
| I | Game pages render on every request (`force-dynamic`) with two to three database calls | Needed for the signed-in account panel; changing it risks the load flow |
| J | Blog post cards use `<h2>` on the homepage, so the homepage H2 list is mostly post titles | Minor; a heading-level change on a shared card |
| K | 19 utility and game pages are under 300 words (`/contact`, `/promotions`, `/vip`, legal pages) | Normal for these page types; game pages are addressed by fix 6 |

## 4. Files changed

Code: `src/lib/data/marketing.ts`, `src/lib/seo/json-ld.tsx`, `src/lib/seo/game-seo.ts`, `src/lib/seo/metadata.ts`, `src/lib/games.ts`, `src/components/seo/breadcrumbs.tsx`, `src/components/games/game-guides.tsx` (new), `src/components/games/game-page-shell.tsx`, `src/components/games/game-landing-client.tsx`, `src/app/games/[slug]/page.tsx`, `src/app/games/page.tsx`, `src/app/not-found.tsx`.

Tooling: `scripts/check-blog-content.mjs` (offline mode, metadata checks), `scripts/build-blog-sql.mjs` (new).

Content: `supabase/blog-phase2/batch-1.json`, `batch-2.json`, `batch-3.json`, `meta-fixes.json`, and the generated `supabase/blog-seed-2026-11-phase2.sql`.

Docs: this file, `phase2-content-review.md`, `backlink-targets.md`.

No authentication, wallet, payment, deposit or redeem logic was touched. No dependency was added. The backup at `S:\casinovas\backups\blog_posts-before-seo-cleanup-2026-11-25.json` is untouched.

## 5. Decision needed: ten coming-soon posts

Six games cannot be loaded yet, but fifteen posts were written about them. Five are now rewritten as honest status pages (one per game). The other ten are how-to-win, create-account and comparison posts for games nobody can play here. They still tell readers to create an account and deposit, with only a "coming soon" note on top.

Search Console shows one or two impressions for three of them over the whole life of the site and none for the rest, so there are no rankings to protect.

Recommended: redirect each to its game's status page and archive it (reversible, same method as phase 1).

| Post | Redirect to |
|---|---|
| how-to-win-at-fire-kirin, how-to-create-fire-kirin-account-online, fire-kirin-advanced-tips | fire-kirin-online |
| how-to-win-at-orion-stars, how-to-create-orion-stars-account, orion-stars-advanced-guide, gameroom-vs-orion-stars | orion-stars-online |
| panda-master-vs-ultrapanda | panda-master-online-guide |
| vblink-vs-milky-way | milky-way-fish-table-guide |
| fire-kirin-vs-juwa-vs-orion-stars | fire-kirin-orion-stars-alternatives |

The alternative is to rewrite all ten, which produces ten near-identical "not available yet" pages.

Three rewritten posts target games the site does not offer at all (`fish-em-up-online-alternatives`, `luckytap-slots-guide-casinovasgaming-alternative`) or overlap an existing post (`game-vault-online-guide`). They are honest as rewritten; redirecting them later is an option, not a need.

## 6. AI search (GEO / AEO)

| Item | State |
|---|---|
| `llms.txt` | Live, generated from code, facts match the site. Its guide list links only to published posts |
| `robots.txt` | Search and user-triggered AI crawlers allowed; private areas disallowed for all |
| Organization and WebSite schema | Present site-wide; contact URL added |
| Article schema | Present on all posts, author and publisher are the organization |
| FAQ schema | On 55 posts today; every rewritten post adds one, and the 8 live game pages gain one. Always mirrors visible text |
| Breadcrumb schema | Fixed (problem 2) |
| Entity consistency | Brand written one way after the rewrites; the old-brand slug `win-sweeps-vs-other-fish-table-platforms` remains |
| Direct answers | Every rewritten post opens with a two to three sentence answer |
| Author and editorial information | Posts are attributed to the organization. There is no named author or editorial policy page. Adding real people is your call; inventing them is not an option |

None of this guarantees a citation or a ranking. Third-party mentions weigh heavily in AI answers, and the site has none yet (see `backlink-targets.md`).

## 7. Technical and performance

- Rendering: every public page returns full HTML from the server. Blog, home and static pages are prerendered or ISR; game pages are server-rendered per request (item I).
- Status codes, sitemap and robots: correct in production.
- HTML weight: `/blog` is 389 KB (74 cards on one page) and the homepage 266 KB. Paginating `/blog` is worth doing once the post count grows; not urgent.
- Images: one image without alt text on the homepage, and it is the decorative hero banner, which is correct.
- Core Web Vitals: **Not started**. No field data exists yet. Run PageSpeed Insights on `/`, `/games/juwa` and one post from a browser and send me the results, or I can retry the API another day.

## 8. Search Console checklist

Weekly, in this order:

1. **Sitemaps**: `sitemap.xml` shows Success and "Discovered pages" has dropped from 522 to about 96. It still showed 522 right after resubmission on 2026-11-25.
2. **Pages (indexing)**: "Not indexed" will rise while Google drops the removed pages. Watch that "Alternate page with proper canonical" and "Duplicate" fall over four to eight weeks, and that "Not found (404)" and "Excluded by noindex" grow instead. Do not press "Validate fix" on those two; they are intended.
3. **Crawled, currently not indexed**: should shrink as rewritten posts are recrawled. If a rewritten post is still there after six weeks, inspect it.
4. **Performance**: total impressions and clicks, then Queries and Pages. The baseline is 1 click and 5 impressions in seven weeks, so look for the number of distinct queries growing, not for position.
5. **CTR and average position**: only meaningful per query once a query has 50 or more impressions.
6. **Manual actions** and **Security issues**: both showed "No issues detected" on 2026-11-25. Check monthly.
7. **Core Web Vitals** and **HTTPS**: check monthly; Web Vitals will stay empty until traffic grows.
8. **Enhancements**: Breadcrumbs should stay valid after the deploy; FAQ items may appear.

URLs to request indexing for (URL Inspection, one at a time, after the phase 2 deploy):

1. `https://casinovasgaming.com/`
2. `/games`
3. `/games/juwa`
4. `/games/game-vault`
5. `/games/vegas-sweeps`
6. `/games/mr-all-in-one`
7. `/blog`
8. `/blog/game-vault-vs-juwa`
9. `/blog/juwa-vs-vegas-sweeps`
10. `/blog/how-to-win-at-juwa`
11. `/blog/wallet-deposit-guide-casinovasgaming`
12. `/blog/how-to-redeem-winnings-fast`
13. `/blog/maximize-fish-table-bonus`
14. `/blog/is-casinovasgaming-legit`
15. `/blog/what-is-a-fish-table-game`

No indexing has been requested or confirmed for any of these.

## 9. Build and test results

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | Pass |
| `npm run build` | Pass |
| Local smoke test of 13 routes on the production build | Pass: expected status, title and robots on each |
| Blog checker on the 24 rewrites | 0 findings |
| Blog checker on all 74 posts with rewrites applied | 79 findings, down from 220; 68 belong to the ten posts in section 5 |
| ESLint | Not run: the repo's ESLint config is broken (known, pre-existing) |
| Automated tests | None exist in the repo |

## 10. Task status

| Task | Status |
|---|---|
| Repository and production audit | Completed |
| Audit of all 74 posts | Completed |
| Code fixes (section 3, items 1 to 10) | Completed on branch, not deployed |
| Deploy phase 2 code to production | Needs manual approval |
| Apply 24 rewrites and 6 metadata fixes to the live database | Needs manual approval |
| Ten coming-soon posts (section 5) | Needs manual approval |
| Flagged items A to K | Needs manual approval |
| 105 content review questions | Needs external action (owner answers) |
| Backlink research and outreach templates | Completed (`backlink-targets.md`) |
| Creating profiles, pitching, posting | Needs external action; nothing was created or sent |
| Manual indexing requests | Needs external action, after deploy |
| Core Web Vitals measurement | Not started |
| `telegram-bots` branch | Needs manual approval: it carries its own copy of the phase 1 SEO commit and predates two commits on `main`. Rebase its six Telegram commits onto `main` and drop that copy before merging. Not touched |
