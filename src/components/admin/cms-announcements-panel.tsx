"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  deleteAnnouncementAction,
  upsertAnnouncementAction,
} from "@/lib/actions/admin/cms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CARD =
  "rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] backdrop-blur-xl";

export type AdminAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: "promotion" | "update" | "system";
  is_active: boolean;
  created_at: string;
};

const TYPE_OPTIONS = [
  { value: "promotion", label: "Promotion" },
  { value: "update", label: "Update" },
  { value: "system", label: "System" },
] as const;

function emptyAnnouncement(): Omit<AdminAnnouncementRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
} {
  return {
    title: "",
    content: "",
    type: "promotion",
    is_active: true,
  };
}

function AnnouncementForm({
  initial,
  onDone,
}: {
  initial: Omit<AdminAnnouncementRow, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  };
  onDone: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertAnnouncementAction({
        id: form.id,
        title: form.title,
        content: form.content,
        type: form.type,
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
      <p className="font-semibold text-white">
        {form.id ? "Edit announcement" : "New announcement"}
      </p>
      <div className="space-y-2">
        <Label htmlFor="ann-title">Title</Label>
        <Input
          id="ann-title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-content">Content</Label>
        <Textarea
          id="ann-content"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-type">Type</Label>
        <Select
          value={form.type}
          onValueChange={(v) =>
            setForm({ ...form, type: v as AdminAnnouncementRow["type"] })
          }
        >
          <SelectTrigger id="ann-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-400">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="rounded border-border"
        />
        Active (shown on site)
      </label>
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

export function CmsAnnouncementsPanel({
  announcements,
}: {
  announcements: AdminAnnouncementRow[];
}) {
  const router = useRouter();
  type EditState = Omit<AdminAnnouncementRow, "id" | "created_at"> & {
    id?: string;
    created_at?: string;
  };
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this announcement?")) return;
    setDeletingId(id);
    const result = await deleteAnnouncementAction(id);
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
          <Button onClick={() => setEditing(emptyAnnouncement())}>New announcement</Button>
        </div>
      ) : (
        <AnnouncementForm initial={editing} onDone={refresh} />
      )}

      <div className={cn(CARD, "divide-y divide-white/[0.04]")}>
        {announcements.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No announcements yet.</p>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-white">{a.title}</p>
                  <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] uppercase text-violet-200">
                    {a.type}
                  </span>
                  {a.is_active && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] uppercase text-emerald-300">
                      Live
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">{a.content}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(a.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing({ ...a })}
                  disabled={Boolean(editing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(a.id)}
                  disabled={deletingId === a.id}
                >
                  {deletingId === a.id ? (
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
