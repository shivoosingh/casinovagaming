import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { vipMetadata } from "@/lib/seo/metadata";
import { VIP_TIERS } from "@/lib/constants";
import Link from "next/link";
import { Crown, Check, Star, Zap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = vipMetadata;

const tierIcons = [Star, Star, Crown, Crown];
const tierBorderColors = [
  "border-amber-700/40",
  "border-slate-400/40",
  "border-[rgba(201,168,76,0.4)]",
  "border-violet-400/40",
];
const tierGlowColors = [
  "rgba(180,83,9,0.15)",
  "rgba(148,163,184,0.12)",
  "rgba(201,168,76,0.15)",
  "rgba(124,58,237,0.15)",
];

export default function VipPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "VIP Program" }]} />

          {/* Hero */}
          <div className="text-center mb-16 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-[rgba(201,168,76,0.06)] blur-3xl" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] mb-5">
                <Crown className="h-8 w-8 text-[#c9a84c]" />
              </div>
              <p className="text-sm font-semibold text-[#c9a84c] uppercase tracking-widest mb-3">Exclusive Program</p>
              <h1 className="text-4xl sm:text-5xl font-black mb-5">
                <span className="text-[#f0f0f5]">VIP </span>
                <span className="gradient-text">Rewards Program</span>
              </h1>
              <p className="text-[#6b6d8f] max-w-2xl mx-auto text-lg">
                Earn points with every game request and referral. Unlock exclusive benefits as you climb from Bronze to Platinum.
              </p>
            </div>
          </div>

          {/* Tier Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {VIP_TIERS.map((tier, index) => {
              const TierIcon = tierIcons[index] ?? Star;
              return (
                <div
                  key={tier.id}
                  className={cn(
                    "relative rounded-2xl border bg-[#0d0d1f] overflow-hidden cn-card-hover",
                    tierBorderColors[index]
                  )}
                  style={{ boxShadow: `0 8px 32px ${tierGlowColors[index]}` }}
                >
                  {/* Top gradient bar */}
                  <div className={cn("h-1 w-full bg-gradient-to-r", tier.color)} />

                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br", tier.color, "opacity-90")}>
                        <TierIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-[#f0f0f5]">{tier.name}</p>
                        <p className="text-[11px] text-[#6b6d8f]">{tier.minPoints}+ points</p>
                      </div>
                    </div>

                    <ul className="space-y-2.5">
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-[#c9a84c] mt-0.5 shrink-0" />
                          <span className="text-[#6b6d8f]">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How to Earn */}
          <div className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] overflow-hidden mb-12">
            <div className="h-[1px] bg-gradient-to-r from-transparent via-[rgba(201,168,76,0.4)] to-transparent" />
            <div className="p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[#f0f0f5] mb-6 flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#c9a84c]" />
                How to Earn VIP Points
              </h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { action: "Game Account Request", points: 50, icon: Star },
                  { action: "Successful Referral", points: 10, icon: Users },
                  { action: "Monthly Activity Bonus", points: 200, icon: Crown },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.action}
                      className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(201,168,76,0.04)] p-4 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.1)] border border-[rgba(201,168,76,0.2)] flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-[#c9a84c]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#f0f0f5]">{item.action}</p>
                        <p className="text-xs text-[#c9a84c] font-bold">+{item.points} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button size="lg" asChild>
              <Link href="/register">Join VIP Program</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
