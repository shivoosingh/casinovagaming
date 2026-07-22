"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { assignTicketToMeAction, staffReplyAction, updateTicketStatusAction } from "@/lib/actions/admin/support";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const STATUSES = ["open", "pending", "in_progress", "resolved", "closed"] as const;

export type TicketMessageRow = {
  id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
};

export function SupportTicketThread({
  ticketId,
  status,
  assigned,
  messages,
}: {
  ticketId: string;
  status: (typeof STATUSES)[number];
  assigned: boolean;
  messages: TicketMessageRow[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [sending, startSend] = useTransition();
  const [changingStatus, startStatus] = useTransition();
  const [assigning, startAssign] = useTransition();

  function send() {
    if (!body.trim()) return;
    startSend(async () => {
      const result = await staffReplyAction({ ticketId, body });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function changeStatus(next: string) {
    startStatus(async () => {
      const result = await updateTicketStatusAction({ ticketId, status: next as (typeof STATUSES)[number] });
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(result.message ?? "Updated");
        router.refresh();
      }
    });
  }

  function assignToMe() {
    startAssign(async () => {
      const result = await assignTicketToMeAction(ticketId);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(result.message ?? "Assigned");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className={cn(CARD, "flex flex-wrap items-center justify-between gap-3 p-4")}>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-500">Status</span>
          <Select value={status} onValueChange={changeStatus} disabled={changingStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!assigned && (
          <Button size="sm" variant="outline" onClick={assignToMe} disabled={assigning}>
            {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Assign to me
          </Button>
        )}
      </div>

      <div className={cn(CARD, "max-h-[420px] space-y-3 overflow-y-auto p-4")}>
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.is_staff ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                  m.is_staff ? "bg-violet-600/30 text-white" : "bg-white/5 text-slate-200"
                )}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className="mt-1 text-[10px] text-slate-500">{new Date(m.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {status !== "closed" && (
        <div className={cn(CARD, "space-y-2 p-4")}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Reply to the player…"
          />
          <div className="flex justify-end">
            <Button onClick={send} disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
