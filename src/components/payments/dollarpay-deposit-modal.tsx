"use client";

import { useState } from "react";
import {
  Banknote,
  CreditCard,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import {
  DOLLARPAY_CHANNEL_NAMES,
  DOLLARPAY_SUPPORTED_AMOUNTS_CARD,
  DOLLARPAY_SUPPORTED_AMOUNTS_WALLET,
  type DollarPayChannel,
} from "@/lib/payments/dollarpay";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DollarPayDepositModalProps {
  userId?: string;
  gameSlug?: string;
  gameName?: string;
  onSuccess?: () => void;
}

export function DollarPayDepositSection({
  userId,
  gameSlug,
  gameName,
}: DollarPayDepositModalProps) {
  const [channel, setChannel] = useState<DollarPayChannel>("1");
  const [selectedAmount, setSelectedAmount] = useState<string>("19.99");
  const [loading, setLoading] = useState(false);

  const amounts =
    channel === "4"
      ? DOLLARPAY_SUPPORTED_AMOUNTS_CARD
      : DOLLARPAY_SUPPORTED_AMOUNTS_WALLET;

  // Key preset amounts to highlight prominently
  const featuredAmounts =
    channel === "4"
      ? ["9.99", "14.99", "19.99", "29.99", "49.99", "99.99", "149.99", "199.99"]
      : ["4.99", "9.99", "14.99", "19.99", "29.99", "49.99", "99.99", "149.99", "199.99", "299.99", "499.99"];

  function getChannelIcon(c: DollarPayChannel) {
    switch (c) {
      case "1":
        return <Zap className="h-4 w-4 text-emerald-400" />;
      case "2":
        return <Smartphone className="h-4 w-4 text-sky-400" />;
      case "3":
        return <Globe className="h-4 w-4 text-amber-400" />;
      case "4":
        return <CreditCard className="h-4 w-4 text-purple-400" />;
    }
  }

  async function handlePayNow() {
    if (!selectedAmount) {
      toast.error("Please choose a deposit amount.");
      return;
    }

    setLoading(true);
    try {
      // Generate device ID signature
      let deviceId = "web_device";
      if (typeof window !== "undefined") {
        let storedId = localStorage.getItem("casinova_device_id");
        if (!storedId) {
          storedId = "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
          localStorage.setItem("casinova_device_id", storedId);
        }
        deviceId = storedId;
      }

      const res = await fetch("/api/payments/dollarpay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedAmount,
          isPay: channel,
          deviceId,
          userId,
          gameSlug,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        toast.error(data.error || "Failed to initiate payment");
        setLoading(false);
        return;
      }

      if (data.payUrl) {
        toast.success(`Opening ${DOLLARPAY_CHANNEL_NAMES[channel]} payment gateway...`);
        window.open(data.payUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error("No checkout URL returned from payment server");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment error occurred";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[rgba(0,229,255,0.2)] bg-gradient-to-b from-[#12122b] to-[#0a0a18] p-4 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(0,229,255,0.1)]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              Instant Automated Deposit
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auto-Credit
              </span>
            </h3>
            <p className="text-xs text-[#7af5ff]/70">
              No receipt upload required! Instant approval via DollarPay.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Channel Options */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-[#8b8dae] uppercase tracking-wider block mb-2">
          Select Payment Method
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["1", "2", "3", "4"] as DollarPayChannel[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setChannel(c);
                const nextAmounts =
                  c === "4"
                    ? DOLLARPAY_SUPPORTED_AMOUNTS_CARD
                    : DOLLARPAY_SUPPORTED_AMOUNTS_WALLET;
                if (!nextAmounts.includes(selectedAmount)) {
                  setSelectedAmount(nextAmounts[0]);
                }
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-bold transition-all border",
                channel === c
                  ? "bg-gradient-to-r from-[rgba(0,229,255,0.15)] to-purple-500/20 border-[#00E5FF] text-white shadow-[0_0_15px_rgba(0,229,255,0.25)] scale-[1.02]"
                  : "bg-[#0b0b1a] border-white/10 text-[#6b6d8f] hover:text-white hover:border-white/20"
              )}
            >
              {getChannelIcon(c)}
              <span>{DOLLARPAY_CHANNEL_NAMES[c]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selectable Amount Tiers */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[#8b8dae] uppercase tracking-wider block">
            Select Deposit Amount (USD)
          </label>
          <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
            <Flame className="h-3.5 w-3.5" />
            DollarPay Supported Tiers
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {featuredAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setSelectedAmount(amt)}
              className={cn(
                "rounded-xl py-2.5 px-2 text-sm font-bold transition-all border text-center flex flex-col items-center justify-center",
                selectedAmount === amt
                  ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-105"
                  : "bg-[#0c0c1e] border-white/10 text-[#8b8dae] hover:text-white hover:border-white/20"
              )}
            >
              <span className="text-xs text-gray-400 font-normal">$</span>
              <span className="text-base">{amt}</span>
            </button>
          ))}
        </div>

        {/* Full Dropdown for additional amounts if not in featured */}
        <div className="mt-3">
          <select
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0c0c1e] px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
          >
            {amounts.map((amt) => (
              <option key={amt} value={amt}>
                Deposit Tier: ${amt} USD
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Box */}
      <div className="rounded-xl bg-[#090915] p-3.5 border border-white/5 mb-5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Automated Instant Credit</span>
        </div>
        <div className="text-right">
          <span className="text-gray-400 mr-1">Total:</span>
          <span className="font-bold text-base text-emerald-400">${selectedAmount} USD</span>
        </div>
      </div>

      {/* Pay Action Button */}
      <button
        type="button"
        onClick={handlePayNow}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-4 px-6 text-base font-extrabold text-black bg-gradient-to-r from-emerald-400 via-teal-400 to-[#00E5FF] hover:opacity-95 transition-all shadow-[0_0_20px_rgba(0,229,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Connecting to {DOLLARPAY_CHANNEL_NAMES[channel]}...
          </>
        ) : (
          <>
            <ExternalLink className="h-5 w-5" />
            Pay ${selectedAmount} via {DOLLARPAY_CHANNEL_NAMES[channel]} Now
          </>
        )}
      </button>
    </div>
  );
}
