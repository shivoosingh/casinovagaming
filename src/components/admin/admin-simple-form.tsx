"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionResult } from "@/lib/actions/admin/core";

type Field =
  | { name: string; label: string; type?: "text" | "number"; defaultValue?: string }
  | { name: string; label: string; type: "textarea"; defaultValue?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; defaultValue?: string }
  | { name: string; label: string; type: "checkbox"; defaultChecked?: boolean };

export function AdminSimpleForm({
  fields,
  hidden,
  submitLabel,
  action,
}: {
  fields: Field[];
  hidden?: Record<string, string>;
  submitLabel: string;
  action: (fd: FormData) => Promise<AdminActionResult>;
}) {
  const [pending, start] = React.useTransition();
  const ref = React.useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className="space-y-3 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.55)] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = await action(fd);
          if (res.ok) {
            toast.success(res.message ?? "Saved");
            if (!hidden?.id) ref.current?.reset();
          } else toast.error(res.error);
        });
      }}
    >
      {hidden &&
        Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {fields.map((f) => (
        <div key={f.name}>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">{f.label}</label>
          {f.type === "textarea" ? (
            <Textarea name={f.name} defaultValue={f.defaultValue} rows={3} />
          ) : f.type === "select" ? (
            <select
              name={f.name}
              defaultValue={f.defaultValue}
              className="h-10 w-full rounded-md border border-violet-400/25 bg-black/30 px-3 text-sm text-white"
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "checkbox" ? (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name={f.name} defaultChecked={f.defaultChecked} value="true" />
              Enabled
            </label>
          ) : (
            <Input name={f.name} type={f.type ?? "text"} defaultValue={f.defaultValue} step={f.type === "number" ? "0.01" : undefined} />
          )}
        </div>
      ))}
      <Button type="submit" disabled={pending} className="bg-violet-600 hover:bg-violet-500">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
}
