"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as Record<string, unknown>).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as Record<string, boolean>).standalone === true;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showNativeInstall, setShowNativeInstall] = useState(false);
  const [showManualInstall, setShowManualInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed or not on mobile — do nothing
    if (isStandalone()) return;
    if (sessionStorage.getItem("copspot_install_dismissed")) {
      setDismissed(true);
      return;
    }

    // iOS: always show the manual guide
    if (isIOS()) {
      setShowManualInstall(true);
      return;
    }

    let promptReceived = false;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptReceived = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowNativeInstall(true);
      setShowManualInstall(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // On mobile: if the install prompt hasn't fired after 3 seconds,
    // the user is likely in an in-app browser (WhatsApp, Instagram, etc.)
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isMobile()) {
      timer = setTimeout(() => {
        if (!promptReceived) {
          setShowManualInstall(true);
        }
      }, 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setShowNativeInstall(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowManualInstall(false);
    setShowNativeInstall(false);
    sessionStorage.setItem("copspot_install_dismissed", "true");
  };

  const handleOpenInChrome = () => {
    const url = window.location.href.replace(/^https?:\/\//, "");
    window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end;`;
  };

  if (dismissed || isStandalone()) return null;

  // Manual install banner (in-app browser or iOS)
  if (showManualInstall) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-[#0d2137] to-[#14375b] border-b border-white/10 px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">📲 Install CopSpot</p>
          {isIOS() ? (
            <p className="text-gray-400 text-xs">Tap <span className="text-white">Share ↑</span> → <span className="text-white">&quot;Add to Home Screen&quot;</span></p>
          ) : (
            <p className="text-gray-400 text-xs">Open in Chrome to install as an app</p>
          )}
        </div>
        {!isIOS() && (
          <button
            onClick={handleOpenInChrome}
            className="px-4 py-2 bg-[#EF4444] text-white text-xs font-bold rounded-lg whitespace-nowrap active:bg-red-600"
          >
            Open Chrome
          </button>
        )}
        <button onClick={handleDismiss} className="text-gray-500 hover:text-white text-lg leading-none p-1">✕</button>
      </div>
    );
  }

  // Native install button for Chrome/Edge
  if (showNativeInstall) {
    return (
      <button
        onClick={handleInstallClick}
        aria-label="Install CopSpot app"
        className="btn-fab"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    );
  }

  return null;
}
