import { AnimatedLogo } from "@/components/ui/animated-logo";
import { Badge } from "@/components/ui/badge";

/** Instant admin chrome while staff auth resolves. */
export function AdminLayoutSkeleton() {
  const groups = ["Insights", "People", "Economy", "Content", "Operations"];

  return (
    <div className="admin-shell relative flex min-h-dvh w-full max-w-[100dvw] overflow-x-clip bg-[#09090F] text-[#F5F3FF]">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-violet-500/20 bg-[rgba(12,10,22,0.92)] lg:flex">
        <div className="flex min-w-0 items-center gap-2 border-b border-violet-500/20 px-4 py-4">
          <AnimatedLogo textClassName="text-sm" imageSize={28} />
          <Badge variant="purple">Admin</Badge>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4 animate-pulse">
          {groups.map((group) => (
            <div key={group}>
              <div className="mx-3 mb-2 h-3 w-16 rounded bg-violet-400/10" />
              <ul className="space-y-1">
                {Array.from({ length: group === "Operations" ? 8 : 4 }).map((_, i) => (
                  <li key={i} className="mx-1 h-10 rounded-xl bg-white/[0.04]" />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
        <header className="sticky top-0 z-10 border-b border-violet-500/20 bg-[#09090F]/90 pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 min-w-0 items-center gap-3 px-3 sm:h-16 sm:px-6">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-white/[0.06] lg:hidden" />
            <div className="h-4 w-24 max-w-[40%] animate-pulse rounded bg-white/[0.06] sm:w-32" />
            <div className="ml-auto h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-x-clip px-3 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-6 animate-pulse">
            <div className="h-10 w-40 max-w-full rounded-lg bg-white/[0.06] sm:w-56" />
            <div className="h-4 w-full max-w-md rounded bg-white/[0.04]" />
            <div className="h-72 rounded-xl bg-white/[0.04]" />
          </div>
        </main>
      </div>
    </div>
  );
}
