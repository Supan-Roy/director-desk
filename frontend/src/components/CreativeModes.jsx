import { useState } from 'react';
import { FiUsers, FiLayers, FiCpu, FiMoon, FiGlobe, FiCamera, FiWind } from 'react-icons/fi';

const creativeTemplates = [
  {
    id: 'cyberpunk',
    icon: FiCpu,
    title: 'Cyberpunk Neo',
    productionType: 'Full CGI Sci-Fi',
    description: 'Vibrant neon color fields, futuristic cityscapes.',
    prompt: 'A sleek spinner vehicle hovering through neon-drenched Tokyo skyscrapers, deep purple atmospheric smoke, cyberpunk aesthetic.',
    image: '/images/cyberpunk_template.png',
    accent: '#8b5cf6',
    aspect: '2.39-1',
    camera: 'pan',
    agents: 4,
    scenes: 32,
    tag: 'Cyberpunk',
    duration: 'Est. Render: 2.4m'
  },
  {
    id: 'noir',
    icon: FiMoon,
    title: 'Cinematic Noir',
    productionType: 'Monochromatic Drama',
    description: 'Shadow play, high contrast monochrome, classic noir.',
    prompt: 'A detective walking down a dark alley under a glowing streetlamp in heavy rain, high-contrast film noir aesthetic.',
    image: '/images/noir_template.png',
    accent: '#a1a1aa',
    aspect: '2.39-1',
    camera: 'static',
    agents: 3,
    scenes: 24,
    tag: 'Classic Noir',
    duration: 'Est. Render: 1.8m'
  },
  {
    id: 'space',
    icon: FiGlobe,
    title: 'Space Odyssey',
    productionType: 'Volumetric Sci-Fi',
    description: 'Interstellar expanses, high concept cosmic sci-fi.',
    prompt: 'An explorer in an advanced space suit looks at a giant glowing orange nebula, cosmic flares, epic sci-fi.',
    image: '/images/space_template.png',
    accent: '#ec4899',
    aspect: '2.39-1',
    camera: 'crane',
    agents: 5,
    scenes: 30,
    tag: 'Sci-Fi Space',
    duration: 'Est. Render: 2.8m'
  },
  {
    id: 'documentary',
    icon: FiCamera,
    title: 'Documentary Realism',
    productionType: 'Handheld Realism',
    description: 'Handheld realism, natural light, raw human stories.',
    prompt: 'A weathered fisherman working on his boat deck in early morning mist, natural key lighting, realistic documentary.',
    image: '/images/documentary_template.png',
    accent: '#f59e0b',
    aspect: '16-9',
    camera: 'zoom',
    agents: 3,
    scenes: 18,
    tag: 'Documentary',
    duration: 'Est. Render: 1.5m'
  },
  {
    id: 'fantasy',
    icon: FiWind,
    title: 'Fantasy Realism',
    productionType: 'Magic Realism',
    description: 'Enchanted forests, mythical runes, magic realism.',
    prompt: 'An ancient mossy stone portal in an enchanted glowing forest, magical wisps, volumetric lighting, fantasy realism.',
    image: '/images/fantasy_template.png',
    accent: '#10b981',
    aspect: '2.39-1',
    camera: 'zoom',
    agents: 4,
    scenes: 28,
    tag: 'Fantasy Real',
    duration: 'Est. Render: 2.2m'
  },
];

export default function CreativeModes({ onSelectTemplate }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <section className="space-y-6 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Creative Presets
          </h3>
          <div className="h-px w-24 bg-white/[0.04]" />
        </div>
        <button className="text-[10px] font-bold text-surface-500 hover:text-accent transition-colors flex items-center gap-1.5">
          <span>View all presets</span>
          <span>→</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {creativeTemplates.map((tmpl) => (
          <button
            key={tmpl.id}
            onClick={() => onSelectTemplate?.(tmpl)}
            onMouseEnter={() => setHoveredCard(tmpl.id)}
            onMouseLeave={() => setHoveredCard(null)}
            className="film-strip-card group text-left flex flex-col h-[335px] w-full bg-[#08080f]/80 border border-white/[0.05] hover:border-accent/40 shadow-xl transition-all duration-300 relative rounded-2xl overflow-hidden"
          >
            {/* Glossy top-shine reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />

            {/* Template Visual Header */}
            <div className="relative h-36 w-full overflow-hidden bg-surface-900 image-overlay-container shrink-0">
              <img
                src={tmpl.image}
                alt={tmpl.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 filter contrast-[1.05]"
              />
              {/* Category Icon */}
              <div 
                className="absolute left-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-[#0c0c16]/90 border border-white/10 group-hover:border-accent/40 shadow-lg transition-colors"
              >
                <tmpl.icon size={13} style={{ color: tmpl.accent }} />
              </div>
              {/* Status/Format tag */}
              <div className="absolute right-3 top-3 z-10 rounded bg-black/60 border border-white/10 px-1.5 py-0.5 text-[8px] font-semibold text-surface-300 tracking-wider uppercase font-mono">
                {tmpl.tag}
              </div>
            </div>

            {/* Template Metadata Details */}
            <div className="p-4 flex-1 flex flex-col justify-between relative z-10">
              <div>
                <h4 className="text-[12.5px] font-bold tracking-wide text-white group-hover:text-accent transition-colors leading-tight">
                  {tmpl.title}
                </h4>
                <p className="text-[9.5px] text-accent/80 font-bold mt-0.5 tracking-wide">{tmpl.productionType}</p>
                <p className="mt-1.5 text-[10px] leading-normal text-surface-500 line-clamp-2">
                  {tmpl.description}
                </p>
              </div>
              
              {/* Output & Agent Metadata Dials */}
              <div className="border-t border-white/[0.05] pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[9.5px] text-surface-400 font-semibold font-mono">
                  <span className="flex items-center gap-1.5">
                    <FiUsers size={10.5} className="text-accent/80" />
                    {tmpl.agents} Agents
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiLayers size={10.5} className="text-accent/80" />
                    {tmpl.scenes} Scenes
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-semibold mt-1">
                  <span className="text-surface-600 uppercase tracking-widest text-[8px] font-mono">
                    {tmpl.duration}
                  </span>
                  <span className="text-accent font-mono text-[9px] tracking-wide">
                    Storyboard Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Accent glowing dot */}
            <div 
              className="absolute right-3.5 top-3.5 h-1 w-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: tmpl.accent, boxShadow: `0 0 6px ${tmpl.accent}` }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
