"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
          type: "classic",
        });

        // Attempt to update on load to pick latest SW
        registration.update().catch(() => {});
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Service worker registration failed", err);
      }
    };

    register();
  }, []);

  return null;
}


