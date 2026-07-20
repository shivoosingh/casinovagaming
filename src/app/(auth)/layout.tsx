import Image from "next/image";
import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { Shield, Crown, Zap, Cpu } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[#050510]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1e] via-[#050510] to-[#1a1210]" />

        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(rgba(0, 229, 255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 229, 255,1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full bg-[rgba(0, 229, 255,0.07)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-[rgba(255, 45, 120,0.06)] blur-3xl pointer-events-none" />

        {/* Neon top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff2d78] via-[#00E5FF] to-[#ffd700]" />

        <div className="relative text-center p-12 max-w-sm">
          {/* Logo with glow */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 rounded-3xl bg-[rgba(0, 229, 255,0.15)] blur-xl scale-110" />
            <Image
              src="/logo.webp"
              alt={SITE_NAME}
              width={120}
              height={120}
              className="relative mx-auto rounded-3xl border border-[rgba(0, 229, 255,0.3)]"
              style={{ boxShadow: "0 0 40px rgba(0, 229, 255,0.4), 0 0 80px rgba(0, 229, 255,0.15)" }}
              priority
            />
          </div>

          <h2 className="text-3xl font-black mb-1">
            <span className="text-white">Casino</span>
            <span style={{
              background: "linear-gradient(135deg, #00E5FF, #ffd700, #ff2d78)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}>nova</span>
          </h2>
          <div className="flex items-center justify-center gap-1.5 mb-6">
            <Cpu className="h-3 w-3 text-[#00E5FF]" />
            <p className="text-xs font-bold text-[#00E5FF] tracking-widest uppercase">Gaming</p>
          </div>

          <p className="text-[#6b6d8f] text-sm leading-relaxed mb-8">
            Premium casino platform with VIP rewards, instant account setup, and 24/7 live support.
          </p>

          <div className="space-y-2.5">
            {[
              { icon: Shield, label: "Secure & Trusted Platform", color: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
              { icon: Crown, label: "VIP Rewards Program", color: "text-[#ffd700]", border: "border-[rgba(255,215,0,0.2)]", bg: "bg-[rgba(255,215,0,0.05)]" },
              { icon: Zap, label: "Instant Account Setup", color: "text-[#00E5FF]", border: "border-[rgba(0, 229, 255,0.2)]", bg: "bg-[rgba(0, 229, 255,0.05)]" },
            ].map(({ icon: Icon, label, color, border, bg }) => (
              <div key={label} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${border} ${bg}`}>
                <Icon className={`h-4 w-4 ${color} shrink-0`} />
                <span className="text-sm text-[#c8caef] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff2d78] via-[#00E5FF] to-[#ffd700] lg:hidden" />
        <div className="w-full max-w-md">
          <Link href="/" className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Image src="/logo.webp" alt={SITE_NAME} width={36} height={36} className="rounded-xl border border-[rgba(0, 229, 255,0.3)]" style={{ boxShadow: "0 0 15px rgba(0, 229, 255,0.3)" }} />
            <span className="font-black text-xl">
              <span className="text-white">Casino</span>
              <span style={{ background: "linear-gradient(135deg,#00E5FF,#ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>nova</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
