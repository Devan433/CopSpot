"use client";

import { useEffect, useState } from "react";

// Custom type for the BeforeInstallPrompt event (not in standard DOM types)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      aria-label="Install CopSpot app"
      className="absolute bottom-20 left-6 z-20 px-3 min-h-[44px] bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-accent)] text-[var(--color-rp-accent)] font-bold text-sm flex items-center justify-center hover:bg-[var(--color-rp-accent)] hover:text-black transition-colors shadow-[0_4px_0_0_#000]"
      style={{ fontFamily: 'var(--font-pixel)' }}
    >
      INSTALL APP
    </button>
  );
}
