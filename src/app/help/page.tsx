import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { createMetadata } from "@/lib/seo/metadata";

export const metadata = createMetadata({
  title: "Help Center",
  description:
    "How to create a Casinova account, add money to your wallet, load a game, and share your referral code. Live chat and Messages are there if you need a person.",
  keywords: ["Casinova help", "Casinova account", "game account", "Casinova deposit", "Casinova referrals"],
  path: "/help",
});

const GUIDES = [
  {
    title: "Create your account",
    body: "Register with your email and phone number, then open the confirmation link we email you before you sign in.",
  },
  {
    title: "Add money",
    body: "Open Deposit in your dashboard to add money to your Casinova wallet.",
  },
  {
    title: "Play a game",
    body: "Open a game's page to create your game account, load credits from your wallet, or redeem.",
  },
  {
    title: "Referrals",
    body: "Share the code from your Referrals page. Friends who sign up with it are linked to your account, and the page shows your referral points.",
  },
];

export default function HelpPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Help Center", href: "/help" },
            ]}
          />
          <p className="text-sm font-semibold uppercase tracking-widest text-[#c9a84c]">Help Center</p>
          <h1 className="mt-2 text-4xl font-black text-white">Guides</h1>
          <p className="mt-3 text-[#6b6d8f]">
            Short walkthroughs for your account, deposits, games, and referrals. Live chat is on the site if you need a person.
          </p>
          <div className="mt-8 space-y-4">
            {GUIDES.map((guide) => (
              <article key={guide.title} className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-5">
                <h2 className="text-lg font-bold text-white">{guide.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6b6d8f]">{guide.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-sm text-[#6b6d8f]">
            <Link href="/responsible-play" className="text-[#00E5FF]">
              Responsible play
            </Link>
            {" · "}
            <Link href="/support" className="text-[#00E5FF]">
              Contact support
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
