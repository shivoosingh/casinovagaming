"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminApproveRedeem, adminRejectRedeem, adminUpdateGameLoadStatus, getAdminPanelUrlForGame } from "@/lib/actions/game-loads";
import { isRedeemAwaitingAdmin } from "@/lib/wallet/redeem-approval";
import { toast } from "sonner";
import type { GameLoadRequest } from "@/lib/game-automation/types";

interface GameLoadActionsProps {
  load: GameLoadRequest & {
    user?: { full_name?: string | null; email?: string } | null;
  };
}

export function GameLoadActions({ load }: GameLoadActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function openPanel() {
    setBusy(true);
    const result = await getAdminPanelUrlForGame(load.game_slug);
    setBusy(false);
    if (result.error || !result.url) {
      toast.error(result.error ?? "Panel URL not configured");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  async function mark(status: "completed" | "failed" | "cancelled") {
    setBusy(true);
    const result = await adminUpdateGameLoadStatus(load.id, status);
    if (result.error) toast.error(result.error);
    else toast.success(`Marked ${status}`);
    router.refresh();
    setBusy(false);
  }

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    const result = action === "approve" ? await adminApproveRedeem(load.id) : await adminRejectRedeem(load.id);
    if (result.error) toast.error(result.error);
    else toast.success(action === "approve" ? "Approved. The cashout is now being sent." : "Redeem rejected. No cashout was sent.");
    router.refresh();
    setBusy(false);
  }

  if (isRedeemAwaitingAdmin(load)) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2">
        <p className="text-xs text-amber-300">KYC is not enough. Approve this to send the cashout.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() => void decide("approve")}
          >
            Approve cashout
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void decide("reject")}
          >
            Reject
          </Button>
        </div>
      </div>
    );
  }

  if (load.status === "completed" || load.status === "cancelled") {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Button size="sm" variant="outline" onClick={openPanel} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
        Open {load.game_name} panel
      </Button>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => mark("completed")} disabled={busy}>
          Complete
        </Button>
        <Button size="sm" variant="destructive" onClick={() => mark("failed")} disabled={busy}>
          Failed
        </Button>
      </div>
      {load.game_username && (
        <p className="text-xs text-[#6b6d8f]">User: {load.game_username}</p>
      )}
      {load.game_password && (
        <p className="text-xs font-mono text-[#00E5FF] break-all">Pass: {load.game_password}</p>
      )}
      {load.error_message && (
        <p className="text-xs text-destructive">{load.error_message}</p>
      )}
    </div>
  );
}
