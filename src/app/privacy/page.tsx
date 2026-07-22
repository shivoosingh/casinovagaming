import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Privacy Policy | Casinova Gaming",
  description: "How Casinova Gaming collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    heading: "Information we collect",
    body: "We collect account information (email, phone, name), transaction records, support messages, and usage data needed to operate the platform and prevent fraud.",
  },
  {
    heading: "How we use information",
    body: "We use your data to provide the service, process deposits and game loads, send account notifications, improve the platform, and comply with legal obligations.",
  },
  {
    heading: "Sharing",
    body: "We do not sell personal information. We share data with service providers (hosting, email, payment verification) under contract and when required by law.",
  },
  {
    heading: "Security",
    body: "We use industry-standard measures to protect accounts and financial records. No method of transmission over the internet is 100% secure.",
  },
  {
    heading: "Your choices",
    body: "You may update profile details from your dashboard and request account deletion by contacting support via Live Chat or the Contact page.",
  },
  {
    heading: "Contact",
    body: "Privacy questions: use Live Chat or Contact on casinovasgaming.com.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Privacy Policy" }]} />
          <h1 className="mb-8 text-4xl font-bold text-[#f0f0f5]">Privacy Policy</h1>
          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section key={s.heading}>
                <h2 className="mb-3 text-xl font-semibold text-[#f0f0f5]">{s.heading}</h2>
                <p className="leading-relaxed text-[#6b6d8f]">{s.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-12 text-sm text-[#6b6d8f]">
            See also our{" "}
            <Link href="/terms" className="text-[#00E5FF] hover:underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
