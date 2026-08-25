"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MapContainer from "@/components/Map/MapContainer";
import ReportModal from "@/components/ReportModal";
import InfoModal from "@/components/InfoModal";
import InstallButton from "@/components/InstallButton";
import ChatWidget from "@/components/ChatWidget";
import ToastContainer from "@/components/Toast";
import { Report, MapBounds } from "@/lib/types";
import { KERALA_CENTER, REPORT_COOLDOWN_MS } from "@/lib/constants";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/lib/useToast";

function mapDbRowToReport(d: Record<string, unknown>): Report {
  return {
    id: d.id as string,
    latitude: d.latitude as number,
    longitude: d.longitude as number,
    description: (d.description as string) || "",
    created_at: d.created_at as string,
    expires_at: (d.expires_at as string) || new Date(Date.now() + 60 * 60000).toISOString(),
    confirmations: (d.confirmations as number) || 0,
    denials: (d.denials as number) || 0,
  };
}

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

// Simple device fingerprint for server-side vote dedup
function getVoterFingerprint(): string {
  if (typeof window === "undefined") return "server";
  const raw = `${navigator.userAgent}|${screen.width}x${screen.height}|${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
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
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, lastReportTime + REPORT_COOLDOWN_MS - Date.now());
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining, lastReportTime]);

  useEffect(() => {
    const fetchReports = async () => {
      setIsLoading(true);

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

      description: desc,
      latitude,
      longitude,
      expires_at: new Date(Date.now() + 60 * 60000).toISOString()
    });

    if (error) {
      console.error("Error inserting report:", error);
      showToast(`Failed to submit report: ${error.message || 'Check Supabase RLS policies'}`, "error");
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

    votedReports.add(reportId);
    saveVotedReport(reportId);

    // Try atomic RPC first (prevents race condition + server-side dedup)
    const { error: rpcError } = await supabase.rpc('vote_on_report', {
      p_report_id: reportId,
      p_vote_type: voteType,
      p_new_expires_at: voteType === 'confirm' ? newExpiresAt : null,
      p_voter_fingerprint: getVoterFingerprint()
    });

    let error = rpcError;

    // If RPC says already voted, show warning (server-side caught it)
    if (rpcError?.code === '23505') {
      showToast("You've already voted on this report.", "warning");
      votedReports.delete(reportId);
      saveVotedReport(reportId); // re-add since server rejected
      setReports(prev => prev.map(r => {
        if (r.id === reportId) return reportToUpdate;
        return r;
      }));
      return;
    }

    // If RPC function doesn't exist yet, fall back to direct update (not atomic)
    if (rpcError?.code === '42883') {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          confirmations: voteType === 'confirm' ? reportToUpdate.confirmations + 1 : reportToUpdate.confirmations,
          denials: voteType === 'deny' ? reportToUpdate.denials + 1 : reportToUpdate.denials,
          expires_at: newExpiresAt
        })
        .eq('id', reportId);
      error = updateError;
    }

    if (error) {
      console.error("Error updating vote:", error);
      showToast(`Vote failed: ${error.message || 'Check database permissions'}`, "error");

      votedReports.delete(reportId);
      const arr = Array.from(votedReports);
      localStorage.setItem("copspot_voted", JSON.stringify(arr));

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

  // Fetch reports filtered by map viewport bounds
  const fetchReportsInBounds = async (bounds: MapBounds) => {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching reports in bounds:", error);
    } else if (data) {
      setReports(data.map((d) => mapDbRowToReport(d as Record<string, unknown>)));
    }
  };

  const handleBoundsChange = useCallback((bounds: MapBounds) => {
    setMapBounds(bounds);
  }, []);

  // Debounced re-fetch when map viewport changes
  useEffect(() => {
    if (!mapBounds) return;
    if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
    boundsTimeoutRef.current = setTimeout(() => {
      fetchReportsInBounds(mapBounds);
    }, 500);
    return () => {
      if (boundsTimeoutRef.current) clearTimeout(boundsTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapBounds]);

  const activeReports = reports.filter(r => {
    const isExpired = new Date(r.expires_at).getTime() < Date.now();
    const isHighlyDenied = (r.denials - r.confirmations) >= 3;
    return !isExpired && !isHighlyDenied;
  });



  return (
    <main className="w-screen h-screen overflow-hidden bg-[var(--color-cs-base)]">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Full-screen Map */}
      <div className="w-full h-full relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--color-cs-text-muted)]">
            <div className="w-8 h-8 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm opacity-60">Loading map...</span>
          </div>
        ) : (
          <MapContainer reports={activeReports} centerOn={mapCenter} onVote={handleVote} onBoundsChange={handleBoundsChange} />
        )}
      </div>

      {/* Floating UI Overlay */}
      <div className="fixed inset-0 z-10 pointer-events-none">

        {/* Top Left: Install button */}
        <div className="absolute top-4 left-4 pointer-events-auto">
          <InstallButton />
        </div>

        {/* Top Right: Info button */}
        <div className="absolute top-4 right-4 pointer-events-auto">
          <button
            onClick={() => setIsInfoOpen(true)}
            aria-label="Guidelines"
            className="btn-fab"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
          </button>
        </div>

        {/* Bottom Left: Chat */}
        <div className="absolute bottom-18 left-[12%] pointer-events-auto">
          <ChatWidget showToast={showToast} />
        </div>

        {/* Bottom Center: Report button (large red) */}
        <div className="absolute bottom-15 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-fab-primary"
            aria-label="Report sighting"
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </button>
        </div>

        {/* Bottom Right: Locate me */}
        <div className="absolute bottom-18 right-[12%] pointer-events-auto">
          <button
            onClick={handleLocateUser}
            className="btn-fab"
            aria-label="Locate Me"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="2" /><path d="m22 12-3 0" /><path d="m5 12-3 0" /><path d="m12 22 0-3" /><path d="m12 5 0-3" /></svg>
          </button>
        </div>

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
