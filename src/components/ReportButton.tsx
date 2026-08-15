export default function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="absolute top-4.5 right-4.5 z-50">
      <button
        onClick={onClick}
        className="group relative bg-[#e0e5ec] text-black w-20 h-20 rounded-2xl border-4 border-[#14375b] shadow-[0_4px_0_0_#14375b] hover:bg-[#cfd6e0] transition-all active:translate-y-1 flex flex-col items-center justify-center pointer-events-auto gap-1"
      >
        <span className="text-[10px] font-bold tracking-widest text-[#14375b]" style={{ fontFamily: 'var(--font-pixel)' }}>REPORT</span>
        <div className="w-8 h-8 rounded-full bg-[#ff1744] border-2 border-black shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.3),0_2px_0_0_#000] group-active:shadow-none group-active:translate-y-0.5 transition-all"></div>
      </button>
    </div>
  );
}
