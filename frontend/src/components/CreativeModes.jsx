import { useState } from 'react';
import { FiUsers, FiLayers, FiCpu, FiMoon, FiGlobe, FiCamera, FiWind } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const creativeTemplates = [
  {
    id: 'cyberpunk',
    icon: FiCpu,
    title: 'Cyberpunk Neo',
    productionType: 'Full CGI Sci-Fi',
    description: 'Neon, rain, future cityscapes',
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
    description: 'Mystery, shadows, classic noir',
    prompt: 'A detective walking down a dark alley under a glowing streetlamp in heavy rain, high-contrast film noir aesthetic.',
    image: '/images/noir_template.png',
    accent: '#ffffff', // changed to white for monochrome noir dot in reference image
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
    description: 'Cosmic, epic, otherworldly',
    prompt: 'An explorer in an advanced space suit looks at a giant glowing orange nebula, cosmic flares, epic sci-fi.',
    image: '/images/space_template.png',
    accent: '#5b6cf6', // blue-purple dot in reference image
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
    description: 'Real stories, real people',
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
    title: 'Fantasy Realic',
    productionType: 'Magic Realism',
    description: 'Magic, adventure, wonder',
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
  const { isDayMode } = useTheme();

  return (
    <section className="space-y-4 select-none">
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
            className={`group text-left flex flex-col h-[205px] w-full border shadow-xl transition-all duration-300 relative rounded-2xl overflow-hidden ${
              isDayMode 
                ? 'bg-white border-black/[0.07] hover:border-accent/50' 
                : 'bg-[#08080f]/80 border-white/[0.05] hover:border-accent/40'
            }`}
          >
            {/* Glossy top-shine reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />

            {/* Template Visual Header */}
            <div className="relative h-[125px] w-full overflow-hidden bg-surface-900 shrink-0">
              <img
                src={tmpl.image}
                alt={tmpl.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 filter contrast-[1.05]"
              />
              {/* Category Icon */}
              <div 
                className={`absolute left-2.5 top-2.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-colors ${
                  isDayMode 
                    ? 'bg-white/90 border-black/10' 
                    : 'bg-[#0c0c16]/90 border-white/10 group-hover:border-accent/40'
                }`}
              >
                <tmpl.icon size={12} style={{ color: tmpl.accent }} />
              </div>
              {/* Status/Format tag */}
              <div className={`absolute right-2.5 top-2.5 z-10 rounded border px-1 py-0.5 text-[7px] font-semibold tracking-wider uppercase font-mono ${
                isDayMode 
                  ? 'bg-white/90 border-black/10 text-neutral-700' 
                  : 'bg-black/60 border-white/10 text-surface-300'
              }`}>
                {tmpl.tag}
              </div>
            </div>

            {/* Template Details */}
            <div className="p-3 flex-1 flex flex-col justify-center relative z-10 min-w-0">
              <h4 className={`text-[11.5px] font-bold tracking-wide transition-colors leading-tight truncate ${
                isDayMode 
                  ? 'text-neutral-900 group-hover:text-accent' 
                  : 'text-white group-hover:text-accent'
              }`}>
                {tmpl.title}
              </h4>
              <p className={`mt-0.5 text-[9.5px] leading-normal font-medium truncate ${
                isDayMode ? 'text-neutral-500' : 'text-surface-500'
              }`}>
                {tmpl.description}
              </p>
            </div>

            {/* Accent colored dot */}
            <div 
              className="absolute right-3.5 bottom-3.5 h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: tmpl.accent, 
                boxShadow: `0 0 8px ${tmpl.accent}` 
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
