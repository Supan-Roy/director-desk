import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiSend, FiLoader, FiVideo, FiMaximize2, FiCompass, FiLayers, FiSliders, FiFilm, FiAlertCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import { PiSparkle, PiRobotBold } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useTheme } from '../context/ThemeContext';
import { DICTIONARY } from '../utils/dictionary';

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

// Custom styled selector to align with professional editing suite aesthetic
function CustomSelect({ label, value, onChange, options, icon: Icon, disabled }) {
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
    <div className={`relative ${isOpen ? 'z-30' : 'z-10'}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center gap-3 rounded-lg px-3 py-1.5 border text-left transition-all duration-150 cursor-pointer focus:outline-none min-w-[155px] ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        } ${
          isDayMode
            ? 'bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100 shadow-sm'
            : 'bg-surface-900 text-white border-surface-700 hover:bg-surface-800 hover:border-surface-600'
        }`}
        disabled={disabled}
      >
        <div className={`p-1.5 rounded shrink-0 ${isDayMode ? 'bg-neutral-200 border border-neutral-300 text-neutral-600' : 'bg-surface-800 border border-surface-700 text-surface-300'}`}>
          <Icon size={12} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <span className={`text-[8px] font-bold uppercase tracking-wider leading-none ${isDayMode ? 'text-neutral-400' : 'text-surface-500'}`}>
            {label}
          </span>
          <span className={`text-[11px] font-bold truncate mt-1 leading-tight ${isDayMode ? 'text-neutral-800' : 'text-surface-100'}`}>
            {activeOption.value || activeOption.label}
          </span>
        </div>
        <span 
          className={`text-[8.5px] ml-1 shrink-0 transition-transform duration-200 ${isDayMode ? 'text-neutral-400' : 'text-surface-400'}`} 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full mt-1.5 z-55 min-w-[185px] rounded-lg border p-1 shadow-2xl space-y-0.5 ${
          isDayMode
            ? 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
            : 'bg-surface-800 border-surface-600 text-surface-200 shadow-black/85'
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
                className={`w-full text-left px-3 py-2 rounded text-[11px] transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? isDayMode
                      ? 'bg-neutral-100 text-neutral-900 font-bold'
                      : 'bg-accent/10 border border-accent/20 text-white font-bold'
                    : isDayMode
                      ? 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      : 'text-surface-300 hover:bg-surface-700 hover:text-white'
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

/*
 * Uses a local 10k English word dictionary to validate words with inflection stripping
 * and a 70% word validation ratio.
 */
function isGibberishPrompt(promptText) {
  if (!promptText || !promptText.trim()) return false;
  
  // Split prompt into clean lowercase alphabetical tokens (keeping hyphens)
  const words = promptText
    .toLowerCase()
    .replace(/[^a-z\s\-]/g, "")
    .split(/[\s\-]+/)
    .filter(w => w.length > 0);
    
  if (words.length === 0) return false;
  
  const keyboardRows = [
    "asdfghjkl",
    "qwertyuiop",
    "zxcvbnm"
  ];
  
  const hasKeyboardWalk = (word) => {
    if (word.length < 4) return false;
    for (const row of keyboardRows) {
      // Check forward row walk
      for (let i = 0; i <= row.length - 4; i++) {
        if (word.includes(row.substring(i, i + 4))) return true;
      }
      // Check backward row walk
      const reversedRow = row.split("").reverse().join("");
      for (let i = 0; i <= reversedRow.length - 4; i++) {
        if (word.includes(reversedRow.substring(i, i + 4))) return true;
      }
    }
    return false;
  };

  const isWordValid = (word) => {
    // 1. Short words (length <= 2) or words containing digits are allowed (e.g. 4k, 3d, 1940s)
    if (word.length <= 2 || /\d/.test(word)) return true;
    
    // 2. Direct dictionary match
    if (DICTIONARY.has(word)) return true;
    
    // 3. Inflections check
    // Plurals / 's
    if (word.endsWith("'s")) {
      if (DICTIONARY.has(word.slice(0, -2))) return true;
    }
    if (word.endsWith("s") && word.length > 3) {
      if (DICTIONARY.has(word.slice(0, -1))) return true;
    }
    if (word.endsWith("es") && word.length > 4) {
      if (DICTIONARY.has(word.slice(0, -2))) return true;
    }
    // Past tense
    if (word.endsWith("ed") && word.length > 4) {
      if (DICTIONARY.has(word.slice(0, -2)) || DICTIONARY.has(word.slice(0, -1))) return true;
    }
    // Adverbs
    if (word.endsWith("ly") && word.length > 4) {
      if (DICTIONARY.has(word.slice(0, -2))) return true;
    }
    // Gerunds
    if (word.endsWith("ing") && word.length > 5) {
      if (DICTIONARY.has(word.slice(0, -3)) || DICTIONARY.has(word.slice(0, -3) + "e")) return true;
    }
    
    return false;
  };
  
  let invalidSequenceFound = false;
  let validWordCount = 0;
  
  for (const word of words) {
    // 1. Single character repeated 4+ times (e.g., "aaaaa")
    if (/(.)\1{3,}/.test(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    // 2. Repeating syllable pattern of length 2-4 repeated 3+ times (e.g., "inininininii", "ababab")
    if (/(.{2,4})\1{2,}/.test(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    // 3. No vowels at all in a word of length >= 4 (e.g., "sdfg")
    if (word.length >= 4 && !/[aeiouy]/.test(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    // 4. Keyboard walk mashups (e.g., "asdf", "lkjh", "qwer")
    if (hasKeyboardWalk(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    // 5. Excessive consecutive consonants (6+ consonants in a row, e.g., "bcdfgh", "zxcvbn")
    if (/[^aeiouy]{6,}/.test(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    // 6. Excessive consecutive vowels (6+ vowels in a row)
    if (/[aeiou]{6,}/.test(word)) {
      invalidSequenceFound = true;
      break;
    }
    
    if (isWordValid(word)) {
      validWordCount++;
    }
  }
  
  if (invalidSequenceFound) return true;
  
  // Ratio calculation: if less than 70% of the words are verified English words, flag as gibberish
  const validRatio = validWordCount / words.length;
  return validRatio < 0.70;
}

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
  const [toastMsg, setToastMsg] = useState('');
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
    setToastMsg('');

    if (isGibberishPrompt(prompt)) {
      setToastMsg("Please enter a valid word or description to enhance your prompt.");
      return;
    }

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
    setErrorMsg('');
    const filesArray = Array.from(e.target.files);

    const MAX_SIZE = 200 * 1024 * 1024; // 200MB
    const blockedExtensions = [
      '.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.bz2',
      '.exe', '.bat', '.cmd', '.sh', '.py', '.js', '.jsx', '.ts', '.tsx', '.vbs', '.msi',
      '.html', '.htm', '.xhtml', '.svg'
    ];
    
    const blockedMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/zip-compressed',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-gzip',
      'application/x-msdownload',
      'application/x-sh',
      'application/x-python',
      'text/html',
      'image/svg+xml'
    ];

    const allowedExtensions = ['.pdf', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.doc', '.docx'];
    const validFiles = [];

    for (const file of filesArray) {
      const fileName = file.name;
      const fileType = file.type || '';
      
      // Extract file extension cleanly
      const extIndex = fileName.lastIndexOf('.');
      const fileExtension = extIndex !== -1 ? fileName.substring(extIndex).toLowerCase() : '';

      // 1. Size Validation
      if (file.size > MAX_SIZE) {
        setErrorMsg(`File "${fileName}" exceeds the maximum allowed limit of 200MB.`);
        e.target.value = '';
        return;
      }

      // 2. Blocklist Validation (Archives/Scripts/Executables)
      const isBlockedExt = blockedExtensions.some(ext => fileExtension === ext || fileName.toLowerCase().endsWith(ext));
      const isBlockedMime = blockedMimeTypes.includes(fileType.toLowerCase());

      if (isBlockedExt || isBlockedMime) {
        if (fileExtension === '.zip' || fileType.includes('zip') || fileType.includes('tar') || fileType.includes('gzip')) {
          setErrorMsg(`ZIP and archive file formats are not allowed for security reasons.`);
        } else {
          setErrorMsg(`File "${fileName}" contains an unsupported or potentially unsafe format.`);
        }
        e.target.value = '';
        return;
      }

      // 3. Allowlist Validation
      const isAllowedExt = allowedExtensions.includes(fileExtension);
      const isImage = fileType.startsWith('image/') && fileType !== 'image/svg+xml';
      const isDoc = fileType === 'application/pdf' || 
                    fileType === 'text/plain' || 
                    fileType === 'text/markdown' ||
                    fileType === 'application/msword' ||
                    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      if (!isAllowedExt && !isImage && !isDoc) {
        setErrorMsg(`Only PDF, TXT, MD, DOC, DOCX, and standard image files (PNG, JPG, WEBP, GIF) are allowed.`);
        e.target.value = '';
        return;
      }

      // 4. Filename Sanitization to prevent directory traversal
      const sanitizedName = fileName
        .replace(/^[.\/\\]+/, '') // remove leading dots/slashes
        .replace(/[\/\\]/g, '_')   // replace internal slashes with underscores
        .replace(/[^a-zA-Z0-9_\-\.\s]/g, ''); // keep safe chars only

      validFiles.push({ file, sanitizedName });
    }

    // Process valid files
    validFiles.forEach(({ file, sanitizedName }) => {
      const reader = new FileReader();
      const fileType = file.type;

      if (fileType.startsWith('image/') || fileType === 'application/pdf') {
        reader.readAsDataURL(file);
        reader.onload = () => {
          setAttachedFiles((prev) => {
            if (prev.some(f => f.name === sanitizedName)) return prev;
            return [...prev, {
              name: sanitizedName,
              type: fileType,
              content: reader.result
            }];
          });
        };
      } else {
        reader.readAsText(file);
        reader.onload = () => {
          setAttachedFiles((prev) => {
            if (prev.some(f => f.name === sanitizedName)) return prev;
            return [...prev, {
              name: sanitizedName,
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

  // Dismiss toast notification after 5 seconds
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => {
      setToastMsg('');
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setErrorMsg('');
    setToastMsg('');

    if (isGibberishPrompt(prompt)) {
      setToastMsg("Please enter a valid word or description to initiate production.");
      return;
    }

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
            {/* Cinematic background artwork (fully visible) */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none rounded-lg opacity-[0.85] filter contrast-[1.05] brightness-[0.95]"
              style={{
                backgroundImage: `url('/images/studio_bg.png')`
              }}
            />
          </>
        ) : (
          // DARK MODE ARTWORK AND OVERLAYS
          <>
            {/* Cinematic background artwork */}
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-[0.85] filter brightness-[0.8] contrast-[1.1] mix-blend-screen rounded-lg"
              style={{ backgroundImage: `url('/images/studio_bg.png')` }}
            />
            {/* Dark overlay (reduced opacity for better visibility) */}
            <div className="absolute inset-0 z-0 pointer-events-none rounded-lg bg-gradient-to-b from-black/50 via-transparent to-black/60" />
            <div className="absolute inset-0 z-0 pointer-events-none rounded-lg bg-gradient-to-r from-[#050505]/50 via-transparent to-[#050505]/50" />
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
            <h2 className={`text-4xl font-black tracking-tight md:text-5xl lg:text-6xl uppercase font-display transition-colors duration-300 hero-title ${
              isDayMode ? 'text-white-force' : 'text-white'
            }`}>
              Director Desk
            </h2>
            <p className={`mx-auto max-w-2xl text-xs font-semibold leading-relaxed font-mono transition-colors duration-300 hero-subtitle ${
              isDayMode ? 'text-neutral-200' : 'text-surface-400'
            }`}>
              AI Showrunner Studio. From concept to cut. Collaborative agents for writers, storyboard artists, critics and editors.
            </p>
          </div>
        )}

        {/* Prompt Input / Production Console Box */}
        <div className={`relative rounded-lg border p-5 transition-all duration-200 text-left ${
          isDayMode
            ? focused 
              ? 'bg-white border-accent shadow-[0_4px_20px_rgba(139,92,246,0.12)]' 
              : 'bg-white border-[#E4E4E7] shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
            : focused 
              ? 'bg-surface-900 border-accent shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
              : 'bg-surface-900 border-surface-700 shadow-none'
        }`}>
          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md,image/*,.doc,.docx"
            className="hidden"
          />

          {/* Viewfinder corner brackets inside the console */}
          <div className={`absolute top-3 left-3 w-3 h-3 border-t border-l transition-all duration-200 pointer-events-none z-10 ${
            isDayMode 
              ? focused ? 'border-accent' : 'border-neutral-300' 
              : focused ? 'border-accent' : 'border-surface-700'
          }`} />
          <div className={`absolute top-3 right-3 w-3 h-3 border-t border-r transition-all duration-200 pointer-events-none z-10 ${
            isDayMode 
              ? focused ? 'border-accent' : 'border-neutral-300' 
              : focused ? 'border-accent' : 'border-surface-700'
          }`} />
          <div className={`absolute bottom-3 left-3 w-3 h-3 border-b border-l transition-all duration-200 pointer-events-none z-10 ${
            isDayMode 
              ? focused ? 'border-accent' : 'border-neutral-300' 
              : focused ? 'border-accent' : 'border-surface-700'
          }`} />
          <div className={`absolute bottom-3 right-3 w-3 h-3 border-b border-r transition-all duration-200 pointer-events-none z-10 ${
            isDayMode 
              ? focused ? 'border-accent' : 'border-neutral-300' 
              : focused ? 'border-accent' : 'border-surface-700'
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
              onChange={(e) => {
                setPrompt(e.target.value);
                if (toastMsg) {
                  setToastMsg('');
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Describe your creative concept or project idea, or drop context files..."
              className={`flex-1 bg-transparent border-0 outline-none text-[14px] leading-relaxed resize-none h-20 focus:ring-0 px-1 pt-1 font-mono transition-colors duration-200 ${
                isDayMode ? 'placeholder-neutral-400 text-neutral-900' : 'placeholder-surface-500 text-white'
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
            isDayMode ? 'bg-black/[0.08]' : 'bg-surface-700'
          }`} />

          {/* Row 2: Selectors & Initiate Production */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Production Type Selector */}
              <CustomSelect
                label="Format"
                value={selectedProdType}
                onChange={setSelectedProdType}
                options={productionTypes}
                icon={FiFilm}
                disabled={loading}
              />

              {/* Aspect Ratio Selector */}
              <CustomSelect
                label="Aspect Ratio"
                value={aspect}
                onChange={setAspect}
                options={aspectRatios}
                icon={FiMaximize2}
                disabled={loading}
              />

              {/* Style Presets Selector */}
              <CustomSelect
                label="Style Preset"
                value={style}
                onChange={setStyle}
                options={styles}
                icon={FiLayers}
                disabled={loading}
              />

              {/* Camera Motion Selector */}
              <CustomSelect
                label="Camera Motion"
                value={camera}
                onChange={setCamera}
                options={cameraMotions}
                icon={FiVideo}
                disabled={loading}
              />

              {/* Quality Preset Selector */}
              <CustomSelect
                label="Render Quality"
                value={quality}
                onChange={setQuality}
                options={qualities}
                icon={FiSliders}
                disabled={loading}
              />

              {/* Orchestration Mode Selector */}
              <CustomSelect
                label="Orchestration"
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
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-black uppercase tracking-[0.25em] transition-all duration-200 focus:outline-none shrink-0 ml-auto cursor-pointer ${
                !prompt.trim() || loading
                  ? isDayMode
                    ? 'opacity-40 cursor-not-allowed border-transparent bg-neutral-200 text-neutral-400'
                    : 'cursor-not-allowed border border-[#2A2A2A] bg-[#1A1A1A] text-[#666666]'
                  : isDayMode
                    ? 'bg-accent border border-accent text-white-force hover:bg-accent-dim hover:shadow-[0_4px_12px_rgba(139,92,246,0.25)]'
                    : 'bg-surface-950 border border-accent text-white hover:bg-accent/10 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]'
              }`}
            >
              {loading ? (
                <>
                  <FiLoader size={12} className="animate-spin" />
                  <span>Generating</span>
                </>
              ) : (
                <>
                  <span className={`text-[10px] mr-0.5 ${
                    !prompt.trim() || loading
                      ? isDayMode ? 'text-neutral-400' : 'text-[#666666]'
                      : isDayMode ? 'text-white-force' : 'text-accent'
                  }`}>▶</span>
                  <span>Initiate Production</span>
                </>
              )}
            </button>
          </div>
        </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/[0.03] shadow-[0_0_25px_rgba(245,158,11,0.08)] px-5 py-4 text-left max-w-xl mx-auto relative z-10 animate-[bounce_0.6s_ease-out_1] flex gap-4 items-start ring-1 ring-amber-500/10 transition-all duration-300">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
            <FiAlertTriangle size={18} className="animate-pulse" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-400">System & Safety Advisory</p>
            <p className="text-xs leading-relaxed text-amber-200/90 font-medium">{errorMsg}</p>
          </div>
          <button 
            onClick={() => setErrorMsg('')}
            className="text-amber-400/50 hover:text-amber-400 p-1 rounded-md hover:bg-amber-500/10 transition-colors"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && createPortal(
        <div 
          key={toastMsg}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100000] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl animate-toast-in max-w-sm w-[90%] transition-all duration-300 ${
            isDayMode 
              ? 'bg-white border-[#FECACA] text-red-600' 
              : 'bg-black border-red-950/60 text-red-500'
          }`}
          style={{
            zIndex: 100000,
            boxShadow: isDayMode 
              ? '0 10px 30px -10px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)' 
              : '0 10px 30px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <FiAlertCircle size={15} className="shrink-0 text-red-500 animate-pulse" />
          <p className="flex-1 text-[11px] font-semibold leading-normal font-mono text-left">
            {toastMsg}
          </p>
          <button 
            onClick={() => setToastMsg('')}
            className={`text-base font-bold leading-none p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${
              isDayMode ? 'text-neutral-400 hover:text-neutral-600' : 'text-surface-500 hover:text-white'
            }`}
            title="Dismiss"
          >
            &times;
          </button>
        </div>,
        document.body
      )}
      </div>
    </section>
  );
}
