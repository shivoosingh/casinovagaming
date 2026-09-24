"use client";

import { Banknote } from "lucide-react";
import { DollarPayDepositSection } from "@/components/payments/dollarpay-deposit-modal";
import type { DepositPaymentMethod } from "@/lib/payments/methods";
import type { Game } from "@/lib/games";

interface GameDepositSectionProps {
  game: Game;
  paymentMethods?: DepositPaymentMethod[];
  hideSectionAnchor?: boolean;
}

export function GameDepositSection({ game, hideSectionAnchor }: GameDepositSectionProps) {
  return (
    <section
      id={hideSectionAnchor ? undefined : "deposit"}
      className="rounded-2xl border border-[rgba(0,229,255,0.1)] bg-[#0d0d1f] p-4 sm:p-5 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <Banknote className="h-5 w-5 text-emerald-400" />
        <h2 className="font-bold text-white">Deposit to {game.name}</h2>
      </div>
      <DollarPayDepositSection gameSlug={game.slug} gameName={game.name} />
    </section>
  );
}
