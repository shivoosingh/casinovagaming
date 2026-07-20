import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-[rgba(0, 229, 255,0.12)] text-[#00E5FF] border border-[rgba(0, 229, 255,0.3)]",
        secondary: "bg-[rgba(255,255,255,0.07)] text-[#c8caef] border border-[rgba(255,255,255,0.1)]",
        success:   "bg-[rgba(16,185,129,0.12)] text-emerald-400 border border-[rgba(16,185,129,0.25)]",
        warning:   "bg-[rgba(255,215,0,0.12)] text-yellow-400 border border-[rgba(255,215,0,0.25)]",
        destructive:"bg-[rgba(239,68,68,0.12)] text-red-400 border border-[rgba(239,68,68,0.25)]",
        outline:   "border border-[rgba(0, 229, 255,0.2)] text-[#e8eaf6]",
        teal:      "bg-[rgba(13,148,136,0.12)] text-teal-400 border border-[rgba(13,148,136,0.3)]",
        purple:    "bg-[rgba(255, 45, 120,0.12)] text-pink-400 border border-[rgba(255, 45, 120,0.3)]",
        gold:      "bg-[rgba(255,215,0,0.12)] text-yellow-300 border border-[rgba(255,215,0,0.3)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
