import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TelegramBroadcastCard } from "@/components/admin/telegram-broadcast-card";
import { AdminAutopilotCard } from "@/components/admin/admin-autopilot-card";
import { AdminImageGeneratorCard } from "@/components/admin/admin-image-generator-card";
import { AdminTelegramTester } from "@/components/admin/admin-telegram-tester";
import { GlassCard } from "@/components/shared/glass-card";
import { LinkTelegramButton } from "@/components/shared/link-telegram-button";
import { Badge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/data/admin";
import { OPS_CHANNELS, commandBotStatus, resolveChatIds } from "@/lib/telegram/channels";
import { isTelegramConfigured, isTelegramPromoConfigured } from "@/lib/telegram/client";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = { title: "Telegram Bots" };
export const dynamic = "force-dynamic";

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-background px-1.5 py-0.5 font-mono text-foreground">{children}</code>;
}

function StatusBadge({ ok, okLabel = "Ready", badLabel = "Missing" }: { ok: boolean; okLabel?: string; badLabel?: string }) {
  return (
    <Badge className={ok ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}>
      {ok ? okLabel : badLabel}
    </Badge>
  );
}

export default async function AdminTelegramPage() {
  await requirePermission("cms.manage");

  const env = process.env;
  const opsConfigured = isTelegramConfigured();
  const promoConfigured = isTelegramPromoConfigured();
  const channels = OPS_CHANNELS.map((c) => ({
    name: c,
    envVar: `TELEGRAM_CHAT_${c.toUpperCase()}`,
    own: Boolean(env[`TELEGRAM_CHAT_${c.toUpperCase()}`]?.trim()),
    resolved: resolveChatIds(env, c).length > 0,
  }));
  const adminBot = commandBotStatus(env, "admin");
  const customerBot = commandBotStatus(env, "customer");
  const promoChatIdPresent = resolveChatIds(env, "promo").length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="Telegram Bots"
        description="Three bots: one-way staff alerts into fixed channels, a staff command bot, and a player command bot that also posts the promo channel."
      />

      {/* ── Bot status ──────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="hud-label text-xs text-muted-foreground">1 · Ops-alert bot</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Code>TELEGRAM_BOT_TOKEN</Code> posts staff alerts. One-way.
              </p>
            </div>
            <StatusBadge ok={opsConfigured} okLabel="Connected" badLabel="Action required" />
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {channels.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-2">
                <span className="text-foreground">
                  {c.name} <span className="text-xs text-muted-foreground">({c.envVar})</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {c.own ? "own chat" : c.resolved ? "falls back to admin chat" : "not set"}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="hud-label text-xs text-muted-foreground">2 · Admin command bot</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Staff ask <Code>/dashboard</Code>, <Code>/wallet</Code>, <Code>/tickets</Code>… Permission-gated.
              </p>
            </div>
            <StatusBadge ok={adminBot.ready} />
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex justify-between"><span>Token</span><span className="text-xs text-muted-foreground">{adminBot.token ? "set" : "TELEGRAM_ADMIN_BOT_TOKEN"}</span></li>
            <li className="flex justify-between"><span>Webhook secret</span><span className="text-xs text-muted-foreground">{adminBot.secret ? "set" : "TELEGRAM_ADMIN_WEBHOOK_SECRET"}</span></li>
            <li className="flex justify-between"><span>Username</span><span className="text-xs text-muted-foreground">{adminBot.username ? `@${adminBot.username}` : "TELEGRAM_ADMIN_BOT_USERNAME"}</span></li>
          </ul>
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="mb-2 text-xs text-muted-foreground">Link your staff account to this bot:</p>
            {adminBot.ready ? <LinkTelegramButton purpose="admin" /> : <p className="text-xs text-amber-400">Set the three env vars and redeploy first.</p>}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="hud-label text-xs text-muted-foreground">3 · Customer command bot</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Players ask <Code>/wallet</Code>, <Code>/games</Code>, <Code>/ticket</Code>… Also posts the promo channel.
              </p>
            </div>
            <StatusBadge ok={customerBot.ready} />
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            <li className="flex justify-between"><span>Token</span><span className="text-xs text-muted-foreground">{customerBot.token ? "set" : "TELEGRAM_CUSTOMER_BOT_TOKEN"}</span></li>
            <li className="flex justify-between"><span>Webhook secret</span><span className="text-xs text-muted-foreground">{customerBot.secret ? "set" : "TELEGRAM_CUSTOMER_WEBHOOK_SECRET"}</span></li>
            <li className="flex justify-between"><span>Username</span><span className="text-xs text-muted-foreground">{customerBot.username ? `@${customerBot.username}` : "TELEGRAM_CUSTOMER_BOT_USERNAME"}</span></li>
            <li className="flex justify-between"><span>Promo channel</span><span className="text-xs text-muted-foreground">{promoConfigured ? (env.TELEGRAM_CUSTOMER_BOT_TOKEN ? "customer bot" : "via ops bot (fallback)") : "TELEGRAM_CHAT_PROMO"}</span></li>
          </ul>
          <p className="mt-4 border-t border-border/50 pt-4 text-xs text-muted-foreground">
            Players link from Dashboard → Security.
          </p>
        </GlassCard>
      </div>

      {/* Autopilot, tester, broadcast, image creator (promo channel tooling) */}
      <AdminAutopilotCard />
      <AdminTelegramTester />
      <TelegramBroadcastCard siteUrl={SITE_URL} promoChatIdPresent={promoChatIdPresent} />
      <AdminImageGeneratorCard />

      {/* ── Setup guide ─────────────────────────────────────────────── */}
      <GlassCard className="p-6">
        <h3 className="text-md mb-3 font-bold text-foreground">Setup (once per environment)</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
          <li>
            In <strong>@BotFather</strong> create three bots with <Code>/newbot</Code>: an alerts bot, an admin bot and a
            player bot. Copy each token.
          </li>
          <li>
            Create the staff groups (finance, users, sweepstakes, errors, reports) and the public promo channel. Add the
            alerts bot to the staff groups and the player bot to the promo channel, both as admins. Get each chat id from{" "}
            <strong>@getidsbot</strong> (group ids look like <Code>-1001234567890</Code>).
          </li>
          <li>
            Set in Vercel → Production: <Code>TELEGRAM_BOT_TOKEN</Code>, the five <Code>TELEGRAM_CHAT_*</Code> ids,{" "}
            <Code>TELEGRAM_ADMIN_BOT_TOKEN</Code> / <Code>_USERNAME</Code> / <Code>_WEBHOOK_SECRET</Code>,{" "}
            <Code>TELEGRAM_CUSTOMER_BOT_TOKEN</Code> / <Code>_USERNAME</Code> / <Code>_WEBHOOK_SECRET</Code> and{" "}
            <Code>TELEGRAM_CHAT_PROMO</Code>. Secrets are any long random strings. Redeploy.
          </li>
          <li>
            Run <Code>supabase/telegram-bots.sql</Code> in the Supabase SQL Editor (link tables).
          </li>
          <li>
            Register the webhooks once (replace the token and secret):
            <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs text-foreground">
{`curl "https://api.telegram.org/bot<ADMIN_BOT_TOKEN>/setWebhook" \\
  -d "url=${SITE_URL}/api/telegram/admin" -d "secret_token=<TELEGRAM_ADMIN_WEBHOOK_SECRET>"
curl "https://api.telegram.org/bot<CUSTOMER_BOT_TOKEN>/setWebhook" \\
  -d "url=${SITE_URL}/api/telegram/customer" -d "secret_token=<TELEGRAM_CUSTOMER_WEBHOOK_SECRET>"`}
            </pre>
          </li>
          <li>
            Link yourself above, send <Code>/help</Code> to the admin bot. Full guide: <Code>docs/telegram-bots.md</Code>.
          </li>
        </ol>
      </GlassCard>
    </div>
  );
}
