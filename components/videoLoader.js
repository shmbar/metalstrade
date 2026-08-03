import React from 'react';

// Blocking loading overlay. Kept as an OVERLAY on purpose: during in-session
// reloads (e.g. date-range changes) the page stays mounted underneath — table
// filters/pagination state survive — while interaction is blocked until fresh
// data lands. Restyled from the old full-screen video to a light spinner card
// (perceived-speed pass); first-paint gates use components/skeletons.js instead.
const VideoLoader = ({ loading = true, fullScreen = true }) => {
  if (!loading) return null;

  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center z-command bg-[var(--overlay)] backdrop-blur-[2px]"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses} role="status" aria-label="Loading">
      <div className="flex items-center gap-3 bg-[var(--surface-card)] rounded-full shadow-lg border border-[var(--selago)] px-5 py-3">
        <div
          className="w-5 h-5 rounded-full border-[3px] border-[var(--surface-header)] animate-spin"
          style={{ borderTopColor: 'var(--endeavour)' }}
        />
        <span className="responsiveTextInput font-medium" style={{ color: 'var(--chathams-blue)' }}>
          Loading…
        </span>
      </div>
    </div>
  );
};

export default VideoLoader;
