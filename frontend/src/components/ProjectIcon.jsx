import React from 'react';

/**
 * ProjectIcon
 * 
 * Renders the premium vector SVG project formats directly (without the surrounding square card background/border and glow).
 * It retains custom 3-stop gradients, multi-layered opacities, and a subtle hover scaling animation.
 */
export default function ProjectIcon({ type, size = 'sm', dayMode = false, active = false, className = '' }) {
  const t = (type || '').toLowerCase();
  
  // Setup 3-stop gradients for each icon
  let gradientId = 'filmGrad';
  let stop1 = '#8a2387';
  let stop2 = '#e94057';
  let stop3 = '#f27121';
  let svgContent = null;
  
  if (t.includes('podcast')) {
    gradientId = 'podcastGrad';
    stop1 = '#4361ee';
    stop2 = '#7209b7';
    stop3 = '#f72585';
    svgContent = (
      <>
        {/* Shockmount outer ring */}
        <circle cx="12" cy="9" r="6.5" stroke={`url(#${gradientId})`} strokeWidth="1.5" fill="none" opacity="0.75" />
        {/* Shockmount spider bands (diagonal crossings) */}
        <line x1="7.4" y1="4.4" x2="16.6" y2="13.6" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.5" />
        <line x1="16.6" y1="4.4" x2="7.4" y2="13.6" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.5" />
        {/* Microphone capsule body */}
        <rect x="9.5" y="4.5" width="5" height="9" rx="2.5" fill={`url(#${gradientId})`} fillOpacity="0.25" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Grille mesh line */}
        <line x1="9.5" y1="8" x2="14.5" y2="8" stroke={`url(#${gradientId})`} strokeWidth="1.2" />
        {/* Studio stand boom arm / desk mount */}
        <path d="M12 15.5v2.5l-3.5 2" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />
        {/* Soundwaves pulsing */}
        <path d="M20 7a6 6 0 0 1 0 4" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" className="animate-pulse" />
        <path d="M4 7a6 6 0 0 0 0 4" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.85" className="animate-pulse" />
      </>
    );
  } else if (t.includes('documentary') || t.includes('series') || t.includes('episode') || t.includes('tv')) {
    gradientId = 'cameraGrad';
    stop1 = '#00f2fe';
    stop2 = '#4facfe';
    stop3 = '#6a11cb';
    svgContent = (
      <>
        {/* Top film reel */}
        <circle cx="8.5" cy="6.5" r="4" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
        <circle cx="8.5" cy="6.5" r="1.2" fill={`url(#${gradientId})`} />
        <line x1="8.5" y1="4.5" x2="8.5" y2="8.5" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.6" />
        
        {/* Lower film reel */}
        <circle cx="15.5" cy="6.5" r="4" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
        <circle cx="15.5" cy="6.5" r="1.2" fill={`url(#${gradientId})`} />
        <line x1="15.5" y1="4.5" x2="15.5" y2="8.5" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.6" />

        {/* Camera base casing */}
        <rect x="4.5" y="11" width="14" height="8.5" rx="2" fill={`url(#${gradientId})`} fillOpacity="0.25" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Lens cone */}
        <path d="M18.5 13l4-3v7.5l-4-3" fill={`url(#${gradientId})`} stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinejoin="round" />
        {/* Lens highlight */}
        <line x1="20.5" y1="12.5" x2="20.5" y2="15" stroke="#fff" strokeWidth="0.8" opacity="0.6" />
        {/* Camera side controls */}
        <rect x="7.5" y="13.5" width="3" height="2.2" rx="0.5" fill={`url(#${gradientId})`} opacity="0.8" />
        <circle cx="14" cy="15" r="1" fill={`url(#${gradientId})`} opacity="0.8" />
      </>
    );
  } else if (t.includes('drama') || t.includes('theatre')) {
    gradientId = 'dramaGrad';
    stop1 = '#f9d423';
    stop2 = '#ff4e50';
    stop3 = '#e11d48';
    svgContent = (
      <>
        {/* Tragedy Mask (Left, shifted back) */}
        <path d="M4 14.2c0-3.2 2.2-5.2 5.2-5.2s5.2 2 5.2 5.2-2.2 5.8-5.2 5.8S4 17.4 4 14.2z" fill={`url(#${gradientId})`} fillOpacity="0.1" stroke={`url(#${gradientId})`} strokeWidth="1.2" opacity="0.75" />
        <path d="M6.2 12.8a0.8 0.8 0 0 1 0.8-0.8" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.9" />
        <path d="M10.2 12.8a0.8 0.8 0 0 0-0.8-0.8" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.9" />
        <path d="M7 16.5c0.5-0.4 1.5-0.4 2 0" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" />

        {/* Comedy Mask (Right, shifted forward) */}
        <path d="M9.8 9.5c0-3.2 2.6-5.2 5.8-5.2s5.8 2 5.8 5.2-2.6 5.8-5.8 5.8-5.8-2.6-5.8-5.8z" fill={`url(#${gradientId})`} fillOpacity="0.25" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Star happy eyes */}
        <polygon points="12.5,8.2 13,8.7 12.5,9.2 12,8.7" fill={`url(#${gradientId})`} />
        <polygon points="16.5,8.2 17,8.7 16.5,9.2 16,8.7" fill={`url(#${gradientId})`} />
        {/* Happy smile */}
        <path d="M13.5 11.5c0.6 0.8 1.8 0.8 2.4 0" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Creativity sparkles in background */}
        <path d="M8 3.5l0.6 0.6 0.6-0.6-0.6-0.6z" fill={`url(#${gradientId})`} opacity="0.9" />
        <path d="M21 14.5l0.4 0.4 0.4-0.4-0.4-0.4z" fill={`url(#${gradientId})`} opacity="0.6" />
      </>
    );
  } else if (t.includes('audio') || t.includes('sound')) {
    gradientId = 'audioGrad';
    stop1 = '#ff007f';
    stop2 = '#7f00ff';
    stop3 = '#4facfe';
    svgContent = (
      <>
        {/* Vinyl outer disc */}
        <circle cx="12" cy="12" r="9.2" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Grooves */}
        <circle cx="12" cy="12" r="6.8" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.5" />
        <circle cx="12" cy="12" r="4.8" stroke={`url(#${gradientId})`} strokeWidth="0.8" opacity="0.3" />
        {/* Core label */}
        <circle cx="12" cy="12" r="2.8" fill={`url(#${gradientId})`} />
        <circle cx="12" cy="12" r="0.8" fill="#fff" opacity="0.95" />
        {/* Tone-arm needle */}
        <path d="M18.8 5.2l-3.8 3.8v2" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="18.8" cy="5.2" r="1.2" fill={`url(#${gradientId})`} />
      </>
    );
  } else if (t.includes('commercial') || t.includes('ad')) {
    gradientId = 'adGrad';
    stop1 = '#10b981';
    stop2 = '#059669';
    stop3 = '#00f2fe';
    svgContent = (
      <>
        {/* Megaphone body */}
        <path d="M2.5 10h4.2l5.8-5.2v14.4l-5.8-5.2H2.5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Handle */}
        <path d="M5.5 14v3.5a1.2 1.2 0 0 0 2.4 0V14" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" />
        {/* sound broadcasting waves */}
        <path d="M15.5 8.2a4 4 0 0 1 0 7.6" stroke={`url(#${gradientId})`} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
        <path d="M18.5 5.8a7.5 7.5 0 0 1 0 12.4" stroke={`url(#${gradientId})`} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M21.5 3.5a11 11 0 0 1 0 17" stroke={`url(#${gradientId})`} strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      </>
    );
  } else {
    // Default high-end Clapperboard (Film/Script)
    gradientId = 'filmGrad';
    stop1 = '#ff0844';
    stop2 = '#e94057';
    stop3 = '#ffb199';
    svgContent = (
      <>
        {/* Main board box */}
        <rect x="2.5" y="10.5" width="19" height="11" rx="2" fill={`url(#${gradientId})`} fillOpacity="0.2" stroke={`url(#${gradientId})`} strokeWidth="1.8" />
        {/* Chalk lines */}
        <line x1="6.5" y1="14.5" x2="17.5" y2="14.5" stroke={`url(#${gradientId})`} strokeWidth="1" opacity="0.55" />
        <line x1="6.5" y1="17.5" x2="13.5" y2="17.5" stroke={`url(#${gradientId})`} strokeWidth="1" opacity="0.55" />
        
        {/* Tilted top clapper bar */}
        <g transform="rotate(-14, 2.5, 9.5)">
          <rect x="2.5" y="6.2" width="19" height="3.5" rx="1" fill={`url(#${gradientId})`} stroke={`url(#${gradientId})`} strokeWidth="1.5" />
          {/* stripes */}
          <line x1="5.5" y1="6.2" x2="7.5" y2="9.7" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
          <line x1="9.5" y1="6.2" x2="11.5" y2="9.7" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
          <line x1="13.5" y1="6.2" x2="15.5" y2="9.7" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
          <line x1="17.5" y1="6.2" x2="19.5" y2="9.7" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
        </g>
      </>
    );
  }

  // Size mapping (in pixels)
  let iconSize = 16;
  if (size === 'lg') {
    iconSize = 24;
  } else if (size === 'md') {
    iconSize = 20;
  } else if (size === 'xl') {
    iconSize = 32;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={iconSize}
      height={iconSize}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 ${className}`}
    >
      <defs>
        {/* Gradient setup */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={stop1} />
          <stop offset="50%" stopColor={stop2} />
          <stop offset="100%" stopColor={stop3} />
        </linearGradient>
      </defs>
      {svgContent}
    </svg>
  );
}
