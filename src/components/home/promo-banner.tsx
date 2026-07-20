"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";

export function PromoBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden border-b border-violet-500/25"
      style={{
        background:
          "linear-gradient(90deg, rgba(88,28,135,0.55) 0%, rgba(20,12,40,0.95) 45%, rgba(154,52,18,0.35) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(105deg, transparent 20%, rgba(232,121,249,0.15) 50%, transparent 80%)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-2.5 px-4 py-2.5 sm:flex-row sm:gap-4">
        <div className="flex items-center gap-2.5 text-center sm:text-left">
          <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-fuchsia-600 text-white sm:inline-flex">
            <Gift className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-medium text-violet-100 sm:text-sm">
            Weekend Boost live —{" "}
            <span className="font-bold text-orange-300">up to 50% extra VIP points</span>
          </p>
        </div>
        <Link
          href="/promotions"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 via-fuchsia-500 to-violet-600 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_0_18px_rgba(232,121,249,0.4)] transition-transform hover:scale-[1.03]"
        >
          Avail Now
        </Link>
      </div>
    </motion.div>
  );
}
