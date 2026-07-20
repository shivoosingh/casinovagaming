"use client";

import { useState, useEffect } from "react";
import { Heart, Trash2, MessageSquare, Shield } from "lucide-react";
import { StarRating } from "@/components/reviews/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  adminDeleteReview,
  adminToggleReviewLike,
  adminUpdateReviewComment,
} from "@/lib/actions/reviews";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { ReviewWithAuthor } from "@/types/database";

function displayName(review: ReviewWithAuthor) {
  const name = review.author?.full_name?.trim();
  if (name) return name;
  const email = review.author?.email ?? "";
  if (email && !email.endsWith("@phone.spinora.local")) {
    return email.split("@")[0];
  }
  return "Casinova Player";
}

interface ReviewCardProps {
  review: ReviewWithAuthor;
  isAdmin?: boolean;
  isOwn?: boolean;
}

export function ReviewCard({ review, isAdmin, isOwn }: ReviewCardProps) {
  const router = useRouter();
  const [adminComment, setAdminComment] = useState(review.admin_comment ?? "");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    setAdminComment(review.admin_comment ?? "");
  }, [review.admin_comment]);

  async function handleLike() {
    const result = await adminToggleReviewLike(review.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(result.liked ? "Review liked" : "Like removed");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this review permanently?")) return;
    const result = await adminDeleteReview(review.id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Review deleted");
    router.refresh();
  }

  async function handleSaveComment() {
    const text = adminComment.trim();
    if (text.length < 3) {
      toast.error("Comment must be at least a few words");
      return;
    }

    setSavingComment(true);
    const result = await adminUpdateReviewComment(review.id, text);
    setSavingComment(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Team reply saved");
    router.refresh();
  }

  return (
    <article
      className={cn(
        "rounded-xl border p-4 sm:p-5 transition-colors",
        review.admin_liked
          ? "border-[rgba(0, 229, 255,0.25)] bg-orange-500/5"
          : "border-[rgba(0, 229, 255,0.1)] bg-[#0a0a1e]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white truncate">{displayName(review)}</p>
            {isOwn && (
              <span className="text-[10px] uppercase tracking-wide text-[#00E5FF] font-medium">
                You
              </span>
            )}
            {review.admin_liked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#00E5FF] bg-[rgba(0, 229, 255,0.08)] px-2 py-0.5 rounded-full">
                <Heart className="h-3 w-3 fill-current" />
                Team pick
              </span>
            )}
          </div>
          <p className="text-xs text-[#6b6d8f] mt-0.5">
            {formatRelativeTime(review.created_at)}
          </p>
        </div>
        <StarRating value={review.rating} readonly size="sm" />
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
        {review.comment}
      </p>

      {review.admin_comment && (
        <div className="mt-4 rounded-lg border border-[rgba(0, 229, 255,0.15)] bg-orange-500/5 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-[#00E5FF] shrink-0" />
            <p className="text-xs font-semibold text-[#c9a84c]">Casinova Team</p>
            {review.admin_commented_at && (
              <span className="text-[10px] text-[#6b6d8f]">
                · {formatRelativeTime(review.admin_commented_at)}
              </span>
            )}
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words">
            {review.admin_comment}
          </p>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 pt-3 border-t border-[rgba(0, 229, 255,0.1)] space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#6b6d8f] flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Team reply on review
            </p>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Thank the player or add a follow-up note — visible to everyone on this review..."
              rows={3}
              maxLength={1000}
              className="bg-[#0d0d1f] border-[rgba(0, 229, 255,0.1)] resize-none text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleSaveComment}
              disabled={savingComment}
            >
              {savingComment ? "Saving..." : "Save team reply"}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={review.admin_liked ? "default" : "outline"}
              onClick={handleLike}
              className="gap-1.5"
            >
              <Heart className={cn("h-4 w-4", review.admin_liked && "fill-current")} />
              {review.admin_liked ? "Liked" : "Like review"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDelete}
              className="gap-1.5 text-red-400 hover:text-red-300 hover:border-red-500/40"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
