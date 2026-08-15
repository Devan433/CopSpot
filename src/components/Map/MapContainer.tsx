import dynamic from "next/dynamic";
import { Report } from "@/lib/types";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-rp-bg)] text-[var(--color-rp-border)] font-bold animate-pulse" style={{ fontFamily: 'var(--font-pixel)' }}>
      INITIALIZING RADAR...
    </div>
  ),
});

export default function MapContainer(props: { reports: Report[], centerOn?: [number, number], onVote?: (reportId: string, voteType: 'confirm' | 'deny') => void }) {
  return <MapView {...props} />;
}
