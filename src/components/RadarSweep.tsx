export default function RadarSweep({ onClick }: { onClick?: () => void }) {
  return (
    <div onClick={onClick} className="absolute bottom-16 right-8 z-10 w-28 h-28 rounded-full border-2 border-[#14375b] bg-transparent flex items-center justify-center overflow-hidden pointer-events-auto cursor-pointer hidden md:flex hover:scale-105 transition-transform">
      
      {/* Radar Grid Lines */}
      <div className="absolute inset-0 rounded-full border border-white/20"></div>
      <div className="absolute inset-4 rounded-full border border-white/20"></div>
      <div className="absolute inset-8 rounded-full border border-white/20"></div>
      
      <div className="absolute w-full h-[1px] bg-white/20"></div>
      <div className="absolute h-full w-[1px] bg-white/20"></div>
      <div className="absolute w-full h-[1px] bg-white/20 rotate-45"></div>
      <div className="absolute w-full h-[1px] bg-white/20 -rotate-45"></div>

      {/* Radar Sweep Animation */}
      <div className="absolute w-1/2 h-1/2 bg-gradient-to-r from-transparent to-[#00bcd4] opacity-50 origin-bottom-right animate-[radar-sweep_4s_linear_infinite]" style={{ bottom: '50%', right: '50%' }}></div>
      
      {/* Center Dot */}
      <div className="absolute w-2 h-2 bg-[#ff1744] rounded-full shadow-[0_0_8px_#ff1744]"></div>
    </div>
  );
}
