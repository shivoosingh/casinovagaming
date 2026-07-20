import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "blog", label: "Blog" },
  { key: "announcements", label: "Announcements" },
] as const;

export type CmsTabKey = (typeof TABS)[number]["key"];

export function CmsTabNav({ active }: { active: CmsTabKey }) {
  return (
    <div className="mb-6 inline-flex flex-wrap gap-1 rounded-full border border-violet-400/20 bg-[rgba(18,14,34,0.5)] p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/admin/cms?tab=${tab.key}`}
          className={cn(
            "min-h-9 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            active === tab.key
              ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
              : "text-slate-400 hover:text-white"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
