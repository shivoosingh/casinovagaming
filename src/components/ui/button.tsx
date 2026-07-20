import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF] disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#33eeff] to-[#0099cc] text-[#050510] shadow-lg shadow-[rgba(0,229,255,0.35)] hover:shadow-[rgba(0,229,255,0.55)] hover:from-[#7af5ff] hover:to-[#00c4e0] border border-[rgba(0,229,255,0.45)]",
        secondary:
          "bg-[#10102a] text-[#c8caef] border border-[rgba(0,229,255,0.15)] hover:bg-[#1a1a3a] hover:border-[rgba(0,229,255,0.3)]",
        outline:
          "border border-[rgba(0,229,255,0.35)] bg-transparent text-[#00E5FF] hover:bg-[rgba(0,229,255,0.08)] hover:border-[rgba(0,229,255,0.6)]",
        ghost:
          "hover:bg-[rgba(0,229,255,0.06)] text-[#c8caef]",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
        link:
          "text-[#00E5FF] underline-offset-4 hover:underline",
        pink:
          "bg-gradient-to-b from-[#ff2d78] to-[#cc0055] text-white shadow-lg shadow-[rgba(255,45,120,0.35)] hover:shadow-[rgba(255,45,120,0.55)] border border-[rgba(255,45,120,0.4)]",
        gold:
          "bg-gradient-to-b from-[#ffd700] to-[#cc9900] text-[#050510] shadow-lg shadow-[rgba(255,215,0,0.25)] hover:from-[#ffe033] hover:to-[#ddaa00] border border-[rgba(255,215,0,0.4)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
