export default function Header() {
  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="bg-[var(--color-rp-bg)] border-[6px] border-[var(--color-rp-bezel-border)] rounded-full px-6 py-2 flex items-center gap-4 shadow-[0_4px_0_0_#000] pointer-events-auto">
        <h1 className="text-xl md:text-2xl text-[var(--color-rp-border)] tracking-widest drop-shadow-[0_0_5px_var(--color-rp-border)]" style={{ fontFamily: 'var(--font-pixel)' }}>
          COP
        </h1>
        <div className="relative w-12 h-12 rounded-full border-4 border-white bg-[#032145] flex items-center justify-center -my-6 shadow-lg z-10 text-white font-bold" style={{ fontFamily: 'var(--font-pixel)' }}>
          <span className="text-2xl">🚔</span>
        </div>
        <h1 className="text-xl md:text-2xl text-[var(--color-rp-border)] tracking-widest drop-shadow-[0_0_5px_var(--color-rp-border)]" style={{ fontFamily: 'var(--font-pixel)' }}>
          SPOT
        </h1>
      </div>
    </div>
  );
}
