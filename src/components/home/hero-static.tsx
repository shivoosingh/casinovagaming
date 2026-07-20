"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gift, Play, Shield, Headphones, Zap, Crown } from "lucide-react";

const FEATURES = [
  { icon: Zap, label: "Instant Withdrawals", tone: "#F97316" },
  { icon: Shield, label: "100% Secure", tone: "#3B82F6" },
  { icon: Headphones, label: "24/7 Support", tone: "#A855F7" },
  { icon: Gift, label: "Daily Rewards", tone: "#E879F9" },
  { icon: Crown, label: "VIP Club", tone: "#FBBF24" },
];

export function HeroStatic() {
  return (
    <div className="space-y-3">
      <section
        className="relative w-full overflow-hidden rounded-[1.5rem] border border-violet-400/30 shadow-[0_0_60px_rgba(168,85,247,0.22)]"
        aria-label="Hero"
        style={{ minHeight: "clamp(280px, 38vw, 380px)" }}
      >
        <Image
          src="/casinova-hero-banner.png"
          alt=""
          fill
          priority
          sizes="(max-width:1280px) 100vw, 1100px"
          className="object-cover object-right"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(9,9,15,0.94) 0%, rgba(9,9,15,0.78) 38%, rgba(9,9,15,0.35) 62%, rgba(9,9,15,0.55) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 80px rgba(168,85,247,0.18)" }}
        />

        {/* Soft floating orbs */}
        <motion.div
          className="pointer-events-none absolute right-[18%] top-[22%] h-16 w-16 rounded-full blur-2xl"
          style={{ background: "rgba(168,85,247,0.55)" }}
          animate={{ y: [0, -10, 0], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute right-[8%] bottom-[18%] h-20 w-20 rounded-full blur-2xl"
          style={{ background: "rgba(59,130,246,0.4)" }}
          animate={{ y: [0, 12, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex h-full min-h-[inherit] flex-col justify-center px-6 py-10 sm:px-10 lg:max-w-[58%] lg:px-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-[11px] font-bold uppercase tracking-[0.28em] text-violet-300"
          >
            Live premium lobby
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-3 font-black leading-[0.95] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(2.1rem, 5.5vw, 3.6rem)" }}
          >
            WELCOME TO{" "}
            <span className="bg-gradient-to-r from-sky-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(168,85,247,0.55)]">
              CASINOVA
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-7 max-w-md text-sm font-medium text-slate-300 sm:text-base"
          >
            Play. Win. Repeat. — instant accounts, VIP handling, and neon-level polish.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-wrap items-center gap-3"
          >
            <Link
              href="/#games"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-500 px-7 py-3.5 text-sm font-black text-white shadow-[0_0_32px_rgba(168,85,247,0.55)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(232,121,249,0.65)]"
            >
              <Play className="h-4 w-4 fill-current" />
              PLAY NOW
            </Link>
            <Link
              href="/promotions"
              className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/50 bg-black/30 px-6 py-3.5 text-sm font-bold text-fuchsia-100 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-fuchsia-300 hover:bg-fuchsia-500/15"
            >
              <Gift className="h-4 w-4" />
              Claim Bonus
            </Link>
          </motion.div>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="Platform features"
      >
        {FEATURES.map(({ icon: Icon, label, tone }) => (
          <div
            key={label}
            className="group flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-[rgba(18,14,32,0.72)] px-3 py-3 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-violet-400/45 hover:shadow-[0_0_24px_rgba(168,85,247,0.25)]"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: `linear-gradient(145deg, ${tone}, ${tone}88)`,
                boxShadow: `0 0 16px ${tone}66`,
              }}
            >
              <Icon className="h-4 w-4 text-white" />
            </span>
            <p className="text-[11px] font-bold leading-snug text-slate-200">{label}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
