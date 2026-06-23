import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { creativeTemplates } from '../data/presets';

function VideoThumbnail({ src, isHovered }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isHovered) {
      video.play().catch((err) => {
        // Handle interruptions silently (e.g. user hover transitions quickly)
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      className="h-full w-full object-cover filter contrast-[1.05]"
    />
  );
}

export default function CreativeModes({ onSelectTemplate }) {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [zCard, setZCard] = useState(null);

  const handleMouseEnter = (id) => {
    setHoveredCard(id);
    setZCard(id);
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
    // Keep z elevated briefly so the shrink animation doesn't clip under siblings
    setTimeout(() => setZCard(null), 350);
  };

  const handleSelectTemplate = (tmpl) => {
    // Pick a random prompt from the pool each time
    const randomPrompt = tmpl.prompts[Math.floor(Math.random() * tmpl.prompts.length)];
    if (onSelectTemplate) {
      onSelectTemplate({
        ...tmpl,
        prompt: randomPrompt
      });
    }
  };
  const { isDayMode } = useTheme();

  return (
    <section className="space-y-4 select-none creative-presets-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Creative Presets
          </h3>
          <div className="h-px w-24 bg-surface-700" />
        </div>
        <button className="text-[10px] font-bold text-surface-500 hover:text-accent transition-colors flex items-center gap-1.5">
          <span>View all presets</span>
          <span>→</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" style={{ overflow: 'visible' }}>
        {creativeTemplates.map((tmpl, idx) => {
          const isHov = hoveredCard === tmpl.id;
          return (
          <button
            key={tmpl.id}
            onClick={() => handleSelectTemplate(tmpl)}
            onMouseEnter={() => handleMouseEnter(tmpl.id)}
            onMouseLeave={handleMouseLeave}
            style={{
              zIndex: hoveredCard === tmpl.id ? 30 : (zCard === tmpl.id ? 10 : 1),
              transform: isHov ? 'scale(1.08) translateY(-4px)' : 'scale(1.0) translateY(0px)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease, box-shadow 0.3s ease',
              willChange: 'transform',
            }}
            className="group text-left flex flex-col h-[205px] w-full border border-white/10 relative rounded-lg bg-[#111111] hover:border-accent/60 shadow-[0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.6)]"
          >
            {/* Glossy top-shine reflection (removed gradient shine for flat style) */}
            <div className="absolute inset-0 bg-white/[0.01] pointer-events-none z-20" />

            {/* Template Visual Header */}
            <div className="relative h-[125px] w-full overflow-hidden bg-black shrink-0 rounded-t-lg">
              {tmpl.video ? (
                <VideoThumbnail src={tmpl.video} isHovered={hoveredCard === tmpl.id} />
              ) : (
                <img
                  src={tmpl.image}
                  alt={tmpl.title}
                  className="h-full w-full object-cover filter contrast-[1.05]"
                />
              )}
              {/* Category Icon */}
              <div 
                className={`absolute left-2.5 top-2.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-colors ${
                  isDayMode
                    ? 'border-black/5 bg-white/95 text-black'
                    : 'border-white/10 bg-[#0B0B0B]/90 text-white'
                } group-hover:border-accent/40`}
              >
                <tmpl.icon size={12} style={{ color: tmpl.accent }} />
              </div>
            </div>

            {/* Template Details */}
            <div className="p-3 flex-1 flex flex-col justify-center relative z-10 min-w-0">
              <h4 className="text-[11.5px] font-bold tracking-wide transition-colors leading-tight truncate text-white group-hover:text-accent">
                {tmpl.title}
              </h4>
              <p className="mt-0.5 text-[9.5px] leading-normal font-medium truncate text-[#D1D5DB]">
                {tmpl.description}
              </p>
            </div>

            {/* Popout Filmmaking Info Panel */}
            {isHov && tmpl.specs && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-0 h-full w-full bg-[#141414] border border-accent/40 rounded-lg p-3 z-50 text-left select-text pointer-events-auto flex flex-col justify-between shadow-[0_20px_35px_rgba(0,0,0,0.8)] ${
                  idx <= 2 ? 'left-full ml-3 animate-popout-right' : 'right-full mr-3 animate-popout-left'
                }`}
              >
                <div>
                  <span className="text-[7.5px] font-black uppercase tracking-[0.2em] text-accent block mb-1.5 border-b border-white/5 pb-1">
                    Filmmaking Profile
                  </span>
                  
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[6.5px] font-extrabold uppercase text-surface-550 tracking-wider block leading-none">Lens Config</span>
                      <span className="text-[9px] font-bold text-white block mt-0.5 leading-snug">{tmpl.specs.lenses}</span>
                    </div>
                    <div>
                      <span className="text-[6.5px] font-extrabold uppercase text-surface-550 tracking-wider block leading-none">Lighting Scheme</span>
                      <span className="text-[9px] font-bold text-white block mt-0.5 leading-snug">{tmpl.specs.lighting}</span>
                    </div>
                    <div>
                      <span className="text-[6.5px] font-extrabold uppercase text-surface-550 tracking-wider block leading-none">Color Profile</span>
                      <span className="text-[9px] font-bold text-white block mt-0.5 leading-snug">{tmpl.specs.colorGrade}</span>
                    </div>
                    <div>
                      <span className="text-[6.5px] font-extrabold uppercase text-surface-550 tracking-wider block leading-none">Choreography</span>
                      <span className="text-[9px] font-bold text-white block mt-0.5 leading-snug">{tmpl.specs.movement}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[7.5px] font-bold uppercase tracking-wider text-surface-400 font-mono leading-none">
                  <span>{tmpl.productionType}</span>
                  <span className="text-accent">{tmpl.duration}</span>
                </div>
              </div>
            )}
          </button>
          );
        })}
      </div>
    </section>
  );
}
