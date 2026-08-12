export default function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="bg-[var(--color-rp-bg)] pixel-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg text-[var(--color-rp-accent)]" style={{ fontFamily: 'var(--font-pixel)' }}>
            COMMUNITY GUIDELINES
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">X</button>
        </div>

        <div className="space-y-4 text-sm text-gray-300">
          <p>
            Welcome to CopSpot! To keep this network reliable and helpful for everyone, please adhere to the following guidelines:
          </p>

          <div>
            <h3 className="text-[var(--color-rp-border)] font-bold uppercase mb-1">1. Do Not Spam</h3>
            <p>Only report genuine sightings. Fake reports confuse the community and reduce the usefulness of the radar.</p>
          </div>

          <div>
            <h3 className="text-[var(--color-rp-border)] font-bold uppercase mb-1">2. Verify Reports</h3>
            <p>If you pass by a reported location, use the + or - buttons on the map to confirm or deny its accuracy.</p>
          </div>

          <div>
            <h3 className="text-[var(--color-rp-border)] font-bold uppercase mb-1">3. Drive Safely</h3>
            <p>Do not use your phone while driving. Have a passenger make reports, or pull over safely before using the app.</p>
          </div>
          
          <div>
            <h3 className="text-[var(--color-rp-border)] font-bold uppercase mb-1">4. Cooperate</h3>
            <p>We are a community looking out for each other. Be respectful, accurate, and helpful.</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 mt-6 pixel-border bg-[var(--color-rp-accent)] text-black font-bold text-lg hover:bg-white transition-colors"
          style={{ fontFamily: 'var(--font-pixel)' }}
        >
          ACKNOWLEDGE
        </button>
      </div>
    </div>
  );
}
