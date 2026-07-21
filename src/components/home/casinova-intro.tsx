"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const INTRO_KEY = "casinova-intro-seen";
/** Total runtime before fade-out (~8.5s feel, skippable). */
const INTRO_MS = 8500;
const EXIT_MS = 900;

const easeCinematic = [0.22, 1, 0.36, 1] as const;

/** Ease progress: linger in the middle so the logo beat lands. */
function cinematicProgress(t: number) {
  if (t < 0.22) return (t / 0.22) * 0.12;
  if (t < 0.55) return 0.12 + ((t - 0.22) / 0.33) * 0.38;
  if (t < 0.82) return 0.5 + ((t - 0.55) / 0.27) * 0.35;
  return 0.85 + ((t - 0.82) / 0.18) * 0.15;
}

function Chip({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-11 w-11 rounded-full border-2 border-amber-400/55 bg-gradient-to-br from-violet-600 to-fuchsia-700 shadow-[0_0_24px_rgba(168,85,247,0.5)] sm:h-12 sm:w-12 ${className ?? ""}`}
      initial={{ opacity: 0, y: 56, rotate: -28, scale: 0.85 }}
      animate={{ opacity: [0, 0.95, 0.8], y: [56, -16, 4], rotate: [-28, 16, -6], scale: 1 }}
      transition={{ duration: 6.5, delay, ease: "easeInOut" }}
      aria-hidden
    >
      <span className="absolute inset-[3px] rounded-full border border-amber-300/45" />
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-amber-100/90">
        $
      </span>
    </motion.div>
  );
}

function Card({ className, delay, suit }: { className?: string; delay: number; suit: string }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-16 w-11 rounded-md border border-white/25 bg-gradient-to-b from-white to-violet-100 shadow-[0_0_28px_rgba(232,121,249,0.3)] sm:h-[4.5rem] sm:w-12 ${className ?? ""}`}
      initial={{ opacity: 0, y: 70, rotate: 22, scale: 0.9 }}
      animate={{ opacity: [0, 1, 0.85], y: [70, -14, 2], rotate: [22, -14, 5], scale: 1 }}
      transition={{ duration: 7, delay, ease: "easeInOut" }}
      aria-hidden
    >
      <span className="absolute left-1.5 top-1.5 text-[11px] font-bold text-fuchsia-700">{suit}</span>
      <span className="absolute right-1.5 bottom-1.5 rotate-180 text-[11px] font-bold text-violet-700">{suit}</span>
    </motion.div>
  );
}

function Die({ className, delay }: { className?: string; delay: number }) {
  return (
    <motion.div
      className={`pointer-events-none absolute h-9 w-9 rounded-md border border-violet-300/45 bg-gradient-to-br from-violet-500/85 to-fuchsia-800/95 shadow-[0_0_18px_rgba(168,85,247,0.45)] ${className ?? ""}`}
      initial={{ opacity: 0, scale: 0.5, rotate: -40 }}
      animate={{ opacity: [0, 0.9, 0.75], scale: [0.5, 1.05, 1], rotate: [-40, 30, -8] }}
      transition={{ duration: 6.2, delay, ease: "easeOut" }}
      aria-hidden
    >
      <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />
      <span className="absolute right-1.5 bottom-1.5 h-1.5 w-1.5 rounded-full bg-white/90" />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
    </motion.div>
  );
}

