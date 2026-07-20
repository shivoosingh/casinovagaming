import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { Button } from "@/components/ui/button";
import { supportMetadata } from "@/lib/seo/metadata";
import Link from "next/link";
import { MessageCircle, Mail, HelpCircle, Clock, ChevronRight } from "lucide-react";

export const metadata = supportMetadata;

const faqs = [
  {
    q: "How do I request a game account?",
    a: "Create a free account, navigate to your dashboard, and submit a game request. Our team will process it within 24 hours.",
  },
  {
    q: "How does the VIP program work?",
    a: "Earn VIP points through game requests and referrals. Points unlock Bronze, Silver, Gold, and Platinum tiers with increasing benefits.",
  },
  {
    q: "Is live chat available 24/7?",
    a: "Yes! Use the floating chat widget on any page or visit your dashboard messages for real-time support.",
  },
  {
    q: "How do referrals work?",
    a: "Share your unique referral code. When friends sign up, you earn 10 VIP points per referral.",
  },
];

export default function SupportPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Support" }]} />

          <div className="mb-12 relative">
            <div className="h-[1px] bg-gradient-to-r from-[rgba(201,168,76,0.4)] via-transparent to-transparent mb-6" />
            <p className="text-sm font-semibold text-[#c9a84c] uppercase tracking-widest mb-3">Help Center</p>
            <h1 className="text-4xl sm:text-5xl font-black mb-5">
              <span className="text-[#f0f0f5]">Support & </span>
              <span className="gradient-text">Help Center</span>
            </h1>
            <p className="text-[#6b6d8f] max-w-2xl text-lg">
              Get help with game accounts, VIP questions, and technical issues. Our team is here 24/7.
            </p>
          </div>

          {/* Contact Cards */}
          <div className="grid sm:grid-cols-3 gap-5 mb-16">
            {[
              {
                icon: MessageCircle,
                title: "Live Chat",
                desc: "Chat with our support team in real-time",
                action: "Open Chat",
                href: "/login",
                color: "text-[#c9a84c]",
                bg: "bg-[rgba(201,168,76,0.08)] border-[rgba(201,168,76,0.2)]",
                cardBorder: "border-[rgba(201,168,76,0.12)]",
              },
              {
                icon: Mail,
                title: "Email Support",
                desc: "support@casinovagaming.com",
                action: "Send Email",
                href: "mailto:support@casinovagaming.com",
                color: "text-teal-400",
                bg: "bg-teal-400/10 border-teal-400/20",
                cardBorder: "border-teal-400/12",
              },
              {
                icon: Clock,
                title: "Response Time",
                desc: "Average response under 5 minutes",
                action: "Learn More",
                href: "/about",
                color: "text-violet-400",
                bg: "bg-violet-400/10 border-violet-400/20",
                cardBorder: "border-violet-400/12",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className={`rounded-2xl border ${item.cardBorder} bg-[#0d0d1f] p-6 text-center cn-card-hover`}
                >
                  <div className={`inline-flex w-14 h-14 rounded-2xl border items-center justify-center mb-4 ${item.bg}`}>
                    <Icon className={`h-7 w-7 ${item.color}`} />
                  </div>
                  <h3 className="font-bold text-[#f0f0f5] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#6b6d8f] mb-4">{item.desc}</p>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={item.href}>{item.action}</Link>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-2xl font-bold text-[#f0f0f5] mb-6 flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-[#c9a84c]" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <ChevronRight className="h-5 w-5 text-[#c9a84c] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-[#f0f0f5] mb-2">{faq.q}</p>
                        <p className="text-sm text-[#6b6d8f] leading-relaxed">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
