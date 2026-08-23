import { useState } from "react";
import { MAX_DESCRIPTION_LENGTH, REPORT_CONFIG } from "@/lib/constants";
import { ReportType } from "@/lib/types";
import { Filter } from "bad-words";

const profanityFilter = new Filter();

const REPORT_TYPES: ReportType[] = ["checking", "traffic", "accident", "hazard", "other"];

export default function ReportModal({
  onClose,
  onSubmit,
  cooldownRemaining,
  showToast,
}: {
  onClose: () => void;
  onSubmit: (type: ReportType, desc: string, location: { lat: number; lng: number } | null) => void;
  cooldownRemaining?: number;
  showToast?: (msg: string, type: "success" | "error" | "warning") => void;
}) {
  const [selectedType, setSelectedType] = useState<ReportType>("checking");
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
          onSubmit(selectedType, description, { lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          showToast?.("Could not get exact GPS, using map center instead.", "warning");
          setSubmitStatus("transmitting");
          onSubmit(selectedType, description, null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setSubmitStatus("transmitting");
      onSubmit(selectedType, description, null);
    }
  };

  const isCoolingDown = (cooldownRemaining ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* Structural Modal Frame */}
      <div className="bg-[var(--color-cs-base)] border border-[var(--color-cs-border-light)] shadow-[inset_0_0_0_4px_var(--color-cs-frame)] p-1 w-full max-w-md max-h-[90vh] flex flex-col relative">
        
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--color-cs-cyan)] z-10" />

        <div className="bg-[var(--color-cs-panel)] border border-[var(--color-cs-border)] flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center bg-[var(--color-cs-frame)] border-b border-[var(--color-cs-border)] p-4">
            <h2 className="text-[var(--color-cs-text)] font-bold text-sm tracking-widest flex items-center gap-2 m-0 uppercase">
              <span className="text-[var(--color-cs-red)] flex items-center justify-center border border-[var(--color-cs-red)] w-6 h-6 bg-[rgba(239,68,68,0.1)]">
                !
              </span>
              Report Sighting
            </h2>
            <button
              onClick={onClose}
              aria-label="Close report modal"
              className="text-[var(--color-cs-text-muted)] hover:text-white bg-[var(--color-cs-base)] hover:bg-[var(--color-cs-border)] border border-[var(--color-cs-border)] w-6 h-6 flex items-center justify-center transition-colors text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            {/* Report Type Selector */}
            <div className="mb-6">
              <label className="flex justify-between items-end mb-2">
                <span className="text-[var(--color-cs-text)] text-xs font-bold uppercase tracking-wider">
                  Sighting Type
                </span>
                <span className="text-[var(--color-cs-text-muted)] text-[10px] font-mono tracking-widest">
                  [REQUIRED]
                </span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {REPORT_TYPES.map((type) => {
                  const config = REPORT_CONFIG[type];
                  const isSelected = selectedType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-1 border transition-all text-center ${
                        isSelected
                          ? "border-[var(--color-cs-cyan)] bg-[var(--color-cs-frame)] shadow-[inset_0_0_12px_rgba(6,182,212,0.15)]"
                          : "border-[var(--color-cs-border)] bg-[var(--color-cs-base)] hover:border-[var(--color-cs-border-light)] hover:bg-[var(--color-cs-frame)]"
                      }`}
                    >
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors"
                        style={{ borderColor: isSelected ? config.color : 'var(--color-cs-border)' }}
                        dangerouslySetInnerHTML={{ __html: config.icon }}
                      />
                      <span className={`text-[9px] font-mono uppercase tracking-wider leading-tight ${
                        isSelected ? 'text-[var(--color-cs-text)]' : 'text-[var(--color-cs-text-muted)]'
                      }`}>
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes Section */}
            <div className="mb-6">
              <label className="flex justify-between items-end mb-2">
                <span className="text-[var(--color-cs-text)] text-xs font-bold uppercase tracking-wider">
                  Additional Details
                </span>
                <span className="text-[var(--color-cs-text-muted)] text-[10px] font-mono tracking-widest">
                  [OPTIONAL]
                </span>
              </label>
              
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[var(--color-cs-base)] border border-[var(--color-cs-border-light)] p-3 text-[var(--color-cs-text)] placeholder-[var(--color-cs-text-muted)] outline-none focus:border-[var(--color-cs-cyan)] transition-colors resize-none h-32 font-sans text-sm rounded-none"
                  placeholder="e.g. Traffic is piling up, checking documents..."
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <div className={`absolute bottom-3 right-3 text-[10px] font-mono tracking-widest ${description.length >= MAX_DESCRIPTION_LENGTH ? 'text-[var(--color-cs-red)]' : 'text-[var(--color-cs-text-muted)]'}`}>
                  {description.length}/{MAX_DESCRIPTION_LENGTH}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isCoolingDown}
              className={`w-full py-4 font-bold text-sm tracking-widest transition-all uppercase flex items-center justify-center gap-2 border ${
                isCoolingDown || isSubmitting
                  ? "bg-[var(--color-cs-frame)] text-[var(--color-cs-text-muted)] border-[var(--color-cs-border)] cursor-not-allowed"
                  : "bg-[#7F1D1D] hover:bg-[#991B1B] text-white border-[#EF4444] shadow-[inset_0_0_20px_rgba(239,68,68,0.3)] active:bg-[#450A0A]"
              }`}
            >
              {submitStatus === "locating" && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isCoolingDown
                ? `COOLDOWN [ ${Math.ceil((cooldownRemaining ?? 0) / 1000)}s ]`
                : submitStatus === "locating"
                  ? "ACQUIRING GPS..."
                  : submitStatus === "transmitting"
                    ? "TRANSMITTING..."
                    : "TRANSMIT REPORT"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
