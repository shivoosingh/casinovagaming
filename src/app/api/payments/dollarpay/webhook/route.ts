import { NextResponse } from "next/server";
import { getDollarPayConfig, verifyDollarPaySignature } from "@/lib/payments/dollarpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let params: Record<string, string> = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const searchParams = new URLSearchParams(text);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    } else if (contentType.includes("application/json")) {
      const json = await req.json();
      for (const key in json) {
        params[key] = String(json[key]);
      }
    } else {
      const text = await req.text();
      const searchParams = new URLSearchParams(text);
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }
    }

    const { merchantKey } = getDollarPayConfig();
    const signature = params.sign || "";

    // Verify signature
    const isValid = verifyDollarPaySignature(params, signature, merchantKey);
    if (!isValid) {
      console.error("[dollarpay/webhook] Invalid MD5 signature from DollarPay webhook:", params);
      return new NextResponse("INVALID SIGNATURE", { status: 400, headers: { "Content-Type": "text/plain" } });
    }

    const { status, pay_status, outer_order_sn, amount, transaction_id } = params;

    // Check if order is successful (status === "00000" and pay_status === "1")
    if (status === "00000" && pay_status === "1" && outer_order_sn) {
      const admin = createAdminClient();
      if (admin) {
        // Extract userId from outer_order_sn (format: dep_{userId}_{timestamp})
        const parts = outer_order_sn.split("_");
        const userId = parts[1];

        if (userId && userId !== "guest") {
          const depositAmount = Number(amount || 0);

          // Get existing wallet balance
          const { data: profile } = await admin
            .from("profiles")
            .select("wallet_balance")
            .eq("id", userId)
            .maybeSingle();

          const currentBalance = Number(profile?.wallet_balance || 0);
          const newBalance = currentBalance + depositAmount;

          // Update user wallet balance
          await admin
            .from("profiles")
            .update({ wallet_balance: newBalance })
            .eq("id", userId);

          // Log transaction in wallet_transactions
          await admin.from("wallet_transactions").insert({
            user_id: userId,
            amount: depositAmount,
            wallet_type: "current",
            transaction_type: "credit",
            source: "dollarpay_deposit",
            description: `DollarPay automated deposit of $${depositAmount.toFixed(2)} (Tx: ${transaction_id || outer_order_sn})`,
            created_by: null,
          });

          console.log(`[dollarpay/webhook] Deposited $${depositAmount} for user ${userId}. New balance: $${newBalance}`);
        }
      }
    }

    // MANDATORY RESPONSE BY DOLLARPAY DOCS: MUST respond with ONLY the string "SUCCESS"
    return new NextResponse("SUCCESS", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err) {
    console.error("[dollarpay/webhook] Exception error:", err);
    return new NextResponse("INTERNAL ERROR", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
