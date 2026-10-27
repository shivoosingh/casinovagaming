import { Sparkles } from "lucide-react";

/**
 * A short "quick answer" callout placed at the very top of a blog post.
 *
 * Answer-engine optimization: Google snippets and AI assistants favor a direct,
 * self-contained answer near the top. We reuse the post's own excerpt — no
 * fabricated claims — rendered as a scannable lead-in.
 */
export function QuickAnswer({ text }: { text?: string | null }) {
  const answer = text?.trim();
  if (!answer) return null;
  return (
    <div className="mb-8 rounded-xl border border-violet-500/20 bg-violet-950/30 p-4 sm:p-5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-violet-300">
        <Sparkles className="h-3.5 w-3.5" /> Quick answer
      </p>
      <p className="text-sm leading-relaxed text-violet-50/90 sm:text-base">{answer}</p>
    </div>
  );
}
