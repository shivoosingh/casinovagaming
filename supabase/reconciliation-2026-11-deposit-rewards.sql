-- ============================================================================
-- Reconciliation: VIP points for card deposits confirmed before the reward fix.
-- NOT RUN. Review the preview first; run the award block only after approval.
-- Requires 040-deposit-reward-awards.sql.
--
-- Scope: completed, credited CARD deposits (proof_url 'paydora/...') that have
-- no row in deposit_reward_awards. Manual deposits are excluded: the old manual
-- approval flow already awarded their points.
--
-- Snapshot taken 2026-11-25 (read-only query on production):
--   9 card deposits, 4 players, $139.91 in total, 2026-09-24 to 2026-11-24
--   140 VIP points owed under the existing rule (greatest(1, round(amount)))
--   0 referral shares owed: no referred player has a completed deposit
--   0 refunds recorded
--
-- Referral share: the award function pays it only when the deposit is the
-- player's single completed deposit. For history this means a referred player
-- whose only deposit predates the fix would be paid now, at the referrer's
-- CURRENT tier. The preview lists any such row; today there are none.
-- ============================================================================

-- 1. PREVIEW (read-only). Run this on its own and check every row.
SELECT
  d.id                                   AS deposit_request_id,
  d.user_id,
  d.amount,
  d.created_at,
  GREATEST(1, round(d.amount)::int)      AS vip_points_to_award,
  p.vip_points                           AS current_points,
  p.vip_tier                             AS current_tier,
  p.referred_by IS NOT NULL
    AND (SELECT count(*) FROM public.deposit_requests x
         WHERE x.user_id = d.user_id AND x.status = 'completed') = 1
                                         AS would_pay_referral_share
FROM public.deposit_requests d
JOIN public.profiles p ON p.id = d.user_id
WHERE d.proof_url LIKE 'paydora/%'
  AND d.status = 'completed'
  AND d.wallet_credited
  AND d.amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.deposit_reward_awards a WHERE a.deposit_request_id = d.id)
ORDER BY d.created_at;

-- 2. AWARD (after approval). Uses the same function as live deposits, so each
--    deposit can only ever be awarded once, and re-running this is harmless.
--    Rows are marked source = 'reconciliation' in the ledger.
--
-- BEGIN;
-- DO $$
-- DECLARE
--   r record;
--   v_result jsonb;
-- BEGIN
--   FOR r IN
--     SELECT d.id
--     FROM public.deposit_requests d
--     WHERE d.proof_url LIKE 'paydora/%'
--       AND d.status = 'completed'
--       AND d.wallet_credited
--       AND d.amount > 0
--       AND NOT EXISTS (SELECT 1 FROM public.deposit_reward_awards a WHERE a.deposit_request_id = d.id)
--     ORDER BY d.created_at
--   LOOP
--     v_result := public.award_deposit_rewards(
--       r.id,
--       '{"bronze":0.05,"silver":0.1,"gold":0.15,"platinum":0.25}'::jsonb,
--       'reconciliation'
--     );
--     RAISE NOTICE '% -> %', r.id, v_result;
--   END LOOP;
-- END $$;
--
-- -- Check before committing: expect one row per deposit in the preview.
-- SELECT source, count(*) AS deposits, sum(vip_points) AS points, sum(referral_bonus) AS referral_total
-- FROM public.deposit_reward_awards GROUP BY source;
-- COMMIT;   -- or ROLLBACK;

-- 3. UNDO a reconciliation run (points only; removes nothing else).
-- BEGIN;
-- UPDATE public.profiles p
-- SET vip_points = GREATEST(0, p.vip_points - s.points)
-- FROM (SELECT user_id, sum(vip_points) AS points
--       FROM public.deposit_reward_awards WHERE source = 'reconciliation' GROUP BY user_id) s
-- WHERE p.id = s.user_id;
-- DELETE FROM public.deposit_reward_awards WHERE source = 'reconciliation' AND referral_bonus = 0;
-- COMMIT;
