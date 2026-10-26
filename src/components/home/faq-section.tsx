"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { HOME_FAQS } from "@/lib/seo/faq-data";
import { HomeSection } from "@/components/home/home-section";
import { cn } from "@/lib/utils";

const FAQS = HOME_FAQS;

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <HomeSection tinted>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-[#6b6d8f] text-sm">Have any questions? We&apos;ve got answers.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            const buttonId = `${baseId}-q${i}`;
            const panelId = `${baseId}-a${i}`;
            return (
              <div key={i} className="rounded-xl overflow-hidden bg-[#0d0d1f] border border-[rgba(255,255,255,0.06)]">
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[rgba(201,168,76,0.04)] transition-colors"
                >
                  <span className="font-semibold text-sm pr-4 text-[#f0f0f5]">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-[#c9a84c] flex-shrink-0 transition-transform",
                      isOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
                {/* Keep closed answers mounted: the FAQPage schema needs every answer in the server HTML. */}
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  inert={!isOpen}
                  initial={false}
                  animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-4 sm:px-5 pb-4 text-sm text-[#6b6d8f] leading-relaxed">
                    {faq.a}
                  </p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </HomeSection>
  );
}
