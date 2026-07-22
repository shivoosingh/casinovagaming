-- Casinova · bot redeem fallback RPC (from final-file)
-- Safe to re-run. Required so workers can finish redeems if complete_game_load fails.

CREATE OR REPLACE FUNCTION public.credit_redeem_completion(
  p_request_id UUID,
  p_redeemed_amount NUMERIC,
  p_game_username TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.game_load_requests;
  v_credit NUMERIC;
BEGIN
  SELECT * INTO v_row
  FROM public.game_load_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_row.id IS NULL OR v_row.load_type <> 'redeem' THEN
    RAISE EXCEPTION 'Invalid redeem request';
  END IF;

  IF v_row.status = 'completed' THEN
    RETURN;
  END IF;

  v_credit := COALESCE(p_redeemed_amount, NULLIF(v_row.amount, 0));
  IF v_credit IS NULL OR v_credit <= 0 THEN
    RAISE EXCEPTION 'Redeem amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  -- Prefer deposit redeem wallet when wallet_type is current; bonus → bonus_redeem if columns exist
  IF v_row.wallet_type = 'bonus' THEN
    BEGIN
      UPDATE public.profiles
      SET bonus_redeem_wallet = COALESCE(bonus_redeem_wallet, 0) + v_credit
      WHERE id = v_row.user_id;
    EXCEPTION
      WHEN undefined_column THEN
        UPDATE public.profiles
        SET cashout_wallet = cashout_wallet + v_credit
        WHERE id = v_row.user_id;
    END;
  ELSE
    BEGIN
      UPDATE public.profiles
      SET cashout_wallet = cashout_wallet + v_credit
      WHERE id = v_row.user_id;
    EXCEPTION
      WHEN undefined_column THEN
        UPDATE public.profiles
        SET wallet_balance = wallet_balance + v_credit
        WHERE id = v_row.user_id;
    END;
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, amount, wallet_type, transaction_type, source, description, created_by
  )
  VALUES (
    v_row.user_id,
    v_credit,
    CASE WHEN v_row.wallet_type = 'bonus' THEN 'bonus_redeem' ELSE 'cashout' END,
    'credit',
    'game_redeem',
    format('Redeem $%s from %s', v_credit, v_row.game_name),
    v_row.user_id
  );

  UPDATE public.game_load_requests
  SET
    status = 'completed',
    amount = v_credit,
    game_username = COALESCE(p_game_username, game_username),
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_redeem_completion(UUID, NUMERIC, TEXT) TO service_role;

COMMENT ON FUNCTION public.credit_redeem_completion IS
  'Bot fallback: credit redeem wallet and mark game_load_requests completed.';
