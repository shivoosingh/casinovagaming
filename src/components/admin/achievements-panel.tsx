"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteAchievementAction, upsertAchievementAction } from "@/lib/actions/admin/achievements";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const CATEGORIES = ["gameplay", "social", "loyalty", "milestone", "seasonal", "special"] as const;
const RARITIES = ["common", "rare", "epic", "legendary"] as const;
const CONDITIONS = [
  "vip_points",
  "total_deposits",
  "total_deposit_amount",
  "total_referrals",
  "total_spins",
  "manual",
] as const;

const RARITY_BADGE: Record<string, string> = {
  common: "bg-slate-500/15 text-slate-300",
  rare: "bg-blue-500/15 text-blue-300",
  epic: "bg-fuchsia-500/15 text-fuchsia-300",
  legendary: "bg-amber-500/15 text-amber-300",
};

export type AchievementRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  category: (typeof CATEGORIES)[number];
  rarity: (typeof RARITIES)[number];
  icon: string;
  condition_type: (typeof CONDITIONS)[number];
  condition_value: number;
  reward_amount: number;
  is_secret: boolean;
  is_active: boolean;
  sort_order: number;
};

type FormState = Omit<AchievementRow, "id" | "condition_value" | "reward_amount" | "sort_order"> & {
  id?: string;
  condition_value: string;
  reward_amount: string;
  sort_order: string;
};

function emptyForm(): FormState {
  return {
    key: "",
    name: "",
    description: "",
    category: "milestone",
    rarity: "common",
    icon: "trophy",
    condition_type: "manual",
    condition_value: "1",
    reward_amount: "0",
    is_secret: false,
    is_active: true,
    sort_order: "100",
  };
}

function AchievementForm({ initial, onDone }: { initial: FormState; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertAchievementAction({
        id: form.id,
        key: form.key,
        name: form.name,
        description: form.description,
        category: form.category,
        rarity: form.rarity,
        icon: form.icon,
        condition_type: form.condition_type,
        condition_value: Number(form.condition_value) || 0,
        reward_amount: Number(form.reward_amount) || 0,
        is_secret: form.is_secret,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 100,
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
      <p className="font-semibold text-white">{form.id ? "Edit achievement" : "New achievement"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ach-name">Name</Label>
          <Input id="ach-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ach-key">Key</Label>
          <Input id="ach-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="first_deposit" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ach-desc">Description</Label>
        <Textarea id="ach-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ach-category">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as FormState["category"] })}>
            <SelectTrigger id="ach-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ach-rarity">Rarity</Label>
          <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v as FormState["rarity"] })}>
            <SelectTrigger id="ach-rarity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RARITIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ach-icon">Icon (lucide name)</Label>
          <Input id="ach-icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="trophy" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ach-condition">Unlock condition</Label>
          <Select value={form.condition_type} onValueChange={(v) => setForm({ ...form, condition_type: v as FormState["condition_type"] })}>
            <SelectTrigger id="ach-condition">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ach-value">Target value</Label>
          <Input id="ach-value" type="number" min="0" step="1" value={form.condition_value} onChange={(e) => setForm({ ...form, condition_value: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ach-reward">Reward ($ to wallet_balance)</Label>
          <Input id="ach-reward" type="number" min="0" step="0.01" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2 sm:w-40">
        <Label htmlFor="ach-sort">Sort order</Label>
        <Input id="ach-sort" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={form.is_secret} onChange={(e) => setForm({ ...form, is_secret: e.target.checked })} className="rounded border-border" />
          Secret (hidden until unlocked)
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save achievement"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AchievementsPanel({ achievements }: { achievements: AchievementRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this achievement?")) return;
    setDeletingId(id);
    const result = await deleteAchievementAction(id);
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
            <Plus className="h-4 w-4" /> New achievement
          </Button>
        </div>
      ) : (
        <AchievementForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {achievements.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No achievements yet.</p>
        ) : (
          achievements.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{a.name}</p>
                  <Badge className={RARITY_BADGE[a.rarity] ?? "bg-slate-500/15"}>{a.rarity}</Badge>
                  {a.is_secret && <Badge className="bg-slate-700/40 text-slate-400">Secret</Badge>}
                  {!a.is_active && <Badge className="bg-slate-500/15 text-slate-500">Inactive</Badge>}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{a.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {a.condition_type.replace(/_/g, " ")} ≥ {a.condition_value}
                  {a.reward_amount > 0 ? ` · rewards $${a.reward_amount.toFixed(2)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditing({
                      ...a,
                      condition_value: String(a.condition_value),
                      reward_amount: String(a.reward_amount),
                      sort_order: String(a.sort_order),
                    })
                  }
                  disabled={Boolean(editing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(a.id)} disabled={deletingId === a.id}>
                  {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
