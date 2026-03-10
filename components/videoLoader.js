import React, { useState } from 'react';

const VideoLoader = ({ loading = true, fullScreen = true }) => {
  const [videoError, setVideoError] = useState(false);

  if (!loading) return null;

  const containerClasses = fullScreen
    ? "fixed inset-0 flex items-center justify-center z-50 bg-white"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      {!videoError ? (
        <div className="flex flex-col items-center justify-center">
          <video
            className="w-32 h-32 md:w-48 md:h-48 rounded-2xl object-cover"
            autoPlay
            loop
            muted
            playsInline
            onError={() => setVideoError(true)}
          >
            <source src="/logo/loader.mp4" type="video/mp4" />
          </video>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      ) : (
        // Fallback spinner
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-t-8 border-slate-500 border-solid rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default VideoLoader;
