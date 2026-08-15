import { useState } from "react";
import { MAX_DESCRIPTION_LENGTH } from "@/lib/constants";
import { Filter } from "bad-words";

const profanityFilter = new Filter();

export default function ReportModal({
  onClose,
  onSubmit,
  cooldownRemaining,
  showToast,
}: {
  onClose: () => void;
  onSubmit: (desc: string, location: { lat: number; lng: number } | null) => void;
  cooldownRemaining?: number;
  showToast?: (msg: string, type: "success" | "error" | "warning") => void;
}) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "locating" | "transmitting">("idle");

  const handleSubmit = () => {
    if (isSubmitting) return;

    if (description && profanityFilter.isProfane(description)) {
      showToast?.("Please remove profane language from your description.", "warning");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("locating");

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSubmitStatus("transmitting");
          onSubmit(description, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          showToast?.("Could not get exact GPS, using map center instead.", "warning");
          setSubmitStatus("transmitting");
          onSubmit(description, null); // Falls back to map center in page.tsx
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setSubmitStatus("transmitting");
      onSubmit(description, null);
    }
  };

  const isCoolingDown = (cooldownRemaining ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border-2 border-slate-700/50 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/50">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <span className="bg-red-500/20 text-red-500 p-2 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </span>
            Report Sighting
          </h2>
          <button 
            onClick={onClose} 
            aria-label="Close report modal" 
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Notes Section */}
        <div className="mb-6">
          <label className="block text-slate-300 text-sm font-bold mb-3">
            Additional Details <span className="text-slate-500 font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900/50 border-2 border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors resize-none h-32 font-sans shadow-inner"
              placeholder="e.g. Traffic is piling up, checking documents..."
              maxLength={MAX_DESCRIPTION_LENGTH}
              autoFocus
            />
            <div className={`absolute bottom-3 right-3 text-xs font-mono ${description.length >= MAX_DESCRIPTION_LENGTH ? 'text-red-400' : 'text-slate-500'}`}>
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isCoolingDown}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
            isCoolingDown || isSubmitting
              ? "bg-slate-700 text-slate-400 cursor-not-allowed border-b-4 border-slate-800"
              : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white border-b-4 border-red-700 active:border-b-0 active:translate-y-1"
          }`}
        >
          {submitStatus === "locating" && (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isCoolingDown
            ? `Cooldown (${Math.ceil((cooldownRemaining ?? 0) / 1000)}s)`
            : submitStatus === "locating"
            ? "Acquiring GPS..."
            : submitStatus === "transmitting"
            ? "Transmitting..."
            : "TRANSMIT REPORT"}
        </button>
      </div>
    </div>
  );
}
