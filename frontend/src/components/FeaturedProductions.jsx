import { useProjectData } from '../hooks/useProjectData';
import { FiPlay, FiAward, FiTag, FiCpu, FiLayers, FiCamera } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

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
  const { isDayMode } = useTheme();

  return (
    <section className="space-y-4 select-none">
      <div className="flex items-center gap-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          Featured Productions
        </h3>
        <div className="h-px w-24 bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {featuredList.map((item, idx) => {
          const isImageRight = idx >= 2;
          const gradientClass = isImageRight
            ? isDayMode
              ? 'from-white via-white/80 to-transparent'
              : 'from-[#08080f] via-[#08080f]/80 to-transparent'
            : isDayMode
              ? 'from-transparent via-white/80 to-white'
              : 'from-transparent via-[#08080f]/80 to-[#08080f]';

          return (
            <div
              key={item.id}
              onClick={() => loadFeatured(item.id)}
              className={`group relative h-[178px] w-full rounded-2xl border overflow-hidden cursor-pointer shadow-lg transition-all duration-500 flex ${
                isImageRight ? 'flex-row-reverse' : 'flex-row'
              } ${
                isDayMode 
                  ? 'bg-white border-black/[0.07] hover:border-accent/50 hover:shadow-md' 
                  : 'bg-[#08080f]/80 border-white/[0.04] hover:border-accent/40 hover:shadow-[0_12px_32px_rgba(139,92,246,0.18)]'
              }`}
            >
              {/* Glossy top-shine reflection */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20" />

              {/* Landscape image with Hover Zoom */}
              <div className="relative w-[38%] h-full overflow-hidden shrink-0">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-[0.85] group-hover:brightness-[0.75] contrast-[1.05]"
                />
                {/* Gradient mask blending image into background */}
                <div className={`absolute inset-0 z-10 pointer-events-none bg-gradient-to-r ${gradientClass}`} />
              </div>

              {/* Text content split side */}
              <div className="flex-1 flex flex-col justify-between p-3.5 min-w-0 relative z-10">
                <div>
                  <h4 className={`text-[12px] font-black tracking-wide leading-tight uppercase font-display truncate transition-colors duration-300 ${
                    isDayMode ? 'text-neutral-900 group-hover:text-accent' : 'text-white group-hover:text-accent'
                  }`}>
                    {item.title}
                  </h4>
                  <span className="text-[8px] font-extrabold tracking-wider uppercase block mt-1" style={{ color: item.accent }}>
                    {item.tag}
                  </span>
                  <p className={`mt-2 text-[9.5px] leading-relaxed line-clamp-2 transition-colors duration-300 ${
                    isDayMode ? 'text-neutral-500' : 'text-surface-500'
                  }`}>
                    {item.description}
                  </p>
                </div>

                {/* Footer scenes & agents info */}
                <div className={`flex items-center gap-4 text-[9.5px] font-semibold font-mono border-t pt-2 mt-2 transition-colors duration-300 ${
                  isDayMode ? 'border-neutral-100 text-neutral-500' : 'border-white/[0.05] text-surface-450'
                }`}>
                  <span className="flex items-center gap-1.5">
                    <FiLayers size={10} className="text-accent/80" />
                    {item.scenes}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiCpu size={10} className="text-accent/80" />
                    {item.agents}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
