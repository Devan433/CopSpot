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
  const [isReporting, setIsReporting] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [lastReportTime, setLastReportTime] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [votedReports] = useState<Set<string>>(getVotedReports);
  const { toasts, showToast, dismissToast } = useToast();
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const boundsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const userLocationRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, lastReportTime + REPORT_COOLDOWN_MS - Date.now());
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining, lastReportTime]);

  // Auto-locate user on app load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          userLocationRef.current = userPos;
          setMapCenter(userPos);
        },
        () => {
          // Silent fallback — map stays at default Kerala center
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

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

  const handleReportSubmit = async (desc: string, location: { lat: number; lng: number } | null, turnstileToken?: string) => {
    const now = Date.now();
    if (now - lastReportTime < REPORT_COOLDOWN_MS) {
      showToast("Please wait before submitting another report.", "warning");
      return;
    }

    // Fallback chain: fresh GPS → actual map viewport center → last known GPS → KERALA_CENTER
    let latitude: number;
    let longitude: number;

    if (location) {
      latitude = location.lat;
      longitude = location.lng;
    } else {
      const viewportCenter: [number, number] | null = mapBounds
        ? [(mapBounds.north + mapBounds.south) / 2, (mapBounds.east + mapBounds.west) / 2]
        : null;
      const fallback = viewportCenter ?? userLocationRef.current ?? KERALA_CENTER;
      latitude = fallback[0];
      longitude = fallback[1];
    }

    setIsReporting(false);
    setMapCenter([latitude, longitude]);
    setLastReportTime(now);
    setCooldownRemaining(REPORT_COOLDOWN_MS);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, latitude, longitude, turnstileToken }),
      });

      if (res.status === 429) {
        const data = await res.json();
        showToast(data.error || "Too many reports. Please try again later.", "warning");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        showToast(`Failed to submit report: ${data.error}`, "error");
        return;
      }

      showToast("Report transmitted successfully!", "success");
    } catch (err) {
      console.error("Error submitting report:", err);
      showToast("Failed to submit report. Check your connection.", "error");
    }
  };

  const handleVote = useCallback(async (reportId: string, voteType: 'confirm' | 'deny') => {
    if (votedReports.has(reportId)) {
      showToast("You've already voted on this report.", "warning");
      return;
    }

    const reportToUpdate = reports.find(r => r.id === reportId);
    if (!reportToUpdate) return;

    // Calculate new expiry: +5 min for confirm, -5 min for deny
    const currentExpiry = new Date(reportToUpdate.expires_at).getTime();
    const maxExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hour cap
    let newExpiresAt: string;

    if (voteType === 'confirm') {
      const extendedExpiry = Math.max(Date.now(), currentExpiry) + 5 * 60 * 1000; // +5 min
      newExpiresAt = new Date(Math.min(extendedExpiry, maxExpiry)).toISOString();
    } else {
      const reducedExpiry = currentExpiry - 5 * 60 * 1000; // -5 min
      newExpiresAt = new Date(Math.max(reducedExpiry, Date.now())).toISOString(); // don't go below now
    }

    // Check if this denial would trigger auto-remove (3+ denials, 0 confirmations)
    const newDenials = voteType === 'deny' ? reportToUpdate.denials + 1 : reportToUpdate.denials;
    const newConfirmations = voteType === 'confirm' ? reportToUpdate.confirmations + 1 : reportToUpdate.confirmations;
    const shouldAutoRemove = newDenials >= 3 && newConfirmations === 0;

    // Optimistic update
    if (shouldAutoRemove) {
      setReports(prev => prev.filter(r => r.id !== reportId));
    } else {
      setReports(prev => prev.map(r => {
        if (r.id === reportId) {
          return {
            ...r,
            confirmations: newConfirmations,
            denials: newDenials,
            expires_at: newExpiresAt
          };
        }
        return r;
      }));
    }

    votedReports.add(reportId);
    saveVotedReport(reportId);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          voteType,
          newExpiresAt,
          voterFingerprint: getVoterFingerprint(),
        }),
      });

      if (res.status === 409) {
        showToast("You've already voted on this report.", "warning");
        votedReports.delete(reportId);
        setReports(prev => {
          if (shouldAutoRemove) return [...prev, reportToUpdate];
          return prev.map(r => r.id === reportId ? reportToUpdate : r);
        });
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        showToast(data.error || "Too many votes. Please slow down.", "warning");
        votedReports.delete(reportId);
        setReports(prev => {
          if (shouldAutoRemove) return [...prev, reportToUpdate];
          return prev.map(r => r.id === reportId ? reportToUpdate : r);
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || 'Vote failed');
      }

      if (shouldAutoRemove) {
        showToast("Report removed — marked as false by multiple users.", "success");
      }
    } catch (err) {
      console.error("Error updating vote:", err);
      showToast(`Vote failed: ${err instanceof Error ? err.message : 'Check your connection'}`, "error");

      votedReports.delete(reportId);
      const arr = Array.from(votedReports);
      localStorage.setItem("copspot_voted", JSON.stringify(arr));

      setReports(prev => {
        if (shouldAutoRemove) return [...prev, reportToUpdate];
        return prev.map(r => r.id === reportId ? reportToUpdate : r);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, votedReports]);

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          userLocationRef.current = userPos;
          setMapCenter(userPos);
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

        {/* Center Target Pin — only visible when reporting */}
        {isReporting && (
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-[38px] pointer-events-none drop-shadow-xl z-20">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="#EF4444" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" fill="black" />
            </svg>
          </div>
        )}

        {!isReporting && (
          <>
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
                onClick={() => setIsReporting(true)}
                className="btn-fab-primary"
                aria-label="Report sighting"
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
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
          </>
        )}

      </div>

      {/* Inline Report Bottom Sheet */}
      {isReporting && (
        <ReportModal
          onClose={() => setIsReporting(false)}
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
