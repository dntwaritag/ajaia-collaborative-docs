export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 3h7l5 5v13H7z" /><path d="M10 13h6M10 17h6" /></svg>
      </div>
      <span className="text-lg font-semibold tracking-tight">Ajaia Docs</span>
    </div>
  );
}
