"use client";

import { useState, useEffect, useCallback } from "react";
import MapContainer from "@/components/Map/MapContainer";
import ReportButton from "@/components/ReportButton";
import SideControls from "@/components/SideControls";
import RadarSweep from "@/components/RadarSweep";
import ReportModal from "@/components/ReportModal";
import InfoModal from "@/components/InfoModal";
import InstallButton from "@/components/InstallButton";
import ChatWidget from "@/components/ChatWidget";
import ToastContainer from "@/components/Toast";
import { Report, ReportType } from "@/lib/types";
import { KERALA_CENTER, REPORT_COOLDOWN_MS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/useToast";

// Shared helper to map a Supabase database row to our Report type (DRY)
function mapDbRowToReport(d: Record<string, unknown>): Report {
  return {
    id: d.id as string,
    type: d.type as ReportType,
    latitude: d.latitude as number,
    longitude: d.longitude as number,
    description: (d.description as string) || "",
    created_at: d.created_at as string,
    expires_at: (d.expires_at as string) || new Date(Date.now() + 60 * 60000).toISOString(),
    confirmations: (d.confirmations as number) || 0,
    denials: (d.denials as number) || 0,
  };
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const { toasts, showToast, dismissToast } = useToast();

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, lastReportTime + REPORT_COOLDOWN_MS - Date.now());
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining, lastReportTime]);

  // Fetch initial reports and listen for changes
  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
        
      if (error) {
        console.error("Error fetching reports:", error);
        showToast("Failed to load reports. Check your connection.", "error");
      } else if (data) {
        const mappedReports = data.map((d) => mapDbRowToReport(d as Record<string, unknown>));
        setReports(mappedReports);
      }
      setIsLoading(false);
    };

    fetchReports();

    // Setup Realtime Subscription for INSERT, UPDATE, and DELETE
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'reports' },
        (payload) => {
          const mappedReport = mapDbRowToReport(payload.new as Record<string, unknown>);
          setReports((prev) => [mappedReport, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'reports' },
        (payload) => {
          const updatedReport = mapDbRowToReport(payload.new as Record<string, unknown>);
          setReports((prev) =>
            prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'reports' },
        (payload) => {
          const deletedId = (payload.old as Record<string, unknown>).id as string;
          setReports((prev) => prev.filter((r) => r.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReportSubmit = async (type: ReportType, desc: string, location: { lat: number; lng: number } | null) => {
    // Rate limit check
    const now = Date.now();
    if (now - lastReportTime < REPORT_COOLDOWN_MS) {
      showToast(`Please wait before submitting another report.`, "warning");
      return;
    }

    // Default to map center if no explicit location is provided
    const latitude = location ? location.lat : (mapCenter ? mapCenter[0] : KERALA_CENTER[0]);
    const longitude = location ? location.lng : (mapCenter ? mapCenter[1] : KERALA_CENTER[1]);
    
    // Optimistically close modal and center map
    setIsModalOpen(false);
    setMapCenter([latitude, longitude]);
    setLastReportTime(now);
    setCooldownRemaining(REPORT_COOLDOWN_MS);

    // Insert into Supabase
    const { error } = await supabase.from('reports').insert({
      type,
      description: desc,
      latitude,
      longitude
    });

    if (error) {
      console.error("Error inserting report:", error);
      showToast("Failed to submit report. Please try again.", "error");
    } else {
      showToast("Report transmitted successfully!", "success");
    }
  };

  const handleVote = useCallback(async (reportId: string, voteType: 'confirm' | 'deny') => {
    const reportToUpdate = reports.find(r => r.id === reportId);
    if (!reportToUpdate) return;
    
    // Optimistic update
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          confirmations: voteType === 'confirm' ? r.confirmations + 1 : r.confirmations,
          denials: voteType === 'deny' ? r.denials + 1 : r.denials
        };
      }
      return r;
    }));

    const { error } = await supabase
      .from('reports')
      .update({
        confirmations: voteType === 'confirm' ? reportToUpdate.confirmations + 1 : reportToUpdate.confirmations,
        denials: voteType === 'deny' ? reportToUpdate.denials + 1 : reportToUpdate.denials
      })
      .eq('id', reportId);
      
    if (error) {
      console.error("Error updating vote:", error);
      showToast("Vote failed. Please try again.", "error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          showToast("Could not get location. Make sure permissions are granted.", "warning");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showToast("Geolocation is not supported by this browser.", "error");
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-0 md:p-8 lg:p-12">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Device Frame */}
      <div className="device-frame w-full h-full max-w-7xl max-h-[900px] flex flex-col">
        {/* Map Container - Inside Bezel */}
        <div className="absolute inset-0 md:inset-4 rounded-none md:rounded-xl overflow-hidden z-0">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-rp-bg)] text-[var(--color-rp-border)] font-bold animate-pulse" style={{ fontFamily: 'var(--font-pixel)' }}>
              LOADING RADAR DATA...
            </div>
          ) : (
            <MapContainer reports={reports} centerOn={mapCenter} onVote={handleVote} />
          )}
        </div>

        {/* UI Elements - Relative to Frame */}
        <SideControls />
        <ReportButton onClick={() => setIsModalOpen(true)} />
        <RadarSweep onClick={handleLocateUser} />

        {/* Info Button */}
        <button
          onClick={() => setIsInfoOpen(true)}
          className="absolute bottom-6 left-6 z-20 w-11 h-11 bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-border)] text-[var(--color-rp-border)] font-bold text-xl flex items-center justify-center hover:bg-[var(--color-rp-border)] hover:text-black transition-colors shadow-[0_4px_0_0_#000]"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          !
        </button>

        {/* Install Button */}
        <InstallButton />

        {/* Chat Widget */}
        <ChatWidget showToast={showToast} />
      </div>

      {/* Modals */}
      {isModalOpen && (
        <ReportModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleReportSubmit}
          cooldownRemaining={cooldownRemaining}
        />
      )}
      {isInfoOpen && (
        <InfoModal onClose={() => setIsInfoOpen(false)} />
      )}
    </main>
  );
}
