import { useProjectData } from '../hooks/useProjectData';
import { FiPlay, FiAward, FiTag, FiCpu, FiLayers, FiCamera } from 'react-icons/fi';

const featuredList = [
  {
    id: 'neo-tokyo',
    title: 'Neo Tokyo 2099',
    tag: 'Cyberpunk Thriller',
    description: 'A noir detective follows a digital signal deep into the towering, wet skyscrapers of Tokyo.',
    image: '/images/neotokyo_featured.png',
    scenes: '32 Scenes',
    agents: '4 Agents',
    rating: '98% Match',
    accent: '#8b5cf6',
    format: '4K RED RAW // Rec.2020',
    status: 'VFX Master Render',
    progress: 92
  },
  {
    id: 'quiet-camera',
    title: 'The Quiet Camera',
    tag: 'Drama',
    description: 'An elderly lady recalls a lifetime of moments long forgotten.',
    image: '/images/camera_featured.png',
    scenes: '18 Scenes',
    agents: '3 Agents',
    rating: '95% Match',
    accent: '#f59e0b',
    format: '35mm Kodak // Dolby Vision',
    status: 'Color Grading',
    progress: 85
  },
  {
    id: 'echoes-apollo',
    title: 'Echoes of Apollo',
    tag: 'Sci-Fi',
    description: 'Stranded on the moon, a lone engineer detects a signal from Earth.',
    image: '/images/apollo_featured.png',
    scenes: '24 Scenes',
    agents: '5 Agents',
    rating: '99% Match',
    accent: '#ec4899',
    format: '70mm IMAX // Atmos 16-bit',
    status: 'Audio Master Align',
    progress: 99
  },
  {
    id: 'last-lighthouse',
    title: 'The Last Lighthouse',
    tag: 'Drama',
    description: 'A keeper\'s final log before the storm that changed everything.',
    image: '/images/lighthouse_featured.png',
    scenes: '16 Scenes',
    agents: '3 Agents',
    rating: '97% Match',
    accent: '#10b981',
    format: 'Arri Alexa 65 // Rec.709',
    status: 'Release Master Ready',
    progress: 100
  }
];

export default function FeaturedProductions() {
  const { loadFeatured } = useProjectData();

  return (
    <section className="space-y-6 select-none">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          Featured Productions
        </h3>
        <div className="h-px w-24 bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {featuredList.map((item) => (
          <div
            key={item.id}
            onClick={() => loadFeatured(item.id)}
            className="group relative h-[295px] w-full rounded-2xl border border-white/[0.04] bg-[#08080f]/80 overflow-hidden cursor-pointer shadow-lg transition-all duration-500 hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(139,92,246,0.18)] flex flex-col justify-between"
          >
            {/* Glossy top-shine reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />

            {/* Background Image with Hover Zoom */}
            <div className="absolute inset-0 z-0">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.7] group-hover:brightness-[0.6] contrast-[1.05]"
              />
              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#07070d] via-[#07070d]/50 to-transparent z-10" />
            </div>

            {/* Viewfinder Scope Guides Overlay */}
            <div className="absolute inset-4 z-10 opacity-30 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none text-[8px] font-mono text-white/60">
              {/* Corner bounds */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white" />
              
              {/* Center focus indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center">
                <div className="w-1.5 h-px bg-white" />
                <div className="h-1.5 w-px bg-white absolute" />
              </div>
            </div>

            {/* Top metadata tags */}
            <div className="relative z-20 p-4 flex items-center justify-between">
              <span className="text-[7.5px] font-mono tracking-widest text-surface-400 uppercase">
                {item.format}
              </span>
              <span className={`text-[7.5px] font-mono tracking-widest uppercase font-bold flex items-center gap-1.5 ${item.progress === 100 ? 'text-emerald-400' : 'text-accent'}`}>
                <span className={`h-1 w-1 rounded-full ${item.progress === 100 ? 'bg-emerald-400' : 'bg-accent animate-pulse'}`} />
                {item.status}
              </span>
            </div>

            {/* Play Button Overlay (Visible on Hover) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/90 border border-white/20 text-white shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                <FiPlay size={18} className="ml-1" />
              </div>
            </div>

            {/* Content Details */}
            <div className="relative z-20 p-4 flex flex-col justify-end">
              {/* Badge Row */}
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-surface-400 font-mono">
                  <FiCamera size={8} />
                  {item.tag}
                </span>
                <span className="flex items-center gap-1 rounded bg-accent/10 border border-accent/25 px-1.5 py-0.5 text-[8px] font-bold text-accent font-mono">
                  <FiAward size={8} />
                  {item.rating}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-[14px] font-black tracking-wide text-white group-hover:text-accent transition-colors leading-tight uppercase font-display">
                {item.title}
              </h4>

              {/* Description */}
              <p className="mt-1.5 text-[10px] leading-relaxed text-surface-500 line-clamp-2">
                {item.description}
              </p>

              {/* Footer specs */}
              <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2 text-[9px] text-surface-400 font-semibold font-mono">
                <span className="flex items-center gap-1">
                  <FiCpu size={9} className="text-accent/80" />
                  {item.agents}
                </span>
                <span className="flex items-center gap-1">
                  <FiLayers size={9} className="text-accent/80" />
                  {item.scenes}
                </span>
              </div>
            </div>

            {/* Netflix-style Glowing Bottom Progress Bar */}
            <div className="w-full h-1 bg-white/[0.08] relative z-20 shrink-0">
              <div 
                className={`h-full bg-gradient-to-r transition-all duration-500 ${
                  item.progress === 100 
                    ? 'from-emerald-500 to-teal-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' 
                    : 'from-accent to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.7)]'
                }`}
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
