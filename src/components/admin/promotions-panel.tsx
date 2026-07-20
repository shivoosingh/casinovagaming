"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deletePromotionAction, upsertPromotionAction } from "@/lib/actions/admin/promotions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const STATUS_OPTIONS = ["draft", "scheduled", "active", "expired", "archived"] as const;

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  scheduled: "bg-blue-500/15 text-blue-300",
  active: "bg-emerald-500/15 text-emerald-300",
  expired: "bg-amber-500/15 text-amber-300",
  archived: "bg-slate-500/15 text-slate-500",
};

export type PromotionRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string | null;
  badge_text: string | null;
  bonus_amount: number;
  code: string | null;
  status: (typeof STATUS_OPTIONS)[number];
  is_featured: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
};

type FormState = Omit<PromotionRow, "id" | "bonus_amount" | "priority"> & {
  id?: string;
  bonus_amount: string;
  priority: string;
};

function emptyForm(): FormState {
  return {
    slug: "",
    title: "",
    summary: "",
    description: "",
    image_url: "",
    badge_text: "",
    bonus_amount: "0",
    code: "",
    status: "draft",
    is_featured: false,
    priority: "100",
    starts_at: "",
    ends_at: "",
  };
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function PromotionForm({ initial, onDone }: { initial: FormState; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertPromotionAction({
        id: form.id,
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        description: form.description,
        image_url: form.image_url ?? "",
        badge_text: form.badge_text ?? "",
        bonus_amount: Number(form.bonus_amount) || 0,
        code: form.code ?? "",
        status: form.status,
        is_featured: form.is_featured,
        priority: Number(form.priority) || 100,
        starts_at: form.starts_at ?? "",
        ends_at: form.ends_at ?? "",
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
      <p className="font-semibold text-white">{form.id ? "Edit promotion" : "New promotion"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="promo-title">Title</Label>
          <Input id="promo-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-slug">Slug</Label>
          <Input id="promo-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="welcome-bonus" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="promo-summary">Summary</Label>
        <Textarea id="promo-summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} rows={2} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="promo-desc">Description</Label>
        <Textarea id="promo-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="promo-bonus">Bonus amount ($)</Label>
          <Input id="promo-bonus" type="number" min="0" step="0.01" value={form.bonus_amount} onChange={(e) => setForm({ ...form, bonus_amount: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-code">Code</Label>
          <Input id="promo-code" value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME50" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-priority">Priority</Label>
          <Input id="promo-priority" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="promo-image">Image URL</Label>
          <Input id="promo-image" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-badge">Badge text</Label>
          <Input id="promo-badge" value={form.badge_text ?? ""} onChange={(e) => setForm({ ...form, badge_text: e.target.value })} placeholder="NEW" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="promo-status">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}>
            <SelectTrigger id="promo-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-starts">Starts</Label>
          <Input id="promo-starts" type="datetime-local" value={form.starts_at ?? ""} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="promo-ends">Ends</Label>
          <Input id="promo-ends" type="datetime-local" value={form.ends_at ?? ""} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded border-border" />
        Featured
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save promotion"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function PromotionsPanel({ promotions }: { promotions: PromotionRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this promotion?")) return;
    setDeletingId(id);
    const result = await deletePromotionAction(id);
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
            <Plus className="h-4 w-4" /> New promotion
          </Button>
        </div>
      ) : (
        <PromotionForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {promotions.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No promotions yet.</p>
        ) : (
          promotions.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{p.title}</p>
                  <Badge className={STATUS_BADGE[p.status] ?? "bg-slate-500/15"}>{p.status}</Badge>
                  {p.is_featured && <Badge className="bg-fuchsia-500/15 text-fuchsia-300">Featured</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{p.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  /promotions/{p.slug} {p.bonus_amount > 0 ? `· $${p.bonus_amount.toFixed(2)} bonus` : ""}
                  {p.code ? ` · code ${p.code}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      slug: p.slug,
                      title: p.title,
                      summary: p.summary,
                      description: p.description,
                      image_url: p.image_url,
                      badge_text: p.badge_text,
                      bonus_amount: String(p.bonus_amount),
                      code: p.code,
                      status: p.status,
                      is_featured: p.is_featured,
                      priority: String(p.priority),
                      starts_at: toDatetimeLocal(p.starts_at),
                      ends_at: toDatetimeLocal(p.ends_at),
                    })
                  }
                  disabled={Boolean(editing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(p.id)} disabled={deletingId === p.id}>
                  {deletingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
