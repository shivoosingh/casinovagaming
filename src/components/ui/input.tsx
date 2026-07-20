import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      suppressHydrationWarning
      className={cn(
        "flex h-10 w-full rounded-lg border border-[rgba(0, 229, 255,0.15)] bg-[#0d0d1f]",
        "px-3 py-2 text-sm text-[#e8eaf6] placeholder:text-[#6b6d8f]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0, 229, 255,0.4)] focus-visible:border-[rgba(0, 229, 255,0.5)]",
        "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
