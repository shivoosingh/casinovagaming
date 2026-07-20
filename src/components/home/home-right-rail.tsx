"use client";

import Link from "next/link";
import { Crown, Gift, Headphones, Sparkles, TrendingUp } from "lucide-react";

/**
 * Visual right rail matching the reference dashboard.
 * Links only to existing Casinova routes — no new features.
 */
export function HomeRightRail() {
  return (
    <aside className="flex flex-col gap-3">
      {/* Welcome / VIP peek */}
      <div className="cx-glass relative overflow-hidden rounded-3xl p-4">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl"
          style={{ background: "rgba(168,85,247,0.45)" }}
        />
        <p className="relative z-10 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80">
          Welcome back
        </p>
        <p className="relative z-10 mt-1 text-lg font-black text-white">VIP Desk</p>
        <div className="relative z-10 mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold">
            <span className="text-slate-400">VIP Progress</span>
            <span className="text-fuchsia-300">Level up</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-orange-400 shadow-[0_0_12px_rgba(232,121,249,0.6)]"
              style={{ width: "62%" }}
            />
          </div>
        </div>
        <Link
          href="/dashboard/vip"
          className="relative z-10 mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-200 transition-colors hover:text-white"
        >
          <Crown className="h-3.5 w-3.5 text-amber-300" />
          View VIP Status →
        </Link>
      </div>

      {/* Deposit bonus */}
      <div className="cx-glass relative overflow-hidden rounded-3xl p-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 85% 20%, rgba(168,85,247,0.35), transparent 45%), radial-gradient(circle at 10% 90%, rgba(249,115,22,0.15), transparent 40%)",
          }}
        />
        <div className="relative z-10 mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-[0_0_28px_rgba(168,85,247,0.55)]">
          <Gift className="h-7 w-7 text-white" />
        </div>
        <p className="relative z-10 text-sm font-black text-white">100% Deposit Bonus</p>
        <p className="relative z-10 mt-1 text-[11px] leading-relaxed text-slate-400">
          Boost your first load with premium VIP points this weekend.
        </p>
        <Link
          href="/promotions"
          className="relative z-10 mt-3 block rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 py-2.5 text-center text-xs font-black text-white shadow-[0_0_24px_rgba(232,121,249,0.45)] transition-transform hover:scale-[1.02]"
        >
          Claim Bonus
        </Link>
      </div>

      {/* Daily spin */}
      <div className="cx-glass-soft rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-300" />
          <p className="text-sm font-bold text-white">Daily Spin</p>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">Spin once a day for bonus rewards.</p>
        <Link
          href="/spin"
          className="block rounded-xl border border-orange-400/35 bg-orange-500/15 py-2.5 text-center text-xs font-bold text-orange-100 transition-all hover:bg-orange-500/25 hover:shadow-[0_0_18px_rgba(249,115,22,0.35)]"
        >
          Spin Now
        </Link>
      </div>

      {/* Live activity tease */}
      <div className="cx-glass-soft rounded-3xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-bold text-white">Live Winners</p>
        </div>
        <ul className="space-y-2.5">
          {[
            { name: "M***k", amount: "$1,280", game: "Game Vault" },
            { name: "A***x", amount: "$912", game: "Juwa" },
            { name: "S***h", amount: "$2,100", game: "Cash Frenzy" },
          ].map((w) => (
            <li key={w.name + w.amount} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-slate-300">{w.name}</span>
              <span className="font-black text-emerald-400">{w.amount}</span>
              <span className="truncate text-violet-300/70">{w.game}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Support */}
      <div className="cx-glass relative overflow-hidden rounded-3xl p-4">
        <div
          className="pointer-events-none absolute -bottom-6 -right-4 h-20 w-20 rounded-full blur-2xl"
          style={{ background: "rgba(59,130,246,0.35)" }}
        />
        <div className="relative z-10 mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/20">
          <Headphones className="h-5 w-5 text-sky-300" />
        </div>
        <p className="relative z-10 text-sm font-bold text-white">Live Support</p>
        <p className="relative z-10 mb-3 text-[11px] text-slate-400">Chat with our team anytime.</p>
        <Link
          href="/support"
          className="relative z-10 block rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 py-2.5 text-center text-xs font-black text-white shadow-[0_0_20px_rgba(59,130,246,0.35)] transition-transform hover:scale-[1.02]"
        >
          Chat Now
        </Link>
      </div>
    </aside>
  );
}
