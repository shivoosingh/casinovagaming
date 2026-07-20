"use client";

import { useRef, useState } from "react";

const WINNERS = [
  { emoji:"🔥", name:"Rahul",   amt:"$582"   },
  { emoji:"💎", name:"Mike",    amt:"$1,280"  },
  { emoji:"🏆", name:"Alex",    amt:"$912"   },
  { emoji:"⚡", name:"Sarah",   amt:"$2,100"  },
  { emoji:"🎰", name:"David",   amt:"$745"   },
  { emoji:"👑", name:"Jordan",  amt:"$3,450"  },
  { emoji:"💰", name:"Priya",   amt:"$630"   },
  { emoji:"🌟", name:"Chris",   amt:"$1,870"  },
  { emoji:"🎯", name:"Emma",    amt:"$490"   },
  { emoji:"💫", name:"Marcus",  amt:"$5,200"  },
];

export function WinnerTicker() {
  const [paused, setPaused] = useState(false);
  const items = [...WINNERS, ...WINNERS]; // doubled for seamless loop

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: "rgba(0, 229, 255,0.04)",
        border: "1px solid rgba(0, 229, 255,0.14)",
        boxShadow: "0 0 20px rgba(0, 229, 255,0.04)",
        height: "44px",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background:"linear-gradient(to right,#050510,transparent)" }}/>
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background:"linear-gradient(to left,#050510,transparent)" }}/>

      {/* Label */}
      <div className="absolute left-3 top-0 bottom-0 z-20 flex items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
          style={{ background:"rgba(0, 229, 255,0.12)", color:"#00E5FF", border:"1px solid rgba(0, 229, 255,0.2)" }}>
          LIVE WINS
        </span>
      </div>

      {/* Scroll track */}
      <div
        className="flex items-center h-full pl-28"
        style={{
          animation: paused ? "none" : "ticker-scroll 30s linear infinite",
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {items.map((w, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 mr-8 text-sm font-bold select-none">
            <span>{w.emoji}</span>
            <span style={{ color:"rgba(200,210,255,0.8)" }}>{w.name}</span>
            <span className="font-black" style={{ color:"#00E5FF" }}>won</span>
            <span className="font-black" style={{
              background:"linear-gradient(90deg,#FFD700,#ffaa00)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text"
            }}>{w.amt}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
