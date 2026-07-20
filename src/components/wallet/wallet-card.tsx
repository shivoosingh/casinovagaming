import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletCardProps {
  walletBalance: number;
  cashoutWallet: number;
  className?: string;
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function WalletCard({ walletBalance, cashoutWallet, className }: WalletCardProps) {
  const columns = [
    { label: "Total Deposit", value: walletBalance },
    { label: "Deposit Redeem", value: cashoutWallet },
  ] as const;

  return (
    <div className={cn("wallet-card relative pt-5", className)}>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-[#ff2d78] via-[#00E5FF] to-[#ffd700]" />
      <div className="absolute -top-0 left-1/2 -translate-x-1/2 z-10">
        <div className="wallet-card-notch" />
        <div className="absolute left-1/2 top-3 -translate-x-1/2 w-9 h-9 rounded-full bg-[#060616] border-2 border-[#00E5FF]/60 flex items-center justify-center shadow-lg shadow-[rgba(0, 229, 255,0.2)]">
          <Wallet className="h-4 w-4 text-[#00E5FF]" />
        </div>
      </div>

      <div className="wallet-card-body grid grid-cols-2 gap-y-3 pt-6 pb-4 px-0.5">
        {columns.map((col, index) => (
          <div
            key={col.label}
            className={cn(
              "flex min-w-0 flex-col items-center text-center px-0.5 sm:px-1",
              index === 0 && "border-r border-[rgba(0, 229, 255,0.1)]"
            )}
          >
            <div className="flex h-9 w-full items-center justify-center">
              <p className="text-[10px] sm:text-[11px] text-[#6b6d8f] leading-snug text-balance">{col.label}</p>
            </div>
            <p className="text-base sm:text-lg font-black text-[#00E5FF] tabular-nums leading-none"
               style={{ textShadow: "0 0 10px rgba(0, 229, 255,0.6)" }}>
              {formatMoney(col.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
