import Link from "next/link";
import { Gift } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { promotionsMetadata } from "@/lib/seo/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = promotionsMetadata;

type PromotionCard = {
  id: string;
  title: string;
  summary: string;
  description: string;
  badge_text: string | null;
  bonus_amount: number;
};

export default async function PromotionsPage() {
  const promotions = await loadActivePromotions();

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
              Live offers from the admin panel. An active bonus is added to Total Deposit when a deposit is confirmed.
            </p>
          </div>

          {promotions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d0d1f] p-8 text-center">
              <p className="text-[#f0f0f5] font-semibold">No active promotions right now.</p>
              <p className="mt-2 text-sm text-[#6b6d8f]">
                When an offer is set to active in Admin → Promotions, it shows up here.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-5">
              {promotions.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-2xl border border-[rgba(201,168,76,0.2)] bg-gradient-to-br from-[rgba(201,168,76,0.12)] to-[rgba(201,168,76,0.04)] bg-[#0d0d1f] overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl border flex items-center justify-center bg-[rgba(201,168,76,0.1)] border-[rgba(201,168,76,0.2)]">
                        <Gift className="h-6 w-6 text-[#c9a84c]" />
                      </div>
                      <Badge>{promo.badge_text || "Active"}</Badge>
                    </div>
                    <h2 className="text-lg font-bold text-[#f0f0f5] mb-2">{promo.title}</h2>
                    <p className="text-sm text-[#6b6d8f] mb-5 leading-relaxed">
                      {promo.summary || promo.description}
                    </p>
                    {promo.bonus_amount > 0 && (
                      <p className="mb-5 text-sm font-semibold text-[#c9a84c]">
                        +${promo.bonus_amount.toFixed(2)} on a confirmed deposit
                      </p>
                    )}
                    <Button size="sm" asChild>
                      <Link href="/dashboard/deposit">Deposit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

async function loadActivePromotions(): Promise<PromotionCard[]> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("promotions")
      .select("id, title, summary, description, badge_text, bonus_amount, starts_at, ends_at, priority")
      .eq("status", "active")
      .order("priority", { ascending: true });

    if (error || !data) return [];

    return data
      .filter((row) => {
        if (row.starts_at && row.starts_at > now) return false;
        if (row.ends_at && row.ends_at < now) return false;
        return true;
      })
      .map((row) => ({
        id: row.id,
        title: row.title,
        summary: row.summary ?? "",
        description: row.description ?? "",
        badge_text: row.badge_text,
        bonus_amount: Number(row.bonus_amount ?? 0),
      }));
  } catch {
    return [];
  }
}
