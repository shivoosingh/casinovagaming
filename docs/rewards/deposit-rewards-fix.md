# VIP points and referral share on deposits: fix report

Deployed to production 2026-11-26. This file covers the reward fix only.

## Root cause

`awardDepositRewards` (VIP points, the referrer's first-deposit share, one promo bonus) was called from one place: the admin confirmation of a manual proof-of-payment deposit. The card flow, `creditPaydoraDeposit`, credited the wallet, wrote the deposit row and a notification, and stopped. No database trigger or function did the award instead (checked on the live database: no trigger on `deposit_requests` or `wallet_transactions` awards anything).

The old award was also not safe to repeat: points were added with a read-then-write and no record of which deposit had been rewarded.

## Business rules (unchanged)

Taken from the code as it was, not invented:

| Rule | Value | Source |
|---|---|---|
| VIP points per confirmed deposit | `greatest(1, round(amount))` | `deposit-rewards.ts` (previous version) |
| Tier thresholds | 0 / 500 / 2,000 / 5,000 | `update_vip_tier` trigger in the live database, `constants.ts` |
| Referral share | Deposit amount x the referrer's tier rate: 5%, 10%, 15%, 25% | `constants.ts` `VIP_TIERS` |
| When the share is paid | Only on the referred player's first completed deposit, once per referred player, to the referrer's Total Deposit wallet | `deposit-rewards.ts` (previous version) |
| Not eligible | Pending, processing, rejected, refunded, uncredited, zero or negative deposits | Follows from "after a deposit is already credited" |

## What changed

**Database** (`supabase/fresh-migrations/040-deposit-reward-awards.sql`, applied)

- `deposit_reward_awards`: one row per rewarded deposit (deposit id as primary key, points, referrer, rate, share, `live` or `reconciliation`). This is the VIP and referral history. Row-level security is on with no policies, so players cannot read or write it.
- `award_deposit_rewards(deposit_id, referral_rates, source)`: locks the deposit row, checks it is completed and credited, inserts the ledger row, adds the points, and pays the referral share where the rule applies. All in one transaction: a failure leaves nothing behind. Executable by the service role only.
- Unique index on card deposit ids, so one card payment is one deposit row.
- `protect_reward_columns` trigger: a request made with a player's session cannot change `vip_points`, `vip_tier` or `referred_by`. Admins and server code can.

**Application**

- `src/lib/rewards/award-deposit.ts` (new): calls the function with the rates from `VIP_TIERS`; never throws.
- `src/lib/payments/paydora-wallet.ts`: card deposits call the award after crediting, and again on a repeated notification, so a retry heals a failed award. A refunded deposit is no longer flipped back to completed by a late "paid" notification.
- `src/app/api/payments/paydora/webhook/route.ts`: answers "retry" when only the award failed.
- `src/lib/rewards/deposit-rewards.ts`: the manual flow uses the same award, then the promo bonus as before.
- `src/lib/actions/spin.ts`: spin points and prizes are written with server credentials.
- `src/app/vip/page.tsx`, `src/lib/seo/faq-data.ts`, `src/app/support/page.tsx`, `src/components/home/referral-preview.tsx`, `src/app/llms.txt/route.ts`: state only rewards the code pays.

## How duplicates are prevented

| Situation | Guard |
|---|---|
| The same notification delivered twice | Ledger primary key: the second insert does nothing and the function returns `already_awarded` |
| Two notifications at the same moment | Row lock on the deposit plus the primary key |
| The same payment recorded twice | Unique index on the card deposit id |
| Two first deposits by one player at once | Advisory lock per player, so "is this the first deposit" has one answer |
| A share paid by the old flow | The function looks for the old transaction marker before paying |
| Two shares for one referred player | Partial unique index on the ledger |

## Tests

`scripts/check-deposit-rewards.mjs` runs the real migration in an in-memory Postgres with production-shaped tables and the live trigger functions: 32 tests, all passing.

Covered: card deposit, manual deposit, pending, processing, rejected, refunded, uncredited, zero and negative amounts, unknown deposit, duplicate delivery, calls fired together, duplicate payment rows, all-or-nothing on failure, no referral, referral at each tier, first deposit only, earlier unrewarded deposits, share already paid by the old flow, self-referral, deleted referrer, invalid rates, refund after award, players blocked from the function and the ledger, players blocked from editing their own points, admins and server code still able to.

Limit: the in-memory database has one connection, so truly overlapping transactions cannot be run there. The guards that handle them are asserted to exist.

Other checks: `npx tsc --noEmit -p .` passes; `npm run build` passes; ESLint cannot run (the repo's config is broken, pre-existing).

## Production verification (2026-11-26)

Each check that writes ran inside a transaction forced to roll back; the ledger had 0 rows before and after.

| Check | Result |
|---|---|
| Migration objects present, permissions as intended | Yes: players and anonymous callers cannot execute the function, the service role can |
| Award a real $9.99 card deposit, then again | First call `awarded`, 10 points, profile 42 to 52; second call `already_awarded`; one ledger row |
| A player session tries to add 777 points and set tier platinum | Ignored: points and tier unchanged |
| Server credentials credit a wallet and add points | Works |
| Live pages (`/`, `/vip`, `/games/juwa`, `/blog`, `/spin`, `/leaderboard`, `/register`) | 200 |
| `/vip` and `/llms.txt` | Show the corrected earning rules |
| Status endpoint without login | 401 |

Not verified: a real card payment end to end. There is no test payment environment and no customer deposit was used. The first real deposit after the deploy should produce one row in `deposit_reward_awards`; check with `select * from deposit_reward_awards order by created_at desc limit 5`.

## Historical deposits

Read-only count on 2026-11-25:

| | |
|---|---|
| Card deposits completed before the fix | 9, by 4 players, $139.91 |
| VIP points owed under the rule | 140 |
| Referral shares owed | 0 (no referred player has deposited) |
| Refunds recorded | 0 |
| Manual deposits | 1 ($14), awarded by the old flow |

Nothing was backfilled. `supabase/reconciliation-2026-11-deposit-rewards.sql` has a preview query and a commented award block that uses the same function.

## Rollback

Code and database roll back independently. None of these steps deletes a ledger row, a wallet transaction or points already paid.

1. **Code**: `vercel promote https://casinovagaming-60hrs1fub-darks-projects-0d253498.vercel.app --yes` returns production to the previous build. The old code ignores the new table and function.
2. **Stop new awards without removing history**: `REVOKE EXECUTE ON FUNCTION public.award_deposit_rewards(uuid, jsonb, text) FROM service_role;`
3. **Remove the point protection** (only if a legitimate flow turns out to need it): `DROP TRIGGER protect_reward_columns_trigger ON public.profiles;`
4. **Remove the unique index**: `DROP INDEX public.uq_deposit_requests_paydora_proof;`

Do not drop `deposit_reward_awards`. There are no Edge Functions in this project to roll back.

## Remaining issues

- **The payment webhook is not configured in production.** `PAYDORA_WEBHOOK_SECRET` is not set, so the webhook endpoint answers 500 to every call. Deposits are currently credited only when the player's browser polls the status endpoint after paying. A player who closes the tab too early may not be credited until they return. Set the secret in Vercel and confirm the webhook URL with the payment provider.
- **Refund after award.** A refunded deposit earns nothing if it is refunded first, but there is no existing rule for taking points or a referral share back when the refund comes later, so none was added. Decide the policy.
- **Referral points: 100 or 10.** The live sign-up trigger adds 100; the application constant is 10.
- **Promo bonus.** The old award also paid a flat bonus from an active promotion. It is still called only by the manual flow. There are no promotions in the database today. Decide whether card deposits should trigger it.
- **Wallet credit and the award are two steps.** The card credit runs first and the award second. If the award fails, the deposit is still credited and the award is retried on the next notification or status poll; it is not one transaction.
