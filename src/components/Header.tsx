export default function Header() {
  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="bg-[var(--color-rp-bg)] border-[6px] border-[var(--color-rp-bezel-border)] rounded-full px-6 py-2 flex items-center shadow-[0_4px_0_0_#000] pointer-events-auto">
        <h1 className="text-xl md:text-2xl text-[var(--color-rp-border)] tracking-widest drop-shadow-[0_0_5px_var(--color-rp-border)]" style={{ fontFamily: 'var(--font-pixel)' }}>
          COPSPOT
        </h1>
      </div>
    </div>
  );
}
