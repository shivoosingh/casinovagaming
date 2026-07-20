"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { searchUsersForAdmin, type AdminUserSearchResult } from "@/lib/actions/admin";
import { deleteRewardRuleAction, grantRewardAction, upsertRewardRuleAction } from "@/lib/actions/admin/rewards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

const REWARD_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "streak_milestone",
  "referral",
  "seasonal",
  "promotional",
  "manual",
] as const;

export type RewardRuleRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  reward_type: (typeof REWARD_TYPES)[number];
  amount: number;
  wallet_type: "current" | "cashout";
  is_active: boolean;
};

type FormState = Omit<RewardRuleRow, "id" | "amount"> & { id?: string; amount: string };

function emptyForm(): FormState {
  return {
    key: "",
    name: "",
    description: "",
    reward_type: "manual",
    amount: "0",
    wallet_type: "current",
    is_active: true,
  };
}

function RuleForm({ initial, onDone }: { initial: FormState; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertRewardRuleAction({
        id: form.id,
        key: form.key,
        name: form.name,
        description: form.description,
        reward_type: form.reward_type,
        amount: Number(form.amount) || 0,
        wallet_type: form.wallet_type,
        is_active: form.is_active,
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
      <p className="font-semibold text-white">{form.id ? "Edit reward rule" : "New reward rule"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="rr-name">Name</Label>
          <Input id="rr-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-key">Key</Label>
          <Input id="rr-key" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="daily_login" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rr-desc">Description</Label>
        <Textarea id="rr-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="rr-type">Reward type</Label>
          <Select value={form.reward_type} onValueChange={(v) => setForm({ ...form, reward_type: v as FormState["reward_type"] })}>
            <SelectTrigger id="rr-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REWARD_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-amount">Amount ($)</Label>
          <Input id="rr-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rr-wallet">Credits wallet</Label>
          <Select value={form.wallet_type} onValueChange={(v) => setForm({ ...form, wallet_type: v as FormState["wallet_type"] })}>
            <SelectTrigger id="rr-wallet">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Total Deposit (current)</SelectItem>
              <SelectItem value="cashout">Deposit Redeem (cashout)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
        Active
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save rule"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function GrantForm({ rules }: { rules: RewardRuleRow[] }) {
  const router = useRouter();
  const [ruleId, setRuleId] = useState(rules[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[]>([]);
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { users } = await searchUsersForAdmin(query);
      setResults(users ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function submit() {
    if (!ruleId) {
      toast.error("Choose a reward rule");
      return;
    }
    if (!selected) {
      toast.error("Search and select a player");
      return;
    }
    startTransition(async () => {
      const result = await grantRewardAction({ ruleId, userId: selected.id, note });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Granted");
      setSelected(null);
      setQuery("");
      setNote("");
      router.refresh();
    });
  }

  if (rules.length === 0) return null;

  return (
    <div className={cn(CARD, "space-y-3 p-5")}>
      <p className="flex items-center gap-2 font-semibold text-white">
        <Gift className="h-4 w-4 text-violet-300" /> Grant a reward
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grant-rule">Rule</Label>
          <Select value={ruleId} onValueChange={setRuleId}>
            <SelectTrigger id="grant-rule">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rules.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} (${r.amount.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="grant-user">Player</Label>
          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-500/20 bg-black/20 px-3 py-2 text-sm">
              <span className="truncate text-white">{selected.full_name || selected.email}</span>
              <button type="button" className="text-xs text-slate-400 underline" onClick={() => setSelected(null)}>
                change
              </button>
            </div>
          ) : (
            <Input id="grant-user" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, email, phone…" />
          )}
        </div>
      </div>
      {!selected && results.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg border border-violet-500/15 bg-black/20 p-1">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setSelected(u);
                setResults([]);
              }}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-slate-200 hover:bg-white/5"
            >
              {u.full_name || "Unnamed"} · <span className="text-slate-500">{u.email}</span>
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="grant-note">Note (optional)</Label>
        <Input id="grant-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this reward was granted" />
      </div>
      <Button onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Grant reward"}
      </Button>
    </div>
  );
}

export function RewardsPanel({ rules }: { rules: RewardRuleRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this reward rule?")) return;
    setDeletingId(id);
    const result = await deleteRewardRuleAction(id);
    setDeletingId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <GrantForm rules={rules.filter((r) => r.is_active && r.amount > 0)} />

      {!editing ? (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(emptyForm())}>
            <Plus className="h-4 w-4" /> New reward rule
          </Button>
        </div>
      ) : (
        <RuleForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {rules.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No reward rules yet.</p>
        ) : (
          rules.map((r) => (
            <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{r.name}</p>
                  <Badge className="bg-violet-500/15 text-violet-200">{r.reward_type.replace(/_/g, " ")}</Badge>
                  {r.is_active ? (
                    <Badge className="bg-emerald-500/15 text-emerald-300">Active</Badge>
                  ) : (
                    <Badge className="bg-slate-500/15 text-slate-400">Inactive</Badge>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{r.description}</p>
                <p className="mt-1 text-xs text-slate-500">
                  key: {r.key} · ${r.amount.toFixed(2)} → {r.wallet_type} wallet
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ ...r, amount: String(r.amount) })}
                  disabled={Boolean(editing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(r.id)} disabled={deletingId === r.id}>
                  {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
