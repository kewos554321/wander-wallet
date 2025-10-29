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

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined" || typeof window === "undefined") return false;
    const isiOSUA = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const noMS = !hasMSStream(window);
    return isiOSUA && noMS;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

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

  if (isStandalone) return null;

  const canPrompt = !!deferredPrompt && !hasPrompted && !isIOS;

  return (
    <div className="p-4 rounded-md border">
      <h3 className="font-medium mb-2">Install App</h3>
      {canPrompt && (
        <button
          className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
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
          Add to Home Screen
        </button>
      )}

      {isIOS && (
        <p className="text-sm text-muted-foreground mt-2">
          To install on iOS, tap the share button ⎋ and then &quot;Add to Home Screen&quot; ➕.
        </p>
      )}
    </div>
  );
}


