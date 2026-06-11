import { useState, useEffect, useRef } from 'react';
import { FiSend, FiLoader, FiVideo, FiMaximize2, FiCompass, FiLayers } from 'react-icons/fi';
import { useProjectData } from '../hooks/useProjectData';

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
        className={`flex items-center gap-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] px-3 py-1.5 border border-white/[0.04] text-[11px] font-medium text-surface-300 transition-all cursor-pointer focus:outline-none ${
          disabled ? 'opacity-40 cursor-not-allowed' : ''
        }`}
        disabled={disabled}
      >
        <Icon size={12} className="text-surface-500" />
        <span>{activeOption.label}</span>
        <span 
          className="text-[7px] text-surface-500 ml-1 transition-transform duration-200" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-white/[0.06] bg-surface-950/95 backdrop-blur-xl p-1 shadow-elevated space-y-0.5">
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
                    ? 'bg-accent/20 text-accent font-semibold'
                    : 'text-surface-400 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <span className="text-[6px]">●</span>}
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
  const [errorMsg, setErrorMsg] = useState('');
  
  const { generate, loading, hasProject } = useProjectData();

  const handleSubmit = async () => {
    if (!prompt.trim() || loading) return;
    setErrorMsg('');

    // Compose a rich prompt containing the cinematic settings
    const selectedAspect = aspectRatios.find(a => a.id === aspect)?.value || '16:9';
    const selectedStyle = styles.find(s => s.id === style)?.value || 'Default';
    const selectedCamera = cameraMotions.find(c => c.id === camera)?.value || 'Static';

    const composedPrompt = `${prompt.trim()}\n[Aspect: ${selectedAspect}, Style: ${selectedStyle}, Motion: ${selectedCamera}]`;
    
    try {
      await generate(composedPrompt);
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
    <section className={`relative mx-auto text-center transition-all duration-500 max-w-4xl ${
      hasProject ? 'py-4 mt-2' : 'min-h-[60vh] flex flex-col justify-center py-12'
    }`}>
      {/* Immersive lens flare beam glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[600px] -translate-x-1/2 rounded-full bg-gradient-radial from-accent/[0.07] to-transparent blur-3xl" />

      <div className="relative z-10 space-y-6">
        {/* Cinematic Titles */}
        {!hasProject && (
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
              Creative Production Engine
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl">
              Director Desk
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-surface-400 md:text-base">
              Enter your concept. Collaborating AI showrunner agents will compose screenplay scripts, script storyboard shots, and draft timelines.
            </p>
          </div>
        )}

        {/* Prompt Input Box */}
        <div className="glass-panel rounded-2xl p-4 shadow-elevated border border-white/[0.05] bg-surface-950/20 backdrop-blur-md">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your film vision in detail..."
            className="w-full bg-transparent border-0 outline-none text-white placeholder-surface-600 text-[15px] resize-none h-24 focus:ring-0 px-2 pt-1"
            disabled={loading}
          />

          {/* Divider */}
          <div className="h-px bg-white/[0.04] my-3" />

          {/* Custom Film Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex flex-wrap items-center gap-3">
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
            </div>

            {/* Launch Button */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className="btn-primary shrink-0 rounded-xl px-5 py-2.5 flex items-center gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent hover:to-purple-500 text-xs font-semibold uppercase tracking-wider"
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

        {/* Cinematic Suggestions */}
        {!prompt && !errorMsg && !hasProject && (
          <div className="space-y-2 mt-4 animate-fade-in">
            <p className="text-[11px] font-medium uppercase tracking-widest text-surface-500 flex items-center justify-center gap-1.5">
              <FiCompass size={11} className="text-accent/60" />
              <span>Suggested Studio Prompts</span>
            </p>
            <div className="flex flex-col items-center gap-2">
              {detailedSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplySuggestion(sug)}
                  className="w-full max-w-xl text-left rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-2.5 text-xs text-surface-400 transition-all hover:border-accent/20 hover:bg-accent/[0.02] hover:text-surface-200"
                >
                  "{sug.text}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] px-4 py-3 text-left max-w-xl mx-auto">
            <p className="text-[12px] font-medium text-red-400">Production system failed</p>
            <p className="mt-1 text-[11px] text-red-300/70">{errorMsg}</p>
          </div>
        )}
      </div>
    </section>
  );
}
