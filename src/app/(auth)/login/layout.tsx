import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Log In | ${SITE_NAME}`,
  description: `Log in to your ${SITE_NAME} account to deposit, load a game, spin the daily wheel or request a redeem.`,
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
