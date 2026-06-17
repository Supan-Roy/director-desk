import { useState, useEffect, useRef } from 'react';
import { FiSend, FiLoader, FiVideo, FiMaximize2, FiCompass, FiLayers, FiSliders, FiFilm } from 'react-icons/fi';
import { PiSparkle, PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';

const aspectRatios = [
  { id: '16-9', label: '16:9 Cinema', value: '16:9' },
  { id: '2.39-1', label: '2.39:1 Anamorphic', value: '2.39:1' },
  { id: '9-16', label: '9:16 Vertical', value: '9:16' },
  { id: '1-1', label: '1:1 Square', value: '1:1' },
];

const styles = [
  { id: 'none', label: 'Raw Lens', value: 'Default' },
  { id: 'noir', label: 'Cinematic Noir', value: 'Cinematic Noir' },
  { id: 'cyberpunk', label: 'Cyberpunk Neo', value: 'Cyberpunk Neo' },
  { id: 'space', label: 'Space Odyssey', value: 'Space Odyssey' },
  { id: 'documentary', label: 'Documentary Realism', value: 'Documentary Realism' },
];

const cameraMotions = [
  { id: 'static', label: 'Static Camera', value: 'Static' },
  { id: 'pan', label: 'Pan Left/Right', value: 'Pan Left/Right' },
  { id: 'zoom', label: 'Zoom In Slow', value: 'Zoom In' },
  { id: 'crane', label: 'Crane Shot Up', value: 'Crane' },
];

const qualities = [
  { id: 'draft', label: 'Draft Cut', value: 'Draft' },
  { id: 'high', label: 'High Quality', value: 'High Quality' },
  { id: 'master', label: 'Master Grade', value: 'Master' },
];

const orchestrationModes = [
  { id: 'fast', label: 'Fast Mode (Single-call)', value: 'fast' },
  { id: 'studio', label: 'Studio Mode (Multi-agent)', value: 'studio' },
];

const productionTypes = [
  { id: 'Auto Detect', label: 'Auto Detect', value: 'Auto Detect' },
  { id: 'Short Film', label: 'Short Film', value: 'Short Film' },
  { id: 'Trailer', label: 'Trailer', value: 'Trailer' },
  { id: 'Documentary', label: 'Documentary', value: 'Documentary' },
  { id: 'Podcast', label: 'Podcast (Audio)', value: 'Podcast' },
  { id: 'Drama', label: 'Drama', value: 'Drama' },
  { id: 'Series Episode', label: 'Series Episode', value: 'Series Episode' },
  { id: 'Educational Show', label: 'Educational Show', value: 'Educational Show' },
  { id: 'Interview', label: 'Interview', value: 'Interview' },
  { id: 'YouTube Video', label: 'YouTube Video', value: 'YouTube Video' },
  { id: 'Audio Story', label: 'Audio Story (Audio)', value: 'Audio Story' },
];

const detailedSuggestions = [
  {
    text: 'A detective walking down a neon-drenched Tokyo alleyway in heavy rain, chasing a digital shadow...',
    aspect: '2.39-1',
    style: 'cyberpunk',
    camera: 'pan'
  },
  {
    text: 'Elena sits silently in a rocking chair, light streaming on a vintage camera on the table...',
    aspect: '16-9',
    style: 'documentary',
    camera: 'zoom'
  },
  {
    text: 'Commander Miller steps out onto the dust, staring into a giant orange nebula...',
    aspect: '2.39-1',
    style: 'space',
    camera: 'crane'
  },
];

// Custom styled selector to align with Runway/Linear aesthetic
function CustomSelect({ value, onChange, options, icon: Icon, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDayMode } = useTheme();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeOption = options.find((o) => o.id === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-[11px] font-semibold transition-all cursor-pointer focus:outline-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        } ${
          isDayMode
            ? 'bg-black text-white-force border-black/15 hover:bg-neutral-900 shadow-sm'
            : 'bg-white text-black border-white/10 hover:bg-neutral-100 shadow-sm'
        }`}
        disabled={disabled}
      >
        <Icon size={12} className={isDayMode ? 'text-neutral-400' : 'text-neutral-500'} />
        <span>{activeOption.label}</span>
        <span 
          className={`text-[7.5px] ml-1 transition-transform duration-200 ${isDayMode ? 'text-neutral-400' : 'text-neutral-500'}`} 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border p-1 backdrop-blur-xl shadow-lg space-y-0.5 ${
          isDayMode
            ? 'bg-black border-white/[0.08] text-white-force shadow-xl'
            : 'bg-white border-neutral-200/80 text-neutral-800 shadow-xl'
        }`}>
          {options.map((opt) => {
            const isSelected = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? isDayMode
                      ? 'bg-white/15 text-white-force font-bold'
                      : 'bg-accent/15 text-accent font-bold'
                    : isDayMode
                      ? 'text-neutral-300 hover:bg-white/10 hover:text-white-force'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="text-[6px] text-accent">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const prefixesPool = [
  "A visually striking and highly detailed depiction of ",
  "A cinematic and atmosphere-rich rendering of ",
  "An evocative, character-focused scene featuring ",
  "A high-fidelity atmospheric close-up of ",
  "A beautifully composed cinematic shot of ",
  "A stunning, photorealistic representation of ",
  "An atmospheric and breathtaking view showcasing ",
  "A dramatic, masterfully lit scene of ",
  "An epic, high-contrast visual focus on ",
  "A professional, studio-quality capture of "
];

const stylesPool = {
  noir: [
    "monochromatic drama, heavy rain-slicked streets, deep shadows, high-contrast chiascuro lighting, vintage film grain, classic 1940s detective film look",
    "stark high-contrast monochrome cinematography, shadow-drenched alleys, retro film noir texture, moody low-key lighting",
    "classic film-noir aesthetic, deep black-and-white silhouettes, smoky atmosphere, wet pavement reflections, dramatic key light",
    "monochrome cinematic masterpiece, dark atmospheric shadows, film noir lighting, vintage camera lenses, wet asphalt glare",
    "moody high-contrast black and white styling, volumetric smoke, silhouette lighting, classic noir cinema feel"
  ],
  cyberpunk: [
    "neon neo-noir aesthetic, glowing cyan and magenta light leaks, massive holographic commercial displays, rain-slicked asphalt reflecting colorful signs, volumetric atmospheric purple haze",
    "futuristic cyberpunk landscape, buzzing neon elements, neon purple and teal backlight, damp city streets, holographic projections",
    "cyberpunk atmospheric styling, high-tech low-life mood, shimmering electric signage, dense steam venting, blue and magenta highlights",
    "dystopian cyberpunk city view, flickering neon streetlights, glowing interface displays, volumetric atmospheric fog, neon highlights",
    "high-tech futuristic aesthetic, neon-drenched background, iridescent glow, cybernetic atmosphere, holographic ads"
  ],
  space: [
    "cosmic realism, vast stellar background, hyper-detailed spacesuit reflections, majestic glowing orange nebula clouds, sharp anamorphic lens flare",
    "epic sci-fi cosmic scale, starry deep-space atmosphere, colorful nebulae dust, reflective helmet visor detail, volumetric solar flares",
    "hyper-detailed astronaut sci-fi setting, cinematic deep space void, glowing cosmic dust, spectacular lens flares, space odyssey aesthetic",
    "interstellar explorer scenery, majestic galaxy background, cosmic dust clouds, extreme definition space background, soft nebula light",
    "breathtaking deep-space view, distant star systems, stellar gas glow, high-fidelity space suit detail, anamorphic flares"
  ],
  documentary: [
    "photorealistic textures, observational documentary cinematography, soft natural sunlight, organic handheld camera feel, shallow depth of field, raw human emotion",
    "authentic documentary handheld capture, naturalistic lighting, high-fidelity real-world textures, candid cinematography look",
    "observational direct-cinema style, natural ambient illumination, sharp details, real-life documentary framing",
    "candid journalistic documentary aesthetic, raw real-world details, soft natural light, handheld camera motion tracking",
    "hyper-realistic documentary style, natural key lights, highly detailed textures, observational human element"
  ],
  none: [
    "natural cinematic realism, clean professional studio lighting, rich color grade",
    "crisp cinematic lighting, natural realistic color-grading, professional studio presentation",
    "clean cinematic presentation, photorealistic rendering, natural atmospheric light",
    "balanced studio lighting, neutral high-definition colors, clean visual design",
    "photorealistic rendering, natural ambient illumination, professional color grading"
  ]
};

const cameraPool = {
  static: [
    "shot on a locked tripod, steady framing, stable cinematic composition",
    "fixed camera position, locked-off shot, steady cinematic frame",
    "stable tripod framing, stationary camera perspective",
    "steady locked-off camera composition, balanced still shot",
    "motionless tripod shoot, steady camera perspective"
  ],
  pan: [
    "slow cinematic panning camera movement, sweeping across the scene to reveal environmental depth",
    "smooth horizontal camera pan, sweeping view revealing detailed background elements",
    "cinematic panning movement, slow side-to-side camera drift",
    "horizontal pan movement, sweeping camera angle, reveals dramatic scene details",
    "slow left-to-right camera sweep, smooth panning motion"
  ],
  zoom: [
    "slow smooth zoom-in focusing on subtle details, rising dramatic tension, narrow focus lock",
    "gradual cinematic zoom-in, tightening focus on the subject, shallow depth of field",
    "slow dolly-in camera effect, magnifying subtle micro-details",
    "smooth zoom-in camera tracking, focuses on essential subject elements",
    "gradual lens focal shift, slow zoom, increases perspective intimacy"
  ],
  crane: [
    "sweeping overhead crane shot, elevating high, epic aerial perspective, grand cinematic scale",
    "smooth rising crane movement, high-angle establishing view, sweeping perspective",
    "vertical crane boom shot, elevating camera perspective, epic cinematic layout",
    "sweeping jib arm camera lift, high angle viewpoint, majestic scale reveal",
    "rising overhead camera movement, crane perspective, dramatic environmental reveal"
  ]
};

const qualityPool = {
  draft: [
    "draft concept visual, raw prototype render",
    "concept draft styling, quick pre-visualization render",
    "raw prototype concept sketch",
    "fast preview rendering, draft style concept visualization",
    "pre-vis layout render, draft grade visual design"
  ],
  high: [
    "ultra-sharp 4k resolution, raytraced highlights, high-fidelity textures, photorealistic render",
    "crisp 4k quality, realistic lighting and textures, detailed render style",
    "high-fidelity 4k visualization, raytraced reflection details, photorealistic finish",
    "stunning 4k resolution, highly detailed texture mapping, advanced render finish",
    "photorealistic 4k output, raytraced environmental lights, high-end production render"
  ],
  master: [
    "master-grade cinematic render, arri alexa 65 look, anamorphic lens flare, flawless 8k quality, perfect color-graded raw footage",
    "flawless 8k master print quality, arri alexa cinematic style, anamorphic flares, professionally color graded raw feed",
    "exquisite 8k master grade, anamorphic cinematic look, rich dynamic range, perfect color-graded output",
    "flawless 8k cinematic masterpiece, authentic arri alexa 65 style, professional color graded raw profile",
    "ultra high-definition 8k master, perfect cinematic color grading, raw camera details, flawless render quality"
  ]
};

const prodTypePool = {
  "Auto Detect": [],
  "Short Film": [
    "cinematic storytelling scene, narrative focus, dramatic tone",
    "narrative-driven short film sequence, dramatic character scene",
    "cinematic storytelling tone, dramatic short film mood",
    "short film character study scene, dramatic atmosphere, cinematic storytelling",
    "cinematic drama short scene, narratively rich layout, short film style"
  ],
  "Trailer": [
    "epic cinematic trailer aesthetic, high-impact fast pacing, dramatic visual hook, intense scale",
    "action-packed film trailer style, high-energy editing cues, epic scale visualization",
    "blockbuster trailer style, dramatic fast-paced sequence, cinematic punchy visual",
    "high-impact movie trailer aesthetic, fast pacing editing, dramatic scale hook",
    "epic scale promotional trailer vibe, fast-paced transitions, intense cinematic energy"
  ],
  "Documentary": [
    "authentic documentary style, candid observational journalism, raw non-fiction essence, genuine real-world environment, documentary language narration atmosphere",
    "observational documentary vibe, raw realistic scene, candid human storytelling, documentary narration tone",
    "direct non-fiction documentary setting, raw authenticity, real-world detail, documentary voiceover atmosphere",
    "authentic documentary language, candid real-world recording, observational camera style, non-fiction setting",
    "candid observational documentary, real-life human environment, documentary narration voiceover atmosphere"
  ],
  "Podcast": [
    "studio podcast vibe, intimate vocal microphone setup, podcast language dialogue clarity, crisp high-end studio acoustics, professional audio broadcasting atmosphere",
    "intimate studio podcast recording, broadcast microphone close-up, clean acoustics, warm studio atmosphere",
    "professional broadcast podcast layout, speech-focused audio setup, warm room acoustics, radio studio lighting",
    "high-fidelity podcast language broadcast, professional studio atmosphere, vocal microphone setup",
    "broadcast studio podcast layout, speech-focused acoustic treatment, warm room lighting, professional setup"
  ],
  "Drama": [
    "character-driven dramatic storytelling scene, intense emotional nuance, cinematic narrative pacing",
    "emotionally charged dramatic sequence, character study framing, deep atmospheric tension",
    "intense dramatic screenplay scene, expressive actor framing, cinematic narrative depth",
    "character study drama layout, deep emotional acting focus, cinematic scene pacing",
    "dramatic actor composition, intense character-driven scene, deep emotional nuance"
  ],
  "Series Episode": [
    "episodic high-production television drama aesthetic, streaming quality",
    "premium streaming series episode look, television drama style",
    "high-budget television series aesthetic, cinematic episodic quality",
    "episodic streaming drama format, high production value television style",
    "high-end television drama series view, premium streaming aesthetic quality"
  ],
  "Educational Show": [
    "engaging educational presentation style, clear explanatory graphics, highly-informative visual layout, educational language narration, professional host presentation",
    "informative educational show layout, clear diagrams and overlays, educational narration clarity, studio host setup",
    "instructive presentation vibe, clear graphic callouts, educational voiceover quality, professional explanation setup",
    "educational language instruction, clear graphic overlays, informative show presentation, professional studio layout",
    "structured educational layout, clear explanation diagrams, educational voiceover quality, professional broadcast setup"
  ],
  "Interview": [
    "two-camera talking-head interview setup, key light illumination, professional journalistic framing, depth of field blur",
    "professional interview setup, three-point lighting layout, talking-head frame, journalistic profile",
    "two-camera interview scene, key light profile, clean back-to-camera background blur, media interview style",
    "journalistic talking-head interview, three-point studio lighting, soft blurred background",
    "professional interview setup, clean key light focus, two-camera interview layout, media profiling style"
  ],
  "YouTube Video": [
    "vibrant engaging content creation style, clean focus lock, eye-catching vlog-style visual presentation",
    "modern content creator aesthetic, vibrant colorful palette, clean focus tracking, engaging vlog visual",
    "popular video vlog style, high-energy framing, colorful setting, crisp focus lock",
    "engaging content creator style, vibrant colors, vlog framing presentation, clean focus track",
    "creative vlog-style video presentation, colorful design layout, high-energy content presentation"
  ],
  "Audio Story": [
    "immersive auditory narrative scene, rich soundscape descriptions, evocative storytelling atmosphere",
    "audiobook narrative setting, sound-evocative scene descriptions, rich storytelling vibe",
    "voice-narrated story ambiance, deep atmospheric setting, rich auditory worldbuilding details",
    "audio-first narrative scene, rich soundscape descriptions, voiceover-driven ambiance",
    "immersive voice-narrated story setting, sound-evocative scene backdrop, rich auditory details"
  ]
};

function enhancePromptText(userPrompt, prodType, styleId, cameraId, qualityId) {
  let text = userPrompt.trim();

  // 1. Recover the original user prompt by cleaning any known pre-defined prefixes
  prefixesPool.forEach(prefix => {
    if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
      text = text.substring(prefix.length);
    }
  });

  // Decapitalize the recovered text's first letter so it blends perfectly into a new prefix
  if (text.length > 0) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }

  // 2. Recover the original user prompt by cleaning any known pre-defined pool values
  const allPoolPhrases = [];
  [stylesPool, cameraPool, qualityPool, prodTypePool].forEach(pool => {
    Object.values(pool).forEach(arr => {
      arr.forEach(phrase => {
        allPoolPhrases.push(phrase);
      });
    });
  });

  // Sort by length descending to clean more specific strings first
  allPoolPhrases.sort((a, b) => b.length - a.length);

  allPoolPhrases.forEach(phrase => {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\s*,?\\s*${escaped}\\s*,?\\s*`, 'gi');
    text = text.replace(regex, ', ');
  });

  // Strip any old style/aspect tags or [Aspect:...] blocks from the end
  text = text.replace(/\[Aspect:[^\]]+\]/gi, '');

  // Clean double commas and spaces
  text = text
    .replace(/,\s*,/g, ',')
    .replace(/^[\s,]+|[\s,.]+$/g, '')
    .trim();

  // 3. Fallbacks if base prompt is empty
  let basePrompt = text;
  if (!basePrompt) {
    const starters = {
      cyberpunk: "A futuristic cyberpunk street merchant demonstrating a glowing digital device",
      noir: "A mysterious detective smoking in the rainy night alley under flickering neon",
      space: "An astronaut discovering a colossal crystalline monolith on a distant desert planet",
      documentary: "An elderly weaver meticulously operating a wooden loom in a sunlit studio",
      none: "A breathtaking cinematic shot of an ancient lighthouse standing tall against stormy ocean waves"
    };
    basePrompt = starters[styleId] || starters.none;
  } else {
    // Wrap with a random prefix
    const randomPrefix = prefixesPool[Math.floor(Math.random() * prefixesPool.length)];
    basePrompt = `${randomPrefix}${basePrompt}`;
  }

  // 4. Select a random option from each pool for style, camera, quality, and production type
  const styleArr = stylesPool[styleId] || stylesPool.none;
  const styleText = styleArr[Math.floor(Math.random() * styleArr.length)];

  const cameraArr = cameraPool[cameraId] || cameraPool.static;
  const cameraText = cameraArr[Math.floor(Math.random() * cameraArr.length)];

  const qualityArr = qualityPool[qualityId] || qualityPool.high;
  const qualityText = qualityArr[Math.floor(Math.random() * qualityArr.length)];

  const prodArr = prodTypePool[prodType] || [];
  const prodText = prodArr.length > 0 ? prodArr[Math.floor(Math.random() * prodArr.length)] : "";

  let enhancedParts = [basePrompt];
  if (styleText) enhancedParts.push(styleText);
  if (cameraText) enhancedParts.push(cameraText);
  if (prodText) enhancedParts.push(prodText);
  if (qualityText) enhancedParts.push(qualityText);

  let result = enhancedParts.join(", ");
  result = result.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();

  if (!result.endsWith(".")) {
    result += ".";
  }

  return result;
}

export default function HeroSection({
  prompt,
  setPrompt,
  aspect,
  setAspect,
  style,
  setStyle,
  camera,
  setCamera,
}) {
  const [quality, setQuality] = useState('high');
  const [orchestrationMode, setOrchestrationMode] = useState('studio');
  const [errorMsg, setErrorMsg] = useState('');
  const { isDayMode } = useTheme();
  
  // AI Production Orb animation states
  const [focused, setFocused] = useState(false);
  const [orbAnimating, setOrbAnimating] = useState(false);
  
  const { generate, loading, hasProject, productionType: contextProductionType } = useProjectData();
  const [selectedProdType, setSelectedProdType] = useState('Auto Detect');
  
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Multimodal file states
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleEnhance = () => {
    if (isEnhancing || loading) return;
    setIsEnhancing(true);
    setTimeout(() => {
      const enhanced = enhancePromptText(prompt, selectedProdType, style, camera, quality);
      setPrompt(enhanced);
      setIsEnhancing(false);
    }, 450); // Small realistic delay for UI satisfaction
  };

  const handleOrbClick = () => {
    if (!loading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    filesArray.forEach((file) => {
      const reader = new FileReader();
      const fileType = file.type;
      const fileName = file.name;
      
      if (fileType.startsWith('image/') || fileType === 'application/pdf') {
        reader.readAsDataURL(file);
        reader.onload = () => {
          setAttachedFiles((prev) => {
            if (prev.some(f => f.name === fileName)) return prev;
            return [...prev, {
              name: fileName,
              type: fileType,
              content: reader.result
            }];
          });
        };
      } else {
        reader.readAsText(file);
        reader.onload = () => {
          setAttachedFiles((prev) => {
            if (prev.some(f => f.name === fileName)) return prev;
            return [...prev, {
              name: fileName,
              type: fileType,
              content: reader.result
            }];
          });
        };
      }
    });
    
    e.target.value = '';
  };

  useEffect(() => {
    if (contextProductionType) {
      setSelectedProdType(contextProductionType);
    }
  }, [contextProductionType]);

  useEffect(() => {
    if (focused) {
      setOrbAnimating(true);
      const timer = setTimeout(() => {
        setOrbAnimating(false);
      }, 3000); // 3 seconds of high-energy camera focus dial swirl
      return () => clearTimeout(timer);
    } else {
      setOrbAnimating(false);
    }
  }, [focused]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setErrorMsg('');

    // Compose a rich prompt containing the cinematic settings
    const selectedAspect = aspectRatios.find(a => a.id === aspect)?.value || '16:9';
    const selectedStyle = styles.find(s => s.id === style)?.value || 'Default';
    const selectedCamera = cameraMotions.find(c => c.id === camera)?.value || 'Static';
    const selectedQuality = qualities.find(q => q.id === quality)?.value || 'High Quality';

    const composedPrompt = `${prompt.trim()}\n[Aspect: ${selectedAspect}, Style: ${selectedStyle}, Motion: ${selectedCamera}, Quality: ${selectedQuality}]`;
    
    try {
      await generate(composedPrompt, orchestrationMode, selectedProdType, attachedFiles);
      setAttachedFiles([]);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleApplySuggestion = (sug) => {
    setPrompt(sug.text);
    setAspect(sug.aspect);
    setStyle(sug.style);
    setCamera(sug.camera);
  };

  const getOuterRingClass = () => {
    if (loading) return "absolute w-10 h-10 rounded-full border-2 border-dashed border-emerald-400/90 animate-[spin_2s_linear_infinite] scale-105";
    if (focused) {
      if (orbAnimating) return "absolute w-10 h-10 rounded-full border-2 border-dashed border-accent/80 animate-[spin_2.5s_linear_infinite] scale-105";
      return "absolute w-10 h-10 rounded-full border border-dashed border-accent/50 animate-[spin_12s_linear_infinite] scale-105";
    }
    return "absolute w-8 h-8 rounded-full border border-white/15 border-dashed";
  };

  const getMiddleRingClass = () => {
    if (loading) return "absolute w-7 h-7 rounded-full border border-dotted border-emerald-300/60 animate-[spin_4s_linear_infinite_reverse] transition-all duration-300";
    if (focused) {
      if (orbAnimating) return "absolute w-7 h-7 rounded-full border border-dotted border-purple-400/60 animate-[spin_4s_linear_infinite_reverse] transition-all duration-300";
      return "absolute w-7 h-7 rounded-full border border-dotted border-purple-400/30 animate-[spin_20s_linear_infinite_reverse] transition-all duration-300";
    }
    return "absolute w-7 h-7 rounded-full border border-dotted border-transparent opacity-0 scale-75 transition-all duration-300";
  };

  const getCoreClass = () => {
    if (loading) return "absolute w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all duration-300";
    if (focused) {
      if (orbAnimating) return "absolute w-4 h-4 rounded-full bg-gradient-to-tr from-accent/30 via-purple-600/20 to-pink-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.4)] scale-105 transition-all duration-300";
      return "absolute w-4 h-4 rounded-full bg-gradient-to-tr from-accent/15 to-purple-800/20 flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.2)] scale-105 transition-all duration-300";
    }
    return "absolute w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.3)] transition-all duration-300";
  };

  return (
    <section className={`relative z-30 mx-auto text-center transition-all duration-500 w-full ${
      hasProject ? 'py-2 mt-1' : 'py-3 mt-2'
    }`}>
      {/* Studio Background Image — always visible for immersive studio feel */}
      <>
        {isDayMode ? (
          // LIGHT MODE ARTWORK AND OVERLAYS
          <>
            {/* Cinematic background artwork (Leica/film tone color grade) */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none rounded-3xl opacity-[0.55] filter contrast-[1.25] brightness-[0.88] saturate-[0.75]"
              style={{
                backgroundImage: `url('/images/studio_bg.png')`,
                mixBlendMode: 'multiply'
              }}
            />
            {/* Warm film-tone overlay gradient */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl bg-gradient-to-b from-[#e3ded5]/25 via-transparent to-[#ede9e2]/80" />
            {/* Soft warm radial vignette for readability & keeping silhouettes visible */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl bg-gradient-radial from-transparent via-[#f0ede8]/30 to-[#f0ede8]/85" />
            {/* Left/Right side gradient for visual focus */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl bg-gradient-to-r from-[#f0ede8]/50 via-transparent to-[#f0ede8]/50" />
          </>
        ) : (
          // DARK MODE ARTWORK AND OVERLAYS
          <>
            {/* Cinematic background artwork */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-[0.65] filter brightness-[0.65] contrast-[1.1] mix-blend-screen rounded-3xl"
              style={{ backgroundImage: `url('/images/studio_bg.png')` }}
            />
            {/* Dark overlay (70-80%) */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl bg-gradient-to-b from-black/75 via-transparent to-black/85" />
            <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl bg-gradient-to-r from-[#06060b]/85 via-transparent to-[#06060b]/85" />
          </>
        )}
      </>

      {/* Immersive radial glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-gradient-radial from-accent/[0.08] to-transparent blur-3xl" />

      <div className="relative z-10 space-y-6 max-w-4xl mx-auto px-6">
        
        {/* Cinematic Titles */}
        {!hasProject && (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-accent">
              Creative Production Engine
            </span>
            <h2 className={`text-4xl font-black tracking-tight md:text-5xl lg:text-6xl uppercase font-display transition-colors duration-300 ${
              isDayMode ? 'text-[#1c1825]' : 'text-white'
            }`}>
              Director Desk
            </h2>
            <p className={`mx-auto max-w-2xl text-xs font-semibold leading-relaxed font-mono transition-colors duration-300 ${
              isDayMode ? 'text-neutral-600' : 'text-surface-400'
            }`}>
              AI Showrunner Studio. From concept to cut. Collaborative agents for writers, storyboard artists, critics and editors.
            </p>
            {/* Showrunner indicator */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-accent">
                AI Showrunner Online
              </span>
            </div>
          </div>
        )}

        {/* Prompt Input / Production Console Box */}
        <div className={`group/console relative p-[1.5px] rounded-2xl transition-all duration-500 bg-gradient-to-b ${
          isDayMode
            ? focused 
              ? 'from-accent/50 via-accent/25 to-purple-500/10 shadow-[0_12px_32px_rgba(124,58,237,0.12)]' 
              : 'from-black/[0.08] to-black/[0.02] shadow-[0_8px_30px_rgba(28,24,37,0.06)]'
            : focused 
              ? 'from-accent/60 via-accent/30 to-purple-600/20 shadow-[0_12px_40px_rgba(139,92,246,0.15)]' 
              : 'from-white/[0.08] to-white/[0.02] shadow-[0_10px_35px_rgba(0,0,0,0.95)]'
        }`}>
          <div className={`rounded-[15px] p-5 relative transition-all duration-500 ${
            isDayMode
              ? 'bg-white/75 border border-white/35 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.65)] shadow-sm'
              : 'bg-[#07070d]/80 backdrop-blur-[2px] shadow-[inset_0_2px_12px_rgba(0,0,0,0.9)]'
          }`}>
            {/* Hidden File Input */}
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.txt,.md,image/*"
              className="hidden"
            />

            {/* Viewfinder corner brackets inside the console */}
            <div className={`absolute top-3 left-3 w-3 h-3 border-t border-l transition-all duration-500 pointer-events-none group-focus-within/console:scale-105 z-10 ${
              isDayMode ? 'border-black/[0.15] group-focus-within/console:border-accent/80' : 'border-white/[0.12] group-focus-within/console:border-accent/80'
            }`} />
            <div className={`absolute top-3 right-3 w-3 h-3 border-t border-r transition-all duration-500 pointer-events-none group-focus-within/console:scale-105 z-10 ${
              isDayMode ? 'border-black/[0.15] group-focus-within/console:border-accent/80' : 'border-white/[0.12] group-focus-within/console:border-accent/80'
            }`} />
            <div className={`absolute bottom-3 left-3 w-3 h-3 border-b border-l transition-all duration-500 pointer-events-none group-focus-within/console:scale-105 z-10 ${
              isDayMode ? 'border-black/[0.15] group-focus-within/console:border-accent/80' : 'border-white/[0.12] group-focus-within/console:border-accent/80'
            }`} />
            <div className={`absolute bottom-3 right-3 w-3 h-3 border-b border-r transition-all duration-500 pointer-events-none group-focus-within/console:scale-105 z-10 ${
              isDayMode ? 'border-black/[0.15] group-focus-within/console:border-accent/80' : 'border-white/[0.12] group-focus-within/console:border-accent/80'
            }`} />
 
            {/* Row 1: Orb, Input text, Sparkle */}
            <div className="flex items-start gap-4 relative z-10">
              
              {/* AI Production Orb / Camera Focus Spinner */}
              <div 
                onClick={!loading ? handleOrbClick : undefined}
                className={`flex items-center justify-center h-12 w-12 shrink-0 relative select-none ${
                  !loading ? 'cursor-pointer hover:scale-105 transition-all' : ''
                }`}
                title={!loading ? "Upload reference documents or images (PDF, TXT, MD, PNG/JPG)" : "Processing..."}
              >
                {/* Outer Volumetric Halo */}
                <div className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500 ${
                  loading 
                    ? 'bg-emerald-500/10' 
                    : focused 
                      ? 'bg-accent/10' 
                      : 'bg-accent/5'
                }`} />

                {/* Stable Outer Ring */}
                <div className={getOuterRingClass()} />

                {/* Stable Middle Ring */}
                <div className={getMiddleRingClass()} />

                {/* Stable Core */}
                <div className={getCoreClass()}>
                  {loading ? (
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ) : (
                    <div className={`w-1.5 h-1.5 relative ${focused && orbAnimating ? 'animate-pulse' : ''}`}>
                      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-accent/80" />
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-accent/80" />
                    </div>
                  )}
                </div>
              </div>

              {/* Prompt text field */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe your creative concept or project idea, or drop context files..."
                className={`flex-1 bg-transparent border-0 outline-none placeholder-neutral-500 text-[14px] leading-relaxed resize-none h-20 focus:ring-0 px-1 pt-1 font-mono transition-colors duration-300 ${
                  isDayMode ? 'text-neutral-900' : 'text-white'
                }`}
                disabled={loading}
              />

              {/* Sparkles Action */}
              <button 
                type="button"
                onClick={handleEnhance}
                className={`hover:text-accent p-2 rounded-lg transition-colors cursor-pointer shrink-0 mt-1 ${
                  isDayMode ? 'text-neutral-500' : 'text-surface-500'
                } ${isEnhancing ? 'animate-pulse text-accent' : ''}`}
                title="Enhance Prompt"
                disabled={loading || isEnhancing}
              >
                {isEnhancing ? (
                  <FiLoader size={16} className="animate-spin text-accent" />
                ) : (
                  <PiSparkle size={16} />
                )}
              </button>
            </div>

            {/* Attached Files List */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 px-1 relative z-10">
                {attachedFiles.map((file, idx) => {
                  const isImage = file.type.startsWith('image/');
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-all ${
                        isDayMode 
                          ? 'bg-neutral-50 border-neutral-200 text-neutral-800' 
                          : 'bg-white/[0.03] border-white/[0.08] text-neutral-300'
                      }`}
                    >
                      {isImage ? (
                        <div className="w-4 h-4 rounded overflow-hidden shrink-0 border border-white/10">
                          <img src={file.content} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="text-[10px] opacity-60">📄</span>
                      )}
                      <span className="truncate max-w-[150px] font-medium" title={file.name}>{file.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
                        }}
                        className={`hover:text-red-500 font-bold ml-1 transition-colors focus:outline-none cursor-pointer ${
                          isDayMode ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            <div className={`h-px my-4 relative z-10 transition-colors duration-300 ${
              isDayMode ? 'bg-black/[0.08]' : 'bg-white/[0.04]'
            }`} />

          {/* Row 2: Selectors & Initiate Production */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Production Type Selector */}
              <CustomSelect
                value={selectedProdType}
                onChange={setSelectedProdType}
                options={productionTypes}
                icon={FiFilm}
                disabled={loading}
              />

              {/* Aspect Ratio Selector */}
              <CustomSelect
                value={aspect}
                onChange={setAspect}
                options={aspectRatios}
                icon={FiMaximize2}
                disabled={loading}
              />

              {/* Style Presets Selector */}
              <CustomSelect
                value={style}
                onChange={setStyle}
                options={styles}
                icon={FiLayers}
                disabled={loading}
              />

              {/* Camera Motion Selector */}
              <CustomSelect
                value={camera}
                onChange={setCamera}
                options={cameraMotions}
                icon={FiVideo}
                disabled={loading}
              />

              {/* Quality Preset Selector */}
              <CustomSelect
                value={quality}
                onChange={setQuality}
                options={qualities}
                icon={FiSliders}
                disabled={loading}
              />

              {/* Orchestration Mode Selector */}
              <CustomSelect
                value={orchestrationMode}
                onChange={setOrchestrationMode}
                options={orchestrationModes}
                icon={PiRobotBold}
                disabled={loading}
              />
            </div>

            {/* Initiate Button */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className="btn-primary ml-auto shrink-0 rounded-xl px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent hover:to-purple-500 text-xs font-semibold uppercase tracking-widest transition-all shadow-[0_4px_16px_rgba(139,92,246,0.25)]"
            >
              {loading ? (
                <>
                  <FiLoader size={12} className="animate-spin" />
                  <span>Generating</span>
                </>
              ) : (
                <>
                  <FiSend size={12} />
                  <span>Initiate Production</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-left max-w-xl mx-auto relative z-10">
          <p className="text-[12px] font-medium text-red-400">Production system failed</p>
          <p className="mt-1 text-[11px] text-red-300/70">{errorMsg}</p>
        </div>
      )}
      </div>
    </section>
  );
}
