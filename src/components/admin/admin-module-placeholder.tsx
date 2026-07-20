import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { requireStaff } from "@/lib/data/admin";

/** Temporary shell for Spinora modules not fully wired to Casinova data yet. */
export async function AdminModulePlaceholder({
  title,
  description,
  relatedHref,
  relatedLabel,
}: {
  title: string;
  description: string;
  relatedHref?: string;
  relatedLabel?: string;
}) {
  await requireStaff();

  return (
    <div className="mx-auto max-w-3xl">
      <AdminPageHeader title={title} description={description} />
      <div className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-6 backdrop-blur-xl">
        <p className="text-sm leading-relaxed text-slate-300">
          This section is part of the new Casinova admin shell (ported from Spinora). Full
          controls for this module will connect as the matching database tables and actions
          are enabled on your Casinova project.
        </p>
        {relatedHref && relatedLabel ? (
          <Link
            href={relatedHref}
            className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]"
          >
            {relatedLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
