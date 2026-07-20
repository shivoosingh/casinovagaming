"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutGrid, Star, Zap, Gift, Trophy, Clock } from "lucide-react";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { HomeRightRail } from "@/components/home/home-right-rail";
import { DeferredWalletCardLoader } from "@/components/wallet/deferred-wallet-card-loader";
import { AppShell } from "@/components/layout/app-shell";
import { GameCard } from "@/components/home/game-card";
import { CompactGameCard } from "@/components/home/compact-game-card";
import { PublicReviewsSection } from "@/components/home/public-reviews-section";
import { filterGames, filterHomeGames, GAMES, type GameTab, type HomeGameTab } from "@/lib/games";
import { LazyWhenVisible } from "@/components/ui/lazy-when-visible";
import { usePrefetchDashboardRoutes } from "@/lib/dashboard/prefetch-dashboard-routes";
import { cn } from "@/lib/utils";

function Placeholder() {
  return <div className="h-28 animate-pulse rounded-2xl bg-violet-500/5" aria-hidden />;
}

const HowItWorks = dynamic(() => import("@/components/home/how-it-works").then((m) => m.HowItWorks), { loading: () => <Placeholder /> });
const VipPreview = dynamic(() => import("@/components/home/vip-preview").then((m) => m.VipPreview), { loading: () => <Placeholder /> });
const ReferralPreview = dynamic(() => import("@/components/home/referral-preview").then((m) => m.ReferralPreview), { loading: () => <Placeholder /> });
const ActivityFeed = dynamic(() => import("@/components/home/activity-feed").then((m) => m.ActivityFeed), { loading: () => <Placeholder /> });
const FaqSection = dynamic(() => import("@/components/home/faq-section").then((m) => m.FaqSection), { loading: () => <Placeholder /> });
const ActivityToast = dynamic(() => import("@/components/ui/ActivityToast").then((m) => m.ActivityToast), { ssr: false, loading: () => null });

function DeferredActivityToast() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 8000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(() => setReady(true), 5000);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return null;
  return <ActivityToast />;
}

const MAIN_TABS: { id: HomeGameTab; label: string; icon: typeof Zap }[] = [
  { id: "trending", label: "Most Trending Games", icon: Zap },
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "promotional", label: "Promotional Games", icon: Gift },
];

const CAT_CHIPS: { id: GameTab; label: string; icon: typeof Star; tone: string }[] = [
  { id: "all", label: "All Games", icon: LayoutGrid, tone: "from-sky-500 to-blue-600" },
  { id: "popular", label: "Popular", icon: Star, tone: "from-orange-500 to-pink-500" },
  { id: "trending", label: "Trending", icon: Zap, tone: "from-fuchsia-500 to-violet-600" },
  { id: "topRated", label: "Top Rated", icon: Trophy, tone: "from-amber-400 to-orange-500" },
  { id: "upcoming", label: "Upcoming", icon: Clock, tone: "from-violet-400 to-indigo-600" },
];

