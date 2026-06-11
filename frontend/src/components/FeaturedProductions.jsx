import { useProjectData } from '../hooks/useProjectData';
import { FiPlay, FiAward, FiTag, FiCpu } from 'react-icons/fi';

const featuredList = [
  {
    id: 'neo-tokyo',
    title: 'Neo-Tokyo 2099',
    tag: 'Cyberpunk Thriller',
    description: 'A noir detective follows a digital signal deep into the towering, wet skyscrapers of Tokyo.',
    image: '/images/neotokyo_featured.png',
    runtime: '3 Scenes',
    rating: '98% match',
    accent: '#8b5cf6'
  },
  {
    id: 'quiet-camera',
    title: 'The Quiet Camera',
    tag: 'Nostalgic Drama',
    description: 'An elderly lady dusts her old mechanical camera, recalling a memory that changes everything.',
    image: '/images/camera_featured.png',
    runtime: '2 Scenes',
    rating: '95% match',
    accent: '#f59e0b'
  },
  {
    id: 'echoes-apollo',
    title: 'Echoes of Apollo',
    tag: 'Retro-Sci-Fi',
    description: 'Miller wanders across the moon surface and catches a mysterious radio beacon signal.',
    image: '/images/apollo_featured.png',
    runtime: '2 Scenes',
    rating: '99% match',
    accent: '#ec4899'
  }
];

export default function FeaturedProductions() {
  const { loadFeatured } = useProjectData();

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Featured Productions
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {featuredList.map((item) => (
          <div
            key={item.id}
            onClick={() => loadFeatured(item.id)}
            className="group relative h-[280px] w-full rounded-2xl border border-white/[0.04] bg-surface-950/80 overflow-hidden cursor-pointer shadow-lg transition-all duration-500 hover:border-accent/30 hover:shadow-[0_12px_32px_rgba(139,92,246,0.12)]"
          >
            {/* Background Image with Hover Zoom */}
            <div className="absolute inset-0 z-0">
              <img
                src={item.image}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 filter brightness-90 group-hover:brightness-75"
              />
              {/* Radial Shadow Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 transition-opacity" />
            </div>

            {/* Play Button Overlay (Visible on Hover) */}
            <div className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/90 border border-white/20 text-white shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
                <FiPlay size={20} className="ml-1" />
              </div>
            </div>

            {/* Content Details */}
            <div className="absolute inset-x-0 bottom-0 z-20 p-5 flex flex-col justify-end">
              {/* Badge Row */}
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center gap-1 rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-surface-300">
                  <FiTag size={9} />
                  {item.tag}
                </span>
                <span className="flex items-center gap-1 rounded bg-accent/10 border border-accent/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
                  <FiAward size={9} />
                  {item.rating}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-base font-bold tracking-wide text-white group-hover:text-accent transition-colors">
                {item.title}
              </h4>

              {/* Description */}
              <p className="mt-1 text-[11px] leading-relaxed text-surface-400 line-clamp-2">
                {item.description}
              </p>

              {/* Footer specs */}
              <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.05] pt-2.5 text-[10px] text-surface-500 font-medium">
                <span className="flex items-center gap-1">
                  <FiCpu size={10} className="text-accent/60" />
                  Studio AI Active
                </span>
                <span>{item.runtime}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
