import { ReportType, Report } from "./types";

export const REPORT_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
  checking: { label: "Checking", icon: "🚔", color: "#ff1744" },
  other: { label: "Other", icon: "!", color: "#ffffff" },
};

export const KERALA_CENTER: [number, number] = [10.8505, 76.2711];
export const DEFAULT_ZOOM = 8;

export const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    type: "checking",
    latitude: 9.9312,
    longitude: 76.2673, // Kochi
    description: "Cops checking at Edappally junction",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 55 * 60000).toISOString(),
    confirmations: 12,
    denials: 1
  },
  {
    id: "2",
    type: "checking",
    latitude: 8.5241,
    longitude: 76.9366, // Trivandrum
    description: "Checking near bypass",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 45 * 60000).toISOString(),
    confirmations: 5,
    denials: 0
  },
  {
    id: "3",
    type: "checking",
    latitude: 11.2588,
    longitude: 75.7804, // Calicut
    description: "Checking vehicles",
    created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    expires_at: new Date(Date.now() + 58 * 60000).toISOString(),
    confirmations: 20,
    denials: 2
  }
];
