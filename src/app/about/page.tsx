import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { aboutMetadata } from "@/lib/seo/metadata";
import { Shield, Headphones, Zap, Users, Crown, Star } from "lucide-react";
import Link from "next/link";

export const metadata = aboutMetadata;

const values = [
  {
    icon: Shield,
    title: "Trusted & Secure",
    description: "Your accounts and data are protected with enterprise-grade security and encrypted communications.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Our expert support team is available around the clock via live chat to assist with any questions.",
    color: "text-[#c9a84c]",
    bg: "bg-[rgba(201,168,76,0.08)] border-[rgba(201,168,76,0.2)]",
  },
  {
    icon: Zap,
    title: "Fast Setup",
    description: "Get your game accounts set up quickly with our streamlined request and approval process.",
    color: "text-teal-400",
    bg: "bg-teal-400/10 border-teal-400/20",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Join thousands of players who trust Casinova Gaming for premium gaming support and VIP rewards.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
];

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "About" }]} />

          {/* Hero */}
          <div className="mb-16 relative">
            <div className="absolute -top-8 -left-8 w-64 h-64 rounded-full bg-[rgba(201,168,76,0.05)] blur-3xl pointer-events-none" />
            <div className="h-[1px] bg-gradient-to-r from-[rgba(201,168,76,0.4)] via-transparent to-transparent mb-6" />
            <p className="text-sm font-semibold text-[#c9a84c] uppercase tracking-widest mb-3">About Us</p>
            <h1 className="text-4xl sm:text-5xl font-black mb-5">
              <span className="text-[#f0f0f5]">About </span>
              <span className="gradient-text">Casinova Gaming</span>
            </h1>
            <p className="text-[#6b6d8f] max-w-3xl text-lg leading-relaxed">
              Casinova Gaming is a premium gaming support and account platform built for players who demand the best. We provide instant access to popular gaming platforms, VIP reward programs, and dedicated 24/7 live chat support.
            </p>
          </div>

          {/* Values */}
          <div className="grid sm:grid-cols-2 gap-5 mb-16">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] p-6 cn-card-hover"
                >
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${value.bg}`}>
                    <Icon className={`h-6 w-6 ${value.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-[#f0f0f5] mb-2">{value.title}</h3>
                  <p className="text-sm text-[#6b6d8f] leading-relaxed">{value.description}</p>
                </div>
              );
            })}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-16">
            {[
              { value: "14+", label: "Gaming Platforms" },
              { value: "24/7", label: "Live Support" },
              { value: "10K+", label: "Happy Players" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.04)] p-6 text-center"
              >
                <p className="text-3xl font-black gradient-text mb-1">{value}</p>
                <p className="text-sm text-[#6b6d8f]">{label}</p>
              </div>
            ))}
          </div>

          {/* Mission */}
          <div className="rounded-2xl border border-[rgba(201,168,76,0.15)] bg-[#0d0d1f] overflow-hidden">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="h-6 w-6 text-[#c9a84c]" />
                <h2 className="text-2xl font-bold text-[#f0f0f5]">Our Mission</h2>
              </div>
              <p className="text-[#6b6d8f] leading-relaxed mb-6">
                We believe every gamer deserves premium support and seamless access to their favorite platforms. Casinova Gaming was founded to bridge the gap between players and gaming platforms, offering a trusted, transparent, and rewarding experience. From account requests to VIP perks and referral bonuses, we are committed to elevating your gaming journey.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-[#d4ae52] to-[#a07830] text-[#0a0a0f] font-bold text-sm hover:from-[#e0be5e] hover:to-[#b08840] transition-all shadow-sm"
              >
                <Star className="h-4 w-4" />
                Join Casinova Gaming
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
