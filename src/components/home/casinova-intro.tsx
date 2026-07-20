"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const INTRO_KEY = "casinova-intro-seen";
const INTRO_MS = 4200;

function Chip({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-10 w-10 rounded-full border-2 border-amber-400/50 bg-gradient-to-br from-violet-600 to-fuchsia-700 shadow-[0_0_20px_rgba(168,85,247,0.45)] ${className ?? ""}`}
      initial={{ opacity: 0, y: 40, rotate: -20 }}
      animate={{ opacity: [0, 0.9, 0.75], y: [40, -12, 8], rotate: [-20, 12, -8] }}
      transition={{ duration: 4.2, delay, ease: "easeInOut" }}
      aria-hidden
    >
      <span className="absolute inset-[3px] rounded-full border border-amber-300/40" />
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-amber-100/90">
        $
      </span>
    </motion.div>
  );
}

function Card({ className, delay, suit }: { className?: string; delay: number; suit: string }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-14 w-10 rounded-md border border-white/20 bg-gradient-to-b from-white/95 to-violet-100 shadow-[0_0_24px_rgba(232,121,249,0.25)] ${className ?? ""}`}
      initial={{ opacity: 0, y: 50, rotate: 15 }}
      animate={{ opacity: [0, 0.95, 0.8], y: [50, -8, 6], rotate: [15, -10, 6] }}
      transition={{ duration: 4.4, delay, ease: "easeInOut" }}
      aria-hidden
    >
      <span className="absolute left-1 top-1 text-[10px] font-bold text-fuchsia-700">{suit}</span>
      <span className="absolute right-1 bottom-1 rotate-180 text-[10px] font-bold text-violet-700">{suit}</span>
    </motion.div>
  );
}

function Die({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-8 w-8 rounded-md border border-violet-300/40 bg-gradient-to-br from-violet-500/80 to-fuchsia-800/90 shadow-[0_0_16px_rgba(168,85,247,0.4)] ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.6, rotate: 0 }}
      animate={{ opacity: [0, 0.85, 0.7], scale: [0.6, 1, 0.95], rotate: [0, 25, -10] }}
      transition={{ duration: 4, delay, ease: "easeOut" }}
      aria-hidden
    >
      <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />
      <span className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
    </motion.div>
  );
}

function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const size = 2 + (i % 3);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-fuchsia-300/70 shadow-[0_0_8px_rgba(232,121,249,0.8)]"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{
              opacity: [0, 0.9, 0.3, 0.8],
              y: [0, -18 - (i % 5) * 4, 0],
              x: [0, (i % 2 === 0 ? 8 : -8), 0],
            }}
            transition={{ duration: 3.5 + (i % 4) * 0.3, delay: 0.2 + i * 0.05, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}

export function CasinovaIntro({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / INTRO_MS);
      setProgress(Math.round(t * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050508]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "brightness(1.4)" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-label="Casinova Gaming opening"
    >
      {/* Phase 1 ambient */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(88,28,135,0.45) 0%, rgba(5,5,8,0.2) 45%, #050508 75%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.35] }}
        transition={{ duration: 2.4, delay: 0.4 }}
        style={{
          background:
            "conic-gradient(from 210deg at 50% 50%, transparent 0deg, rgba(168,85,247,0.12) 60deg, transparent 120deg, rgba(249,115,22,0.08) 200deg, transparent 280deg)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute -left-1/4 top-1/3 h-[50vh] w-[50vw] rounded-full bg-violet-600/20 blur-[100px]"
        animate={{ x: [0, 30, 0], opacity: [0.2, 0.4, 0.25] }}
        transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -right-1/4 bottom-1/4 h-[40vh] w-[40vw] rounded-full bg-fuchsia-600/15 blur-[90px]"
        animate={{ x: [0, -24, 0], opacity: [0.15, 0.35, 0.2] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
      />

      <Particles />

      {/* Phase 2 elements */}
      <Chip className="left-[12%] top-[28%]" delay={0.55} />
      <Chip className="right-[14%] top-[36%]" delay={0.75} />
      <Chip className="left-[22%] bottom-[26%]" delay={0.95} />
      <Card className="left-[8%] top-[58%]" delay={0.7} suit="A♠" />
      <Card className="right-[10%] top-[22%]" delay={0.9} suit="K♥" />
      <Card className="right-[20%] bottom-[22%]" delay={1.05} suit="Q♦" />
      <Die className="left-[30%] top-[18%]" delay={0.85} />
      <Die className="right-[28%] bottom-[30%]" delay={1.1} />

      {/* Phase 3–4 logo */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.div
          className="relative mb-5"
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.15, duration: 0.95, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute -inset-10 rounded-full bg-violet-500/30 blur-3xl"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.85, 0.55], scale: [0.6, 1.15, 1] }}
            transition={{ delay: 1.35, duration: 1.4 }}
          />
          <motion.div
            className="absolute -inset-6 rounded-full border border-fuchsia-400/20"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.7, 0.25], scale: [0.85, 1.25, 1.45] }}
            transition={{ delay: 2.1, duration: 1.2 }}
          />
          <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-violet-400/40 bg-black/40 shadow-[0_0_40px_rgba(168,85,247,0.55)] sm:h-24 sm:w-24">
            <Image src="/logo.webp" alt="" fill className="object-contain p-2" priority sizes="96px" />
          </div>
        </motion.div>

        <motion.p
          className="text-[10px] font-semibold tracking-[0.45em] text-amber-300/90 sm:text-xs"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 0.6 }}
        >
          ENTER THE ARENA
        </motion.p>
        <motion.h1
          className="mt-2 bg-gradient-to-b from-white via-violet-100 to-fuchsia-300/90 bg-clip-text text-4xl font-black tracking-[0.12em] text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.65)] sm:text-6xl"
          initial={{ opacity: 0, scale: 0.88, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ delay: 1.55, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          CASINOVA
        </motion.h1>
        <motion.p
          className="mt-1 text-lg font-semibold tracking-[0.35em] text-violet-200/90 sm:text-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.85, duration: 0.55 }}
        >
          GAMING
        </motion.p>
      </div>

      {/* Phase 5 progress */}
      <motion.div
        className="absolute bottom-16 left-1/2 z-10 w-[min(18rem,78vw)] -translate-x-1/2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.45 }}
      >
        <p className="mb-3 text-center text-[10px] font-semibold tracking-[0.28em] text-violet-200/80">
          PREPARING YOUR LUCK...
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-400 shadow-[0_0_12px_rgba(168,85,247,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </motion.div>

      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 z-20 text-[11px] font-medium tracking-wide text-slate-400/80 transition hover:text-white"
      >
        Skip Intro
      </button>
    </motion.div>
  );
}

export function HomeIntroGate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = false;
    }
    if (reduced || seen) {
      setShowIntro(false);
      setReady(true);
      return;
    }
    setShowIntro(true);
    setReady(true);
  }, [reduced]);

  if (!ready) {
    return <div className="min-h-dvh bg-[#050508]" aria-hidden />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro ? (
          <CasinovaIntro key="intro" onComplete={() => setShowIntro(false)} />
        ) : null}
      </AnimatePresence>
      <motion.div
        initial={showIntro ? { opacity: 0.15, scale: 1.02 } : false}
        animate={{ opacity: showIntro ? 0.15 : 1, scale: 1 }}
        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className={showIntro ? "pointer-events-none max-h-dvh overflow-hidden" : undefined}
        aria-hidden={showIntro || undefined}
      >
        {children}
      </motion.div>
    </>
  );
}