export function HomeLandingShell({ hero }: { hero?: ReactNode }) {
  const router = useRouter();
  usePrefetchDashboardRoutes();
  const [sidebarTab, setSidebarTab] = useState<GameTab>("all");
  const [mainTab, setMainTab] = useState<HomeGameTab>("trending");
  const [search, setSearch] = useState("");
  const [useSidebar, setUseSidebar] = useState(false);
  const gamesRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const displayGames = useSidebar ? filterGames(sidebarTab, search) : filterHomeGames(mainTab, search);
  const carouselGames = GAMES.filter((g) => !g.upcoming).slice(0, 12);
  const loopGames = [...carouselGames, ...carouselGames];

  function onSidebarTab(tab: GameTab) {
    setSidebarTab(tab);
    setUseSidebar(true);
    gamesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function onMainTab(tab: HomeGameTab) {
    setMainTab(tab);
    setUseSidebar(false);
  }
  function focusSearch() {
    gamesRef.current?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => searchRef.current?.focus(), 400);
  }
  function onHeaderSearch() {
    if (window.location.pathname !== "/") {
      router.push("/#games");
      return;
    }
    focusSearch();
  }

  return (
    <AppShell
      onSearchClick={onHeaderSearch}
      sidebar={
        <HomeSidebar
          activeTab={sidebarTab}
          onTabChange={onSidebarTab}
          onSearchClick={onHeaderSearch}
          walletSlot={<DeferredWalletCardLoader />}
        />
      }
      rightRail={<HomeRightRail />}
    >
      <div className="space-y-6">
        {hero}

        <section className="game-slider-wrap relative overflow-hidden py-1" aria-label="Featured games carousel">
          <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-violet-300/80">Popular Games</p>
              <p className="text-sm font-semibold text-white">Now spinning</p>
            </div>
            <div className="h-px flex-1 translate-y-[-6px] bg-gradient-to-r from-violet-500/40 to-transparent" />
          </div>
          <div className="carousel-row-normal flex w-max gap-4">
            {loopGames.map((game, i) => (
              <CompactGameCard
                key={`${game.id}-${i}`}
                game={game}
                variant="slider"
                eager={i < 6}
                className="game-carousel-card"
              />
            ))}
          </div>
        </section>

        {/* Category glass chips — your existing filters only */}
        <section className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" aria-label="Game categories">
          {CAT_CHIPS.map(({ id, label, icon: Icon, tone }) => {
            const active = useSidebar && sidebarTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSidebarTab(id)}
                className={cn(
                  "group relative flex min-w-[104px] flex-col items-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-3.5 transition-all duration-300",
                  active
                    ? "border-sky-400/70 bg-[rgba(30,20,55,0.9)] shadow-[0_0_32px_rgba(56,189,248,0.35)]"
                    : "border-violet-400/25 bg-[rgba(18,14,34,0.7)] hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.28)]"
                )}
              >
                <div
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_0_20px_rgba(168,85,247,0.35)] transition-transform group-hover:scale-110",
                    tone
                  )}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className={cn("text-[11px] font-bold", active ? "text-white" : "text-slate-300")}>
                  {label}
                </span>
              </button>
            );
          })}
        </section>

        <section ref={gamesRef} id="games" className="scroll-mt-24 space-y-5">
          <div className="cx-glass flex flex-col gap-4 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {MAIN_TABS.map((t) => {
                const active = !useSidebar && mainTab === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onMainTab(t.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                      active
                        ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-violet-100"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-violet-300" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Find a game..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-violet-400/25 bg-black/30 py-2.5 pl-9 pr-3 text-xs font-medium text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400/50 focus:shadow-[0_0_16px_rgba(168,85,247,0.25)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {displayGames.length > 0 ? (
              displayGames.map((game, i) => <GameCard key={game.id} game={game} eager={i < 5} />)
            ) : (
              <p className="col-span-full py-12 text-center text-sm text-slate-500">No games found.</p>
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: "10K+", label: "Players online" },
            { value: "14+", label: "Platforms" },
            { value: "99.9%", label: "Uptime" },
            { value: "24/7", label: "Live support" },
          ].map((s) => (
            <div key={s.label} className="cx-glass rounded-2xl px-4 py-5 text-center">
              <p className="text-xl font-black text-white sm:text-2xl">{s.value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        <LazyWhenVisible placeholder={<Placeholder />}>
          <HowItWorks />
        </LazyWhenVisible>
        <LazyWhenVisible placeholder={<Placeholder />}>
          <VipPreview />
        </LazyWhenVisible>
        <LazyWhenVisible placeholder={<Placeholder />}>
          <ReferralPreview />
        </LazyWhenVisible>
        <LazyWhenVisible placeholder={<Placeholder />}>
          <ActivityFeed />
        </LazyWhenVisible>
        <LazyWhenVisible placeholder={<Placeholder />}>
          <PublicReviewsSection />
        </LazyWhenVisible>
        <LazyWhenVisible placeholder={<Placeholder />}>
          <FaqSection />
        </LazyWhenVisible>
      </div>
      <DeferredActivityToast />
    </AppShell>
  );
}
