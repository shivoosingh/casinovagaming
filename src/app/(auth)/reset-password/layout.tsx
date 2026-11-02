import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Reset Password | ${SITE_NAME}`,
  description: `Reset the password for your ${SITE_NAME} account.`,
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
