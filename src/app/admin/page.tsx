import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminBroadcastNotice } from "@/components/admin/admin-broadcast-notice";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, MessageSquare, Star, Banknote, History, Wallet, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminPage() {
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: pendingLoads },
    { count: transactionCount },
    { count: conversationCount },
    { count: reviewCount },
    { count: pendingDeposits },
    { count: flaggedUsers },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("game_load_requests")
      .select("*", { count: "exact", head: true })
      .in("load_type", ["load", "reload", "redeem"])
      .in("status", ["pending", "processing"]),
    supabase.from("wallet_transactions").select("*", { count: "exact", head: true }),
    supabase.from("conversations").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase
      .from("deposit_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing"]),
    supabase
      .from("fraud_scores")
      .select("*", { count: "exact", head: true })
      .or("rewards_blocked.eq.true,blocked.eq.true,manual_review.eq.true,risk_score.gte.50"),
  ]);

  const stats = [
    { icon: Users, label: "Total Users", value: userCount || 0, href: "/admin/users" },
    { icon: ShieldAlert, label: "Flagged Users", value: flaggedUsers || 0, href: "/admin/fraud" },
    { icon: Banknote, label: "Wallet Loads", value: pendingLoads || 0, href: "/admin/game-loads" },
    { icon: History, label: "Transactions", value: transactionCount || 0, href: "/admin/transactions" },
    {
      icon: Wallet,
      label: "Pending Deposits",
      value: pendingDeposits || 0,
      href: "/admin/deposits?status=pending",
    },
    { icon: MessageSquare, label: "Active Chats", value: conversationCount || 0, href: "/admin/chat" },
    { icon: Star, label: "Reviews", value: reviewCount || 0, href: "/admin/reviews" },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Admin Overview"
        description="Casinova platform overview — new Spinora-style admin shell"
      />

      <div className="mb-6 flex flex-col flex-wrap gap-2 sm:flex-row sm:gap-3">
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/chat">Open Customer Chat</Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/admin/game-loads">Wallet Loads</Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto">
          <Link href="/admin/deposits?status=pending">Pending Deposits</Link>
        </Button>
      </div>

      <div className="mb-6">
        <AdminBroadcastNotice />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className={cn(
                "rounded-2xl border border-violet-400/20 bg-[rgba(18,14,34,0.72)] p-4 transition-all",
                "hover:-translate-y-0.5 hover:border-fuchsia-400/40 hover:shadow-[0_0_24px_rgba(168,85,247,0.25)]"
              )}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-400">{s.label}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
