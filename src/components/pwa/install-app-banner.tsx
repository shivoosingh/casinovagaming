"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "casinova-install-dismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
}

export function InstallAppBanner() {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    setIos(isIos());
    const timer = window.setTimeout(() => setOpen(true), 1200);

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setOpen(true);
    }

    window.addEventListener("beforeinstallprompt", onPrompt);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function install() {
    if (!promptEvent) {
      setHint(
        ios
          ? "Use the Share button in Safari, then tap Add to Home Screen."
          : "Open the browser menu and choose Install app, or Add to Home screen."
      );
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") dismiss();
    else setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[260] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="install-app-title"
        className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0a0a1e] p-5 shadow-2xl"
      >
        <p id="install-app-title" className="text-lg font-bold text-white">
          Install Casinova
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#c7c9e0]">
          {ios
            ? "Add Casinova to your home screen. In Safari, tap Share, then Add to Home Screen."
            : "Add Casinova to your home screen so it opens like an app."}
        </p>
        {hint ? <p className="mt-3 text-xs text-[#00E5FF]">{hint}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="px-3 py-2 text-sm text-[#6b6d8f]" onClick={dismiss}>
            Not now
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#00E5FF] px-4 py-2 text-sm font-bold text-black"
            onClick={() => void install()}
          >
            {ios ? "How to add" : "Install"}
          </button>
        </div>
      </div>
    </div>
  );
}
