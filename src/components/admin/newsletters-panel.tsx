"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteNewsletterCampaignAction,
  sendNewsletterCampaignAction,
  upsertNewsletterCampaignAction,
} from "@/lib/actions/admin/newsletters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  scheduled: "bg-blue-500/15 text-blue-300",
  sending: "bg-amber-500/15 text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
};

export type NewsletterCampaignRow = {
  id: string;
  name: string;
  subject: string;
  heading: string;
  body: string;
  cta_label: string;
  cta_href: string;
  segment: "all" | "test";
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  sent_count: number;
  total_recipients: number;
};

type FormState = Omit<NewsletterCampaignRow, "id" | "status" | "sent_count" | "total_recipients"> & { id?: string };

function emptyForm(): FormState {
  return { name: "", subject: "", heading: "", body: "", cta_label: "Play Now", cta_href: "/", segment: "test" };
}

function CampaignForm({ initial, onDone }: { initial: FormState; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertNewsletterCampaignAction({
        id: form.id,
        name: form.name,
        subject: form.subject,
        heading: form.heading,
        body: form.body,
        cta_label: form.cta_label,
        cta_href: form.cta_href,
        segment: form.segment,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className={cn(CARD, "space-y-4 p-5")}>
      <p className="font-semibold text-white">{form.id ? "Edit campaign" : "New campaign"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nl-name">Internal name</Label>
          <Input id="nl-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-subject">Subject</Label>
          <Input id="nl-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nl-heading">Heading</Label>
        <Input id="nl-heading" value={form.heading} onChange={(e) => setForm({ ...form, heading: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nl-body">Body</Label>
        <Textarea id="nl-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="nl-cta-label">CTA label</Label>
          <Input id="nl-cta-label" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-cta-href">CTA link</Label>
          <Input id="nl-cta-href" value={form.cta_href} onChange={(e) => setForm({ ...form, cta_href: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nl-segment">Segment</Label>
          <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v as FormState["segment"] })}>
            <SelectTrigger id="nl-segment">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test (staff only)</SelectItem>
              <SelectItem value="all">All players</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save campaign"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SendButton({ id, disabled }: { id: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function send() {
    if (!window.confirm("Send this campaign now? This queues an in-app notification for every recipient.")) return;
    startTransition(async () => {
      const result = await sendNewsletterCampaignAction(id);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(result.message ?? "Sent");
        router.refresh();
      }
    });
  }

  return (
    <Button size="sm" onClick={send} disabled={disabled || pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
    </Button>
  );
}

export function NewslettersPanel({ campaigns }: { campaigns: NewsletterCampaignRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this campaign?")) return;
    setDeletingId(id);
    const result = await deleteNewsletterCampaignAction(id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {!editing ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyForm())}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </div>
      ) : (
        <CampaignForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {campaigns.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No newsletter campaigns yet.</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{c.name}</p>
                  <Badge className={STATUS_BADGE[c.status] ?? "bg-slate-500/15"}>{c.status}</Badge>
                  <Badge className="bg-violet-500/15 text-violet-200">{c.segment === "all" ? "All players" : "Test"}</Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{c.subject}</p>
                {c.status === "sent" && (
                  <p className="mt-1 text-xs text-slate-500">Sent to {c.sent_count} of {c.total_recipients}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <SendButton id={c.id} disabled={c.status === "sent" || c.status === "sending"} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ ...c })}
                  disabled={Boolean(editing) || c.status === "sent"}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(c.id)} disabled={deletingId === c.id}>
                  {deletingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
