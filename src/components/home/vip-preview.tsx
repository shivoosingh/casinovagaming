"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Check } from "lucide-react";

const TIERS = [
  {
    id:"bronze", name:"Bronze", pts:"0+",
    color:"#cd7f32", glow:"rgba(205,127,50,0.25)", border:"rgba(205,127,50,0.3)",
    cashback:"5%", weekly:"Basic Rewards", perks:["Priority support","5% cashback","Weekly bonuses"],
  },
  {
    id:"silver", name:"Silver", pts:"500+",
    color:"#c0c0c0", glow:"rgba(192,192,192,0.22)", border:"rgba(192,192,192,0.3)",
    cashback:"8%", weekly:"Silver Pack", perks:["Priority support","8% cashback","Exclusive games"],
  },
  {
    id:"gold", name:"Gold", pts:"2,000+",
    color:"#FFD700", glow:"rgba(255,215,0,0.3)", border:"rgba(255,215,0,0.4)",
    cashback:"12%", weekly:"Gold Pack", perks:["VIP support 24/7","12% cashback","Early access"],
  },
  {
    id:"platinum", name:"Platinum", pts:"5,000+",
    color:"#00E5FF", glow:"rgba(0, 229, 255,0.3)", border:"rgba(0, 229, 255,0.4)",
    cashback:"25%", weekly:"Platinum Pack", perks:["Dedicated manager","25% cashback","Custom rewards"],
  },
];

export function VipPreview() {
  return (
    <section className="space-y-6">
      <motion.div initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.45}}
        className="flex items-center gap-3">
        <Crown className="h-5 w-5" style={{color:"#FFD700"}}/>
        <h2 className="font-black text-xl uppercase tracking-widest text-white">VIP TIERS</h2>
        <div className="flex-1 h-px" style={{background:"linear-gradient(90deg,rgba(255,215,0,0.4),transparent)"}}/>
        <Link href="/vip" className="text-xs font-bold uppercase tracking-wider transition-colors hover:text-white" style={{color:"rgba(200,210,255,0.4)"}}>
          View All →
        </Link>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((t,i)=>(
          <motion.div key={t.id}
            initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{duration:0.45,delay:i*0.08}}
            className="vip-tier-card relative overflow-hidden rounded-2xl p-5"
            style={{ background:`linear-gradient(165deg, ${t.color}0a 0%, rgba(8,10,24,0.85) 100%)`, border:`1px solid ${t.border}`, boxShadow:`0 4px 24px rgba(0,0,0,0.35), 0 0 20px ${t.glow}` }}>
            <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{background:`linear-gradient(90deg, transparent, ${t.color}, transparent)`}}/>
            <div className="relative z-10 flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`${t.color}20`,border:`1px solid ${t.border}`}}>
                <Crown className="h-4 w-4" style={{color:t.color}}/>
              </div>
              <div>
                <p className="font-black text-white text-sm">{t.name}</p>
                <p className="text-[10px] font-semibold" style={{color:"rgba(200,210,255,0.45)"}}>{t.pts} points</p>
              </div>
            </div>
            <div className="relative z-10 flex gap-2 mb-4">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black" style={{background:`${t.color}18`,color:t.color}}>
                {t.cashback} Cashback
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold" style={{background:"rgba(255,255,255,0.05)",color:"rgba(200,210,255,0.5)"}}>
                {t.weekly}
              </span>
            </div>
            <ul className="relative z-10 space-y-1.5">
              {t.perks.map(p=>(
                <li key={p} className="flex items-center gap-2 text-xs" style={{color:"rgba(200,210,255,0.7)"}}>
                  <Check className="h-3 w-3 shrink-0" style={{color:t.color}}/>
                  {p}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
