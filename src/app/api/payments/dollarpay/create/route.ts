import { NextResponse } from "next/server";
import { createDollarPayInOrder, type DollarPayChannel } from "@/lib/payments/dollarpay";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, isPay = "1", deviceId = "device_browser", userId } = body;

    if (!amount) {
      return NextResponse.json({ error: "Deposit amount is required" }, { status: 400 });
    }

    // Get current authenticated user if not explicitly passed
    let activeUserId = userId;
    let userName = "guest_player";

    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        activeUserId = user.id;
        userName = user.email ? user.email.split("@")[0] : user.id.slice(0, 12);
      }
    } catch {
      // Fall back if unauthenticated or guest
    }

    // Extract end user IP address from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    let clientIp = "127.0.0.1";

    if (forwardedFor) {
      clientIp = forwardedFor.split(",")[0].trim();
    } else if (realIp) {
      clientIp = realIp.trim();
    }

    // Site base URL
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.casinovasgaming.com").replace(/\/+$/, "");
    const orderSn = `dep_${activeUserId || "guest"}_${Date.now()}`;
    const notifyUrl = `${siteUrl}/api/payments/dollarpay/webhook`;
    const returnUrl = `${siteUrl}/dashboard/deposits`;

    const result = await createDollarPayInOrder({
      orderSn,
      userName,
      amount: String(amount),
      isPay: isPay as DollarPayChannel,
      notifyUrl,
      returnUrl,
      ip: clientIp,
      deviceId: String(deviceId).slice(0, 64),
    });

    if (result.status !== "00000") {
      return NextResponse.json(
        { error: result.msg || "Failed to create DollarPay transaction" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payUrl: result.pay_url,
      orderSn: result.outer_order_sn || orderSn,
      amount: result.amount,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
