import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { SITE_NAME } from "@/lib/constants";

// Next.js adds <meta name="robots" content="noindex"> to not-found renders on
// its own; this page deliberately sets no canonical so a missing URL never
// claims to be a copy of another page.
export const metadata: Metadata = {
  title: `Page Not Found | ${SITE_NAME}`,
  description: "The page you were looking for does not exist on Casinova Gaming.",
};

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/games", label: "All games" },
  { href: "/blog", label: "Guides & tips" },
  { href: "/promotions", label: "Promotions" },
  { href: "/support", label: "Support" },
];

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#c9a84c]">Error 404</p>
          <h1 className="mt-2 text-4xl font-black text-white">Page not found</h1>
          <p className="mt-3 text-[#6b6d8f]">
            That link is broken or the page has moved. Try one of these instead.
          </p>
          <nav aria-label="Helpful links" className="mt-8 flex flex-wrap justify-center gap-3">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-white/10 bg-[#0d0d1f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#00E5FF]/40 hover:text-[#00E5FF]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </main>
      <Footer />
    </>
  );
}
