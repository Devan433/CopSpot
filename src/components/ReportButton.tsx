export default function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="absolute top-4 right-[-20px] z-20">
      <button
        onClick={onClick}
        className="group relative bg-white text-black w-16 h-16 rounded-xl border-4 border-black shadow-[0_4px_0_0_#000] hover:bg-gray-200 transition-all active:translate-y-1 flex flex-col items-center justify-center pointer-events-auto"
      >
        <span className="text-3xl leading-none font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>🚔</span>
      </button>
    </div>
  );
}
