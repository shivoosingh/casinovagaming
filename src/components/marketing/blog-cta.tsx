import { Gift, ArrowRight } from "lucide-react";
import { BONUS_HEADLINE, BONUS_SUBTEXT, registerHref } from "@/lib/offers";
import { TrackedLink } from "@/components/marketing/tracked-link";

/**
 * Signup CTA for blog posts. Server component; the link itself is a client
 * TrackedLink so clicks fire a Vercel Analytics `cta_click` event.
 *
 * `variant="slim"` sits above the article; `variant="feature"` closes it.
 * `source` flows into the /register link for blog→signup attribution.
 */
export function BlogCta({
  source,
  variant = "feature",
}: {
  source: string;
  variant?: "slim" | "feature";
}) {
  if (variant === "slim") {
    return (
      <TrackedLink
        href={registerHref(source)}
        event="cta_click"
        data={{ source, variant }}
        className="group mb-8 flex items-center justify-between gap-3 rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-900/40 via-[#140c28]/80 to-orange-900/20 px-4 py-3 transition-colors hover:border-violet-400/50"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-violet-100">
          <Gift className="h-4 w-4 shrink-0 text-orange-300" />
          {BONUS_HEADLINE}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black uppercase tracking-[0.14em] text-orange-300 group-hover:text-orange-200">
          Sign up <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </TrackedLink>
    );
  }

  return (
    <aside className="my-12 overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-900/50 via-[#140c28] to-orange-900/25 p-6 text-center sm:p-8">
      <span className="mx-auto mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white">
        <Gift className="h-5 w-5" />
      </span>
      <h2 className="text-xl font-black text-white sm:text-2xl">{BONUS_HEADLINE}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-violet-200/80">{BONUS_SUBTEXT}</p>
      <TrackedLink
        href={registerHref(source)}
        event="cta_click"
        data={{ source, variant }}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-7 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_0_24px_rgba(232,121,249,0.4)] transition-transform hover:scale-[1.03]"
      >
        Create free account <ArrowRight className="h-4 w-4" />
      </TrackedLink>
    </aside>
  );
}
