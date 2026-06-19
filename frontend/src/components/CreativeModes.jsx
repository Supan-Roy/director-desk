import { useState, useRef, useEffect } from 'react';
import { FiUsers, FiLayers, FiCpu, FiMoon, FiGlobe, FiCamera, FiWind } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

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

const creativeTemplates = [
  {
    id: 'cyberpunk',
    icon: FiCpu,
    title: 'Neon Syndicate',
    productionType: 'Full CGI Sci-Fi',
    description: 'Neon, rain, future cityscapes',
    prompts: [
      'A sleek spinner vehicle hovering through neon-drenched Tokyo skyscrapers, deep purple atmospheric smoke, cyberpunk aesthetic.',
      'A lone mercenary in a chrome trench coat walks through a flooded neon marketplace, holographic ads flickering overhead, cyberpunk city.',
      'Aerial shot of a dystopian megacity at night, grid of purple and cyan neon light trails from aerial vehicles, rain-soaked rooftops.',
      'A hacker jacks into a neural interface inside a dark server room, cascading lines of glowing code, cyberpunk thriller atmosphere.',
      'Two rival gangs face off on a rain-slicked overpass lined with neon kanji signs, electric tension, cyberpunk street level.',
      'A rogue android sprints across rooftops above a blazing neon bazaar, pursuit drones close behind, high-speed cyberpunk chase.',
      'Inside a neon-lit underground club, a DJ with cybernetic arms spins holographic records, dense atmospheric haze, cyberpunk nightlife.',
      'Close-up of a cyberpunk street vendor selling bioluminescent food, neon reflections on wet cobblestones, foggy night alley.',
      'A massive corporate skyscraper looms over slum districts, neon advertisements scrolling across its glass facade, rain pouring, wide shot.',
      'A cyborg detective inspects a crime scene on a rain-soaked rooftop, city sprawl below glowing electric blue and magenta.',
    ],
    image: '/images/cyberpunk_template.png',
    video: '/videos/robot_transform.mp4',
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
    prompts: [
      'A detective walking down a dark alley under a glowing streetlamp in heavy rain, high-contrast film noir aesthetic.',
      'A femme fatale in a 1940s gown leans against a bar counter, shadows slicing across her face, smoky noir interior.',
      'A private investigator sits in a dimly lit office, blinds casting hard shadow stripes, cigarette smoke curling upward, black and white.',
      'A midnight train station, a lone figure waits under a single hanging bulb, fog rolling across the platform, film noir.',
      'Two men exchange a briefcase under a bridge at night, reflections shimmering in puddles, dramatic high-contrast lighting, noir thriller.',
      'A noir detective tails a suspect through winding rain-soaked cobblestone streets, deep shadows, handheld street-level camera.',
      'A dead phone booth in a 1940s city alley, receiver dangling, rain hammering the glass, stark noir cinematography.',
      'A woman peers through Venetian blinds at the street below, dramatic shadow stripes across her face, suspenseful noir atmosphere.',
      'A car chase through empty downtown streets at 3 AM, headlights slicing fog, silhouettes, black and white noir action.',
      'A newspaper editor reads a headline in a dimly lit newsroom, single desk lamp, smoke and shadows, classic noir drama.',
    ],
    image: '/images/noir_template.png',
    video: '/videos/cinematic_noir.mp4',
    accent: '#ffffff',
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
    prompts: [
      'An explorer in an advanced space suit looks at a giant glowing orange nebula, cosmic flares, epic sci-fi.',
      'A lone astronaut drifts past a ringed gas giant, golden light reflecting off the suit visor, vast cosmic silence.',
      'A deep-space station hangs above a dying red star, crew evacuating via escape pods, dramatic volumetric lighting.',
      'Two starships engage in silent combat near an asteroid field, laser trails and explosion blooms, cinematic space opera.',
      'An alien moon surface at dawn, twin suns rising over jagged crystal formations, astronaut silhouette in the foreground.',
      'A wormhole opens in deep space, pulling in nearby debris and light, shimmering event horizon, epic sci-fi scale.',
      'Interior of a generational ark ship, lush biome dome visible through a massive viewport, stars drifting slowly outside.',
      'A first-contact moment — a human and an alien reach toward each other across a glowing energy barrier, epic and tense.',
      'A comet streaks through a nebula cloud, brilliant colors trailing behind, small explorer probe chasing alongside it.',
      'A space elevator tethered to a terraformed Mars rises through orange clouds into the black of orbit, sweeping crane shot.',
    ],
    image: '/images/space_template.png',
    video: '/videos/space_odyssey.mp4',
    accent: '#5b6cf6',
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
    prompts: [
      'A weathered fisherman working on his boat deck in early morning mist, natural key lighting, realistic documentary.',
      'An elderly potter shaping clay at her wheel in a sunlit village workshop, candid handheld documentary style.',
      'A wildfire crew takes a brief rest on a hillside, exhaustion and camaraderie, golden hour natural light, raw documentary.',
      'Street market in Marrakech at sunrise, vendors arranging colorful spices, ambient sound implied, observational documentary.',
      'A refugee family arrives at a border camp, volunteers handing out supplies, overcast light, empathetic documentary tone.',
      "Inside a coal mine deep underground, a miner's headlamp illuminates the tunnel walls, gritty raw documentary realism.",
      'A protest march surging through downtown streets, handheld camera weaving through the crowd, authentic documentary energy.',
      'A hospital trauma team rushing a patient through bright corridors at night, urgency captured in handheld naturalistic style.',
      'Inuit hunters prepare sleds at dawn on a frozen tundra, breath misting, immersive cultural documentary cinematography.',
      'A young chess prodigy studies a board alone in a quiet library, natural window light, intimate observational documentary.',
    ],
    image: '/images/documentary_template.png',
    video: '/videos/documentary_realism.mp4',
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
    title: 'Sci-Fi Metropolis',
    productionType: 'Magic Realism',
    description: 'Skyscrapers, flying vehicles, future urbanism',
    prompts: [
      'A sprawling high-tech sci-fi city with majestic skyscrapers, floating transit lines, neon-lit skybridges, cinematic lighting.',
      'Aerial fly-through of a future megacity at dusk, thousands of autonomous vehicles weaving between glass towers, golden light.',
      'A sky garden atop a mile-high arcology building, lush greenery contrasting with chrome and glass skyline, wide establishing shot.',
      'A futuristic public transit hub bustling with commuters, holographic departure boards, monorail gliding in, warm sci-fi lighting.',
      'A street-level view of a future city alley, food stalls under glowing awnings, delivery drones zipping past, vibrant and alive.',
      'A skybridge connecting two megastructures high above the clouds, pedestrians crossing, storm rolling in below, dramatic scale.',
      'A protest of robots demanding rights in a future city plaza, holographic signs, tense atmosphere, cinematic wide angle.',
      'The ruins of an old district submerged beneath a gleaming new sci-fi city rising above it, layers of civilization, moody light.',
      'A vertical farm skyscraper glows green at night among grey towers, drones harvesting crops mid-air, futuristic urban agriculture.',
      'Dawn breaks over a sci-fi metropolis, sunlight slicing between towers, mist rising from the lower city, sweeping crane shot.',
    ],
    image: '/images/fantasy_template.png',
    video: '/videos/sci-fi_city.mp4',
    accent: '#10b981',
    aspect: '2.39-1',
    camera: 'zoom',
    agents: 4,
    scenes: 28,
    tag: 'Metropolis',
    duration: 'Est. Render: 2.2m'
  },
];

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
        {creativeTemplates.map((tmpl) => {
          const isHov = hoveredCard === tmpl.id;
          return (
          <button
            key={tmpl.id}
            onClick={() => handleSelectTemplate(tmpl)}
            onMouseEnter={() => handleMouseEnter(tmpl.id)}
            onMouseLeave={handleMouseLeave}
            style={{
              zIndex: zCard === tmpl.id ? 5 : 1,
              transform: isHov ? 'translateY(-2px)' : 'translateY(0px)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              willChange: 'transform',
            }}
            className="group text-left flex flex-col h-[205px] w-full border border-white/10 relative rounded-lg overflow-hidden transition-all duration-200 bg-[#111111] hover:border-accent/60 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
          >
            {/* Glossy top-shine reflection (removed gradient shine for flat style) */}
            <div className="absolute inset-0 bg-white/[0.01] pointer-events-none z-20" />

            {/* Template Visual Header */}
            <div className="relative h-[125px] w-full overflow-hidden bg-black shrink-0">
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
                className="absolute left-2.5 top-2.5 z-10 flex h-6.5 w-6.5 items-center justify-center rounded-lg border border-white/10 bg-[#0B0B0B]/90 transition-colors group-hover:border-accent/40"
              >
                <tmpl.icon size={12} style={{ color: tmpl.accent }} />
              </div>
              {/* Status/Format tag */}
              <div className="absolute right-2.5 top-2.5 z-10 rounded border border-white/10 px-1 py-0.5 text-[7px] font-semibold tracking-wider uppercase font-mono bg-black/60 text-[#D1D5DB]">
                {tmpl.tag}
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


          </button>
          );
        })}
      </div>
    </section>
  );
}
