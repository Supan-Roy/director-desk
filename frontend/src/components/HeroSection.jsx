import { useState, useEffect, useRef } from 'react';
import { FiSend, FiLoader, FiVideo, FiMaximize2, FiCompass, FiLayers, FiSliders } from 'react-icons/fi';
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
  
  const { generate, loading, hasProject } = useProjectData();

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
      await generate(composedPrompt, orchestrationMode);
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

  return (
    <section className={`relative z-30 mx-auto text-center transition-all duration-500 w-full ${
      hasProject ? 'py-2 mt-1' : 'py-3 mt-2'
    }`}>
      {/* Studio Background Image — behind entire hero block */}
      {!hasProject && (
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
      )}

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
              <div className="flex items-center justify-center h-12 w-12 shrink-0 relative select-none">
                {/* Outer Volumetric Halo */}
                <div className={`absolute inset-0 rounded-full blur-md pointer-events-none transition-all duration-500 ${
                  loading 
                    ? 'bg-emerald-500/10' 
                    : focused 
                      ? 'bg-accent/10' 
                      : 'bg-accent/5'
                }`} />

                {/* Case 1: Loading (Active Production Rendering) */}
                {loading && (
                  <div className="relative w-10 h-10 flex items-center justify-center scale-105">
                    {/* Outer Fast Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400/90 animate-[spin_2s_linear_infinite]" />
                    {/* Middle Fast Ring */}
                    <div className="absolute w-7 h-7 rounded-full border border-dotted border-emerald-300/60 animate-[spin_4s_linear_infinite_reverse]" />
                    {/* Core */}
                    <div className="absolute w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.5)]">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                  </div>
                )}

                {/* Case 2: Unfocused Idle (Default) */}
                {!loading && !focused && (
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    {/* Dotted border guide */}
                    <div className="absolute inset-0 rounded-full border border-white/10 border-dashed" />
                    {/* Glowing core dot */}
                    <div className="h-2.5 w-2.5 rounded-full bg-accent/40 shadow-[0_0_8px_rgba(139,92,246,0.6)] animate-pulse" />
                  </div>
                )}

                {/* Case 3: Focused but animating (first 3 seconds) */}
                {!loading && focused && orbAnimating && (
                  <div className="relative w-10 h-10 flex items-center justify-center scale-105">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-accent/80 animate-[spin_2.5s_linear_infinite]" />
                    {/* Middle Ring */}
                    <div className="absolute w-7 h-7 rounded-full border border-dotted border-purple-400/60 animate-[spin_4s_linear_infinite_reverse]" />
                    {/* Core */}
                    <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-accent/30 via-purple-600/20 to-pink-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.4)]">
                      <div className="w-1.5 h-1.5 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-accent/80 animate-pulse" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-accent/80 animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Case 4: Focused and settled (after 3 seconds) */}
                {!loading && focused && !orbAnimating && (
                  <div className="relative w-10 h-10 flex items-center justify-center scale-105">
                    {/* Outer Ring */}
                    <div className="absolute inset-0 rounded-full border border-dashed border-accent/50 animate-[spin_12s_linear_infinite]" />
                    {/* Middle Ring */}
                    <div className="absolute w-7 h-7 rounded-full border border-dotted border-purple-400/30 animate-[spin_20s_linear_infinite_reverse]" />
                    {/* Core */}
                    <div className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-accent/15 to-purple-800/20 flex items-center justify-center shadow-[0_0_8px_rgba(139,92,246,0.2)]">
                      <div className="w-1.5 h-1.5 relative">
                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-accent/80" />
                        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-accent/80" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt text field */}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Describe your film vision in detail..."
                className={`flex-1 bg-transparent border-0 outline-none placeholder-neutral-500 text-[14px] leading-relaxed resize-none h-20 focus:ring-0 px-1 pt-1 font-mono transition-colors duration-300 ${
                  isDayMode ? 'text-neutral-900' : 'text-white'
                }`}
                disabled={loading}
              />

              {/* Sparkles Action */}
              <button 
                type="button"
                className={`hover:text-accent p-2 rounded-lg transition-colors cursor-pointer shrink-0 mt-1 ${
                  isDayMode ? 'text-neutral-500' : 'text-surface-500'
                }`}
                title="Enhance Prompt"
              >
                <PiSparkle size={16} />
              </button>
            </div>

            {/* Divider */}
            <div className={`h-px my-4 relative z-10 transition-colors duration-300 ${
              isDayMode ? 'bg-black/[0.08]' : 'bg-white/[0.04]'
            }`} />

          {/* Row 2: Selectors & Initiate Production */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 relative z-10">
            <div className="flex flex-wrap items-center gap-2.5">
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
              className="btn-primary shrink-0 rounded-xl px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent hover:to-purple-500 text-xs font-semibold uppercase tracking-widest transition-all shadow-[0_4px_16px_rgba(139,92,246,0.25)]"
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
