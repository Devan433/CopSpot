import { ReportType } from "./types";

export const REPORT_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
  checking: { label: "Checking", icon: "👮", color: "#ff1744" },
  traffic:  { label: "Traffic",  icon: "🚗", color: "#ff9800" },
  accident: { label: "Accident", icon: "💥", color: "#f44336" },
  hazard:   { label: "Hazard",   icon: "⚠️", color: "#ffeb3b" },
  other:    { label: "Other",    icon: "❓", color: "#ffffff" },
};

export const KERALA_CENTER: [number, number] = [10.8505, 76.2711];
export const DEFAULT_ZOOM = 8;

// Report submission cooldown in milliseconds (30 seconds)
export const REPORT_COOLDOWN_MS = 30_000;

// Maximum description length for reports
export const MAX_DESCRIPTION_LENGTH = 200;
