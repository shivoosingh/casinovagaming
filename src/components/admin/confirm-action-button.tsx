"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { AdminActionResult } from "@/lib/actions/admin/core";
import { cn } from "@/lib/utils";

/**
 * Confirm-then-run wrapper for a destructive admin action.
 */
export function ConfirmActionButton({
  action,
  title,
  description,
  confirmLabel = "Confirm",
  triggerLabel,
  icon,
  variant = "destructive",
}: {
  action: () => Promise<AdminActionResult>;
  title: string;
  description: string;
  confirmLabel?: string;
  triggerLabel?: string;
  icon?: React.ReactNode;
  variant?: "destructive" | "outline" | "ghost";
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    if (!window.confirm(`${title}\n\n${description}`)) return;
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? confirmLabel);
      router.refresh();
    });
  }

  return triggerLabel ? (
    <Button variant={variant} size="sm" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : (icon ?? <Trash2 className="size-4" />)}
      {triggerLabel}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      aria-label={title}
      onClick={run}
      disabled={pending}
      className={cn(variant === "destructive" && "hover:text-red-400")}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : (icon ?? <Trash2 className="size-4" />)}
    </Button>
  );
}
