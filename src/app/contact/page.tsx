import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Clock } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Contact | ${SITE_NAME}`,
  description: `Reach ${SITE_NAME} support for deposits, game accounts, and VIP questions.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#09090F] pb-16 pt-24 text-[#F5F3FF]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact" }]} />

          <div className="mb-12 max-w-2xl">
            <h1 className="mb-4 text-4xl font-black tracking-tight">
              Contact{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                Casinova
              </span>
            </h1>
            <p className="text-lg text-slate-400">
              24/7 support for deposits, game accounts, and VIP questions.
            </p>
          </div>

          <div className="mb-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "Live Chat",
                desc: "Signed in? Open messages from your dashboard.",
                action: "Open Messages",
                href: "/dashboard/messages",
              },
              {
                icon: Mail,
                title: "Support page",
                desc: "Browse FAQs and contact options.",
                action: "Help Center",
                href: "/support",
              },
              {
                icon: Clock,
                title: "Response Time",
                desc: "Average response under 5 minutes when online.",
                action: "Go Home",
                href: "/",
              },
            ].map(({ icon: Icon, title, desc, action, href }) => (
              <div
                key={title}
                className="rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.75)] p-5 transition-all hover:border-fuchsia-400/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.2)]"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="mb-2 text-lg font-bold text-white">{title}</h2>
                <p className="mb-4 text-sm text-slate-400">{desc}</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href={href}>{action}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
