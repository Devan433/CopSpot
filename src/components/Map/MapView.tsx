"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { KERALA_CENTER, DEFAULT_ZOOM, REPORT_CONFIG } from "@/lib/constants";
import { Report, ReportType } from "@/lib/types";
import "leaflet/dist/leaflet.css";

// Helper to center map
function MapController({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

// Memoized icon cache to avoid re-creating L.divIcon on every render
const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(type: ReportType, isRecent: boolean, opacity: number): L.DivIcon {
  const cacheKey = `${type}-${isRecent}-${opacity}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const config = REPORT_CONFIG[type];
  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: #1b1b1b;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 4px solid ${config.color};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 0 0 #000;
      opacity: ${opacity};
      transition: opacity 0.3s ease;
      ${isRecent ? "animation: pulse-ring 2s infinite;" : ""}
    ">${config.icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

export default function MapView({ reports, centerOn, onVote }: { reports: Report[], centerOn?: [number, number], onVote?: (reportId: string, voteType: 'confirm' | 'deny') => void }) {
  // Memoize the markers to avoid unnecessary re-renders
  const markers = useMemo(() => reports.map((report) => {
    const isRecent = Date.now() - new Date(report.created_at).getTime() < 10 * 60000;
    
    // Calculate visual decay based on time remaining
    const timeRemainingMs = new Date(report.expires_at).getTime() - Date.now();
    // If less than 15 minutes remaining, fade out to 50% opacity
    const opacity = timeRemainingMs < 15 * 60000 ? 0.5 : 1;
    
    const icon = getMarkerIcon(report.type, isRecent, opacity);
    const config = REPORT_CONFIG[report.type];
    const minutesAgo = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 60000);

    return (
      <Marker
        key={report.id}
        position={[report.latitude, report.longitude]}
        icon={icon}
      >
        <Popup>
          <div className="flex flex-col gap-2">
            <div className="font-bold text-[var(--color-rp-border)] text-sm mb-1 uppercase flex items-center gap-1" style={{ fontFamily: 'var(--font-pixel)' }}>
              <span dangerouslySetInnerHTML={{ __html: config.icon }} /> {config.label}
            </div>
            <div className="text-xs text-gray-400">
              Reported {minutesAgo < 1 ? "just now" : `${minutesAgo} min ago`}
            </div>
            {report.description && (
              <div className="mt-1 mb-2 text-sm">&quot;{report.description}&quot;</div>
            )}
            <div className="flex gap-2 mt-2 font-bold">
              <button 
                onClick={() => onVote?.(report.id, 'confirm')}
                className="flex-1 bg-[var(--color-rp-bg)] pixel-border-sm py-1 hover:bg-[#1a2c47] transition-colors text-xs text-green-400 min-h-[44px]"
              >
                ✓ {report.confirmations}
              </button>
              <button 
                onClick={() => onVote?.(report.id, 'deny')}
                className="flex-1 bg-[var(--color-rp-bg)] pixel-border-sm py-1 hover:bg-[#1a2c47] transition-colors text-xs text-red-400 min-h-[44px]"
              >
                ✕ {report.denials}
              </button>
            </div>
          </div>
        </Popup>
      </Marker>
    );
  }), [reports, onVote]);

  return (
    <MapContainer
      center={KERALA_CENTER}
      zoom={DEFAULT_ZOOM}
      className="w-full h-full z-0"
      zoomControl={false}
    >
      <MapController center={centerOn} />
      
      {/* Standard OSM Map */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {markers}
    </MapContainer>
  );
}
