import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";
import { BONUS_HEADLINE } from "@/lib/offers";

// Auth pages are client components; this server layout gives them real metadata.
// They are deliberately noindex: the registration form is not a search landing page.
export const metadata: Metadata = {
  title: `Create Your Free Account | ${SITE_NAME}`,
  description: `Create a free ${SITE_NAME} account. ${BONUS_HEADLINE}. Card deposits, eight live games, 24/7 live chat. 18+.`,
  alternates: { canonical: "/register" },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
