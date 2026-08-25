export default function InfoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      
      <div className="bg-black border border-white/20 w-full sm:max-w-md max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl">
        
        <div className="flex-1 overflow-y-auto">
          
          {/* Header */}
          <div className="flex justify-between items-center p-5 pb-4">
            <h2 className="text-white font-bold text-lg m-0">
              Community Guidelines
            </h2>
            <button
              onClick={onClose}
              aria-label="Close guidelines"
              className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center transition-colors text-lg rounded-full hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          <div className="px-5 pb-2 space-y-4 text-sm text-gray-300">
            <p>
              Welcome to CopSpot! To keep this network reliable and helpful for everyone, please adhere to the following guidelines:
            </p>

            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">1. Do Not Spam</h3>
              <p>Only report genuine sightings. Fake reports confuse the community and reduce the usefulness of the radar.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">2. Verify Reports</h3>
              <p>If you pass by a reported location, use the ✓ or ✕ buttons on the map to confirm or deny its accuracy.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">3. Drive Safely</h3>
              <p>Do not use your phone while driving. Have a passenger make reports, or pull over safely before using the app.</p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-1 text-sm">4. Cooperate</h3>
              <p>We are a community looking out for each other. Be respectful, accurate, and helpful.</p>
            </div>
          </div>

          <div className="p-5">
            <button
              onClick={onClose}
              className="w-full py-3.5 font-semibold text-sm transition-all flex items-center justify-center rounded-xl bg-white text-black hover:bg-gray-100 active:bg-gray-200 min-h-[44px]"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
