"use client";

export default function OfflinePage() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-[var(--color-cs-base)] text-[var(--color-cs-text)] p-8 text-center">
      <div className="text-[var(--color-cs-orange)] mb-6">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"/>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
          <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
          <line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
      </div>
      <h1 className="text-xl font-mono font-bold tracking-widest uppercase text-[var(--color-cs-orange)] mb-4">
        Connection Lost
      </h1>
      <p className="text-[var(--color-cs-text-muted)] mb-8 max-w-md">
        CopSpot requires an internet connection for real-time reports. Check your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="btn-primary px-8 py-4 font-bold tracking-widest uppercase"
      >
        Retry Connection
      </button>
    </div>
  );
}
