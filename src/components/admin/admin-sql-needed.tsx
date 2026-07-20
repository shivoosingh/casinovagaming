export function AdminSqlNeeded({ moduleName }: { moduleName: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
      <p className="font-semibold text-white">{moduleName} needs one SQL setup</p>
      <p className="mt-2 text-amber-100/80">
        In Supabase → SQL Editor, run{" "}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-violet-200">
          supabase/admin-essentials-casinova.sql
        </code>{" "}
        once, then refresh this page. Your data stays empty until players use the site — no Spinora
        import.
      </p>
    </div>
  );
}
