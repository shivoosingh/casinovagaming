import { NextResponse } from "next/server";
import { createDollarPayoutOrder, type DollarPayoutType } from "@/lib/payments/dollarpay";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const { payoutType, accountNo, amount } = body;

    if (!payoutType || !["cashapp", "paypal", "chime"].includes(payoutType)) {
      return NextResponse.json({ error: "Invalid payout type. Choose Cash App, PayPal, or Chime." }, { status: 400 });
    }

    if (!accountNo || typeof accountNo !== "string" || !accountNo.trim()) {
      return NextResponse.json({ error: "Recipient account, tag, or email is required" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 1) {
      return NextResponse.json({ error: "Payout amount must be at least $1.00" }, { status: 400 });
    }

    // Verify player has sufficient balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    const currentBalance = Number(profile?.wallet_balance || 0);
    if (currentBalance < numAmount) {
      return NextResponse.json({ error: `Insufficient wallet balance ($${currentBalance.toFixed(2)})` }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.casinovasgaming.com").replace(/\/+$/, "");
    const orderSn = `po_${user.id}_${Date.now()}`;
    const notifyUrl = `${siteUrl}/api/payments/dollarpay/webhook`;

    const result = await createDollarPayoutOrder({
      payoutType: payoutType as DollarPayoutType,
      orderSn,
      accountNo: accountNo.trim(),
      amount: String(numAmount),
      notifyUrl,
    });

    if (result.status !== "00000") {
      return NextResponse.json({ error: result.msg || "DollarPay payout request failed" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      msg: result.msg,
      orderSn: result.outer_order_sn || orderSn,
      amount: result.amount,
      fee: result.fee,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
