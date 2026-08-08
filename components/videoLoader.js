import React from 'react';

// Blocking loading overlay. Kept as an OVERLAY on purpose: during in-session
// reloads (e.g. date-range changes) the page stays mounted underneath — table
// filters/pagination state survive — while interaction is blocked until fresh
// data lands. Restyled from the old full-screen video to a light spinner card
// (perceived-speed pass); first-paint gates use components/skeletons.js instead.
const VideoLoader = ({ loading = true, fullScreen = true }) => {
  if (!loading) return null;

  /* Two deliberate departures from the modal spec, because this is NOT a modal.
   *
   * 1. NOT var(--overlay). That token is the MODAL scrim — a black 45/60% dim,
   *    right for a dialog that must push the page back. This is a loading veil
   *    over content the user is still looking at, so it tints with the SURFACE:
   *    a light haze in light mode, a dark one in dark. Giving it the modal scrim
   *    (batch 4) is what made dark mode look murky.
   * 2. NO backdrop-blur. A modal blurs on purpose. Blurring content someone is
   *    actively reading is what "everything looks blurry" actually described —
   *    this loader appears on every date-range change and data reload, in BOTH
   *    modes, so the blur was visible constantly. The translucent veil alone
   *    already signals "busy" and still blocks interaction.
   *
   * Both reported by Zak, 2026-08-04. */
  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center z-command bg-[rgba(var(--surface-card-rgb),0.55)]"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses} role="status" aria-label="Loading">
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
};

export default VideoLoader;
