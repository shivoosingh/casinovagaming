"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, Gamepad2, DollarSign, Crown } from "lucide-react";

function Counter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !started.current) {
        started.current = true;
        let cur = 0;
        const step = to / (1800 / 16);
        const t = setInterval(() => {
          cur += step;
          if (cur >= to) { setVal(to); clearInterval(t); }
          else setVal(Math.floor(cur));
        }, 16);
      }
    }, { threshold: 0.3 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [to]);

  return (
    <span ref={ref}>
      {prefix}{val >= 1000 ? (val >= 1_000_000 ? `${(val/1_000_000).toFixed(1)}M` : `${(val/1000).toFixed(0)}K`) : val}{suffix}
    </span>
  );
}

const STATS = [
  { icon: Users,     label: "Players Online",  to: 12847,     color: "#00E5FF", glow: "rgba(0, 229, 255,0.2)"   },
  { icon: Gamepad2,  label: "Games Available",  to: 14,        color: "#7B2FF7", glow: "rgba(123, 47, 247,0.2)"  },
  { icon: DollarSign,label: "Daily Payout",     to: 284000, prefix:"$", color: "#33eeff", glow: "rgba(0, 238, 255,0.2)" },
  { icon: Crown,     label: "VIP Members",      to: 3200,      color: "#ff2d78", glow: "rgba(255, 45, 120,0.2)"   },
];

export function StatsSection() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {STATS.map((s, i) => {
        const Icon = s.icon;
        return (
          <motion.div key={s.label}
            initial={{ opacity:0, y:16 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.45, delay:i*0.08 }}
            className="stat-card cyber-surface-card flex flex-col items-center text-center py-6 px-4 rounded-2xl"
            style={{
              border:`1px solid ${s.glow.replace("0.2","0.14")}`,
            }}>
            <div className="stat-card-accent" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
            <div className="stat-card-glow" style={{ background: s.color }} />
            <div className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center mb-3"
              style={{ background:`${s.color}15`, border:`1px solid ${s.color}35`, boxShadow:`0 0 16px ${s.glow}` }}>
              <Icon className="h-5 w-5" style={{ color:s.color }}/>
            </div>
            <p className="relative z-10 font-black text-2xl sm:text-3xl text-white mb-1" style={{ textShadow:`0 0 24px ${s.glow}` }}>
              <Counter to={s.to} prefix={(s as any).prefix}/>
            </p>
            <p className="relative z-10 text-[11px] font-semibold uppercase tracking-wider" style={{ color:"rgba(200,210,255,0.45)" }}>
              {s.label}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
