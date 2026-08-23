import dynamic from "next/dynamic";
import { Report, MapBounds } from "@/lib/types";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-cs-base)] text-[var(--color-cs-text-muted)] font-mono font-bold tracking-widest animate-pulse">
      INITIALIZING RADAR...
    </div>
  ),
});

export default function MapContainer(props: { reports: Report[], centerOn?: [number, number], onVote?: (reportId: string, voteType: 'confirm' | 'deny') => void, onBoundsChange?: (bounds: MapBounds) => void }) {
  return <MapView {...props} />;
}