function Particles() {
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {dots.map((i) => {
        const left = (i * 41) % 100;
        const top = (i * 59) % 100;
        const size = 2 + (i % 4);
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-fuchsia-300/70 shadow-[0_0_10px_rgba(232,121,249,0.85)]"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: [0, 0.95, 0.25, 0.85, 0.4],
              y: [0, -28 - (i % 6) * 5, 8, -16],
              x: [0, (i % 2 === 0 ? 12 : -12), 0, (i % 2 === 0 ? -6 : 6)],
            }}
            transition={{
              duration: 5.5 + (i % 5) * 0.4,
              delay: 0.35 + i * 0.06,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

function LightRays() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.55, 0.35] }}
      transition={{ delay: 1.4, duration: 2.4 }}
      aria-hidden
    >
      {[0, 30, 60, 90, 120, 150].map((deg) => (
        <motion.span
          key={deg}
          className="absolute h-[120vmax] w-px origin-center bg-gradient-to-t from-transparent via-violet-400/25 to-transparent"
          style={{ transform: `rotate(${deg}deg)` }}
          animate={{ opacity: [0.15, 0.45, 0.2] }}
          transition={{ duration: 4, delay: 1.6 + deg * 0.01, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

export function CasinovaIntro({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [exiting, setExiting] = useState(false);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      /* ignore */
    }
    setExiting(true);
    window.setTimeout(onComplete, EXIT_MS);
  }, [onComplete]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / INTRO_MS);
      setProgress(Math.round(cinematicProgress(raw) * 100));
      if (raw < 1) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [finish]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#030306]"
      initial={{ opacity: 1 }}
      animate={{
        opacity: exiting ? 0 : 1,
        filter: exiting ? "brightness(1.55) saturate(1.2)" : "brightness(1)",
        scale: exiting ? 1.04 : 1,
      }}
      transition={{ duration: EXIT_MS / 1000, ease: easeCinematic }}
      role="dialog"
      aria-label="Casinova Gaming opening"
    >
      {/* Phase 1 — long dark bloom */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 1.8, delay: 0.15, ease: "easeOut" }}
      />
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.4, delay: 0.4, ease: easeCinematic }}
        style={{
          background:
            "radial-gradient(ellipse 85% 65% at 50% 48%, rgba(91,33,182,0.5) 0%, rgba(49,16,89,0.25) 38%, rgba(3,3,6,0.85) 68%, #030306 100%)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0.4] }}
        transition={{ duration: 3.2, delay: 0.9 }}
        style={{
          background:
            "conic-gradient(from 200deg at 50% 48%, transparent 0deg, rgba(168,85,247,0.14) 50deg, transparent 110deg, rgba(249,115,22,0.09) 190deg, transparent 260deg, rgba(232,121,249,0.1) 310deg, transparent 360deg)",
        }}
      />

      {/* Horizon floor */}
      <motion.div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[38%]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 1.8 }}
        style={{
          background:
            "linear-gradient(to top, rgba(88,28,135,0.22) 0%, transparent 70%), repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(168,85,247,0.06) 49px)",
          maskImage: "linear-gradient(to top, black 0%, transparent 85%)",
        }}
        aria-hidden
      />

      <motion.div
        className="pointer-events-none absolute -left-1/4 top-1/4 h-[55vh] w-[55vw] rounded-full bg-violet-600/25 blur-[110px]"
        animate={{ x: [0, 40, 0], y: [0, 16, 0], opacity: [0.2, 0.45, 0.28] }}
        transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute -right-1/4 bottom-1/5 h-[45vh] w-[45vw] rounded-full bg-fuchsia-600/20 blur-[100px]"
        animate={{ x: [0, -32, 0], y: [0, -12, 0], opacity: [0.15, 0.4, 0.22] }}
        transition={{ duration: 9, ease: "easeInOut", repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[60px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.35] }}
        transition={{ delay: 3.2, duration: 2 }}
      />

      <LightRays />
      <Particles />

      {/* Phase 2 — elements (later entrance) */}
      <Chip className="left-[10%] top-[26%]" delay={1.8} />
      <Chip className="right-[12%] top-[34%]" delay={2.15} />
      <Chip className="left-[18%] bottom-[24%]" delay={2.45} />
      <Chip className="right-[16%] bottom-[38%]" delay={2.7} />
      <Card className="left-[6%] top-[56%]" delay={2.0} suit="A♠" />
      <Card className="right-[8%] top-[20%]" delay={2.25} suit="K♥" />
      <Card className="right-[18%] bottom-[20%]" delay={2.55} suit="Q♦" />
      <Card className="left-[24%] top-[14%]" delay={2.8} suit="J♣" />
      <Die className="left-[28%] top-[20%]" delay={2.2} />
      <Die className="right-[26%] bottom-[28%]" delay={2.6} />
      <Die className="left-[42%] bottom-[18%]" delay={2.9} />

      {/* Phase 3–4 — logo (held longer) */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, scale: 0.65 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 3.0, duration: 1.35, ease: easeCinematic }}
        >
          <motion.div
            className="absolute -inset-14 rounded-full bg-violet-500/35 blur-3xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.95, 0.6, 0.85], scale: [0.5, 1.2, 1.05, 1.12] }}
            transition={{ delay: 3.25, duration: 2.8, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-8 rounded-full border border-fuchsia-400/25"
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: [0, 0.8, 0.2], scale: [0.8, 1.35, 1.6] }}
            transition={{ delay: 4.4, duration: 1.8, ease: "easeOut" }}
          />
          <motion.div
            className="absolute -inset-4 rounded-full border border-amber-300/15"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 0.6, 0.15], scale: [0.9, 1.2, 1.4] }}
            transition={{ delay: 4.7, duration: 1.6, ease: "easeOut" }}
          />
          <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-2xl border border-violet-400/50 bg-black/50 shadow-[0_0_50px_rgba(168,85,247,0.65)] sm:h-28 sm:w-28">
            <Image src="/logo.webp" alt="" fill className="object-contain p-2.5" priority sizes="112px" />
          </div>
        </motion.div>

        <motion.p
          className="text-[10px] font-semibold tracking-[0.5em] text-amber-300/90 sm:text-xs"
          initial={{ opacity: 0, y: 16, letterSpacing: "0.2em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.5em" }}
          transition={{ delay: 3.55, duration: 0.9 }}
        >
          ENTER THE ARENA
        </motion.p>
        <motion.h1
          className="mt-3 bg-gradient-to-b from-white via-violet-100 to-fuchsia-300/90 bg-clip-text text-5xl font-black tracking-[0.14em] text-transparent drop-shadow-[0_0_36px_rgba(168,85,247,0.7)] sm:text-7xl"
          initial={{ opacity: 0, scale: 0.82, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ delay: 3.75, duration: 1.25, ease: easeCinematic }}
        >
          CASINOVA
        </motion.h1>
        <motion.p
          className="mt-2 text-xl font-semibold tracking-[0.4em] text-violet-200/90 sm:text-2xl"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4.35, duration: 0.75 }}
        >
          GAMING
        </motion.p>
        <motion.div
          className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 4.7, duration: 0.8 }}
        />
      </div>

      {/* Phase 5 — progress (appears after logo settles) */}
      <motion.div
        className="absolute bottom-16 left-1/2 z-10 w-[min(20rem,80vw)] -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 5.1, duration: 0.7 }}
      >
        <p className="mb-3 text-center text-[10px] font-semibold tracking-[0.32em] text-violet-200/85">
          PREPARING YOUR LUCK...
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10 shadow-[inset_0_0_10px_rgba(0,0,0,0.55)]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-amber-400 shadow-[0_0_14px_rgba(168,85,247,0.85)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[10px] tabular-nums tracking-wider text-slate-500">
          {progress}%
        </p>
      </motion.div>

      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 right-6 z-20 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[11px] font-medium tracking-wide text-slate-400/90 backdrop-blur-sm transition hover:border-violet-400/40 hover:text-white"
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
    return <div className="min-h-dvh bg-[#030306]" aria-hidden />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showIntro ? (
          <CasinovaIntro key="intro" onComplete={() => setShowIntro(false)} />
        ) : null}
      </AnimatePresence>
      <motion.div
        initial={showIntro ? { opacity: 0.12, scale: 1.03 } : false}
        animate={{ opacity: showIntro ? 0.12 : 1, scale: 1 }}
        transition={{ duration: 1.0, ease: easeCinematic }}
        className={showIntro ? "pointer-events-none max-h-dvh overflow-hidden" : undefined}
        aria-hidden={showIntro || undefined}
      >
        {children}
      </motion.div>
    </>
  );
}
