import { DatabaseZap } from "lucide-react";

/** Shown instead of a crash when the Phase 2 admin tables aren't applied yet. */
export function AdminSqlRequiredNotice({
  title = "Database setup required",
}: {
  title?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6">
      <div className="flex items-start gap-3">
        <DatabaseZap className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="font-semibold text-amber-200">{title}</p>
          <p className="mt-2 text-sm text-slate-400">
            This module needs the Phase 2 admin tables. Run{" "}
            <code className="text-violet-200">supabase/admin-essentials-casinova.sql</code> in
            the Supabase SQL editor (after{" "}
            <code className="text-violet-200">CASINOVA-FULL-SCHEMA.sql</code>), then reload this
            page.
          </p>
        </div>
      </div>
    </div>
  );
}
