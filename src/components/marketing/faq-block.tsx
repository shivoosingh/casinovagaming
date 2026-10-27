import { FaqSchema } from "@/lib/seo/json-ld";

/**
 * Visible FAQ section + matching FAQPage JSON-LD (one source, so the rendered
 * Q&A and the structured data can never disagree). Ready to drop into any page
 * that has FAQ data — pass `items` from the page. Renders nothing when empty.
 */
export function FaqBlock({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto mt-12 max-w-3xl px-4 sm:px-6 lg:px-8">
      <FaqSchema items={items} />
      <h2 className="mb-5 text-lg font-black tracking-tight text-white sm:text-xl">
        Frequently asked questions
      </h2>
      <dl className="divide-y divide-white/10 border-y border-white/10">
        {items.map((faq) => (
          <div key={faq.q} className="py-4">
            <dt className="text-sm font-bold text-white">{faq.q}</dt>
            <dd className="mt-1.5 text-sm text-slate-400">{faq.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
