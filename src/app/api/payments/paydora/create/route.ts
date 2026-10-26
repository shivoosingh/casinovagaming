import { NextResponse } from "next/server";
import { createPaydoraDeposit } from "@/lib/payments/paydora";
import { paydoraCustomerIp } from "@/lib/payments/paydora-client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to deposit." }, { status: 401 });
    }

    const body = await req.json();
    const paymentMethodId = String(body.paymentMethodId || "").trim();
    const amount = Number(body.amount);
    const deviceFingerprint = String(body.deviceFingerprint || "").trim();
    const customerIp = paydoraCustomerIp(req);

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Choose a payment method." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Choose a deposit amount." }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(deviceFingerprint)) {
      return NextResponse.json({ error: "Refresh the page and try the deposit again." }, { status: 400 });
    }
    if (!customerIp) {
      return NextResponse.json(
        { error: "This connection did not include a public network address, so the payment could not start. Try again on your phone's Wi-Fi or mobile data." },
        { status: 400 }
      );
    }

    const deposit = await createPaydoraDeposit({
      paymentMethodId,
      amount,
      userName: user.id,
      customerIp,
      deviceFingerprint,
      customerUserAgent: req.headers.get("user-agent") || undefined,
      idempotencyKey: `dep_${user.id}_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      payUrl: deposit.paymentUrl,
      depositId: deposit.id,
      referenceId: deposit.referenceId,
      amount: deposit.amount,
      status: deposit.status,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status || 500;
    return NextResponse.json({ error: msg }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
