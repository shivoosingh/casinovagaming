"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingAction } from "@/lib/actions/admin/payments";

type Settings = Record<string, unknown>;

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-violet-400/25 bg-[rgba(18,14,34,0.72)] p-5">
      <div>
        <h2 className="font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsEditor({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  const maintenance = (initial.maintenance_mode ?? {}) as { enabled?: boolean; message?: string };
  const registration = (initial.registration_open ?? {}) as { enabled?: boolean };
  const welcome = (initial.welcome_bonus ?? {}) as { coins?: number; xp?: number; title?: string };
  const social = (initial.social_links ?? {}) as Record<string, string>;
  const telegramPromo = (initial.telegram_promo ?? {}) as { enabled?: boolean };
  const rewardsEnabled = initial.rewards_enabled !== false;

  const [maintEnabled, setMaintEnabled] = React.useState(!!maintenance.enabled);
  const [maintMsg, setMaintMsg] = React.useState(maintenance.message ?? "");
  const [regOpen, setRegOpen] = React.useState(registration.enabled !== false);
  const [promoEnabled, setPromoEnabled] = React.useState(!!telegramPromo.enabled);
  const [rewardsOn, setRewardsOn] = React.useState(!!rewardsEnabled);
  const [coins, setCoins] = React.useState(String(welcome.coins ?? 0));
  const [xp, setXp] = React.useState(String(welcome.xp ?? 0));
  const [welcomeTitle, setWelcomeTitle] = React.useState(welcome.title ?? "");
  const [links, setLinks] = React.useState({
    discord: social.discord ?? "",
    x: social.x ?? "",
    instagram: social.instagram ?? "",
    telegram: social.telegram ?? "",
  });

  function save(key: string, value: unknown) {
    start(async () => {
      const res = await updateSettingAction({ key, value });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(res.message ?? "Saved");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card title="Rewards master switch" desc="Turn reward grants on/off site-wide.">
        <label className="flex items-center justify-between text-sm text-white">
          <span>Rewards enabled</span>
          <input
            type="checkbox"
            checked={rewardsOn}
            onChange={(e) => {
              setRewardsOn(e.target.checked);
              save("rewards_enabled", e.target.checked);
            }}
            className="h-4 w-4 accent-violet-500"
          />
        </label>
      </Card>

      <Card title="Maintenance mode" desc="Show a site-wide maintenance banner.">
        <label className="flex items-center justify-between text-sm text-white">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={maintEnabled}
            onChange={(e) => setMaintEnabled(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
        </label>
        <div>
          <Label>Banner message</Label>
          <Input value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} placeholder="We'll be back shortly…" />
        </div>
        <Button
          size="sm"
          disabled={pending}
          className="bg-violet-600 hover:bg-violet-500"
          onClick={() => save("maintenance_mode", { enabled: maintEnabled, message: maintMsg })}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </Button>
      </Card>

      <Card title="Registration" desc="Allow new members to sign up.">
        <label className="flex items-center justify-between text-sm text-white">
          <span>Registration open</span>
          <input
            type="checkbox"
            checked={regOpen}
            onChange={(e) => setRegOpen(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
        </label>
        <Button
          size="sm"
          disabled={pending}
          className="bg-violet-600 hover:bg-violet-500"
          onClick={() => save("registration_open", { enabled: regOpen })}
        >
          Save
        </Button>
      </Card>

      <Card
        title="Telegram promo broadcast"
        desc="Toggle for promo posts to your Telegram channel. Configure TELEGRAM_* env vars on Vercel for sending."
      >
        <label className="flex items-center justify-between text-sm text-white">
          <span>Promo broadcasts enabled</span>
          <input
            type="checkbox"
            checked={promoEnabled}
            onChange={(e) => {
              setPromoEnabled(e.target.checked);
              save("telegram_promo", { enabled: e.target.checked });
            }}
            className="h-4 w-4 accent-violet-500"
          />
        </label>
        <p className="text-xs text-slate-500">
          Bot token / chat id stay in env (TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID) — same as Spinora.
        </p>
      </Card>

      <Card title="Welcome bonus" desc="Values shown / granted for new players (when rewards are on).">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Amount ($)</Label>
            <Input value={coins} onChange={(e) => setCoins(e.target.value)} type="number" />
          </div>
          <div>
            <Label>XP / points</Label>
            <Input value={xp} onChange={(e) => setXp(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={welcomeTitle} onChange={(e) => setWelcomeTitle(e.target.value)} />
          </div>
        </div>
        <Button
          size="sm"
          disabled={pending}
          className="bg-violet-600 hover:bg-violet-500"
          onClick={() =>
            save("welcome_bonus", {
              coins: Number(coins) || 0,
              xp: Number(xp) || 0,
              title: welcomeTitle,
            })
          }
        >
          Save
        </Button>
      </Card>

      <Card title="Social links" desc="Footer / marketing links.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(["discord", "x", "instagram", "telegram"] as const).map((k) => (
            <div key={k}>
              <Label className="capitalize">{k}</Label>
              <Input
                value={links[k]}
                onChange={(e) => setLinks((p) => ({ ...p, [k]: e.target.value }))}
                placeholder={`https://…`}
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          disabled={pending}
          className="bg-violet-600 hover:bg-violet-500"
          onClick={() => save("social_links", links)}
        >
          Save
        </Button>
      </Card>
    </div>
  );
}
