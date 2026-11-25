# Phase 2: deploy, verify and roll back

Nothing in this file has been run. Every step that changes production needs the owner's explicit go-ahead.

Paths assume the worktree `S:\casinovas\Casinova-seo` on branch `seo-phase2`. The Vercel project is linked in `S:\casinovas\Casinova` (run `vercel` commands from there). `<REF>` is the Supabase project ref for Casinova.

## What ships

| Part | What it changes | Reversible by |
|---|---|---|
| Code (`seo-phase2`) | Link bug, breadcrumb schema, game page titles/descriptions/FAQ/guides, game descriptions, 404 canonical, `llms.txt` line, 10 new redirects | Promoting the previous production deployment |
| `supabase/blog-seed-2026-11-phase2.sql` | Rewrites 24 published posts; small fixes to 7 more | Restore SQL built from the backup |
| `supabase/blog-seed-2026-11-phase2-archive-coming-soon.sql` | Sets 10 posts to `archived` | Setting them back to `published` |

The three parts depend on each other: the redirects send readers to five status pages that are only accurate after the rewrite SQL has run.

## Before deploying

1. Final review of `docs/seo/phase2-article-review.html` is complete and approved.
2. Checks pass on the branch:
   ```
   npx tsc --noEmit -p .
   npm run build
   ```
3. Fresh backup of the blog table (read-only):
   ```
   supabase db query --linked --project-ref <REF> --output-format json "select slug, status, is_published, telegram_sent, published_at, updated_at, title, excerpt, content, seo_title, seo_description, tags, cover_image_url from public.blog_posts order by slug" > S:\casinovas\backups\blog_posts-before-phase2.json
   ```
   Keep the earlier backup `blog_posts-before-seo-cleanup-2026-11-25.json` as it is.
4. Note the current production deployment URL (first "Production" row):
   ```
   vercel ls casinovagaming
   ```

## Deploy order

1. **Push the branch** to get a preview build. Pushing does not change production on this project.
   ```
   git push origin seo-phase2
   vercel ls casinovagaming          # wait for the new Preview row to be Ready
   ```
2. **Check the preview URL** with the "Verify" list below, where it applies (titles, FAQ, redirects, 404).
3. **Run the rewrite SQL** (posts update on the live site within about five minutes):
   ```
   supabase db query --linked --project-ref <REF> -f supabase/blog-seed-2026-11-phase2.sql
   ```
4. **Promote the preview to production**, then move `main` to the same commit:
   ```
   vercel promote <preview-url> --yes
   git push origin seo-phase2:main
   ```
5. **Run the archive SQL**:
   ```
   supabase db query --linked --project-ref <REF> -f supabase/blog-seed-2026-11-phase2-archive-coming-soon.sql
   ```
6. Wait five minutes for cached pages to refresh, then verify.

## Verify (production)

| Check | Expected |
|---|---|
| `/blog/wallet-deposit-guide-casinovasgaming` linked from `/blog/maximize-fish-table-bonus` | Link is intact, returns 200 (no "Casinova Gaming" inside the URL) |
| `/games/juwa` title | `Juwa 777 Online: Account, Download & Load \| Casinova Gaming` |
| `/games/game-vault` | Shows "Game Vault questions" and "Game Vault guides"; page source has one `FAQPage` block |
| `/games/juwa` description length | Under 160 characters |
| `/games/orion-stars` | Title "Orion Stars: Coming Soon", `noindex, follow` |
| Any blog post source, `BreadcrumbList` | Last item has a name and no `item` URL |
| `/zzz-nope` | 404, no `rel="canonical"` |
| `/blog/how-to-win-at-fire-kirin` | 308 to `/blog/fire-kirin-online` |
| `/blog/gameroom-vs-orion-stars` | 308 to `/blog/orion-stars-online` |
| `/blog/vblink-vs-milky-way` | 308 to `/blog/milky-way-fish-table-guide` |
| `/blog/fire-kirin-online` | New title, opens with "coming soon", no deposit instructions |
| `/sitemap.xml` | 86 URLs (96 minus the 10 archived posts), none returning non-200 |
| `/llms.txt` | "Not offered: promo codes, published odds or RTP." |
| `npm run check:blog` | Findings limited to the known false positives (see the audit report) |
| Sign in, open a live game page, wallet panel | Unchanged: Create Account, Load and Redeem behave as before |

Then in Search Console: resubmit the sitemap and request indexing for the URLs listed in the audit report.

## Roll back

Code and content roll back independently. If the site misbehaves, roll back the code first; it takes effect in seconds.

**Code**
```
vercel promote <previous-production-url> --yes
```
Then return `main` to the previous commit with a revert (no force-push):
```
git checkout main
git revert --no-edit ae9f7b4..HEAD
git push origin main
```

**Archived posts** (brings the ten back; the code rollback above removes their redirects)
```
supabase db query --linked --project-ref <REF> "update public.blog_posts set status = 'published' where slug in ('how-to-win-at-fire-kirin','how-to-create-fire-kirin-account-online','fire-kirin-advanced-tips','how-to-win-at-orion-stars','how-to-create-orion-stars-account','orion-stars-advanced-guide','gameroom-vs-orion-stars','panda-master-vs-ultrapanda','vblink-vs-milky-way','fire-kirin-vs-juwa-vs-orion-stars')"
```

**Rewritten posts** (restores text, metadata, tags and status from the backup taken in "Before deploying")
```
node scripts/build-blog-restore-sql.mjs S:\casinovas\backups\blog_posts-before-phase2.json > restore.sql
supabase db query --linked --project-ref <REF> -f restore.sql
```
To restore only some posts, pass a comma-separated slug list as the second argument.

Restored content appears on the site within about five minutes.

## Not part of this deploy

- The `telegram-bots` branch is untouched.
- No product, wallet, payment or reward logic changes. Those are listed in `phase2-product-issues.md` for separate decisions.
- No outreach, account creation or indexing requests.
