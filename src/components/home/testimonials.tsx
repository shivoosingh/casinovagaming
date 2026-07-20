"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import { HomeSection } from "@/components/home/home-section";
import { Button } from "@/components/ui/button";
import {
  formatReviewDisplayName,
  formatReviewVipTier,
} from "@/lib/reviews/display";
import type { ReviewWithAuthor } from "@/types/database";

interface TestimonialsProps {
  reviews: ReviewWithAuthor[];
}

export function Testimonials({ reviews }: TestimonialsProps) {
  return (
    <HomeSection>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-10"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          What Our <span className="gradient-text">Players Say</span>
        </h2>
        <p className="text-sm text-[#6b6d8f] max-w-xl mx-auto">
          Real reviews from our community — updated live when players share their experience.
        </p>
      </motion.div>

      {reviews.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {reviews.map((review, i) => (
              <motion.article
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="review-card-surface rounded-2xl p-5 flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex gap-1">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  {review.admin_liked && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#00E5FF] bg-[rgba(0, 229, 255,0.08)] px-2 py-0.5 rounded-full shrink-0">
                      <Heart className="h-3 w-3 fill-current" />
                      Team pick
                    </span>
                  )}
                </div>

                <p className="text-sm text-[#6b6d8f] mb-4 leading-relaxed flex-1">
                  &ldquo;{review.comment}&rdquo;
                </p>

                {review.admin_comment && (
                  <p className="text-xs text-orange-200/70 mb-4 leading-relaxed border-l-2 border-[rgba(0, 229, 255,0.25)] pl-3">
                    <span className="font-semibold text-[#7af5ff]">Spinora Team: </span>
                    {review.admin_comment}
                  </p>
                )}

                <div>
                  <p className="font-semibold text-sm">{formatReviewDisplayName(review)}</p>
                  <p className="text-xs text-[#00E5FF]">{formatReviewVipTier(review)}</p>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/dashboard/reviews">See all reviews</Link>
            </Button>
          </div>
        </>
      ) : (
        <div className="text-center review-card-surface rounded-2xl py-12 px-6">
          <p className="text-[#6b6d8f] mb-4">
            No player reviews yet. Be the first to share your Spinora experience!
          </p>
          <Button asChild>
            <Link href="/register">Join & leave a review</Link>
          </Button>
        </div>
      )}
    </HomeSection>
  );
}
