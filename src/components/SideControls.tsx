export default function SideControls() {
  return (
    <div className="absolute top-4.5 left-3.5 z-20 flex flex-col gap-8">



      {/* Filter Buttons */}
      <div className="flex flex-col gap-2 font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
        <button className="bg-[#6a9a7a] text-black w-14 h-14 rounded-xl border-4 border-black shadow-[0_4px_0_0_#000] hover:bg-[#81bca6] transition-all active:translate-y-1 flex items-center justify-center pointer-events-auto ml-1">
        </button>
        <button className="bg-[#d3514a] text-black w-14 h-14 rounded-xl border-4 border-black shadow-[0_4px_0_0_#000] hover:bg-[#e76760] transition-all active:translate-y-1 flex items-center justify-center pointer-events-auto ml-1">
        </button>
      </div>

    </div>
  );
}
