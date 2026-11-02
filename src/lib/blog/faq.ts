/**
 * Pull the FAQ block out of a rendered post body so the page can emit
 * FAQPage JSON-LD that mirrors the visible questions exactly.
 *
 * Supported shapes (both produced on this site):
 *   <h2>FAQ</h2> <h3>Question?</h3> <p>Answer.</p> ...        (2026-10 quality batch)
 *   <h2>FAQ</h2> <p><strong>Question?</strong> Answer.</p> ... (markdown seed posts, after conversion)
 * The section ends at the next <h2>.
 */

export type FaqItem = { q: string; a: string };

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFaqs(html: string | null | undefined): FaqItem[] {
  if (!html) return [];
  const start = html.match(/<h2[^>]*>\s*(faq|faqs|frequently asked questions)\s*<\/h2>/i);
  if (!start || start.index === undefined) return [];
  const after = html.slice(start.index + start[0].length);
  const end = after.search(/<h2[\s>]/i);
  const section = end === -1 ? after : after.slice(0, end);
  const items: FaqItem[] = [];

  // Shape A: <h3>Q</h3> followed by one or more <p> until the next <h3>
  const h3 = /<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3[\s>]|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = h3.exec(section))) {
    const q = text(m[1]);
    const a = text(m[2]);
    if (q && a) items.push({ q, a });
  }
  if (items.length) return items;

  // Shape B: <p><strong>Q?</strong> A</p>
  const strong = /<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*([\s\S]*?)<\/p>/gi;
  while ((m = strong.exec(section))) {
    const q = text(m[1]);
    const a = text(m[2]);
    if (q && a) items.push({ q, a });
  }
  return items;
}
