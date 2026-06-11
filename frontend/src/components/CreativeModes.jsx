import { useState } from 'react';

const creativeTemplates = [
  {
    id: 'cyberpunk',
    icon: '🔮',
    title: 'Cyberpunk Neo',
    description: 'Vibrant neon color fields, futuristic cityscape vistas, high tech.',
    prompt: 'A sleek spinner vehicle hovering through neon-drenched Tokyo skyscrapers, deep purple atmospheric smoke, cyberpunk aesthetic.',
    image: '/images/cyberpunk_template.png',
    accent: '#8b5cf6',
    aspect: '2.39-1',
    camera: 'pan'
  },
  {
    id: 'noir',
    icon: '🕶',
    title: 'Cinematic Noir',
    description: 'Shadow play, high contrast monochrome, mystery narratives.',
    prompt: 'A detective walking down a dark alley under a glowing streetlamp in heavy rain, high-contrast film noir aesthetic.',
    image: '/images/noir_template.png',
    accent: '#a1a1aa',
    aspect: '2.39-1',
    camera: 'static'
  },
  {
    id: 'space',
    icon: '☄️',
    title: 'Space Odyssey',
    description: 'Interstellar expanses, high concept sci-fi, cosmic backdrops.',
    prompt: 'An explorer in an advanced space suit looks at a giant glowing orange nebula, cosmic flares, epic sci-fi.',
    image: '/images/space_template.png',
    accent: '#ec4899',
    aspect: '2.39-1',
    camera: 'crane'
  },
  {
    id: 'documentary',
    icon: '🎥',
    title: 'Documentary Realism',
    description: 'Handheld realism, naturalistic lighting, human textures.',
    prompt: 'A weathered fisherman working on his boat deck in early morning mist, natural key lighting, realistic documentary.',
    image: '/images/documentary_template.png',
    accent: '#f59e0b',
    aspect: '16-9',
    camera: 'zoom'
  },
];

export default function CreativeModes({ onSelectTemplate }) {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Creative Presets
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {creativeTemplates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => onSelectTemplate?.(tmpl)}
            className="film-strip-card group text-left flex flex-col h-72 w-full select-none"
          >
            {/* Template Visual */}
            <div className="relative h-44 w-full overflow-hidden bg-surface-900 image-overlay-container shrink-0">
              <img
                src={tmpl.image}
                alt={tmpl.title}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />
              <div 
                className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-xl text-md transition-all bg-surface-950/80 border border-white/10 group-hover:border-accent/40 shadow-lg"
              >
                {tmpl.icon}
              </div>
            </div>

            {/* Template Details */}
            <div className="p-4 flex-1 flex flex-col justify-center bg-gradient-to-b from-surface-950/10 to-surface-950/40 relative z-10">
              <h4 className="text-sm font-semibold tracking-wide text-white group-hover:text-accent transition-colors">
                {tmpl.title}
              </h4>
              <p className="mt-1 text-[11px] leading-normal text-surface-400 line-clamp-2">
                {tmpl.description}
              </p>
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider text-surface-500 font-medium">
                  Click to Load
                </span>
                <div 
                  className="h-1.5 w-1.5 rounded-full" 
                  style={{ backgroundColor: tmpl.accent, boxShadow: `0 0 8px ${tmpl.accent}` }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
