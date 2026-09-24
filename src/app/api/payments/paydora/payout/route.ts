import { NextResponse } from "next/server";
import { createPaydoraWithdrawal, getPaydoraPaymentMethods } from "@/lib/payments/paydora";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

    const body = await req.json();
    const methodValue = String(body.method || body.payoutType || "").trim().toLowerCase();
    const amount = Number(body.amount);
    const address = String(body.address || body.accountNo || "").trim();
    const chimePhoneEmail = String(body.chimePhoneEmail || "").trim();

    if (!methodValue) return NextResponse.json({ error: "Choose a payout method." }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 1) {
      return NextResponse.json({ error: "Payout amount must be at least $1.00" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = Number(profile?.wallet_balance || 0);
    if (currentBalance < amount) {
      return NextResponse.json(
        { error: `Insufficient wallet balance ($${currentBalance.toFixed(2)})` },
        { status: 400 }
      );
    }

    const methods = await getPaydoraPaymentMethods();
    const method = methods.withdrawals.find((m) => m.value.toLowerCase() === methodValue);
    if (!method) {
      return NextResponse.json({ error: "That payout method is not enabled." }, { status: 400 });
    }

    const withdrawal = await createPaydoraWithdrawal({
      paymentMethodId: method.id,
      amount,
      userName: user.id,
      address: address || undefined,
      chimePhoneEmail: chimePhoneEmail || undefined,
      cardNumber: body.cardNumber ? String(body.cardNumber) : undefined,
      cardValid: body.cardValid ? String(body.cardValid) : undefined,
      idempotencyKey: `wd_${user.id}_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawal.id,
      referenceId: withdrawal.referenceId,
      status: withdrawal.status,
      amount: withdrawal.amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json({ error: msg }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
