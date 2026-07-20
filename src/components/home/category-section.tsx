"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Tv2, Layers, Trophy, Crown } from "lucide-react";

const CATS = [
  {
    id: "live",
    label: "LIVE",
    sub: "Real dealers now",
    icon: Tv2,
    href: "/#games",
    from: "#00E5FF",
    to: "#0099cc",
    glow: "rgba(0, 229, 255,0.25)",
    border: "rgba(0, 229, 255,0.3)",
    bg: "rgba(0, 229, 255,0.06)",
  },
  {
    id: "slots",
    label: "SLOTS",
    sub: "Spin & win big",
    icon: Layers,
    href: "/#games",
    from: "#7B2FF7",
    to: "#5500cc",
    glow: "rgba(123, 47, 247,0.25)",
    border: "rgba(123, 47, 247,0.35)",
    bg: "rgba(123, 47, 247,0.06)",
  },
  {
    id: "jackpot",
    label: "JACKPOT",
    sub: "Mega prize pools",
    icon: Trophy,
    href: "/#games",
    from: "#ff2d78",
    to: "#cc0055",
    glow: "rgba(255, 45, 120,0.22)",
    border: "rgba(255, 45, 120,0.3)",
    bg: "rgba(255, 45, 120,0.05)",
  },
  {
    id: "vip",
    label: "VIP ONLY",
    sub: "Exclusive tables",
    icon: Crown,
    href: "/vip",
    from: "#33eeff",
    to: "#00E5FF",
    glow: "rgba(0, 238, 255,0.25)",
    border: "rgba(0, 238, 255,0.35)",
    bg: "rgba(0, 238, 255,0.05)",
  },
];

export function CategorySection() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {CATS.map((cat, i) => {
        const Icon = cat.icon;
        return (
          <motion.div
            key={cat.id}
            initial={{ opacity:0, y:20 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.45, delay:i*0.08 }}
          >
            <Link href={cat.href}
              className="category-card group flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-2xl text-center transition-all duration-300"
              style={{
                background: `linear-gradient(165deg, ${cat.bg}, rgba(8,10,24,0.6))`,
                border: `1px solid ${cat.border.replace("0.3","0.18")}`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`,
              }}
              data-glow={cat.glow}
              data-border={cat.border}
            >
              {/* Icon circle */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-1 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                style={{ background:`linear-gradient(135deg,${cat.from},${cat.to})`, boxShadow:`0 0 24px ${cat.glow}, inset 0 1px 0 rgba(255,255,255,0.2)` }}>
                <Icon className="h-6 w-6 text-white"/>
              </div>
              <p className="font-black text-sm tracking-wider uppercase text-white">{cat.label}</p>
              <p className="text-[10px] font-medium" style={{ color:"rgba(200,210,255,0.45)" }}>{cat.sub}</p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
