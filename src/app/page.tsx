"use client";

import { useState, useEffect } from "react";
import MapContainer from "@/components/Map/MapContainer";
import Header from "@/components/Header";
import ReportButton from "@/components/ReportButton";
import SideControls from "@/components/SideControls";
import RadarSweep from "@/components/RadarSweep";
import ReportModal from "@/components/ReportModal";
import InfoModal from "@/components/InfoModal";
import { Report, ReportType } from "@/lib/types";
import { KERALA_CENTER } from "@/lib/constants";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  // Fetch initial reports and listen for new ones
  useEffect(() => {
    const fetchReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error("Error fetching reports:", error);
      } else if (data) {
        // Map database fields, filling in missing fields with defaults
        const mappedReports: Report[] = data.map((d: any) => ({
          id: d.id,
          type: d.type as ReportType,
          latitude: d.latitude,
          longitude: d.longitude,
          description: d.description || "",
          created_at: d.created_at,
          expires_at: d.expires_at || new Date(Date.now() + 60 * 60000).toISOString(),
          confirmations: d.confirmations || 0,
          denials: d.denials || 0,
        }));
        setReports(mappedReports);
      }
    };

    fetchReports();

    // Setup Realtime Subscription for new reports
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports',
        },
        (payload) => {
          const newReport = payload.new as any;
          const mappedReport: Report = {
            id: newReport.id,
            type: newReport.type as ReportType,
            latitude: newReport.latitude,
            longitude: newReport.longitude,
            description: newReport.description || "",
            created_at: newReport.created_at,
            expires_at: newReport.expires_at || new Date(Date.now() + 60 * 60000).toISOString(),
            confirmations: newReport.confirmations || 0,
            denials: newReport.denials || 0,
          };
          setReports((prev) => [mappedReport, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReportSubmit = async (type: ReportType, desc: string, location: { lat: number; lng: number } | null) => {
    const latitude = location ? location.lat : KERALA_CENTER[0] + (Math.random() - 0.5) * 0.1;
    const longitude = location ? location.lng : KERALA_CENTER[1] + (Math.random() - 0.5) * 0.1;
    
    // Optimistically close modal and center map
    setIsModalOpen(false);
    setMapCenter([latitude, longitude]);

    // Insert into Supabase
    const { error } = await supabase.from('reports').insert({
      type,
      description: desc,
      latitude,
      longitude
    });

    if (error) {
      console.error("Error inserting report:", error);
      alert("Failed to submit report.");
    }
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

        {/* Info Button */}
        <button
          onClick={() => setIsInfoOpen(true)}
          className="absolute bottom-6 left-6 z-20 w-10 h-10 bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-border)] text-[var(--color-rp-border)] font-bold text-xl flex items-center justify-center hover:bg-[var(--color-rp-border)] hover:text-black transition-colors shadow-[0_4px_0_0_#000]"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          !
        </button>

      </div>

      {/* Modals */}
      {isModalOpen && (
        <ReportModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleReportSubmit} 
        />
      )}
      {isInfoOpen && (
        <InfoModal onClose={() => setIsInfoOpen(false)} />
      )}
    </main>
  );
}
