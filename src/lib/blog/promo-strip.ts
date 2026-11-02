import { BONUS_HEADLINE, BONUS_SUBTEXT, registerHref } from "@/lib/offers";

/**
 * One inline bonus strip, inserted before the second <h2> of a post body
 * (after the lead answer and the first section, where readers are still
 * engaged). Rendered as a string because the body itself is an HTML string.
 * Copy comes from offers.ts so it can never drift from the real bonus.
 */
export function promoStripHtml(source: string): string {
  const href = registerHref(source).replace(/&/g, "&amp;");
  return (
    `<aside class="not-prose my-8 rounded-2xl border border-[#00E5FF]/30 bg-[#00E5FF]/5 p-5" data-promo="blog-strip">` +
    `<p class="m-0 text-base font-semibold text-[#f0f0f5]">${BONUS_HEADLINE}</p>` +
    `<p class="mb-3 mt-1 text-sm text-[#6b6d8f]">${BONUS_SUBTEXT}</p>` +
    `<a href="${href}" class="inline-flex items-center rounded-xl bg-[#00E5FF] px-4 py-2 text-sm font-bold text-[#09090F] no-underline hover:opacity-90">Create free account</a>` +
    `</aside>`
  );
}

/**
 * Insert `strip` before the second <h2>. With fewer than two <h2>s, insert
 * after the first paragraph instead so short posts still get one strip.
 */
export function insertBeforeSecondH2(html: string, strip: string): string {
  const first = html.search(/<h2[\s>]/i);
  if (first !== -1) {
    const second = html.slice(first + 1).search(/<h2[\s>]/i);
    if (second !== -1) {
      const at = first + 1 + second;
      return html.slice(0, at) + strip + "\n" + html.slice(at);
    }
  }
  const p = html.indexOf("</p>");
  if (p !== -1) return html.slice(0, p + 4) + "\n" + strip + html.slice(p + 4);
  return html + "\n" + strip;
}

export function withPromoStrip(html: string, source: string): string {
  if (!html.trim()) return html;
  return insertBeforeSecondH2(html, promoStripHtml(source));
}
