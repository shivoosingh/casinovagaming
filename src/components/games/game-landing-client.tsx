"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  Info,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyGameAccount } from "@/lib/actions/game-loads";
import {
  GAME_BONUS_RULES,
  getOtherGames,
  UPCOMING_GAME_MESSAGE,
  type Game,
} from "@/lib/games";
import { GameOtherGames } from "@/components/games/game-other-games";
import { GameDepositSection } from "@/components/games/game-deposit-section";
import { GameWalletLoadSection } from "@/components/games/game-wallet-load-section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DepositPaymentMethod } from "@/lib/payments/methods";

interface GameLandingClientProps {
  game: Game;
  autoCreate?: boolean;
  walletLoadEnabled?: boolean;
  paymentMethods?: DepositPaymentMethod[];
  initialGameAccount?: {
    game_username: string;
    game_password: string | null;
  } | null;
}

export function GameLandingClient({
  game,
  autoCreate,
  walletLoadEnabled,
  paymentMethods,
  initialGameAccount,
}: GameLandingClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const autoCreateAttempted = useRef(false);
  const walletPanelRef = useRef<HTMLDivElement>(null);
  const [accountStatus, setAccountStatus] = useState<"loading" | "none" | "has">(
    initialGameAccount?.game_username ? "has" : "loading"
  );
  const [resolvedAccount, setResolvedAccount] = useState(initialGameAccount ?? null);
  const otherGames = getOtherGames(game.slug);

  function openWalletPanel() {
    setTimeout(() => {
      walletPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleCreateAccount() {
    if (game.upcoming) {
      toast.info(UPCOMING_GAME_MESSAGE);
      return;
    }

    const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/games/${game.slug}?create=1`)}`
      );
      return;
    }

    openWalletPanel();
  }

  function handleAccountChange(hasAccount: boolean) {
    setAccountStatus(hasAccount ? "has" : "none");
  }

  useEffect(() => {
    if (!walletLoadEnabled || game.upcoming) {
      setAccountStatus("none");
      return;
    }
    if (initialGameAccount?.game_username) {
      setResolvedAccount(initialGameAccount);
      setAccountStatus("has");
      return;
    }

    let cancelled = false;

    async function resolveAccount() {
      const account = await getMyGameAccount(game.slug);
      if (cancelled) return;
      if (account?.game_username) {
        setResolvedAccount({
          game_username: account.game_username,
          game_password: account.game_password,
        });
        setAccountStatus("has");
        return;
      }

      if (!supabase) {
        setAccountStatus("none");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAccountStatus("none");
        return;
      }

      const { data } = await supabase
        .from("game_load_requests")
        .select("game_username, game_password")
        .eq("user_id", user.id)
        .eq("game_slug", game.slug)
        .eq("status", "completed")
        .in("load_type", ["create_account", "new_account"])
        .not("game_username", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (data?.game_username) {
        setResolvedAccount({
          game_username: data.game_username,
          game_password: data.game_password,
        });
        setAccountStatus("has");
      } else {
        setAccountStatus("none");
      }
    }

    void resolveAccount();
    return () => {
      cancelled = true;
    };
  }, [game.slug, game.upcoming, initialGameAccount, walletLoadEnabled, supabase]);

  useEffect(() => {
    if (!autoCreate || autoCreateAttempted.current) return;
    autoCreateAttempted.current = true;

    if (walletLoadEnabled) {
      void (async () => {
        const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
        if (user) openWalletPanel();
        else
          router.push(
            `/login?redirect=${encodeURIComponent(`/games/${game.slug}?create=1`)}`
          );
      })();
      return;
    }

    void handleCreateAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, walletLoadEnabled]);

  function handleHowItWorks() {
    setShowHowItWorks(true);
    setTimeout(() => {
      howItWorksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const rules = GAME_BONUS_RULES;
  const showWalletPanel = Boolean(walletLoadEnabled && !game.upcoming);
  const hasAccount =
    accountStatus === "has" || Boolean(resolvedAccount?.game_username);

  const walletSection = showWalletPanel ? (
    <div ref={walletPanelRef} className="scroll-mt-24">
      <GameWalletLoadSection
        game={game}
        initialAccount={resolvedAccount}
        onAccountChange={handleAccountChange}
      />
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      {/* Upcoming notice */}
      {game.upcoming && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
          <p className="text-sm font-semibold text-amber-200 text-center">
            {UPCOMING_GAME_MESSAGE}
          </p>
        </section>
      )}

      {/* Hero banner + game identity */}
      <section className="relative overflow-hidden rounded-2xl border border-[rgba(0, 229, 255,0.1)]">
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", game.gradient)} />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay"
          style={{ backgroundImage: `url(${game.image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />

        <div className="relative p-5 sm:p-6 flex items-end gap-4 min-h-[140px]">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
            <Image
              src={game.image}
              alt={game.name}
              fill
              className="object-cover"
              priority
              sizes="96px"
            />
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">{game.name}</h1>
            <p className="text-sm text-white/70 mt-0.5">{game.category}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {!game.upcoming && (
          <a
            href={game.playUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-4 px-6 text-base font-bold text-[#0a0a0f] bg-gradient-to-r from-emerald-400 to-[#00E5FF] hover:opacity-95 transition-opacity"
          >
            <ExternalLink className="h-5 w-5" />
            Play {game.name}
          </a>
        )}

        {!hasAccount && accountStatus === "none" && (
          <button
            type="button"
            onClick={handleCreateAccount}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-xl py-4 px-6 text-base font-bold transition-opacity shadow-lg",
              game.upcoming
                ? "text-[#6b6d8f] bg-[#13131a] border border-[rgba(255,255,255,0.07)] cursor-not-allowed opacity-80"
                : "text-[#0a0a0f] bg-gradient-to-b from-[#d4ae52] to-[#a07830] hover:opacity-95 shadow-[rgba(201,168,76,0.2)]"
            )}
          >
            <UserPlus className="h-5 w-5" />
            {game.upcoming ? "Coming Soon" : "Create Account"}
          </button>
        )}
      </section>

      {walletSection}

      {/* Bonuses & Rules */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[#0d0d1f] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-violet-400" />
          <h2 className="font-bold text-[#f0f0f5]">Bonuses &amp; Rules</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl bg-[rgba(16,185,129,0.06)] border border-emerald-500/20 p-4 text-center">
            <p className="text-xs text-[#6b6d8f] mb-1">First Deposit Match</p>
            <p className="text-3xl font-bold text-emerald-400">{rules.firstTimeBonus}%</p>
          </div>
          <div className="rounded-xl bg-[rgba(13,148,136,0.06)] border border-teal-500/20 p-4 text-center">
            <p className="text-xs text-[#6b6d8f] mb-1">Second Deposit Match</p>
            <p className="text-3xl font-bold text-teal-400">{rules.secondDepositBonus}%</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.08)] px-3 py-1.5 text-xs font-medium text-[#c9a84c]">
            Load: ${rules.minDeposit} – ${rules.maxDeposit}
          </span>
          <span className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
            Redeem: {rules.redeemMin}x – {rules.redeemMax}x
          </span>
        </div>
      </section>

      {/* SEO bio */}
      <section className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[#0d0d12] p-4 sm:p-5">
        <h2 className="sr-only">About {game.name}</h2>
        <p className="text-sm text-[#6b6d8f] leading-relaxed">{game.bio}</p>
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <a
            href={game.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-semibold text-[#f0f0f5] bg-[#13131a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#16161e] transition-colors"
          >
            <Download className="h-4 w-4" />
            Download App
          </a>
          <button
            type="button"
            onClick={handleHowItWorks}
            className="flex items-center justify-center gap-2 rounded-xl py-3.5 px-4 text-sm font-semibold text-[#f0f0f5] bg-[#13131a] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[#16161e] transition-colors"
          >
            <Info className="h-4 w-4" />
            How it works
          </button>
        </div>
      </section>

      {!game.upcoming && <GameDepositSection game={game} paymentMethods={paymentMethods} />}

      {/* How it works (expandable) */}
      {showHowItWorks && (
        <div
          ref={howItWorksRef}
          className="rounded-2xl border border-[rgba(201,168,76,0.2)] bg-[#0d0d1f] p-5 space-y-4 scroll-mt-24"
        >
          <h3 className="font-bold text-[#f0f0f5]">How to get started</h3>
          {walletLoadEnabled ? (
            <ol className="space-y-3 text-sm text-[#6b6d8f]">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">1</span>
                <span>
                  Tap <strong className="text-[#f0f0f5]">Create Account</strong> to open your {game.name} panel.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">2</span>
                <span>
                  In the panel, create your game login — username and password appear instantly when ready.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">3</span>
                <span>
                  Download the app, sign in with your credentials, then use <strong className="text-[#f0f0f5]">Load</strong> to move Casinova Gaming wallet credits into {game.name}.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">4</span>
                <span>
                  Need more Casinova Gaming balance? Use the <strong className="text-[#f0f0f5]">Deposit</strong> section below.
                </span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm text-[#6b6d8f]">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">1</span>
                <span>
                  Tap <strong className="text-[#f0f0f5]">Create Account</strong> to open your {game.name} panel.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">2</span>
                <span>
                  Download the app with the button above, then use your login from the panel.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">3</span>
                <span>
                  Use the <strong className="text-[#f0f0f5]">Deposit</strong> section below to add funds to your wallet.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(201,168,76,0.1)] text-[#c9a84c] text-xs font-bold border border-[rgba(201,168,76,0.2)]">4</span>
                <span>
                  Redeem at {rules.redeemMin}x–{rules.redeemMax}x after loading from Total Deposit.
                </span>
              </li>
            </ol>
          )}
        </div>
      )}

      <GameOtherGames games={otherGames} />
    </div>
  );
}
