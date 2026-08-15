"use client";

import { useState, useEffect, useCallback } from "react";
import MapContainer from "@/components/Map/MapContainer";
import ReportButton from "@/components/ReportButton";

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
    type: (d.type as ReportType) || "checking",
    latitude: d.latitude as number,
    longitude: d.longitude as number,
    description: (d.description as string) || "",
    created_at: d.created_at as string,
    expires_at: (d.expires_at as string) || new Date(Date.now() + 60 * 60000).toISOString(),
    confirmations: (d.confirmations as number) || 0,
    denials: (d.denials as number) || 0,
  };
}

// Track which reports the user has voted on to prevent duplicates
function getVotedReports(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem("copspot_voted");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveVotedReport(reportId: string): void {
  if (typeof window === "undefined") return;
  const voted = getVotedReports();
  voted.add(reportId);
  const arr = Array.from(voted);
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  localStorage.setItem("copspot_voted", JSON.stringify(arr));
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [votedReports] = useState<Set<string>>(getVotedReports);
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

      // Try with expires_at filter; fall back without it if column is missing
      // Also fetch ones that haven't hit the denial threshold (-3 net score)
      let result = await supabase
        .from('reports')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (result.error) {
        console.warn("expires_at filter failed, fetching all reports:", result.error.message);
        result = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
      }
        
      if (result.error) {
        console.error("Error fetching reports:", result.error);
        showToast("Failed to load reports. Check your connection.", "error");
      } else if (result.data) {
        const mappedReports = result.data.map((d) => mapDbRowToReport(d as Record<string, unknown>));
        setReports(mappedReports);
      }
      setIsLoading(false);
    };

    fetchReports();

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

  // Report type is always "checking" since we removed the type selector
  const handleReportSubmit = async (desc: string, location: { lat: number; lng: number } | null) => {
    const now = Date.now();
    if (now - lastReportTime < REPORT_COOLDOWN_MS) {
      showToast("Please wait before submitting another report.", "warning");
      return;
    }

    const latitude = location ? location.lat : (mapCenter ? mapCenter[0] : KERALA_CENTER[0]);
    const longitude = location ? location.lng : (mapCenter ? mapCenter[1] : KERALA_CENTER[1]);
    
    setIsModalOpen(false);
    setMapCenter([latitude, longitude]);
    setLastReportTime(now);
    setCooldownRemaining(REPORT_COOLDOWN_MS);

    const { error } = await supabase.from('reports').insert({
      type: 'checking',
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
    if (votedReports.has(reportId)) {
      showToast("You've already voted on this report.", "warning");
      return;
    }

    const reportToUpdate = reports.find(r => r.id === reportId);
    if (!reportToUpdate) return;

    // Calculate new expiration if confirmed (+30 mins, capped at 2 hours from now)
    let newExpiresAt = reportToUpdate.expires_at;
    if (voteType === 'confirm') {
      const currentExpiry = new Date(reportToUpdate.expires_at).getTime();
      const maxExpiry = Date.now() + 2 * 60 * 60 * 1000;
      const extendedExpiry = Math.max(Date.now(), currentExpiry) + 30 * 60 * 1000;
      newExpiresAt = new Date(Math.min(extendedExpiry, maxExpiry)).toISOString();
    }

    // Optimistic update
    setReports(prev => prev.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          confirmations: voteType === 'confirm' ? r.confirmations + 1 : r.confirmations,
          denials: voteType === 'deny' ? r.denials + 1 : r.denials,
          expires_at: newExpiresAt
        };
      }
      return r;
    }));

    // Mark as voted immediately
    votedReports.add(reportId);
    saveVotedReport(reportId);

    const { error } = await supabase
      .from('reports')
      .update({
        confirmations: voteType === 'confirm' ? reportToUpdate.confirmations + 1 : reportToUpdate.confirmations,
        denials: voteType === 'deny' ? reportToUpdate.denials + 1 : reportToUpdate.denials,
        expires_at: newExpiresAt
      })
      .eq('id', reportId);
      
    if (error) {
      console.error("Error updating vote:", error);
      showToast(`Vote failed: ${error.message || 'Check database permissions'}`, "error");
      
      // Revert optimistic tracking
      votedReports.delete(reportId);
      const arr = Array.from(votedReports);
      localStorage.setItem("copspot_voted", JSON.stringify(arr));
      
      // Revert optimistic report state
      setReports(prev => prev.map(r => {
        if (r.id === reportId) return reportToUpdate;
        return r;
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, votedReports]);

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

  // Filter out expired reports and reports with 3 more denials than confirmations
  const activeReports = reports.filter(r => {
    const isExpired = new Date(r.expires_at).getTime() < Date.now();
    const isHighlyDenied = (r.denials - r.confirmations) >= 3;
    return !isExpired && !isHighlyDenied;
  });

  return (
    <main className="relative w-screen h-screen overflow-hidden flex items-center justify-center p-0 md:p-8 lg:p-12">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="device-frame w-full h-full max-w-7xl max-h-[900px] flex flex-col">
        <div className="absolute inset-0 md:inset-4 rounded-none md:rounded-xl overflow-hidden z-0">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-rp-bg)] text-[var(--color-rp-border)] font-bold animate-pulse" style={{ fontFamily: 'var(--font-pixel)' }}>
              LOADING RADAR DATA...
            </div>
          ) : (
            <MapContainer reports={activeReports} centerOn={mapCenter} onVote={handleVote} />
          )}
        </div>

        <ReportButton onClick={() => setIsModalOpen(true)} />
        <RadarSweep onClick={handleLocateUser} />

        <button
          onClick={() => setIsInfoOpen(true)}
          aria-label="Community guidelines"
          className="absolute bottom-6 left-6 z-20 w-11 h-11 bg-[var(--color-rp-bg)] border-[4px] border-[var(--color-rp-border)] text-[var(--color-rp-border)] font-bold text-xl flex items-center justify-center hover:bg-[var(--color-rp-border)] hover:text-black transition-colors shadow-[0_4px_0_0_#000]"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          !
        </button>

        <InstallButton />
        <ChatWidget showToast={showToast} />
      </div>

      {isModalOpen && (
        <ReportModal 
          onClose={() => setIsModalOpen(false)} 
          onSubmit={handleReportSubmit}
          cooldownRemaining={cooldownRemaining}
          showToast={showToast}
        />
      )}
      {isInfoOpen && (
        <InfoModal onClose={() => setIsInfoOpen(false)} />
      )}
    </main>
  );
}
