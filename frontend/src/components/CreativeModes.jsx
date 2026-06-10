import { useState } from 'react';

const creativeModes = [
  {
    id: 'short-film',
    icon: '🎬',
    title: 'Short Film',
    description: 'Narrative short with cinematic pacing and visual storytelling',
    accent: '#8b5cf6',
  },
  {
    id: 'trailer',
    icon: '🎞',
    title: 'Trailer',
    description: 'High-impact promotional cuts with dynamic editing',
    accent: '#ec4899',
  },
  {
    id: 'documentary',
    icon: '📺',
    title: 'Documentary',
    description: 'Real-world narratives with factual depth',
    accent: '#f59e0b',
  },
  {
    id: 'podcast',
    icon: '🎙',
    title: 'Podcast',
    description: 'Audio-first productions with scripted dialogue',
    accent: '#10b981',
  },
];

export default function CreativeModes({ selectedMode, onSelect }) {
  const [active, setActive] = useState(selectedMode || null);

  const handleClick = (mode) => {
    setActive(mode);
    onSelect?.(mode);
  };

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Production Type
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {creativeModes.map((mode) => {
          const isSelected = active === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleClick(mode.id)}
              className="mode-card text-left"
              style={{ '--accent-color': mode.accent }}
            >
              {/* Icon with accent ring */}
              <div
                className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all ${
                  isSelected
                    ? 'ring-1'
                    : ''
                }`}
                style={{
                  background: isSelected ? `${mode.accent}12` : 'rgba(255,255,255,0.02)',
                  ringColor: isSelected ? `${mode.accent}30` : undefined,
                }}
              >
                {mode.icon}
              </div>

              {/* Title */}
              <p
                className={`text-sm font-medium transition-colors ${
                  isSelected ? 'text-white' : 'text-surface-300'
                }`}
              >
                {mode.title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-surface-500">
                {mode.description}
              </p>

              {/* Active indicator */}
              {isSelected && (
                <div
                  className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: mode.accent }}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
