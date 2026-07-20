import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Trophy } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const revalidate = 120;

export const metadata: Metadata = {
  title: `Leaderboard | ${SITE_NAME}`,
  description: `Top ${SITE_NAME} players by VIP points.`,
  alternates: { canonical: "/leaderboard" },
};

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  vip_points: number | null;
  vip_tier: string | null;
};

function maskName(fullName: string | null, email: string | null) {
  if (fullName?.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return `${parts[0].slice(0, 1)}***`;
    return `${parts[0]} ${parts[parts.length - 1].slice(0, 1)}.`;
  }
  if (email) return `${email.slice(0, 2)}***`;
  return "Player";
}

export default async function PublicLeaderboardPage() {
  let rows: Row[] = [];
  try {
    const db = createAdminClient();
    if (db) {
      const { data } = await db
        .from("profiles")
        .select("id, full_name, email, vip_points, vip_tier")
        .eq("is_suspended", false)
        .order("vip_points", { ascending: false })
        .limit(50);
      rows = (data as Row[]) ?? [];
    }
  } catch {
    rows = [];
  }

  return (
    <>
      <Navbar />
      <main className="bg-[#09090F] pb-16 pt-24 text-[#F5F3FF]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Leaderboard" }]} />

          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-black tracking-tight">
              Player{" "}
              <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                Leaderboard
              </span>
            </h1>
            <p className="text-slate-400">
              Top players by VIP points.{" "}
              <Link href="/login" className="text-fuchsia-300 hover:underline">
                Sign in
              </Link>{" "}
              to track your rank.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.7)] py-16 text-center">
              <Trophy className="mx-auto mb-3 h-10 w-10 text-violet-300/50" />
              <p className="font-semibold text-white">Rankings will appear soon</p>
              <p className="mt-1 text-sm text-slate-400">Play and earn VIP points to climb the board.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.75)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-violet-500/20 text-[11px] uppercase tracking-wider text-violet-300/70">
                  <tr>
                    <th className="px-4 py-3 font-bold">Rank</th>
                    <th className="px-4 py-3 font-bold">Player</th>
                    <th className="px-4 py-3 font-bold">Tier</th>
                    <th className="px-4 py-3 text-right font-bold">VIP Points</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-b border-white/[0.04]">
                      <td className="px-4 py-3 font-black text-violet-200">#{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        {maskName(r.full_name, r.email)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            "border-violet-400/30 bg-violet-500/15 text-violet-200"
                          )}
                        >
                          <Crown className="h-3 w-3 text-amber-300" />
                          {r.vip_tier ?? "bronze"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-fuchsia-200">
                        {(r.vip_points ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
