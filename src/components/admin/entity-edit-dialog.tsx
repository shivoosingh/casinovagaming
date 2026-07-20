"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionResult } from "@/lib/actions/admin/core";

export type FieldValue = string | number | boolean;

export type FieldDef =
  | { name: string; label: string; type: "text" | "number" | "textarea"; defaultValue: string | number; hint?: string }
  | { name: string; label: string; type: "switch"; defaultValue: boolean }
  | { name: string; label: string; type: "select"; defaultValue: string; options: { value: string; label: string }[] };

export function EntityEditDialog({
  title,
  fields,
  action,
  triggerLabel,
}: {
  title: string;
  fields: FieldDef[];
  action: (values: Record<string, FieldValue>) => Promise<AdminActionResult>;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [values, setValues] = React.useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue]))
  );

  React.useEffect(() => {
    if (open) setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-violet-400/30">
          <Pencil className="mr-1 h-3.5 w-3.5" />
          {triggerLabel ?? "Edit"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await action(values);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success(res.message ?? "Saved");
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              {field.type === "switch" ? (
                <label className="flex items-center justify-between gap-3 text-sm text-white">
                  <span>{field.label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.checked }))}
                    className="h-4 w-4 accent-violet-500"
                  />
                </label>
              ) : field.type === "select" ? (
                <>
                  <Label>{field.label}</Label>
                  <select
                    className="h-10 w-full rounded-md border border-violet-400/25 bg-black/40 px-3 text-sm text-white"
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.value }))}
                  >
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              ) : field.type === "textarea" ? (
                <>
                  <Label>{field.label}</Label>
                  <Textarea
                    rows={3}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) => setValues((p) => ({ ...p, [field.name]: e.target.value }))}
                  />
                </>
              ) : (
                <>
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    value={String(values[field.name] ?? "")}
                    onChange={(e) =>
                      setValues((p) => ({
                        ...p,
                        [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                </>
              )}
              {"hint" in field && field.hint ? (
                <p className="text-[11px] text-slate-500">{field.hint}</p>
              ) : null}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="bg-violet-600 hover:bg-violet-500">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
