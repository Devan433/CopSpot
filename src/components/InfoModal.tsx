export default function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      
      {/* Structural Modal Frame */}
      <div className="bg-[var(--color-cs-base)] border border-[var(--color-cs-border-light)] shadow-[inset_0_0_0_4px_var(--color-cs-frame)] p-1 w-full max-w-md max-h-[90vh] flex flex-col relative">
        
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--color-cs-cyan)] z-10" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--color-cs-cyan)] z-10" />

        <div className="bg-[var(--color-cs-panel)] border border-[var(--color-cs-border)] flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center bg-[var(--color-cs-frame)] border-b border-[var(--color-cs-border)] p-4">
            <h2 className="text-[var(--color-cs-text)] font-bold text-sm tracking-widest flex items-center gap-2 m-0 uppercase">
              <span className="text-[var(--color-cs-cyan)] flex items-center justify-center border border-[var(--color-cs-cyan)] w-6 h-6 bg-[rgba(6,182,212,0.1)] text-xs">
                i
              </span>
              Community Guidelines
            </h2>
            <button
              onClick={onClose}
              aria-label="Close guidelines"
              className="text-[var(--color-cs-text-muted)] hover:text-white bg-[var(--color-cs-base)] hover:bg-[var(--color-cs-border)] border border-[var(--color-cs-border)] w-6 h-6 flex items-center justify-center transition-colors text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4 text-sm text-[var(--color-cs-text-muted)]">
            <p>
              Welcome to CopSpot! To keep this network reliable and helpful for everyone, please adhere to the following guidelines:
            </p>

            <div>
              <h3 className="text-[var(--color-cs-cyan)] font-bold uppercase mb-1 text-xs tracking-wider">1. Do Not Spam</h3>
              <p>Only report genuine sightings. Fake reports confuse the community and reduce the usefulness of the radar.</p>
            </div>

            <div>
              <h3 className="text-[var(--color-cs-cyan)] font-bold uppercase mb-1 text-xs tracking-wider">2. Verify Reports</h3>
              <p>If you pass by a reported location, use the ✓ or ✕ buttons on the map to confirm or deny its accuracy.</p>
            </div>

            <div>
              <h3 className="text-[var(--color-cs-cyan)] font-bold uppercase mb-1 text-xs tracking-wider">3. Drive Safely</h3>
              <p>Do not use your phone while driving. Have a passenger make reports, or pull over safely before using the app.</p>
            </div>
            
            <div>
              <h3 className="text-[var(--color-cs-cyan)] font-bold uppercase mb-1 text-xs tracking-wider">4. Cooperate</h3>
              <p>We are a community looking out for each other. Be respectful, accurate, and helpful.</p>
            </div>
          </div>

          <div className="p-6 pt-0">
            <button
              onClick={onClose}
              className="w-full py-4 font-bold text-sm tracking-widest transition-all uppercase flex items-center justify-center border bg-[var(--color-cs-cyan)] text-[var(--color-cs-base)] border-[var(--color-cs-cyan)] hover:bg-[#0891b2] active:bg-[#0e7490] min-h-[44px]"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
