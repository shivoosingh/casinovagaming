import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MarketingGameGrid } from "@/components/marketing/game-grid";
import { GAMES } from "@/lib/games";
import { createMetadata } from "@/lib/seo/metadata";

const LIVE_GAMES = GAMES.filter((game) => !game.upcoming);

export const metadata = createMetadata({
  title: "All Games",
  description: `Games you can load on Casinova now: ${LIVE_GAMES.map((game) => game.name).join(", ")}. Open a game to create your account and load it from your wallet.`,
  keywords: ["Casinova games", ...LIVE_GAMES.map((game) => game.name)],
  path: "/games",
});

export default function AllGamesPage() {
  return (
    <>
      <Navbar />
      <main className="bg-[#09090F] pb-16 pt-24 text-[#F5F3FF]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Games", href: "/games" },
            ]}
          />
          <h1 className="mb-4 text-4xl font-black tracking-tight">All games</h1>
          <p className="max-w-2xl text-lg text-slate-400">
            These are the games you can load from your Casinova wallet today. Open one to create your
            game account, load credits, or redeem. Games that are still coming soon are not listed.
          </p>
        </div>
        <MarketingGameGrid title="Available games" />
      </main>
      <Footer />
    </>
  );
}
