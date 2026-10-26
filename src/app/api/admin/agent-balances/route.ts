import { NextResponse } from "next/server";

import { authorize } from "@/lib/actions/admin/core";
import { fetchAdminAgentBalances } from "@/lib/actions/admin/agent-balances";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const auth = await authorize("requests.manage");
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  try {
    const rows = await fetchAdminAgentBalances();
    return NextResponse.json({
      ok: true,
      rows,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to load balances",
      },
      { status: 500 }
    );
  }
}
