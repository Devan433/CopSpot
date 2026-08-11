import { useState } from "react";
import { ReportType } from "@/lib/types";
import { REPORT_CONFIG } from "@/lib/constants";

export default function ReportModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (type: ReportType, desc: string, location: { lat: number; lng: number } | null) => void;
}) {
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "locating" | "done">("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleUseLocation = () => {
    setLocationState("locating");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationState("done");
        },
        (err) => {
          alert("Could not get location. Make sure permissions are granted.");
          setLocationState("idle");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
      setLocationState("idle");
    }
  };

  const handleSubmit = () => {
    if (!selectedType) return alert("Select a report type!");
    onSubmit(selectedType, description, coords);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-[var(--color-rp-bg)] pixel-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg text-[var(--color-rp-accent)]" style={{ fontFamily: 'var(--font-pixel)' }}>
            NEW SIGHTING
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">X</button>
        </div>

        <div className="mb-4">
          <label className="block text-[var(--color-rp-border)] text-sm mb-2 uppercase font-bold">1. Select Type</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(REPORT_CONFIG) as ReportType[]).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`p-2 pixel-border-sm flex items-center gap-2 text-left transition-colors ${
                  selectedType === type
                    ? "bg-[var(--color-rp-border)] text-black font-bold"
                    : "bg-[#0d2137] text-white hover:bg-[#1a2c47]"
                }`}
              >
                <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>{REPORT_CONFIG[type].icon}</span>
                <span className="text-xs uppercase">{REPORT_CONFIG[type].label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[var(--color-rp-border)] text-sm mb-2 uppercase font-bold">2. Location</label>
          <button
            onClick={handleUseLocation}
            disabled={locationState === "locating" || locationState === "done"}
            className="w-full py-3 pixel-border-sm bg-[#0d2137] hover:bg-[#1a2c47] transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {locationState === "idle" && "USE MY LOCATION"}
            {locationState === "locating" && "ACQUIRING GPS SIGNAL..."}
            {locationState === "done" && "LOCATION LOCKED"}
          </button>
          {!coords && locationState === "idle" && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              (Will default to center of map if not provided)
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-[var(--color-rp-border)] text-sm mb-2 uppercase font-bold">3. Notes (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#0d2137] pixel-border-sm p-2 text-white outline-none focus:border-[var(--color-rp-accent)] resize-none h-20 font-sans"
            placeholder="E.g. Checking RC and Insurance..."
          />
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-4 pixel-border bg-[var(--color-rp-accent)] text-black font-bold text-lg hover:bg-white transition-colors"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          TRANSMIT
        </button>
      </div>
    </div>
  );
}
