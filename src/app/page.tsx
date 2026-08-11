"use client";

import { useState } from "react";
import MapContainer from "@/components/Map/MapContainer";
import Header from "@/components/Header";
import ReportButton from "@/components/ReportButton";
import SideControls from "@/components/SideControls";
import RadarSweep from "@/components/RadarSweep";
import ReportModal from "@/components/ReportModal";
import { Report, ReportType } from "@/lib/types";
import { MOCK_REPORTS, KERALA_CENTER } from "@/lib/constants";

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  const handleReportSubmit = (type: ReportType, desc: string, location: { lat: number; lng: number } | null) => {
    const newReport: Report = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      description: desc,
      latitude: location ? location.lat : KERALA_CENTER[0] + (Math.random() - 0.5) * 0.1,
      longitude: location ? location.lng : KERALA_CENTER[1] + (Math.random() - 0.5) * 0.1,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
      confirmations: 0,
      denials: 0,
    };
    
    setReports(prev => [newReport, ...prev]);
    setIsModalOpen(false);
    setMapCenter([newReport.latitude, newReport.longitude]);
  };

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          alert("Could not get location. Make sure permissions are granted.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-4 md:p-12">
      {/* Device Frame */}
      <div className="device-frame w-full h-full max-w-7xl max-h-[900px] flex flex-col">
        
        {/* Header - Overlaps Top Bezel */}
        <Header />

        {/* Map Container - Inside Bezel */}
        <div className="absolute inset-4 rounded-xl overflow-hidden z-0" style={{ inset: '16px' }}>
          <MapContainer reports={reports} centerOn={mapCenter} />
        </div>

        {/* UI Elements - Relative to Frame */}
        <SideControls />
        <ReportButton onClick={() => setIsModalOpen(true)} />
        <RadarSweep onClick={handleLocateUser} />

      </div>

      {/* Modals */}
      {isModalOpen && (
        <ReportModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleReportSubmit} 
        />
      )}
    </main>
  );
}
