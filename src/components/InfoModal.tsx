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

            {/* Legal Disclaimer */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <h3 className="text-yellow-400 font-bold mb-2 text-sm">⚠️ Legal Disclaimer</h3>
              
              <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
                <p>
                  <strong className="text-gray-300">Purpose:</strong> CopSpot is designed solely for community awareness, traffic safety, and responsible driving. This app is intended to help users stay alert, follow traffic rules, and drive safely.
                </p>

                <p>
                  <strong className="text-gray-300">Prohibited Use:</strong> Do not use this app to evade law enforcement, avoid legal checkpoints (including DUI/sobriety checkpoints), or engage in any illegal activities. Any such use is strictly against our terms and is the sole responsibility of the user.
                </p>

                <p>
                  <strong className="text-gray-300">Compliance with Authorities:</strong> CopSpot fully respects and supports law enforcement efforts to maintain public safety. If any law enforcement agency or government authority requests the removal or modification of this service, we will comply promptly and fully.
                </p>

                <p>
                  <strong className="text-gray-300">No Guarantee of Accuracy:</strong> All reports are user-generated and unverified. CopSpot makes no guarantees about the accuracy, timeliness, or reliability of any information displayed. Do not rely on this app for making any safety-critical decisions.
                </p>

                <p>
                  <strong className="text-gray-300">User Responsibility:</strong> By using CopSpot, you agree that you are solely responsible for your actions. You must comply with all applicable local, state, and national laws at all times. Obey all traffic laws regardless of information shown in this app.
                </p>

                <p>
                  <strong className="text-gray-300">Limitation of Liability:</strong> CopSpot and its developers are not liable for any damages, legal consequences, fines, or injuries arising from the use or misuse of this application. This app is provided &quot;as is&quot; without warranties of any kind.
                </p>

                <p className="text-gray-500 italic">
                  By continuing to use CopSpot, you acknowledge that you have read, understood, and agreed to these terms.
                </p>

                <p>
                  <strong className="text-gray-300">Contact:</strong> For legal inquiries, takedown requests, or feedback, please{' '}
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSekIlvzF8rCGDWdIxguSMNAXDdSovlPumKur9qGoEyvKs0q0A/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    contact us here
                  </a>.
                </p>
              </div>
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
