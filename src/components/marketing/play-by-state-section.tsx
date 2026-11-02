import Link from "next/link";
import { MapPin, Globe } from "lucide-react";
import { getGeoStates } from "@/lib/data/marketing";
import { SITE_NAME } from "@/lib/constants";

/**
 * Homepage state list. Links only to states that exist in the database (every
 * one of them has a live /[state] page). Copy is for visitors, not admins.
 */
export async function PlayByStateSection() {
  const states = (await getGeoStates()).map((s) => ({
    name: s.name,
    slug: s.slug,
    abbr: s.abbr,
  }));
  if (states.length === 0) return null;

  return (
    <section aria-labelledby="play-by-state-heading" className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-zinc-900/90 to-black p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-amber-400" aria-hidden />
              <h2 id="play-by-state-heading" className="text-xl font-extrabold text-foreground">
                Players across the US
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {SITE_NAME} is an online platform. Pick your state to see how it works where you live. 18+;
              availability varies by jurisdiction.
            </p>
          </div>

          <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5 shrink-0">
            <Globe className="h-3.5 w-3.5" /> {states.length} states
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {states.map((state) => (
            <Link
              key={state.slug}
              href={`/${state.slug}`}
              className="rounded-full border border-border/50 bg-zinc-900/60 px-3.5 py-1.5 text-sm font-semibold text-foreground hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              {state.name} <span className="text-muted-foreground">({state.abbr})</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
