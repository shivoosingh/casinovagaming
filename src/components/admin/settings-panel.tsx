"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteSiteSettingAction, upsertSiteSettingAction } from "@/lib/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

export type SiteSettingRow = {
  key: string;
  value: unknown;
  description: string;
  updated_at: string;
};

function SettingForm({
  initial,
  locked,
  onDone,
}: {
  initial: { key: string; value: string; description: string };
  locked: boolean;
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertSiteSettingAction(form);
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
      <p className="font-semibold text-white">{locked ? `Edit ${form.key}` : "New setting"}</p>
      <div className="space-y-2">
        <Label htmlFor="setting-key">Key</Label>
        <Input
          id="setting-key"
          value={form.key}
          onChange={(e) => setForm({ ...form, key: e.target.value })}
          disabled={locked}
          placeholder="maintenance_mode"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="setting-value">Value (JSON)</Label>
        <Textarea
          id="setting-value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
          rows={4}
          className="font-mono text-xs"
          placeholder='{"enabled": false}'
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="setting-desc">Description</Label>
        <Input
          id="setting-desc"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SettingsPanel({ settings }: { settings: SiteSettingRow[] }) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  function refresh() {
    setEditingKey(null);
    setCreating(false);
    router.refresh();
  }

  async function remove(key: string) {
    if (!window.confirm(`Delete setting "${key}"?`)) return;
    setDeletingKey(key);
    const result = await deleteSiteSettingAction(key);
    setDeletingKey(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  const editingRow = editingKey ? settings.find((s) => s.key === editingKey) : null;

  return (
    <div className="space-y-4">
      {!editingKey && !creating ? (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> New setting
          </Button>
        </div>
      ) : creating ? (
        <SettingForm initial={{ key: "", value: "", description: "" }} locked={false} onDone={refresh} />
      ) : editingRow ? (
        <SettingForm
          initial={{
            key: editingRow.key,
            value: JSON.stringify(editingRow.value, null, 2),
            description: editingRow.description,
          }}
          locked
          onDone={refresh}
        />
      ) : null}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {settings.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No settings yet.</p>
        ) : (
          settings.map((s) => (
            <div key={s.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-white">{s.key}</p>
                {s.description ? <p className="mt-0.5 text-xs text-slate-400">{s.description}</p> : null}
                <pre className="mt-2 max-w-xl overflow-x-auto rounded-lg bg-black/30 p-2 text-[11px] text-violet-200">
                  {JSON.stringify(s.value, null, 2)}
                </pre>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingKey(s.key)}
                  disabled={Boolean(editingKey) || creating}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s.key)} disabled={deletingKey === s.key}>
                  {deletingKey === s.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-red-400" />
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
