import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { promotionsMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { Gift, Zap, Star, Sparkles } from "lucide-react";

export const metadata = promotionsMetadata;

const promotions = [
  {
    title: "Welcome Bonus",
    description: "New members receive 200 VIP points upon registration. Start your journey with instant rewards.",
    badge: "New Users",
    badgeVariant: "default" as const,
    icon: Gift,
    gradient: "from-[rgba(201,168,76,0.12)] to-[rgba(201,168,76,0.04)]",
    border: "border-[rgba(201,168,76,0.2)]",
    iconColor: "text-[#c9a84c]",
    iconBg: "bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.2)]",
  },
  {
    title: "VIP Double Points Weekend",
    description: "Earn 2x VIP points on all game account requests every weekend. Climb tiers faster!",
    badge: "Limited Time",
    badgeVariant: "warning" as const,
    icon: Zap,
    gradient: "from-[rgba(234,179,8,0.08)] to-[rgba(234,179,8,0.02)]",
    border: "border-yellow-500/20",
    iconColor: "text-yellow-400",
    iconBg: "bg-yellow-400/10 border-yellow-400/20",
  },
  {
    title: "Referral Boost",
    description: "Refer 5 friends this month and receive a bonus 500 VIP points plus exclusive game access.",
    badge: "Monthly",
    badgeVariant: "teal" as const,
    icon: Star,
    gradient: "from-teal-400/[0.08] to-teal-400/[0.02]",
    border: "border-teal-400/20",
    iconColor: "text-teal-400",
    iconBg: "bg-teal-400/10 border-teal-400/20",
  },
  {
    title: "New Games Added",
    description: "Fire Kirin, Juwa, Panda Master, and more platforms now available for instant account requests.",
    badge: "Update",
    badgeVariant: "purple" as const,
    icon: Sparkles,
    gradient: "from-violet-400/[0.08] to-violet-400/[0.02]",
    border: "border-violet-400/20",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10 border-violet-400/20",
  },
];

export default function PromotionsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Promotions" }]} />

          <div className="mb-12 relative">
            <div className="h-[1px] bg-gradient-to-r from-[rgba(201,168,76,0.4)] via-transparent to-transparent mb-6" />
            <p className="text-sm font-semibold text-[#c9a84c] uppercase tracking-widest mb-3">Offers & Deals</p>
            <h1 className="text-4xl sm:text-5xl font-black mb-5">
              <span className="text-[#f0f0f5]">Promotions & </span>
              <span className="gradient-text">Bonuses</span>
            </h1>
            <p className="text-[#6b6d8f] max-w-2xl text-lg">
              Discover exclusive Casinova Gaming promotions, limited-time bonuses, and special offers for our gaming community.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {promotions.map((promo) => {
              const Icon = promo.icon;
              return (
                <div
                  key={promo.title}
                  className={`rounded-2xl border ${promo.border} bg-gradient-to-br ${promo.gradient} bg-[#0d0d1f] overflow-hidden cn-card-hover`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${promo.iconBg}`}>
                        <Icon className={`h-6 w-6 ${promo.iconColor}`} />
                      </div>
                      <Badge variant={promo.badgeVariant}>{promo.badge}</Badge>
                    </div>
                    <h2 className="text-lg font-bold text-[#f0f0f5] mb-2">{promo.title}</h2>
                    <p className="text-sm text-[#6b6d8f] mb-5 leading-relaxed">{promo.description}</p>
                    <Button size="sm" asChild>
                      <Link href="/register">Claim Offer</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
