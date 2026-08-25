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
          onSubmit(description, null);
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
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      
      <div className="modal-frame w-full sm:max-w-md max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl">
        
        <div className="flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center p-5 pb-4">
            <h2 className="text-white font-bold text-lg m-0">
              Report Sighting
            </h2>
            <button
              onClick={onClose}
              aria-label="Close report modal"
              className="text-[var(--color-cs-text-muted)] hover:text-white w-8 h-8 flex items-center justify-center transition-colors text-lg rounded-full hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="px-5 pb-5">


            {/* Notes Section */}
            <div className="mb-5">
              <label className="text-[var(--color-cs-text-muted)] text-xs font-medium uppercase tracking-wider mb-2 block">
                Details <span className="text-[var(--color-cs-text-muted)] opacity-60">(optional)</span>
              </label>
              
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 p-3 text-white placeholder-[var(--color-cs-text-muted)] outline-none focus:border-white/30 transition-colors resize-none h-28 text-sm rounded-xl"
                  placeholder="e.g. Traffic is piling up, checking documents..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className={`absolute bottom-3 right-3 text-[10px] font-mono ${description.length >= MAX_DESCRIPTION_LENGTH ? 'text-[var(--color-cs-red)]' : 'text-[var(--color-cs-text-muted)] opacity-50'}`}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isCoolingDown}
              className={`w-full py-3.5 font-semibold text-sm transition-all rounded-xl flex items-center justify-center gap-2 ${
                isCoolingDown || isSubmitting
                  ? "bg-white/5 text-[var(--color-cs-text-muted)] cursor-not-allowed"
                  : "bg-[#EF4444] hover:bg-[#DC2626] text-white active:bg-[#B91C1C] shadow-lg shadow-red-500/25"
              }`}
            >
              {submitStatus === "locating" && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isCoolingDown
                ? `Wait ${Math.ceil((cooldownRemaining ?? 0) / 60000)}m`
                : submitStatus === "locating"
                  ? "Getting location..."
                  : submitStatus === "transmitting"
                    ? "Sending..."
                    : "Submit Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
