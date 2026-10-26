/** Game-load bonus matched to instant deposits. Wallet is charged the rounded deposit; the game receives the bonus. */

export interface DepositForBonus {
  id: string;
  amount: number;
}

export interface PriorLoadForBonus {
  amount: number;
  adminNotes: string | null;
  status: string;
}

export interface DepositLoadPart {
  depositId: string | null;
  depositIndex: number | null;
  paid: number;
  rate: number;
  gameAmount: number;
}

export interface DepositLoadPlan {
  /** Whole dollars taken from the wallet. */
  walletDebit: number;
  /** Coins sent to the game, including any bonus. */
  gameAmount: number;
  bonusAmount: number;
  parts: DepositLoadPart[];
  /** Shown to the player before and after the load. */
  playerMessage: string;
  /** Stored on the load so the same deposit is not bonused twice. */
  adminNotes: string;
}

const ACTIVE = new Set(["completed", "pending", "processing"]);

/** 4.99 → 5. Amounts already on a dollar stay there. */
export function roundLoadDollars(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export function bonusRateForDepositIndex(index: number): number {
  if (index <= 0) return 1;
  if (index === 1) return 0.5;
  return 0;
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function ordinalName(index: number): string {
  if (index === 0) return "First deposit";
  if (index === 1) return "Second deposit";
  if (index === 2) return "Third deposit";
  return `Deposit ${index + 1}`;
}

function parseParts(notes: string | null): { id: string; paid: number }[] | null {
  if (!notes?.startsWith("deposit_bonus ")) return null;
  const match = notes.match(/parts=([^\s]+)/);
  if (!match || match[1] === "-") return [];
  return match[1].split(",").flatMap((piece) => {
    const [id, paidRaw] = piece.split(":");
    const paid = Number(paidRaw);
    if (!id || !Number.isFinite(paid) || paid <= 0) return [];
    return [{ id, paid }];
  });
}

function consumedByDeposit(deposits: DepositForBonus[], priorLoads: PriorLoadForBonus[]): Map<string, number> {
  const left = new Map(deposits.map((dep) => [dep.id, roundLoadDollars(dep.amount)]));

  for (const load of priorLoads) {
    if (!ACTIVE.has(load.status)) continue;
    const parsed = parseParts(load.adminNotes);
    if (parsed) {
      for (const part of parsed) {
        if (!part.id || !left.has(part.id)) continue;
        left.set(part.id, Math.max(0, (left.get(part.id) ?? 0) - part.paid));
      }
      continue;
    }

    let budget = roundLoadDollars(load.amount);
    for (const dep of deposits) {
      if (budget <= 0) break;
      const available = left.get(dep.id) ?? 0;
      if (available <= 0) continue;
      const take = Math.min(available, budget);
      left.set(dep.id, available - take);
      budget -= take;
    }
  }

  return left;
}

export function planDepositLoad(input: {
  requestedAmount: number;
  deposits: DepositForBonus[];
  priorLoads: PriorLoadForBonus[];
}): DepositLoadPlan {
  const requested = Math.round(Number(input.requestedAmount) * 100) / 100;
  const walletDebit = roundLoadDollars(requested);
  const deposits = input.deposits.filter((dep) => roundLoadDollars(dep.amount) > 0);
  const remaining = consumedByDeposit(deposits, input.priorLoads);

  let budget = walletDebit;
  const parts: DepositLoadPart[] = [];

  deposits.forEach((dep, index) => {
    if (budget <= 0) return;
    const left = remaining.get(dep.id) ?? 0;
    if (left <= 0) return;
    const paid = Math.min(left, budget);
    const rate = bonusRateForDepositIndex(index);
    const gameAmount = Math.round(paid * (1 + rate) * 100) / 100;
    parts.push({ depositId: dep.id, depositIndex: index, paid, rate, gameAmount });
    budget -= paid;
  });

  if (budget > 0) {
    parts.push({
      depositId: null,
      depositIndex: null,
      paid: budget,
      rate: 0,
      gameAmount: budget,
    });
  }

  const gameAmount = Math.round(parts.reduce((sum, part) => sum + part.gameAmount, 0) * 100) / 100;
  const bonusAmount = Math.round((gameAmount - walletDebit) * 100) / 100;
  const playerMessage = describeDepositLoad(requested, walletDebit, gameAmount, parts);
  const partsToken =
    parts
      .filter((part) => part.depositId)
      .map((part) => `${part.depositId}:${part.paid}`)
      .join(",") || "-";

  return {
    walletDebit,
    gameAmount,
    bonusAmount,
    parts,
    playerMessage,
    adminNotes: `deposit_bonus parts=${partsToken} game=${gameAmount} paid=${walletDebit} ${playerMessage}`,
  };
}

function describeDepositLoad(
  requested: number,
  walletDebit: number,
  gameAmount: number,
  parts: DepositLoadPart[]
): string {
  if (walletDebit <= 0) return "Enter a load amount.";

  const sentences: string[] = [];
  if (Math.abs(requested - walletDebit) >= 0.005) {
    sentences.push(`${money(requested)} counts as ${money(walletDebit)}.`);
  }

  const depositParts = parts.filter((part) => part.depositIndex != null);
  if (depositParts.length === 0) {
    sentences.push(`No deposit bonus. ${money(gameAmount)} goes into the game.`);
  } else {
    for (const part of depositParts) {
      const name = ordinalName(part.depositIndex ?? 0);
      const bonus = Math.round((part.gameAmount - part.paid) * 100) / 100;
      if (bonus > 0) {
        const percent = part.rate >= 1 ? "100%" : "50%";
        sentences.push(
          `${name} bonus ${percent}: ${money(part.paid)} + ${money(bonus)} bonus = ${money(part.gameAmount)} in the game.`
        );
      } else {
        sentences.push(`${name}: no bonus. ${money(part.gameAmount)} goes into the game.`);
      }
    }
    const extra = parts.find((part) => part.depositId == null);
    if (extra) {
      sentences.push(`${money(extra.paid)} has no bonus because it is not a new deposit.`);
    }
  }

  sentences.push(`Your wallet is charged ${money(walletDebit)}.`);
  return sentences.join(" ");
}

export function depositBonusPlayerMessage(notes: string | null | undefined): string | null {
  if (!notes?.startsWith("deposit_bonus ")) return null;
  const marker = ` paid=`;
  const paidAt = notes.indexOf(marker);
  if (paidAt < 0) return null;
  const afterPaid = notes.slice(paidAt + marker.length);
  const space = afterPaid.indexOf(" ");
  if (space < 0) return null;
  const message = afterPaid.slice(space + 1).trim();
  return message || null;
}
