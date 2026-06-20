import { useState } from 'react';
import { marked } from 'marked';
import { 
  FiFileText, FiImage, FiClipboard, FiEdit3, FiCheck,
  FiTrendingUp, FiAlertCircle, FiCheckSquare, FiAward, FiStar, FiList
} from 'react-icons/fi';
import { PiSparkle } from 'react-icons/pi';
import { useProjectData } from '../hooks/useProjectData';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const tabs = [
  { id: 'script', label: 'Script', icon: FiFileText },
  { id: 'storyboard', label: 'Storyboard', icon: FiImage },
  { id: 'breakdown', label: 'Scene Breakdown', icon: FiList },
  { id: 'plan', label: 'Plan', icon: FiClipboard },
  { id: 'review', label: 'Review', icon: FiStar },
];

function ScriptTab({ script }) {
  const { updateScript, originalScript } = useProjectData();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(script || '');
  const [copied, setCopied] = useState(false);
  const [viewVersion, setViewVersion] = useState('refined');

  useEffect(() => {
    setText(script || '');
  }, [script]);

  const hasMultipleVersions = originalScript && script && originalScript !== script;
  const activeText = viewVersion === 'original' ? (originalScript || script) : text;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    updateScript(text);
    setIsEditing(false);
  };

  if (!script && !isEditing) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Script will appear here after generation.</p>
      </div>
    );
  }

  // Parse lines and render custom screenplay components with inline markdown compiled
  const renderScriptLines = (textVal) => {
    const lines = textVal.split('\n');
    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} className="h-4" />;

      // 1. Trailer Titles / Headings
      if (trimmed.startsWith('# ')) {
        const html = marked.parseInline(trimmed.substring(2));
        return (
          <h1 
            key={i}
            className="text-3xl md:text-4xl font-extrabold tracking-[0.18em] text-white text-center uppercase my-12 font-display select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (trimmed.startsWith('## ')) {
        const html = marked.parseInline(trimmed.substring(3));
        return (
          <h2 
            key={i}
            className="text-xl md:text-2xl font-bold tracking-[0.12em] text-surface-100 uppercase mt-10 mb-4 font-display select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      if (trimmed.startsWith('### ')) {
        const html = marked.parseInline(trimmed.substring(4));
        return (
          <h3 
            key={i}
            className="text-lg font-semibold text-surface-200 mt-8 mb-4 select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 2. Spoken Dialogue Quote Blocks (starts with >)
      if (trimmed.startsWith('>')) {
        const rawText = trimmed.substring(1).trim();
        const html = marked.parseInline(rawText);
        return (
          <div key={i} className="my-6 flex justify-center select-text">
            <blockquote 
              className="max-w-[70%] border-l-2 border-accent bg-accent/[0.02] px-6 py-4 rounded-r-xl text-center italic text-xs text-surface-200 leading-relaxed font-mono"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      }

      // 3. Scene Headings (e.g. SCENE 1: or INT. or EXT.)
      const isSceneHeading = /^(SCENE\s+\d+|INT\.|EXT\.)/i.test(trimmed);
      if (isSceneHeading) {
        const html = marked.parseInline(trimmed);
        return (
          <div key={i} className="my-8 border-b border-white/[0.06] pb-2 select-text">
            <h3 
              className="text-xs font-bold tracking-[0.2em] text-accent uppercase font-mono"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        );
      }

      // 4. Actor Parentheticals
      if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        const html = marked.parseInline(trimmed);
        return (
          <p 
            key={i}
            className="text-center italic text-xs text-surface-500 my-1 font-mono select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 5. Character Names
      const isCharacterName = /^[A-Z][A-Z\s\.]{1,20}$/.test(trimmed) && trimmed.length > 1;
      if (isCharacterName) {
        const html = marked.parseInline(trimmed);
        return (
          <p 
            key={i}
            className="text-center font-bold tracking-widest text-xs text-surface-100 uppercase mt-6 mb-1 font-mono select-text"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }

      // 6. Action Lines / Regular Paragraphs
      const html = marked.parseInline(trimmed);
      return (
        <p 
          key={i}
          className="text-sm text-surface-400 leading-relaxed my-3 font-mono select-text"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    });
  };

  return (
    <div className="glass-panel rounded-xl p-8 bg-surface-950/45 border border-white/[0.03] screenplay-prose flex flex-col gap-4">
      {/* Version and Edit/Copy Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] pb-3 mb-2">
        {hasMultipleVersions ? (
          <div className="flex gap-1 rounded-lg bg-white/[0.02] p-0.5 border border-white/[0.04] text-[9px] uppercase font-bold tracking-wider select-none">
            <button
              onClick={() => { setViewVersion('original'); setIsEditing(false); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewVersion === 'original'
                  ? 'bg-white/[0.06] text-white'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Original Draft
            </button>
            <button
              onClick={() => { setViewVersion('refined'); }}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewVersion === 'refined'
                  ? 'bg-accent/20 text-accent font-semibold'
                  : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              Refined Draft
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="flex gap-2">
          {viewVersion === 'refined' && (
            isEditing ? (
              <button
                onClick={handleSave}
                title="Save script"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent/90 transition-all"
              >
                <FiCheck size={12} />
                <span>Save</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit script manually"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:text-white transition-all"
              >
                <FiEdit3 size={12} />
                <span>Edit</span>
              </button>
            )
          )}
          {viewVersion === 'original' && (
            <span className="text-[10px] text-surface-500 italic flex items-center pr-1.5 select-none">
              Original version is read-only
            </span>
          )}
          <button
            onClick={handleCopy}
            title="Copy full script"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:text-white transition-all"
          >
            {copied ? <FiCheck size={12} className="text-emerald-400" /> : <FiClipboard size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={18}
          className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-xs font-mono leading-relaxed text-surface-300 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
        />
      ) : (
        <div className="prose prose-invert max-w-none select-text">
          {renderScriptLines(activeText)}
        </div>
      )}
    </div>
  );
}

function StoryboardTab({ storyboard, productionType }) {
  const isAudio = productionType === 'Podcast' || productionType === 'Audio Story';
  if (!storyboard || storyboard.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">
          {isAudio 
            ? "Not applicable for audio-only productions (Podcasts, Audio Stories)." 
            : "Storyboard scenes will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {storyboard.map((scene) => (
        <div key={scene.scene} className="scene-card flex gap-4">
          {/* Scene number + thumbnail placeholder */}
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="flex h-14 w-20 items-center justify-center rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
              <FiImage size={16} className="text-surface-600" />
            </div>
            <span className="text-[10px] font-semibold text-accent/60">
              #{scene.scene}
            </span>
          </div>

          {/* Scene details */}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-medium text-surface-200">{scene.shot}</h4>
            </div>
            <p className="text-[12px] leading-relaxed text-surface-400">{scene.description}</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge-shot">{scene.shot}</span>
              <span className="badge-mood">{scene.mood}</span>
            </div>
            <p className="text-[11px] text-surface-500">
              <span className="text-surface-600">Env:</span> {scene.environment}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneBreakdownTab({ breakdown, productionType }) {
  const isAudio = productionType === 'Podcast' || productionType === 'Audio Story';
  const { isDayMode: d } = useTheme();
  const [copiedPrompt, setCopiedPrompt] = useState(null);

  const handleCopyPrompt = (promptText, index) => {
    navigator.clipboard.writeText(promptText);
    setCopiedPrompt(index);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  if (isAudio) {
    return (
      <div className={`flex min-h-[260px] flex-col items-center justify-center text-sm gap-3 p-6 text-center ${
        d ? 'text-neutral-500' : 'text-surface-400'
      }`}>
        <span className="text-3xl">🎙️</span>
        <h4 className="font-bold tracking-wide">Audio Production Format</h4>
        <p className="max-w-md text-xs leading-relaxed opacity-80">
          Scene breakdowns and visual technical prompts are optimized for video models (Veo, Wan, HappyHorse). Audio-only formats bypass visual specification pipelines.
        </p>
      </div>
    );
  }

  if (!breakdown || !breakdown.scenes || breakdown.scenes.length === 0) {
    return (
      <div className={`flex min-h-[260px] flex-col items-center justify-center text-sm gap-2 ${
        d ? 'text-neutral-400' : 'text-surface-550'
      }`}>
        <span>🎬</span>
        <span>No scene breakdown generated yet. Run production to compile specifications.</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left">
      {/* Overview Block */}
      <div className={`rounded-xl border p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
        d ? 'bg-neutral-50/50 border-neutral-200' : 'bg-[#111111] border-white/[0.04]'
      }`}>
        <div>
          <h4 className={`text-xs font-bold uppercase tracking-[0.15em] ${d ? 'text-neutral-500' : 'text-surface-400'}`}>
            Scene Specs Overview
          </h4>
          <p className={`text-[10px] mt-1 font-mono ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
            Optimized for Wan, Veo, HappyHorse, and Luma Video Pipelines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className={`text-[9px] font-semibold tracking-wider font-mono ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
              ESTIMATED RUNTIME
            </span>
            <span className="text-sm font-black text-accent">
              {breakdown.total_runtime || "Calculating..."}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings Block */}
      {breakdown.consistency_warnings && breakdown.consistency_warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-4">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
            <FiAlertCircle size={14} />
            <span>Consistency Audit Warnings</span>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {breakdown.consistency_warnings.map((warn, i) => (
              <li key={i} className={`text-[11px] font-mono leading-relaxed ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scenes List */}
      <div className="space-y-6">
        {breakdown.scenes.map((scene, idx) => (
          <div 
            key={idx} 
            className={`rounded-xl border transition-all duration-300 ${
              d 
                ? 'bg-white border-neutral-200 shadow-sm hover:border-neutral-300' 
                : 'bg-[#0B0B0B] border-white/[0.05] hover:border-white/[0.08]'
            }`}
          >
            {/* Scene Header */}
            <div className={`px-5 py-4 border-b flex flex-wrap justify-between items-center gap-3 ${
              d ? 'border-neutral-100 bg-neutral-50/30' : 'border-white/[0.04] bg-[#111111]/30'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold font-mono text-accent">
                  {scene.scene_number || `SCENE ${idx + 1}`}
                </span>
                <h3 className={`text-sm font-bold tracking-wide truncate ${d ? 'text-neutral-900' : 'text-white'}`}>
                  {scene.title || "Untitled Scene"}
                </h3>
              </div>
              <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${
                d ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-white/[0.03] border-white/[0.08] text-surface-400'
              }`}>
                ⏱️ {scene.duration || "8s"}
              </span>
            </div>

            {/* Scene Specs Grid */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-[12px] leading-relaxed">
              {/* Col 1: Environment & Location */}
              <div className="space-y-3.5">
                <div className={`border-b pb-2 ${d ? 'border-neutral-100' : 'border-white/[0.04]'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                    Location & Space
                  </span>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Location</span>
                  <span className={`font-mono block mt-0.5 ${d ? 'text-neutral-955' : 'text-neutral-200'}`}>{scene.location || "N/A"}</span>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Environment</span>
                  <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'}`}>{scene.environment || "N/A"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Time of Day</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'}`}>{scene.time_of_day || "N/A"}</span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Weather</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'}`}>{scene.weather || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Col 2: Casting & Props */}
              <div className="space-y-3.5">
                <div className={`border-b pb-2 ${d ? 'border-neutral-100' : 'border-white/[0.04]'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                    Casting & Props
                  </span>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Characters</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(scene.characters) ? (
                      scene.characters.map((char, i) => (
                        <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                          d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/[0.02] border-white/[0.06] text-neutral-200'
                        }`}>
                          {char}
                        </span>
                      ))
                    ) : (
                      <span className={`text-neutral-350`}>{scene.characters || "None"}</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Visual Profile & Wardrobe</span>
                  <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'}`}>{scene.character_descriptions || scene.wardrobe || "N/A"}</span>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Key Props</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.isArray(scene.props) ? (
                      scene.props.map((prop, i) => (
                        <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                          d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/[0.02] border-white/[0.06] text-neutral-300'
                        }`}>
                          {prop}
                        </span>
                      ))
                    ) : (
                      <span className={`text-neutral-350`}>{scene.props || "None"}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 3: Cinematography & Audio */}
              <div className="space-y-3.5">
                <div className={`border-b pb-2 ${d ? 'border-neutral-100' : 'border-white/[0.04]'}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                    Cinematography & Audio
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Camera Setup</span>
                    <span className={`block mt-0.5 font-mono text-[10px] ${d ? 'text-neutral-905' : 'text-neutral-200'}`}>{scene.camera_setup || "N/A"}</span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Movement</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'}`}>{scene.camera_movement || "N/A"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Shot Type</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'}`}>{scene.shot_type || "N/A"}</span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Lighting</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'}`}>{scene.lighting_design || "N/A"}</span>
                  </div>
                </div>
                <div>
                  <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Audio Design & SFX</span>
                  <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'}`}>{scene.audio_notes || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Prompt Generation Section */}
            <div className={`px-5 py-4 border-t flex flex-col gap-3 rounded-b-xl ${
              d ? 'border-neutral-100 bg-neutral-50/20' : 'border-white/[0.04] bg-white/[0.005]'
            }`}>
              {/* AI Visual Prompt */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent">
                    AI Generation Prompt (Wan/Veo/Luma Optimized)
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(scene.ai_generation_prompt, idx)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold tracking-wide uppercase transition-all duration-150 cursor-pointer ${
                      copiedPrompt === idx 
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-accent/10 text-accent hover:bg-accent/20'
                    }`}
                  >
                    {copiedPrompt === idx ? (
                      <>
                        <FiCheck size={10} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>📋 Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <p className={`font-mono text-[11px] leading-relaxed p-3 rounded-lg border whitespace-pre-wrap select-all ${
                  d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-black/40 border-white/[0.04] text-neutral-200'
                }`}>
                  {scene.ai_generation_prompt || "N/A"}
                </p>
              </div>

              {/* Negative Prompt */}
              {scene.negative_prompt && (
                <div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                    Negative Prompt
                  </span>
                  <p className={`font-mono text-[10px] p-2.5 rounded-lg border ${
                    d ? 'bg-neutral-50/50 border-neutral-150 text-neutral-500' : 'bg-black/20 border-white/[0.03] text-surface-400'
                  }`}>
                    {scene.negative_prompt}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Consolidated Asset Requirements */}
      {breakdown.asset_requirements && (
        <div className={`rounded-xl border p-5 ${
          d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
        }`}>
          <div className="flex items-center gap-2.5 border-b pb-3 mb-4 border-white/[0.04]">
            <span className="text-base">📦</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Consolidated Asset Requirements
              </h3>
              <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                Downstream pipeline requisition block (Production Agent consumer)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 text-[11px]">
            {/* Characters */}
            <div className="space-y-2">
              <span className={`font-bold uppercase tracking-wider text-[9px] block ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                Characters Needed
              </span>
              <ul className="space-y-1 list-inside list-disc">
                {Array.isArray(breakdown.asset_requirements.characters_needed) && breakdown.asset_requirements.characters_needed.length > 0 ? (
                  breakdown.asset_requirements.characters_needed.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={item}>{item}</li>
                  ))
                ) : (
                  <li className="text-surface-500 font-mono list-none">None</li>
                )}
              </ul>
            </div>

            {/* Locations */}
            <div className="space-y-2">
              <span className={`font-bold uppercase tracking-wider text-[9px] block ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                Locations Needed
              </span>
              <ul className="space-y-1 list-inside list-disc">
                {Array.isArray(breakdown.asset_requirements.locations_needed) && breakdown.asset_requirements.locations_needed.length > 0 ? (
                  breakdown.asset_requirements.locations_needed.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={item}>{item}</li>
                  ))
                ) : (
                  <li className="text-surface-500 font-mono list-none">None</li>
                )}
              </ul>
            </div>

            {/* Props */}
            <div className="space-y-2">
              <span className={`font-bold uppercase tracking-wider text-[9px] block ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                Props Needed
              </span>
              <ul className="space-y-1 list-inside list-disc">
                {Array.isArray(breakdown.asset_requirements.props_needed) && breakdown.asset_requirements.props_needed.length > 0 ? (
                  breakdown.asset_requirements.props_needed.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={item}>{item}</li>
                  ))
                ) : (
                  <li className="text-surface-500 font-mono list-none">None</li>
                )}
              </ul>
            </div>

            {/* Sound */}
            <div className="space-y-2">
              <span className={`font-bold uppercase tracking-wider text-[9px] block ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                Sound Design SFX
              </span>
              <ul className="space-y-1 list-inside list-disc">
                {Array.isArray(breakdown.asset_requirements.sound_requirements) && breakdown.asset_requirements.sound_requirements.length > 0 ? (
                  breakdown.asset_requirements.sound_requirements.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-355'}`} title={item}>{item}</li>
                  ))
                ) : (
                  <li className="text-surface-500 font-mono list-none">None</li>
                )}
              </ul>
            </div>

            {/* VFX */}
            <div className="space-y-2">
              <span className={`font-bold uppercase tracking-wider text-[9px] block ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                VFX Overlay Cues
              </span>
              <ul className="space-y-1 list-inside list-disc">
                {Array.isArray(breakdown.asset_requirements.vfx_requirements) && breakdown.asset_requirements.vfx_requirements.length > 0 ? (
                  breakdown.asset_requirements.vfx_requirements.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={item}>{item}</li>
                  ))
                ) : (
                  <li className="text-surface-500 font-mono list-none">None</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductionPlanTab({ plan }) {
  if (!plan) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Production plan will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-surface-200">{plan.title}</h4>
      {plan.phases.map((phase) => (
        <div key={phase.name} className="glass-panel rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h5 className="text-[13px] font-medium text-surface-200">{phase.name}</h5>
            <span
              className={`text-[11px] ${
                phase.status === 'complete'
                  ? 'text-emerald-400/80'
                  : 'text-surface-600'
              }`}
            >
              {phase.status === 'complete' ? '✓ Done' : 'Pending'}
            </span>
          </div>
          <ul className="space-y-2">
            {phase.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-surface-400">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                    phase.status === 'complete'
                      ? 'bg-emerald-400/60'
                      : 'bg-surface-600'
                  }`}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ReviewTab({ criticReview, approved, onApprove, onRefine, loading }) {
  if (!criticReview) {
    return (
      <div className="flex min-h-[280px] items-center justify-center glass-panel rounded-xl">
        <p className="text-sm text-surface-600">Review will appear after the Critic Agent completes its review.</p>
      </div>
    );
  }

  const { score, strengths = [], weaknesses = [], suggestions = [] } = criticReview;

  return (
    <div className="space-y-6">
      {/* Score and Header Card */}
      <div className="glass-panel rounded-2xl p-6 bg-surface-950/45 border border-white/[0.04] flex items-center justify-between gap-6 flex-wrap">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold tracking-wide text-white">Quality Review Report</h4>
          <p className="text-[11.5px] text-surface-400">Actionable assessment focused on structure, pacing, clarity, and engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] uppercase font-bold tracking-widest text-surface-500">Overall Score</div>
          <div className="flex items-center justify-center w-14 h-14 rounded-full border border-accent/25 bg-accent/5 text-xl font-extrabold text-accent shadow-[0_0_15px_rgba(139,92,246,0.15)] select-none">
            {score}/10
          </div>
        </div>
      </div>

      {/* Review Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="glass-panel rounded-xl p-5 border border-emerald-500/10 bg-emerald-500/[0.02]">
          <div className="flex items-center gap-2 mb-3.5 text-emerald-400">
            <FiCheckSquare size={14} />
            <h5 className="text-[11px] font-bold uppercase tracking-wider">Strengths</h5>
          </div>
          <ul className="space-y-2.5">
            {strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-surface-300 leading-relaxed">
                <span className="text-emerald-400 mt-1 shrink-0 select-none">•</span>
                <span>{str}</span>
              </li>
            ))}
            {strengths.length === 0 && (
              <li className="text-[12px] text-surface-500 italic">No strengths listed.</li>
            )}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="glass-panel rounded-xl p-5 border border-rose-500/10 bg-rose-500/[0.02]">
          <div className="flex items-center gap-2 mb-3.5 text-rose-400">
            <FiAlertCircle size={14} />
            <h5 className="text-[11px] font-bold uppercase tracking-wider">Weaknesses</h5>
          </div>
          <ul className="space-y-2.5">
            {weaknesses.map((wk, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-surface-300 leading-relaxed">
                <span className="text-rose-400 mt-1 shrink-0 select-none">•</span>
                <span>{wk}</span>
              </li>
            ))}
            {weaknesses.length === 0 && (
              <li className="text-[12px] text-surface-500 italic">No weaknesses listed.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      <div className="glass-panel rounded-xl p-5 border border-white/[0.03] bg-surface-950/20">
        <div className="flex items-center gap-2 mb-3.5 text-accent">
          <FiTrendingUp size={14} />
          <h5 className="text-[11px] font-bold uppercase tracking-wider">Refinement Suggestions</h5>
        </div>
        <ul className="space-y-3">
          {suggestions.map((sug, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12px] text-surface-300 leading-relaxed">
              <span className="text-accent font-mono font-bold mt-0.5 shrink-0 select-none">{i+1}.</span>
              <span>{sug}</span>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="text-[12px] text-surface-500 italic">No suggestions listed.</li>
          )}
        </ul>
      </div>

      {/* Action Area */}
      <div className="border-t border-white/[0.04] pt-5 mt-2">
        {approved ? (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15">
                <FiAward size={15} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider">Production Approved</span>
                <span className="text-[10px] text-emerald-500/70">Ready for visual asset and video generation pipelines.</span>
              </div>
            </div>
            <span className="text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider select-none">✓ Ready</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider py-3 shadow-[0_0_16px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all duration-300 disabled:opacity-40"
            >
              <FiCheckSquare size={13} />
              <span>Continue Production</span>
            </button>
            <button
              onClick={onRefine}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-accent/25 hover:border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent font-semibold text-xs uppercase tracking-wider py-3 shadow-[0_0_16px_rgba(139,92,246,0.05)] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition-all duration-300 disabled:opacity-40"
            >
              <PiSparkle size={13} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Refining Draft..." : "Refine Draft"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TabbedContent() {
  const [activeTab, setActiveTab] = useState('script');
  const { 
    script, 
    storyboard, 
    productionPlan, 
    productionType, 
    criticReview, 
    approved,
    approveProject,
    refineProject,
    loading,
    sceneBreakdown
  } = useProjectData();

  return (
    <section>
      {/* Section label */}
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-surface-500">
          Production Output
        </h3>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>

      {/* Tab headers */}
      <div className="mb-4 flex gap-1 rounded-xl bg-white/[0.02] p-1 ring-1 ring-white/[0.04]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'tab-active'
                : 'text-surface-500 hover:text-surface-300'
            }`}
          >
            <tab.icon size={13} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-h-[520px] overflow-y-auto pr-1">
        {activeTab === 'script' && <ScriptTab script={script} />}
        {activeTab === 'storyboard' && <StoryboardTab storyboard={storyboard} productionType={productionType} />}
        {activeTab === 'breakdown' && <SceneBreakdownTab breakdown={sceneBreakdown} productionType={productionType} />}
        {activeTab === 'plan' && <ProductionPlanTab plan={productionPlan} />}
        {activeTab === 'review' && (
          <ReviewTab 
            criticReview={criticReview} 
            approved={approved} 
            onApprove={approveProject} 
            onRefine={refineProject} 
            loading={loading} 
          />
        )}
      </div>
    </section>
  );
}
