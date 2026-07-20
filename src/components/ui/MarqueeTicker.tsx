"use client";

const ITEMS = [
  { emoji: "🔥", name: "Mike",   action: "won",                highlight: "$1,280",   on: "Game Vault"   },
  { emoji: "🏆", name: "Alex",   action: "won",                highlight: "$912",     on: "Juwa"         },
  { emoji: "⚡", name: "Sarah",  action: "won",                highlight: "$2,100",   on: "Cash Frenzy"  },
  { emoji: "💰", name: "David",  action: "won",                highlight: "$745",     on: "Fire Kirin"   },
  { emoji: "👑", name: "Jordan", action: "won",                highlight: "$3,450",   on: "Vegas Sweeps" },
  { emoji: "💎", name: "Priya",  action: "reached",            highlight: "Gold VIP 🏆", on: ""          },
  { emoji: "🌟", name: "Chris",  action: "joined via referral — earned", highlight: "+10 pts", on: ""    },
  { emoji: "🎰", name: "Emma",   action: "set up account on",  highlight: "",         on: "Milky Way"    },
  { emoji: "🎯", name: "Rahul",  action: "won",                highlight: "$582",     on: "MR All In One"},
  { emoji: "💫", name: "Marcus", action: "won",                highlight: "$5,200",   on: "Cash Machine" },
  { emoji: "⭐", name: "Anika",  action: "won",                highlight: "$240",     on: "Milky Way"    },
  { emoji: "🔥", name: "James",  action: "referred 3 friends — earned", highlight: "+300 pts", on: ""   },
];

function Item({ emoji, name, action, highlight, on }: typeof ITEMS[0]) {
  return (
    <span className="inline-flex items-center gap-2 px-5 whitespace-nowrap text-xs sm:text-sm select-none">
      {/* Live dot */}
      <span className="inline-flex h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: "#00E5FF", boxShadow: "0 0 6px rgba(0, 229, 255,0.8)" }} aria-hidden />
      <span className="font-bold" style={{ color: "#33eeff" }}>{name}</span>
      <span style={{ color: "rgba(200, 210, 255,0.6)" }}>{action}</span>
      {highlight && (
        <span className="font-black" style={{
          background: "linear-gradient(90deg,#7af5ff,#00E5FF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>{highlight}</span>
      )}
      {on && (
        <span className="font-semibold" style={{ color: "#00E5FF" }}>on {on}</span>
      )}
      <span style={{ color: "rgba(0, 229, 255,0.2)", margin: "0 4px" }}>•</span>
    </span>
  );
}

export function MarqueeTicker() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden"
      style={{
        background: "rgba(0, 229, 255,0.04)",
        borderTop: "1px solid rgba(0, 229, 255,0.1)",
        borderBottom: "1px solid rgba(0, 229, 255,0.1)",
        height: "38px",
      }}>

      {/* Edge fades */}
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right,#050510,transparent)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left,#050510,transparent)" }} />

      {/* LIVE label */}
      <div className="absolute left-3 top-0 bottom-0 z-20 flex items-center">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md"
          style={{ background: "rgba(0, 229, 255,0.12)", color: "#00E5FF", border: "1px solid rgba(0, 229, 255,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
          LIVE
        </span>
      </div>

      {/* Scrolling track */}
      <div
        className="marquee-track flex items-center h-full pl-24"
        style={{ width: "max-content" }}
        onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
        onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
      >
        {doubled.map((item, i) => (
          <Item key={i} {...item} />
        ))}
      </div>
    </div>
  );
}
