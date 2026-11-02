import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { SocialLinks } from "@/components/layout/social-links";
import { AnimatedLogo } from "@/components/ui/animated-logo";
import { Shield } from "lucide-react";

const footerLinks = {
  Platform: [
    { href: "/games", label: "Live Games" },
    { href: "/blog", label: "Blog & Guides" },
    { href: "/promotions", label: "Promotions" },
    { href: "/vip", label: "VIP Program" },
    { href: "/spin", label: "Daily Spin" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/about", label: "About Us" },
  ],
  Help: [
    { href: "/support", label: "Support" },
    { href: "/help", label: "Help Center" },
    { href: "/contact", label: "Contact" },
    { href: "/blog/wallet-deposit-guide-casinovasgaming", label: "How to Deposit" },
    { href: "/blog/how-to-redeem-winnings-fast", label: "How to Redeem" },
    { href: "/login", label: "Login" },
    { href: "/register", label: "Register" },
  ],
  Legal: [
    { href: "/terms", label: "Terms of Service" },
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/responsible-play", label: "Responsible Play" },
  ],
};

export function Footer({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <footer className={`border-t border-[rgba(0, 229, 255,0.1)] bg-[#030308] mt-8 ${fullWidth ? "w-full" : ""}`}>
      <div className="h-px bg-gradient-to-r from-transparent via-[#00E5FF]/50 to-transparent" />

      <div className={`mx-auto px-4 py-12 sm:px-6 lg:px-8 ${fullWidth ? "max-w-[1600px]" : "max-w-7xl"}`}>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <AnimatedLogo imageSize={36} textClassName="text-xl" className="mb-5" />
            <p className="text-sm text-[#6b6d8f] max-w-sm mb-6 leading-relaxed">
              Sweepstakes gaming platform. One wallet for Juwa, Game Vault, Vegas Sweeps and more, with VIP rewards and 24/7 live chat.
            </p>
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-[rgba(0, 229, 255,0.05)] border border-[rgba(0, 229, 255,0.12)] w-fit">
              <Shield className="h-4 w-4 text-[#00E5FF] shrink-0" />
              <p className="text-[11px] text-[#00E5FF]/80 font-medium">Card deposits · ID-verified redeems · 24/7 support</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#6b6d8f] mb-3">Follow Us</p>
              <SocialLinks />
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-bold mb-4 text-[#00E5FF] uppercase tracking-widest">{title}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[#6b6d8f] hover:text-[#00E5FF] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-8 border-t border-[rgba(0, 229, 255,0.08)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-[#6b6d8f]">&copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="text-xs text-[#6b6d8f] text-center sm:text-right">
            <span className="font-bold text-[#f0f0f5]">18+ only.</span> Sweepstakes availability varies by jurisdiction; void where prohibited.{" "}
            <Link href="/responsible-play" className="underline hover:text-[#00E5FF]">Play responsibly.</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
