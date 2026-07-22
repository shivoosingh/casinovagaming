import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Coins,
  Inbox,
  LifeBuoy,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminBroadcastNotice } from "@/components/admin/admin-broadcast-notice";
import { AdminGameBotWorkerCard } from "@/components/admin/admin-game-bot-worker-card";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { adminDb } from "@/lib/actions/admin/core";
import {
  ADMIN_PROFILE_SELECT,
  profileDisplayName,
  profileHandle,
} from "@/lib/admin/casinova-profile";
import { requireStaff } from "@/lib/data/admin";
import { getDashboardStats } from "@/lib/data/admin-stats";

export default async function AdminOverviewPage() {
  const ctx = await requireStaff();
  const db = adminDb();

  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    stats,
    new7d,
    activePromos,
    pendingReferrals,
    recentSignups,
    recentTickets,
    fulfilledRequests,
  ] = await Promise.all([
    getDashboardStats(86_400_000),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    db.from("promotions").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("referrals").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select(ADMIN_PROFILE_SELECT)
      .order("created_at", { ascending: false })
      .limit(6),
    db
      .from("support_tickets")
      .select("id, ticket_no, subject, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader
        title="Overview"
        description={`Welcome back, ${ctx.email ?? "admin"}. Here's the pulse of Casinova Gaming.`}
      />

      <div className="mb-6">
        <AdminBroadcastNotice />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={stats.totalUsers.toLocaleString()}
          delta={stats.newUsersInWindow}
          deltaLabel="today"
          icon={<Users />}
          accent="cyan"
        />
        <StatCard
          label="New this week"
          value={(new7d.count ?? 0).toLocaleString()}
          icon={<TrendingUp />}
          accent="emerald"
        />
        <StatCard
          label="Credits issued (24h)"
          value={Math.round(stats.coinsIssuedInWindow).toLocaleString()}
          icon={<Coins />}
          accent="gold"
        />
        <StatCard
          label="Active promotions"
          value={(activePromos.count ?? 0).toLocaleString()}
          icon={<BadgePercent />}
          accent="purple"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open tickets"
          value={stats.openTickets.toLocaleString()}
          icon={<LifeBuoy />}
          accent="cyan"
        />
        <StatCard
          label="Total referrals"
          value={(pendingReferrals.count ?? 0).toLocaleString()}
          icon={<UserPlus />}
          accent="purple"
        />
        <StatCard
          label="Pending requests"
          value={stats.pendingRequests.toLocaleString()}
          icon={<Inbox />}
          accent="gold"
        />
        <StatCard
          label="Completed deposits"
          value={(fulfilledRequests.count ?? 0).toLocaleString()}
          icon={<CheckCircle2 />}
          accent="emerald"
        />
      </div>

      <div className="mt-6">
        <AdminGameBotWorkerCard />
      </div>

      <GlassCard className="mt-6 p-6">
        <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
            <p className="text-xs text-muted-foreground">
              One-click shortcuts for CMS, AI tools, Telegram, and game ops.
            </p>
          </div>
          <span className="rounded-full bg-ws-green/15 px-2.5 py-1 text-xs font-semibold text-ws-green-deep dark:text-ws-green">
            Admin Helper
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/kyc"
            className="group flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 transition-all hover:bg-emerald-500/20"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300 transition-transform group-hover:scale-110">
              🛡️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">KYC Review</p>
              <p className="text-xs text-muted-foreground">Approve player IDs</p>
            </div>
          </Link>

          <Link
            href="/admin/analytics"
            className="group flex items-center gap-3 rounded-lg border border-purple-500/40 bg-purple-500/10 p-3 transition-all hover:bg-purple-500/20"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/30 text-purple-300 transition-transform group-hover:scale-110">
              📊
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Revenue Analytics</p>
              <p className="text-xs text-muted-foreground">Live volume & reports</p>
            </div>
          </Link>

          <Link
            href="/admin/marketing"
            className="group flex items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 transition-all hover:bg-amber-500/20"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/30 text-amber-300 transition-transform group-hover:scale-110">
              🎟️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Marketing Hub</p>
              <p className="text-xs text-muted-foreground">Promo codes</p>
            </div>
          </Link>

          <Link
            href="/admin/bot-status"
            className="group flex items-center gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 transition-all hover:bg-emerald-500/20"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300 transition-transform group-hover:scale-110">
              🤖
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">8-Bot Control Room</p>
              <p className="text-xs text-muted-foreground">24/7 worker status</p>
            </div>
          </Link>

          <Link
            href="/admin/ai-blog"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-ws-green/40 hover:bg-ws-green/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-ws-green/20 text-ws-green transition-transform group-hover:scale-110">
              ✨
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">AI Auto Blog</p>
              <p className="text-xs text-muted-foreground">Generate SEO posts</p>
            </div>
          </Link>

          <Link
            href="/admin/cms"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-indigo-500/40 hover:bg-indigo-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 transition-transform group-hover:scale-110">
              📝
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">CMS & Blog</p>
              <p className="text-xs text-muted-foreground">Posts, banners & FAQs</p>
            </div>
          </Link>

          <Link
            href="/admin/geo"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 transition-transform group-hover:scale-110">
              🗺️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Geo Pages</p>
              <p className="text-xs text-muted-foreground">50 states & cities</p>
            </div>
          </Link>

          <Link
            href="/admin/telegram"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-sky-500/40 hover:bg-sky-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 transition-transform group-hover:scale-110">
              🚀
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Telegram Bot</p>
              <p className="text-xs text-muted-foreground">Send broadcast</p>
            </div>
          </Link>

          <Link
            href="/admin/deposits?status=pending"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-amber-500/40 hover:bg-amber-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 transition-transform group-hover:scale-110">
              💳
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Deposit Requests</p>
              <p className="text-xs text-muted-foreground">Fulfill user loads</p>
            </div>
          </Link>

          <Link
            href="/admin/games"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-rose-500/40 hover:bg-rose-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 transition-transform group-hover:scale-110">
              🎮
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Manage Games</p>
              <p className="text-xs text-muted-foreground">Add or update games</p>
            </div>
          </Link>

          <Link
            href="/admin/game-loads"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-violet-500/40 hover:bg-violet-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300 transition-transform group-hover:scale-110">
              ⚡
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Wallet Loads</p>
              <p className="text-xs text-muted-foreground">Game desk requests</p>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-3 transition-all hover:border-teal-500/40 hover:bg-teal-500/10"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 transition-transform group-hover:scale-110">
              ⚙️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Site Settings</p>
              <p className="text-xs text-muted-foreground">Cashtags & configs</p>
            </div>
          </Link>
        </div>
      </GlassCard>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Newest members</h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-ws-cyan underline-offset-4 hover:underline"
            >
              All users
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentSignups.data ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium">
                  {profileDisplayName(u)}
                  <span className="ml-2 text-xs text-muted-foreground">{profileHandle(u)}</span>
                </span>
                <time dateTime={u.created_at ?? undefined} className="text-xs text-muted-foreground">
                  {u.created_at
                    ? formatDistanceToNow(new Date(u.created_at), { addSuffix: true })
                    : "—"}
                </time>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Latest tickets</h2>
            <Link
              href="/admin/support"
              className="inline-flex items-center gap-1 text-xs font-medium text-ws-cyan underline-offset-4 hover:underline"
            >
              Support inbox
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentTickets.data ?? []).length === 0 ? (
              <li className="py-2.5 text-sm text-muted-foreground">No tickets yet.</li>
            ) : (
              (recentTickets.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href={`/admin/support/${t.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:text-ws-green-deep dark:text-ws-green"
                  >
                    <span className="tnum text-xs text-muted-foreground">#{t.ticket_no}</span>{" "}
                    {t.subject}
                  </Link>
                  <span className="shrink-0 text-xs uppercase text-muted-foreground">{t.status}</span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
