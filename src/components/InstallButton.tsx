"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  // Detect common in-app browsers: Instagram, Facebook, WhatsApp, Telegram, Snapchat, Twitter, LinkedIn
  return /FBAN|FBAV|Instagram|WhatsApp|Telegram|Snapchat|Twitter|LinkedInApp|Line\//i.test(ua);
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
  const [showOpenInBrowser, setShowOpenInBrowser] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show anything if already installed as PWA
    if (isStandalone()) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem("copspot_install_dismissed")) {
      setDismissed(true);
      return;
    }

    // Case 1: In-app browser (WhatsApp, Instagram, etc.)
    if (isInAppBrowser()) {
      setShowOpenInBrowser(true);
      return;
    }

    // Case 2: iOS Safari (no beforeinstallprompt support)
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // Case 3: Normal browser — listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowNativeInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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
    setShowOpenInBrowser(false);
    setShowIOSGuide(false);
    setShowNativeInstall(false);
    sessionStorage.setItem("copspot_install_dismissed", "true");
  };

  const handleOpenInChrome = () => {
    // intent:// URL scheme forces Android to open in Chrome
    const url = window.location.href;
    window.location.href = `intent://${url.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end;`;
  };

  if (dismissed || isStandalone()) return null;

  // Banner for in-app browsers (WhatsApp, Instagram, etc.)
  if (showOpenInBrowser) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-[#0d2137] to-[#14375b] border-b border-white/10 px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Install CopSpot</p>
          <p className="text-gray-400 text-xs">Open in Chrome to install this app</p>
        </div>
        <button
          onClick={handleOpenInChrome}
          className="px-4 py-2 bg-[#EF4444] text-white text-xs font-bold rounded-lg whitespace-nowrap"
        >
          Open in Chrome
        </button>
        <button onClick={handleDismiss} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
      </div>
    );
  }

  // Banner for iOS Safari
  if (showIOSGuide) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-[#0d2137] to-[#14375b] border-b border-white/10 px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Install CopSpot</p>
          <p className="text-gray-400 text-xs">Tap <span className="text-white">Share ↑</span> then <span className="text-white">&quot;Add to Home Screen&quot;</span></p>
        </div>
        <button onClick={handleDismiss} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
      </div>
    );
  }

  // Standard install button for Chrome/Edge
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
