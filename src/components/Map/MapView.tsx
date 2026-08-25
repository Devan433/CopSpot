"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { KERALA_CENTER, DEFAULT_ZOOM } from "@/lib/constants";
import { Report, MapBounds } from "@/lib/types";
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

// Track map viewport bounds changes
function BoundsTracker({ onBoundsChange }: { onBoundsChange: (bounds: MapBounds) => void }) {
  const map = useMap();

  useEffect(() => {
    const handleMoveEnd = () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };

    handleMoveEnd(); // Fire on mount to get initial bounds
    map.on('moveend', handleMoveEnd);
    return () => { map.off('moveend', handleMoveEnd); };
  }, [map, onBoundsChange]);

  return null;
}

// Memoized icon cache to avoid re-creating L.divIcon on every render
const iconCache = new Map<string, L.DivIcon>();

const MARKER_COLOR = "#EF4444";
const MARKER_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

function getMarkerIcon(isRecent: boolean, opacity: number): L.DivIcon {
  const cacheKey = `${isRecent}-${opacity}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const icon = L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: #1b1b1b;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 4px solid ${MARKER_COLOR};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 0 0 #000;
      opacity: ${opacity};
      transition: opacity 0.3s ease;
      ${isRecent ? "animation: pulse-ring 2s infinite;" : ""}
    ">${MARKER_ICON}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

export default function MapView({ reports, centerOn, onVote, onBoundsChange }: { reports: Report[], centerOn?: [number, number], onVote?: (reportId: string, voteType: 'confirm' | 'deny') => void, onBoundsChange?: (bounds: MapBounds) => void }) {
  // Memoize the markers to avoid unnecessary re-renders
  const markers = useMemo(() => reports.map((report) => {
    const isRecent = Date.now() - new Date(report.created_at).getTime() < 10 * 60000;
    
    // Calculate visual decay based on time remaining
    const timeRemainingMs = new Date(report.expires_at).getTime() - Date.now();
    // If less than 15 minutes remaining, fade out to 50% opacity
    const opacity = timeRemainingMs < 15 * 60000 ? 0.5 : 1;
    
    const icon = getMarkerIcon(isRecent, opacity);
    const minutesAgo = Math.floor((Date.now() - new Date(report.created_at).getTime()) / 60000);

    return (
      <Marker
        key={report.id}
        position={[report.latitude, report.longitude]}
        icon={icon}
      >
        <Popup>
          <div className="flex flex-col gap-2">
            <div className="font-bold text-[var(--color-cs-red)] text-sm mb-1 uppercase flex items-center gap-1 font-mono tracking-wider">
              <span dangerouslySetInnerHTML={{ __html: MARKER_ICON }} /> SIGHTING
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
                className="flex-1 bg-[var(--color-cs-frame)] border border-[var(--color-cs-border)] py-1 hover:bg-[#1a2c47] hover:border-[var(--color-cs-border-light)] transition-colors text-xs text-green-400 min-h-[44px]"
              >
                ✓ {report.confirmations}
              </button>
              <button 
                onClick={() => onVote?.(report.id, 'deny')}
                className="flex-1 bg-[var(--color-cs-frame)] border border-[var(--color-cs-border)] py-1 hover:bg-[#1a2c47] hover:border-[var(--color-cs-border-light)] transition-colors text-xs text-red-400 min-h-[44px]"
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
      {onBoundsChange && <BoundsTracker onBoundsChange={onBoundsChange} />}
      
      {/* Standard OSM Map */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {markers}
    </MapContainer>
  );
}
