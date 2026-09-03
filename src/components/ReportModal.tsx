import { useState, useEffect, useRef, useCallback } from "react";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { Filter } from "bad-words";

const profanityFilter = new Filter();

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function ReportModal({
  onClose,
  onSubmit,
  cooldownRemaining,
  showToast,
}: {
  onClose: () => void;
  onSubmit: (desc: string, location: { lat: number; lng: number } | null, turnstileToken?: string) => void;
  cooldownRemaining?: number;
  showToast?: (msg: string, type: "success" | "error" | "warning") => void;
}) {

  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "transmitting">("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    if (document.querySelector('script[src*="turnstile"]')) return;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    document.head.appendChild(script);
  }, [siteKey]);

  const renderWidget = useCallback(() => {
    if (!siteKey || !turnstileRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;

    widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
      sitekey: siteKey,
      theme: 'dark',
      size: 'compact',
      callback: (token: string) => {
        setTurnstileToken(token);
      },
      'error-callback': () => {
        setTurnstileToken(null);
        showToast?.("Verification failed. Please try again.", "error");
      },
    });
  }, [siteKey, showToast]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        renderWidget();
        clearInterval(interval);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  const handleSubmit = () => {
    if (isSubmitting) return;

    if (description && profanityFilter.isProfane(description)) {
      showToast?.("Please remove profane language from your description.", "warning");
      return;
    }

    if (!turnstileToken && siteKey) {
      showToast?.("Please wait for verification to complete.", "warning");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("transmitting");
    onSubmit(description, null, turnstileToken || undefined);
  };

  const isCoolingDown = (cooldownRemaining ?? 0) > 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] pointer-events-auto">
      {/* Bottom sheet */}
      <div className="bg-black border-t border-white/20 w-full rounded-t-2xl shadow-2xl animate-[slideUp_0.3s_ease-out]">

        {/* Drag handle + header row */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-bold text-base m-0">
              Report Sighting
            </h2>
            <span className="text-gray-500 text-xs">Drag map to place pin</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close report"
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors text-lg rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Compact textarea */}
          <div className="mb-3 relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 p-3 text-white placeholder-gray-500 outline-none focus:border-white/30 transition-colors resize-none h-20 text-sm rounded-xl"
              placeholder="Details (optional) e.g. checking documents..."
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <div className={`absolute bottom-2 right-3 text-[10px] font-mono ${description.length >= MAX_DESCRIPTION_LENGTH ? 'text-red-500' : 'text-gray-500 opacity-50'}`}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>

          {/* Turnstile widget */}
          <div ref={turnstileRef} className="mb-3 flex justify-center" />

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isCoolingDown || (!turnstileToken && !!siteKey)}
            className={`w-full py-3.5 font-semibold text-sm transition-all rounded-xl flex items-center justify-center gap-2 ${
              isCoolingDown || isSubmitting || (!turnstileToken && !!siteKey)
                ? "bg-white/5 text-gray-400 cursor-not-allowed"
                : "bg-[#A50021] hover:bg-[#C20027] text-white active:bg-[#800019] shadow-lg shadow-[#A50021]/30"
            }`}
          >
            {submitStatus === "transmitting" && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isCoolingDown
              ? `Wait ${Math.ceil((cooldownRemaining ?? 0) / 60000)}m`
              : !turnstileToken && siteKey
                ? "Verifying..."
                : submitStatus === "transmitting"
                  ? "Sending..."
                  : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
