"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { broadcastAdminNotice } from "@/lib/actions/admin";
import {
  PROMO_BROADCAST_TEMPLATES,
  type PromoBroadcastTemplate,
  type PromoBroadcastType,
} from "@/lib/data/promo-broadcast-templates";
import { toast } from "sonner";
import { Megaphone, Send, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: { value: PromoBroadcastType; label: string }[] = [
  { value: "promo", label: "Promo" },
  { value: "success", label: "Success" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
];

export function AdminBroadcastNotice() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [noticeType, setNoticeType] = useState<PromoBroadcastType>("promo");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [sendChat, setSendChat] = useState(true);
  const [loading, setLoading] = useState(false);

  function applyTemplate(template: PromoBroadcastTemplate) {
    setTitle(template.title);
    setMessage(template.message);
    setNoticeType(template.type);
    setSelectedTemplateId(template.id);
    toast.message(`"${template.label}" loaded — edit if needed, then send to all players.`);
  }

  async function sendNotice(override?: { title: string; message: string; type: PromoBroadcastType }) {
    const trimmedTitle = (override?.title ?? title).trim();
    const trimmedMessage = (override?.message ?? message).trim();
    const type = override?.type ?? noticeType;

    if (!trimmedTitle || !trimmedMessage) {
      toast.error("Enter a title and message first");
      return;
    }

    const ok = window.confirm(
      `Send this notice to EVERY player?\n\nTitle: ${trimmedTitle}\nType: ${type}\n\nThey will get an in-app notification${sendChat ? " and a Support chat message" : ""}.`
    );
    if (!ok) return;

    setLoading(true);
    const result = await broadcastAdminNotice({
      title: trimmedTitle,
      message: trimmedMessage,
      type,
      sendChat,
    });
    if (result.error) toast.error(result.error);
    else {
      toast.success(`Sent to ${result.count ?? 0} players`);
      setTitle("");
      setMessage("");
      setSelectedTemplateId(null);
      setNoticeType("promo");
    }
    setLoading(false);
  }

  async function quickSendTemplate(template: PromoBroadcastTemplate) {
    applyTemplate(template);
    await sendNotice({
      title: template.title,
      message: template.message,
      type: template.type,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-4 sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
            <Zap className="h-4 w-4 text-violet-300" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-white">1-click promo templates</h2>
            <p className="mt-1 text-sm text-slate-400">
              Click a template to load it, or hit <strong className="text-violet-200">Send now</strong>{" "}
              to broadcast instantly to every player.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROMO_BROADCAST_TEMPLATES.map((template) => (
            <div
              key={template.id}
              className={cn(
                "rounded-xl border p-3 transition-colors",
                selectedTemplateId === template.id
                  ? "border-violet-400/50 bg-violet-500/10"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-violet-400/30"
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {template.emoji} {template.label}
                  </p>
                  <p className="text-xs text-slate-500">{template.description}</p>
                </div>
                {template.promoCode && (
                  <Badge variant="outline" className="shrink-0 text-[10px] font-mono">
                    {template.promoCode}
                  </Badge>
                )}
              </div>
              <p className="mb-3 line-clamp-2 text-xs text-slate-400">{template.title}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  disabled={loading}
                  onClick={() => applyTemplate(template)}
                >
                  Load
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-violet-600 text-xs hover:bg-violet-700"
                  disabled={loading}
                  onClick={() => quickSendTemplate(template)}
                >
                  <Send className="mr-1 h-3 w-3" />
                  Send now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
            <Megaphone className="h-4 w-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-white">Custom broadcast</h2>
            <p className="mt-1 text-sm text-slate-400">
              Edit a template above or write your own message. Every non-admin player gets an
              in-app notification bell alert.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500">Title</label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSelectedTemplateId(null);
                }}
                placeholder="e.g. Weekend Deposit Bonus!"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-slate-500">
                Notification type
              </label>
              <select
                value={noticeType}
                onChange={(e) => setNoticeType(e.target.value as PromoBroadcastType)}
                className="mt-1 flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-slate-500">Message</label>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSelectedTemplateId(null);
              }}
              placeholder="Write the promo message players will see…"
              rows={5}
              className="mt-1 min-h-[120px] resize-y"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={sendChat}
              onChange={(e) => setSendChat(e.target.checked)}
              className="rounded border-border"
            />
            Also send as Support chat message
          </label>
        </div>

        <Button
          variant="default"
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => sendNotice()}
          disabled={loading}
        >
          {loading ? "Sending…" : "Send to all players"}
        </Button>
      </div>
    </div>
  );
}
