"use client";

import { useEffect, useMemo, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Helpers hoisted to module scope to avoid hook deps noise
type NavigatorWithStandalone = Navigator & { standalone?: boolean };
const hasStandalone = (n: Navigator): n is NavigatorWithStandalone => "standalone" in n;

type WindowWithMSStream = Window & { MSStream?: unknown };
const hasMSStream = (w: Window): w is WindowWithMSStream => "MSStream" in w;

const NEVER_SHOW_KEY = "install-prompt-never-show";

import { X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const [neverShowChecked, setNeverShowChecked] = useState(false);

  const isiOS = useMemo(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return false;
    const isiOSUA = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const noMS = !hasMSStream(window);
    return isiOSUA && noMS;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 檢查是否設定為永不顯示
    const savedNeverShow = localStorage.getItem(NEVER_SHOW_KEY);
    if (savedNeverShow === "true") {
      setNeverShow(true);
      return;
    }

    const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const iosStandalone = hasStandalone(window.navigator) && window.navigator.standalone === true; // iOS Safari
    setIsStandalone(mediaStandalone || iosStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    };
  }, []);

  const handleDismiss = () => {
    if (neverShowChecked) {
      localStorage.setItem(NEVER_SHOW_KEY, "true");
      setNeverShow(true);
    }
    setIsDismissed(true);
  };

  if (isStandalone || isDismissed || neverShow) return null;

  const canPrompt = !!deferredPrompt && !hasPrompted && !isiOS;
  
  if (!canPrompt && !isiOS) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 p-4 rounded-md border bg-background shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium">安裝應用程式</h3>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">關閉</span>
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        安裝 Wander Wallet 享受更好的體驗、離線存取，以及快速開啟應用程式。
      </p>

      {canPrompt && (
        <button
          className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black w-full sm:w-auto"
          onClick={async () => {
            if (!deferredPrompt) return;
            try {
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
            } finally {
              setHasPrompted(true);
              setDeferredPrompt(null);
            }
          }}
        >
          加入主畫面
        </button>
      )}

      {isiOS && (
        <p className="text-sm text-muted-foreground">
          在 iOS 上安裝：點擊分享按鈕 ⎋ 然後選擇「加入主畫面」➕
        </p>
      )}

      <label className="flex items-center gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={neverShowChecked}
          onChange={(e) => setNeverShowChecked(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-muted-foreground">不再顯示此提示</span>
      </label>
    </div>
  );
}


