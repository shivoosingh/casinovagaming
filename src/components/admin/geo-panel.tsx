"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteGeoCityAction,
  deleteGeoStateAction,
  upsertGeoCityAction,
  upsertGeoStateAction,
} from "@/lib/actions/admin/geo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

export type GeoStateRow = {
  id: string;
  slug: string;
  name: string;
  abbr: string;
  hero_lede: string;
  meta_description: string;
  sort_order: number;
  is_active: boolean;
};

export type GeoCityRow = {
  id: string;
  state_id: string;
  slug: string;
  name: string;
  description_snippet: string;
  sort_order: number;
  is_active: boolean;
};

type StateForm = Omit<GeoStateRow, "id" | "sort_order"> & { id?: string; sort_order: string };
type CityForm = Omit<GeoCityRow, "id" | "sort_order"> & { id?: string; sort_order: string };

function emptyStateForm(): StateForm {
  return { slug: "", name: "", abbr: "", hero_lede: "", meta_description: "", sort_order: "0", is_active: true };
}

function emptyCityForm(stateId: string): CityForm {
  return { state_id: stateId, slug: "", name: "", description_snippet: "", sort_order: "0", is_active: true };
}

function StateForm({ initial, onDone }: { initial: StateForm; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertGeoStateAction({
        id: form.id,
        slug: form.slug,
        name: form.name,
        abbr: form.abbr,
        hero_lede: form.hero_lede,
        meta_description: form.meta_description,
        sort_order: Number(form.sort_order) || 0,
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
      <p className="font-semibold text-white">{form.id ? "Edit state" : "New state"}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="state-name">Name</Label>
          <Input id="state-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state-slug">Slug</Label>
          <Input id="state-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="texas" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state-abbr">Abbr</Label>
          <Input id="state-abbr" value={form.abbr} onChange={(e) => setForm({ ...form, abbr: e.target.value.toUpperCase() })} maxLength={2} placeholder="TX" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="state-lede">Hero lede</Label>
        <Textarea id="state-lede" value={form.hero_lede} onChange={(e) => setForm({ ...form, hero_lede: e.target.value })} rows={3} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state-meta">Meta description</Label>
        <Textarea id="state-meta" value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} rows={2} />
      </div>
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="state-sort">Sort order</Label>
          <Input id="state-sort" type="number" className="w-24" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-400">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save state"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CityForm({ initial, onDone }: { initial: CityForm; onDone: () => void }) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertGeoCityAction({
        id: form.id,
        state_id: form.state_id,
        slug: form.slug,
        name: form.name,
        description_snippet: form.description_snippet,
        sort_order: Number(form.sort_order) || 0,
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
    <form onSubmit={submit} className={cn(CARD, "space-y-3 p-4")}>
      <p className="text-sm font-semibold text-white">{form.id ? "Edit city" : "New city"}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="City name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
      </div>
      <Textarea
        placeholder="Description snippet"
        value={form.description_snippet}
        onChange={(e) => setForm({ ...form, description_snippet: e.target.value })}
        rows={2}
      />
      <div className="flex items-end gap-3">
        <Input
          type="number"
          className="w-20"
          value={form.sort_order}
          onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
        />
        <label className="flex items-center gap-2 pb-2 text-xs text-slate-400">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
          Active
        </label>
        <div className="ml-auto flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

export function GeoPanel({ states, cities }: { states: GeoStateRow[]; cities: GeoCityRow[] }) {
  const router = useRouter();
  const [editingState, setEditingState] = useState<StateForm | null>(null);
  const [creatingState, setCreatingState] = useState(false);
  const [deletingStateId, setDeletingStateId] = useState<string | null>(null);
  const [activeStateId, setActiveStateId] = useState<string | null>(states[0]?.id ?? null);
  const [editingCity, setEditingCity] = useState<CityForm | null>(null);
  const [creatingCity, setCreatingCity] = useState(false);
  const [deletingCityId, setDeletingCityId] = useState<string | null>(null);

  function refresh() {
    setEditingState(null);
    setCreatingState(false);
    setEditingCity(null);
    setCreatingCity(false);
    router.refresh();
  }

  async function removeState(id: string) {
    if (!window.confirm("Delete this state and all its cities?")) return;
    setDeletingStateId(id);
    const result = await deleteGeoStateAction(id);
    setDeletingStateId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      if (activeStateId === id) setActiveStateId(null);
      router.refresh();
    }
  }

  async function removeCity(id: string) {
    if (!window.confirm("Delete this city?")) return;
    setDeletingCityId(id);
    const result = await deleteGeoCityAction(id);
    setDeletingCityId(null);
    if (!result.ok) toast.error(result.error);
    else {
      toast.success(result.message ?? "Deleted");
      router.refresh();
    }
  }

  const activeState = states.find((s) => s.id === activeStateId) ?? null;
  const activeCities = cities.filter((c) => c.state_id === activeStateId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="space-y-4">
        {!creatingState && !editingState ? (
          <Button className="w-full" onClick={() => setCreatingState(true)}>
            <Plus className="h-4 w-4" /> New state
          </Button>
        ) : creatingState ? (
          <StateForm initial={emptyStateForm()} onDone={refresh} />
        ) : editingState ? (
          <StateForm initial={editingState} onDone={refresh} />
        ) : null}

        <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
          {states.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">No states yet.</p>
          ) : (
            states.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStateId(s.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-white/5",
                  activeStateId === s.id && "bg-violet-500/10"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {s.name} <span className="text-slate-500">({s.abbr})</span>
                  </p>
                  <p className="text-xs text-slate-500">{cities.filter((c) => c.state_id === s.id).length} cities</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!s.is_active && <Badge className="bg-slate-500/15 text-slate-500">Off</Badge>}
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingState({ ...s, sort_order: String(s.sort_order) });
                    }}
                    className="rounded p-1 text-slate-400 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeState(s.id);
                    }}
                    className="rounded p-1 text-slate-400 hover:text-red-400"
                  >
                    {deletingStateId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        {activeState ? (
          <>
            <div className={cn(CARD, "flex items-center justify-between p-4")}>
              <div>
                <p className="font-semibold text-white">
                  {activeState.name} <span className="text-slate-500">/{activeState.slug}</span>
                </p>
                <p className="text-xs text-slate-500">Cities in this state</p>
              </div>
              {!creatingCity && !editingCity && (
                <Button size="sm" onClick={() => setCreatingCity(true)}>
                  <Plus className="h-4 w-4" /> New city
                </Button>
              )}
            </div>

            {creatingCity && <CityForm initial={emptyCityForm(activeState.id)} onDone={refresh} />}
            {editingCity && <CityForm initial={editingCity} onDone={refresh} />}

            <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
              {activeCities.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-400">No cities yet.</p>
              ) : (
                activeCities.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">
                        {c.name} <span className="text-slate-500">/{c.slug}</span>
                      </p>
                      <p className="line-clamp-1 text-xs text-slate-500">{c.description_snippet}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {!c.is_active && <Badge className="bg-slate-500/15 text-slate-500">Off</Badge>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCity({ ...c, sort_order: String(c.sort_order) })}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeCity(c.id)} disabled={deletingCityId === c.id}>
                        {deletingCityId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-400" />}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className={cn(CARD, "p-8 text-center text-sm text-slate-400")}>
            Select or create a state to manage its cities.
          </div>
        )}
      </div>
    </div>
  );
}
