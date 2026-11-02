/**
 * Minimal markdown -> HTML for legacy blog bodies.
 *
 * The blog page renders `content` as HTML. Posts written by the AI generator
 * and the 2026-10 quality batch are HTML already; the July 2026 seed posts are
 * markdown. This converter covers what those posts actually use (headings,
 * bold, italic, links, lists, blockquotes, paragraphs) with no dependency.
 * Everything is HTML-escaped first, so a markdown body cannot inject markup.
 */

const BLOCK_TAG = /<(p|h[1-6]|ul|ol|div|blockquote|table|section|article)\b/i;

/** True when the body already contains block-level HTML and must not be converted. */
export function looksLikeHtml(body: string | null | undefined): boolean {
  if (!body) return false;
  return BLOCK_TAG.test(body);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(url: string): string | null {
  const u = url.trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^https?:\/\//i.test(u)) return u;
  if (/^mailto:/i.test(u)) return u;
  return null;
}

/** Inline markdown on an already-escaped line. */
function inline(s: string): string {
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
    const href = safeHref(url.replace(/&amp;/g, "&"));
    if (!href) return text;
    const attrs = href.startsWith("/") ? "" : ' rel="nofollow noopener" target="_blank"';
    return `<a href="${href.replace(/&/g, "&amp;")}"${attrs}>${text}</a>`;
  });
  // bold then italic
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

export function markdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown.replace(/\r\n?/g, "\n")).split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      out.push(`<${list.type}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
      list = null;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      out.push(`<blockquote><p>${inline(quote.join(" ").trim())}</p></blockquote>`);
      quote = [];
    }
  };
  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      // Body headings start at h2; the page already renders the title as h1.
      const level = Math.min(6, Math.max(2, heading[1].length));
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)$/);
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(ul[1].trim());
      continue;
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ol[1].trim());
      continue;
    }
    const bq = line.match(/^\s*&gt;\s?(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      quote.push(bq[1]);
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) {
      flushAll();
      out.push("<hr />");
      continue;
    }
    // continuation of a list item (indented) or a quote
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += " " + line.trim();
      continue;
    }
    if (quote.length && !bq) {
      flushQuote();
    }
    flushList();
    // A line that opens with bold text starts its own paragraph (the seed posts
    // write FAQs as consecutive "**Question?** answer" lines with no blank line).
    if (para.length && /^\*\*[^*]+\*\*/.test(line.trim())) flushPara();
    para.push(line.trim());
  }
  flushAll();
  return out.join("\n");
}

/** Render a body that may be markdown or HTML. */
export function renderBlogBody(body: string | null | undefined): string {
  if (!body) return "";
  return looksLikeHtml(body) ? body : markdownToHtml(body);
}

/** Plain text (for schema / previews) from either format. */
export function bodyToPlainText(body: string | null | undefined): string {
  if (!body) return "";
  const html = renderBlogBody(body);
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
