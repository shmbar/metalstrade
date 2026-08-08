// Same light "Loading…" pill as the loading overlay (videoLoader.js) — one loader
// look everywhere. Outer positioning kept identical to the old PropagateLoader
// wrapper (absolute, full-width, h-screen, centered) so its render sites
// (auth guard in layout.js, Assistant gate, modal loading states) are unaffected.
const Spinner = () => {
    return (
        <div className="absolute z-50 justify-center flex w-full items-center place-content-center h-screen" role="status" aria-label="Loading">
            <div className="flex items-center gap-3 bg-[var(--bg-card)] rounded-full border border-[var(--line)] px-5 py-3" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <div
                    className="w-5 h-5 rounded-full border-[3px] border-[var(--brand-soft)] animate-spin"
                    style={{ borderTopColor: 'var(--brand)' }}
                />
                <span className="responsiveTextInput font-medium" style={{ color: 'var(--ink-secondary)' }}>
                    Loading…
                </span>
            </div>
        </div>
    );
}

export default Spinner
