import React, { useRef, useState, useEffect } from 'react';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize } from 'react-icons/fi';

export default function CustomVideoPlayer({ src, poster, className }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  // Handle play/pause events from video element
  const handlePlayState = () => setIsPlaying(true);
  const handlePauseState = () => setIsPlaying(false);

  // Update progress
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  // Set duration when metadata loads
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  // Scrubber (seeking)
  const handleScrub = (e) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  // Volume slider
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error("Fullscreen request failed:", err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen state if changed externally (e.g. Escape key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Format time (mm:ss)
  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show/Hide controls overlay based on mouse movement
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`relative group bg-neutral-950 overflow-hidden flex flex-col justify-center select-none ${className}`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        onClick={togglePlay}
        onPlay={handlePlayState}
        onPause={handlePauseState}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        className="w-full h-full object-cover cursor-pointer"
        playsInline
      />

      {/* Large Center Play Overlay (visible on hover when paused) */}
      <div 
        onClick={togglePlay}
        className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300 cursor-pointer ${
          !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover:opacity-100'
        }`}
      >
        {!isPlaying && (
          <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white scale-90 hover:scale-100 transition-transform duration-300">
            <FiPlay size={24} className="ml-1 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Custom Controls Panel */}
      <div 
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 flex flex-col gap-2.5 transition-all duration-300 z-30 ${
          showControls ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber / Progress Bar */}
        <div 
          onClick={handleScrub}
          className="h-1.5 w-full bg-white/10 hover:bg-white/20 rounded-full cursor-pointer relative transition-all duration-200 group/scrub"
        >
          {/* Progress fill */}
          <div 
            className="h-full bg-accent rounded-full relative"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          >
            {/* Scrubber Handle */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border border-accent scale-0 group-hover/scrub:scale-100 transition-transform duration-150" />
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between text-white font-mono text-xs">
          <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button 
              onClick={togglePlay} 
              className="text-white hover:text-accent transition-colors p-1 flex items-center justify-center cursor-pointer"
            >
              {isPlaying ? <FiPause size={15} /> : <FiPlay size={15} className="fill-white hover:fill-accent" />}
            </button>

            {/* Time Counter */}
            <div className="text-[10px] text-surface-450 select-none">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1 text-surface-600">/</span>
              <span>{formatTime(duration)}</span>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button 
                onClick={toggleMute} 
                className="text-white hover:text-accent transition-colors p-1 flex items-center justify-center cursor-pointer"
              >
                {isMuted ? <FiVolumeX size={15} /> : <FiVolume2 size={15} />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-14 h-1 accent-white bg-white/20 rounded-lg appearance-none cursor-pointer group-hover/volume:w-20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Fullscreen Button */}
            <button 
              onClick={toggleFullscreen} 
              className="text-white hover:text-accent transition-colors p-1 flex items-center justify-center cursor-pointer"
            >
              {isFullscreen ? <FiMinimize size={15} /> : <FiMaximize size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
