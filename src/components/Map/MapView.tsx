"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { KERALA_CENTER, DEFAULT_ZOOM, REPORT_CONFIG } from "@/lib/constants";
import { Report } from "@/lib/types";
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

export default function MapView({ reports, centerOn }: { reports: Report[], centerOn?: [number, number] }) {
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

      {reports.map((report) => {
        const config = REPORT_CONFIG[report.type];
        
        // Custom retro icon matching the tracker style
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
            ${Date.now() - new Date(report.created_at).getTime() < 10 * 60000 ? "animation: pulse-ring 2s infinite;" : ""}
          ">${config.icon}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });

        return (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={icon}
          >
            <Popup>
              <div className="flex flex-col gap-2">
                <div className="font-bold text-[var(--color-rp-border)] text-sm mb-1 uppercase" style={{ fontFamily: 'var(--font-pixel)' }}>
                  {config.icon} {config.label}
                </div>
                <div className="text-xs text-gray-400">
                  Reported {Math.floor((Date.now() - new Date(report.created_at).getTime()) / 60000)} min ago
                </div>
                {report.description && (
                  <div className="mt-1 mb-2 text-sm">"{report.description}"</div>
                )}
                <div className="flex gap-2 mt-2 font-bold">
                  <button className="flex-1 bg-[var(--color-rp-bg)] pixel-border-sm py-1 hover:bg-[#1a2c47] transition-colors text-xs text-green-400">
                    + {report.confirmations}
                  </button>
                  <button className="flex-1 bg-[var(--color-rp-bg)] pixel-border-sm py-1 hover:bg-[#1a2c47] transition-colors text-xs text-red-400">
                    - {report.denials}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
