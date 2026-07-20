"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export function FeaturedBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(115deg, rgba(8,14,28,0.98), rgba(18,8,22,0.95))",
        border: "1px solid rgba(0,229,255,0.16)",
        clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(-28deg, transparent, transparent 14px, rgba(255,45,120,0.04) 14px, rgba(255,45,120,0.04) 15px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center sm:px-10 sm:py-9">
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#ff2d78]">
            Limited time desk event
          </p>
          <h3
            className="mb-1 font-black leading-tight text-white"
            style={{ fontSize: "clamp(1.35rem,3.8vw,1.9rem)" }}
          >
            Weekly Jackpot Event
          </h3>
          <p className="text-sm font-medium text-[#8b95b0]">
            Double Rewards Week — win 2× on every game
          </p>
        </div>
        <Link
          href="/promotions"
          className="inline-flex shrink-0 items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-wider text-[#050510] transition-transform hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg,#7af5ff,#00E5FF)",
            clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 100%, 10px 100%)",
            boxShadow: "0 0 22px rgba(0,229,255,0.35)",
          }}
        >
          <Zap className="h-4 w-4" />
          Join now
        </Link>
      </div>
    </motion.div>
  );
}
