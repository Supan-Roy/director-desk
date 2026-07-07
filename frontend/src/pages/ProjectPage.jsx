import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { marked } from 'marked';
import {
  FiArrowLeft, FiArrowRight, FiEdit3, FiSend, FiX, FiFileText, FiList,
  FiImage, FiClipboard, FiLoader, FiClock, FiFilm, FiCheck, FiShare2,
  FiTrendingUp, FiAlertCircle, FiCheckSquare, FiAward, FiStar, FiCheckCircle, FiInfo, FiAlertTriangle
} from 'react-icons/fi';
import { PiSparkle } from 'react-icons/pi';
import { 
  getProjectById, apiBaseUrl, updateProjectScript,
  updateProjectApproval, refineProjectScript 
} from '../services/apiClient';
import Sidebar from '../components/Sidebar';
import ProjectIcon from '../components/ProjectIcon';
import AgentActivityPanel from '../components/AgentActivityPanel';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../hooks/useProjectData';
import { decodeProjectRouteId } from '../utils/hashids';
import Footer from '../components/Footer';

// ── Reusable script renderer (copied from TabbedContent) ──────────────────
function ScriptView({ script, originalScript, onSave, readOnly }) {
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
    if (onSave) {
      onSave(text);
    }
    setIsEditing(false);
  };

  if (!script && !isEditing) return (
    <div className="flex min-h-[260px] items-center justify-center text-surface-600 text-sm">
      No script available.
    </div>
  );
 
  const lines = activeText.split('\n');
  return (
    <div className="space-y-4">
      {/* Version and Edit/Copy Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.04] pb-3 mb-4">
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
          {readOnly && (
            <span className="text-[10px] text-surface-500 italic flex items-center pr-1.5 select-none">
              Production active: script is locked
            </span>
          )}
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
              !readOnly && (
                <button
                  onClick={() => setIsEditing(true)}
                  title="Edit script manually"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider bg-white/[0.03] border border-white/[0.08] text-surface-300 hover:bg-white/[0.08] hover:text-white transition-all"
                >
                  <FiEdit3 size={12} />
                  <span>Edit</span>
                </button>
              )
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
        <div className="prose prose-invert max-w-none screenplay-prose">
          {lines.map((line, i) => {
            const t = line.trim();
            if (!t) return <div key={i} className="h-3" />;
            if (t.startsWith('# ')) return <h1 key={i} className="text-3xl font-extrabold tracking-[0.18em] text-white text-center uppercase my-10 font-display" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(2)) }} />;
            if (t.startsWith('## ')) return <h2 key={i} className="text-xl font-bold tracking-[0.1em] text-surface-100 uppercase mt-8 mb-3 font-display" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(3)) }} />;
            if (t.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-surface-200 mt-6 mb-3" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(4)) }} />;
            if (t.startsWith('>')) return (
              <div key={i} className="my-5 flex justify-center">
                <blockquote className="max-w-[70%] border-l-2 border-accent bg-accent/[0.02] px-6 py-3 rounded-r-xl text-center italic text-xs text-surface-200 leading-relaxed font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t.slice(1).trim()) }} />
              </div>
            );
            if (/^(SCENE\s+\d+|INT\.|EXT\.)/i.test(t)) return (
              <div key={i} className="my-6 border-b border-white/[0.06] pb-2">
                <h3 className="text-xs font-bold tracking-[0.2em] text-accent uppercase font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />
              </div>
            );
            if (t.startsWith('(') && t.endsWith(')')) return <p key={i} className="text-center italic text-xs text-surface-500 my-1 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
            if (/^[A-Z][A-Z\s.]{1,20}$/.test(t) && t.length > 1) return <p key={i} className="text-center font-bold tracking-widest text-xs text-surface-100 uppercase mt-5 mb-1 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
            return <p key={i} className="text-sm text-surface-400 leading-relaxed my-2 font-mono" dangerouslySetInnerHTML={{ __html: marked.parseInline(t) }} />;
          })}
        </div>
      )}
    </div>
  );
}

function StoryboardView({ storyboard, productionType, onProceed, loading }) {
  const isAudio = productionType === 'Podcast' || productionType === 'Audio Story';
  if (!Array.isArray(storyboard) || storyboard.length === 0) return (
    <div className="flex flex-col min-h-[260px] items-center justify-center text-center gap-4">
      <p className="text-surface-600 text-sm">
        {isAudio ? 'Not applicable for audio productions.' : 'No storyboard available.'}
      </p>
      {!isAudio && onProceed && (
        <button
          onClick={onProceed}
          disabled={loading}
          className="btn-accent px-4 py-2 disabled:opacity-50 text-xs tracking-wider transition-colors shadow-none"
        >
          {loading ? 'Resuming...' : 'Compile Storyboard & subsequent steps'}
        </button>
      )}
    </div>
  );
  return (
    <div className="space-y-3">
      {Array.isArray(storyboard) && storyboard.map((s, idx) => {
        if (!s) return null;

        let sceneNum = idx + 1;
        if (s.scene !== undefined && s.scene !== null) {
          sceneNum = typeof s.scene === 'object' ? (s.scene.scene ?? s.scene.number ?? idx + 1) : s.scene;
        } else if (s.scene_number !== undefined && s.scene_number !== null) {
          sceneNum = typeof s.scene_number === 'object' ? (s.scene_number.scene ?? s.scene_number.number ?? idx + 1) : s.scene_number;
        }

        let shotVal = "Untitled Shot";
        if (s.shot !== undefined && s.shot !== null) {
          shotVal = typeof s.shot === 'object' ? (s.shot.shot ?? s.shot.title ?? "Untitled Shot") : s.shot;
        } else if (s.camera_shot !== undefined && s.camera_shot !== null) {
          shotVal = typeof s.camera_shot === 'object' ? (s.camera_shot.shot ?? s.camera_shot.title ?? "Untitled Shot") : s.camera_shot;
        }

        let descVal = "";
        if (s.description !== undefined && s.description !== null) {
          descVal = typeof s.description === 'object' ? (s.description.description ?? s.description.text ?? "") : s.description;
        }

        let envVal = "";
        if (s.environment !== undefined && s.environment !== null) {
          envVal = typeof s.environment === 'object' ? (s.environment.environment ?? s.environment.name ?? "") : s.environment;
        }

        let moodVal = "Mood";
        if (s.mood !== undefined && s.mood !== null) {
          moodVal = typeof s.mood === 'object' ? (s.mood.mood ?? s.mood.name ?? "Mood") : s.mood;
        }

        return (
          <div key={idx} className="scene-card flex gap-4 items-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-[11px] font-bold font-mono">
              {String(sceneNum).padStart(2, '0')}
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-medium text-surface-200">{String(shotVal)}</h4>
                <span className="badge-mood">{String(moodVal)}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-surface-400">{String(descVal)}</p>
              <p className="text-[10.5px] text-surface-500 font-mono">{String(envVal)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanView({ plan, onProceed, loading }) {
  if (!plan) return (
    <div className="flex flex-col min-h-[260px] items-center justify-center text-center gap-4">
      <p className="text-surface-600 text-sm">No production plan available.</p>
      {onProceed && (
        <button
          onClick={onProceed}
          disabled={loading}
          className="btn-accent px-4 py-2 disabled:opacity-50 text-xs tracking-wider transition-all shadow-none"
        >
          {loading ? 'Resuming...' : 'Compile Production Plan & Critic Review'}
        </button>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-surface-200">{plan.title}</h4>
      {Array.isArray(plan.phases) && plan.phases.map((phase) => {
        if (!phase) return null;
        return (
          <div key={phase.name} className="glass-panel rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-[13px] font-medium text-surface-200">{phase.name}</h5>
              <span className={`text-[11px] ${phase.status === 'complete' ? 'text-emerald-400/80' : 'text-surface-600'}`}>
                {phase.status === 'complete' ? '✓ Done' : 'Pending'}
              </span>
            </div>
            <ul className="space-y-2">
              {Array.isArray(phase.items) && phase.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] text-surface-400">
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${phase.status === 'complete' ? 'bg-emerald-400/60' : 'bg-surface-600'}`} />
                  {String(item)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function SceneBreakdownView({ breakdown, storyboard, productionType, onProceed, loading }) {
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

  // Build display breakdown by overlaying generated details onto storyboard scenes structure
  let displayBreakdown = breakdown;
  let hasPlaceholders = false;

  if (storyboard && storyboard.length > 0 && loading) {
    const generatedScenes = breakdown?.scenes || [];
    const scenesList = storyboard.map((s, idx) => {
      if (!s) return null;
      // If we already have the generated scene at this index, use it
      if (generatedScenes[idx]) {
        return { ...generatedScenes[idx], isPlaceholder: false };
      }
      if (idx > generatedScenes.length) {
        return null;
      }
      // Otherwise, construct a placeholder card matching the storyboard scene structure
      hasPlaceholders = true;
      
      const sScene = typeof s === 'object' ? (s.scene ?? s.scene_number) : null;
      const sShot = typeof s === 'object' ? (s.shot ?? s.camera_shot) : null;
      const sEnv = typeof s === 'object' ? s.environment : null;
      const sMood = typeof s === 'object' ? s.mood : null;
      const sDesc = typeof s === 'object' ? (s.description ?? s.description_prompt) : null;

      return {
        scene_number: `SCENE ${String(sScene ?? idx + 1).padStart(2, '0')}`,
        title: sShot || "Scene Specifications",
        duration: "10 seconds",
        location: sEnv || "Set",
        environment: sEnv || "Set",
        time_of_day: "Analyzing...",
        weather: "Analyzing...",
        characters: [],
        character_descriptions: "Analyzing details...",
        wardrobe: "Analyzing details...",
        props: [],
        visual_style: "Cinematic",
        mood: sMood || "Atmospheric",
        camera_setup: "Analyzing Setup...",
        camera_movement: "Analyzing...",
        shot_type: sShot || "Standard Shot",
        lighting_design: "Analyzing...",
        audio_notes: "Analyzing audio cue details...",
        ai_generation_prompt: sDesc || sShot || "Generating visual description prompt...",
        isPlaceholder: true
      };
    }).filter(Boolean);

    displayBreakdown = {
      total_runtime: breakdown?.total_runtime || `${storyboard.length * 10}s (Estimating...)`,
      consistency_warnings: breakdown?.consistency_warnings || [],
      scenes: scenesList,
      asset_requirements: breakdown?.asset_requirements || {
        characters_needed: [],
        locations_needed: [],
        props_needed: [],
        sound_requirements: [],
        vfx_requirements: []
      }
    };
  }

  if (!displayBreakdown || !displayBreakdown.scenes || displayBreakdown.scenes.length === 0) {
    return (
      <div className={`flex min-h-[260px] flex-col items-center justify-center text-sm gap-4 text-center ${
        d ? 'text-neutral-400' : 'text-surface-550'
      }`}>
        <span>🎬</span>
        <p>No scene breakdown generated yet. Resuming production will compile specifications.</p>
        {onProceed && (
          <button
            onClick={onProceed}
            disabled={loading}
            className="btn-accent px-4 py-2 disabled:opacity-50 text-xs tracking-wider transition-all shadow-none"
          >
            {loading ? 'Resuming...' : 'Compile Scene Breakdown & Plan'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left select-text">
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
              {displayBreakdown.total_runtime || "Calculating..."}
            </span>
          </div>
        </div>
      </div>

      {/* Warnings Block */}
      {Array.isArray(displayBreakdown.consistency_warnings) && displayBreakdown.consistency_warnings.length > 0 && (
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-4">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
            <FiAlertCircle size={14} />
            <span>Consistency Audit Warnings</span>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {displayBreakdown.consistency_warnings.map((warn, i) => (
              <li key={i} className={`text-[11px] font-mono leading-relaxed ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}
             {/* Scenes List */}
      <div className="space-y-6">
        {Array.isArray(displayBreakdown.scenes) && displayBreakdown.scenes.map((scene, idx) => {
          if (!scene) return null;
          const placeholderClass = scene.isPlaceholder 
            ? `animate-pulse rounded text-transparent select-none pointer-events-none ${d ? 'bg-neutral-100' : 'bg-white/[0.04]'}` 
            : '';
          
          return (
            <div 
              key={idx} 
              className={`rounded-xl border transition-all duration-300 animate-fade-in ${
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
                  <h3 className={`text-sm font-bold tracking-wide truncate ${d ? 'text-neutral-900' : 'text-white'} ${placeholderClass}`}>
                    {scene.title || "Untitled Scene"}
                  </h3>
                </div>
                <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border ${
                  d ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-white/[0.03] border-white/[0.08] text-surface-400'
                } ${placeholderClass}`}>
                  ⏱️ {scene.duration || "8s"}
                </span>
              </div>

              {/* Scene Specs Grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6 text-[12px] leading-relaxed">
                {/* Col 1: Location & Space */}
                <div className="space-y-3.5">
                  <div className={`border-b pb-2 ${d ? 'border-neutral-100' : 'border-white/[0.04]'}`}>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                      Location & Space
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Location</span>
                    <span className={`font-mono block mt-0.5 ${d ? 'text-neutral-950' : 'text-neutral-200'} ${placeholderClass}`}>
                      {scene.location || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Environment</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'} ${placeholderClass}`}>
                      {scene.environment || "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Time of Day</span>
                      <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'} ${placeholderClass}`}>
                        {scene.time_of_day || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Weather</span>
                      <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'} ${placeholderClass}`}>
                        {scene.weather || "N/A"}
                      </span>
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
                      {Array.isArray(scene.characters) && scene.characters.length > 0 ? (
                        scene.characters.map((char, i) => (
                          <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold border ${
                            d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/[0.02] border-white/[0.06] text-neutral-200'
                          }`}>
                            {char}
                          </span>
                        ))
                      ) : (
                        <span className={`text-neutral-350 ${placeholderClass}`}>
                          {scene.isPlaceholder ? "Analyzing characters..." : (scene.characters || "None")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Visual Profile & Wardrobe</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-350'} ${placeholderClass}`}>
                      {scene.character_descriptions || scene.wardrobe || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Key Props</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Array.isArray(scene.props) && scene.props.length > 0 ? (
                        scene.props.map((prop, i) => (
                          <span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                            d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-white/[0.02] border-white/[0.06] text-neutral-300'
                          }`}>
                            {prop}
                          </span>
                        ))
                      ) : (
                        <span className={`text-neutral-350 ${placeholderClass}`}>
                          {scene.isPlaceholder ? "Analyzing props..." : (scene.props || "None")}
                        </span>
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
                      <span className={`block mt-0.5 font-mono text-[10px] ${d ? 'text-neutral-900' : 'text-neutral-200'} ${placeholderClass}`}>
                        {scene.camera_setup || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Movement</span>
                      <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'} ${placeholderClass}`}>
                        {scene.camera_movement || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Shot Type</span>
                      <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'} ${placeholderClass}`}>
                        {scene.shot_type || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Lighting</span>
                      <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-300'} ${placeholderClass}`}>
                        {scene.lighting_design || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`font-semibold block ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Audio Design & SFX</span>
                    <span className={`block mt-0.5 ${d ? 'text-neutral-800' : 'text-neutral-355'} ${placeholderClass}`}>
                      {scene.audio_notes || "N/A"}
                    </span>
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
                      AI Visual Description Prompt
                    </span>
                    {!scene.isPlaceholder && (
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
                    )}
                  </div>
                  <p className={`font-mono text-[11px] leading-relaxed p-3 rounded-lg border whitespace-pre-wrap select-all ${
                    d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-black/40 border-white/[0.04] text-neutral-200'
                  } ${placeholderClass}`}>
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
                    } ${placeholderClass}`}>
                      {scene.negative_prompt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
       {/* Consolidated Asset Requirements */}
      {displayBreakdown.asset_requirements && (
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
                {Array.isArray(displayBreakdown.asset_requirements.characters_needed) && displayBreakdown.asset_requirements.characters_needed.length > 0 ? (
                  displayBreakdown.asset_requirements.characters_needed.map((item, i) => (
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
                {Array.isArray(displayBreakdown.asset_requirements.locations_needed) && displayBreakdown.asset_requirements.locations_needed.length > 0 ? (
                  displayBreakdown.asset_requirements.locations_needed.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-355'}`} title={item}>{item}</li>
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
                {Array.isArray(displayBreakdown.asset_requirements.props_needed) && displayBreakdown.asset_requirements.props_needed.length > 0 ? (
                  displayBreakdown.asset_requirements.props_needed.map((item, i) => (
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
                {Array.isArray(displayBreakdown.asset_requirements.sound_requirements) && displayBreakdown.asset_requirements.sound_requirements.length > 0 ? (
                  displayBreakdown.asset_requirements.sound_requirements.map((item, i) => (
                    <li key={i} className={`truncate font-mono ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={item}>{item}</li>
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
                {Array.isArray(displayBreakdown.asset_requirements.vfx_requirements) && displayBreakdown.asset_requirements.vfx_requirements.length > 0 ? (
                  displayBreakdown.asset_requirements.vfx_requirements.map((item, i) => (
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

// ── Modify Chat Panel ─────────────────────────────────────────────────────
function ModifyChatPanel({ project, onClose, onProjectUpdated }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `I'm reviewing **${project.title}**. What would you like to modify? You can ask me to rewrite scenes, change the tone, adjust the storyboard, or rework the production plan.`,
    }
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamedScript, setStreamedScript] = useState('');
  const bottomRef = useRef(null);
  const { isDayMode: d } = useTheme();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedScript]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setStreaming(true);
    setStreamedScript('');

    try {
      const systemContext = `You are modifying an existing production called "${project.title}" (${project.production_type}).

Current Script:
${project.script || 'N/A'}

The user wants to modify it. Apply their request and return ONLY the updated script, formatted the same way as the original. Do not include any preamble or explanation — just the revised script.`;

      const response = await fetch(`${apiBaseUrl}/api/generate/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemContext}\n\nUser modification request: ${userMsg}`,
          mode: 'studio',
          production_type: project.production_type || 'Short Film',
          files: [],
        }),
      });

      if (!response.ok) {
        let cleanMsg = 'Modification stream failed';
        try {
          const errText = await response.text();
          const parsed = JSON.parse(errText);
          if (parsed.detail) {
            cleanMsg = parsed.detail;
          }
        } catch (e) {}
        throw new Error(cleanMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullScript = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const evt = JSON.parse(trimmed.slice(6));
              if (evt.type === 'script_chunk') {
                fullScript += evt.data;
                setStreamedScript(fullScript);
              } else if (evt.type === 'complete') {
                onProjectUpdated({ ...project, script: fullScript });
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: '✅ Script updated! The changes are reflected in the Script tab above.',
                }]);
                setStreamedScript('');
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Modification failed: ${err.message}` }]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className={`flex flex-col h-full border-l transition-colors duration-500 ${d ? 'bg-white border-black/[0.07]' : 'bg-[#08080f] border-white/[0.05]'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b transition-colors duration-500 ${d ? 'border-black/[0.07]' : 'border-white/[0.05]'}`}>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15">
            <FiEdit3 size={11} className="text-accent" />
          </div>
          <span className={`text-[11px] font-bold tracking-widest uppercase ${d ? 'text-gray-700' : 'text-surface-300'}`}>
            Modify Production
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1.5 rounded-lg transition-colors ${d ? 'hover:bg-black/[0.06] text-gray-400' : 'hover:bg-white/[0.06] text-surface-500'}`}
        >
          <FiX size={13} />
        </button>
      </div>

      {/* Live streaming preview */}
      {streamedScript && (
        <div className="mx-3 mt-3 rounded-xl border border-accent/20 bg-accent/[0.03] p-3 max-h-40 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-1.5">Rewriting script...</p>
          <p className="text-[10px] font-mono text-surface-400 whitespace-pre-wrap leading-relaxed">{streamedScript.slice(-400)}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent text-white rounded-br-md'
                : d
                  ? 'bg-gray-100 text-gray-700 rounded-bl-md'
                  : 'bg-white/[0.05] text-surface-300 rounded-bl-md'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {streaming && !streamedScript && (
          <div className="flex justify-start">
            <div className={`rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[12px] ${d ? 'bg-gray-100 text-gray-500' : 'bg-white/[0.05] text-surface-500'}`}>
              <span className="flex items-center gap-1.5">
                <FiLoader size={10} className="animate-spin" /> Analyzing production...
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={`px-3 pb-3 pt-2 border-t transition-colors duration-500 ${d ? 'border-black/[0.07]' : 'border-white/[0.05]'}`}>
        <div className={`flex items-end gap-2 rounded-xl border p-2 transition-colors duration-300 ${
          d ? 'bg-gray-50 border-black/[0.08]' : 'bg-white/[0.03] border-white/[0.08]'
        }`}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="e.g. Make scene 2 more dramatic, add tension..."
            disabled={streaming}
            rows={2}
            className={`flex-1 bg-transparent border-0 outline-none resize-none text-[12px] leading-relaxed placeholder-neutral-500 focus:ring-0 font-mono ${d ? 'text-gray-800' : 'text-white'}`}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-accent hover:bg-accent/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {streaming ? <FiLoader size={11} className="animate-spin" /> : <FiSend size={11} />}
          </button>
        </div>
        <p className={`text-[9px] mt-1.5 px-1 ${d ? 'text-gray-400' : 'text-surface-600'}`}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function ReviewView({ criticReview, approved, onApprove, onRefine, loading, onGoToProduction, onProceed }) {
  if (!criticReview) {
    return (
      <div className="flex flex-col min-h-[260px] items-center justify-center text-center gap-4">
        <p className="text-surface-600 text-sm">Review will appear after the Critic Agent completes its review.</p>
        {onProceed && (
          <button
            onClick={onProceed}
            disabled={loading}
            className="btn-accent px-4 py-2 disabled:opacity-50 text-xs tracking-wider transition-all shadow-none"
          >
            {loading ? 'Resuming...' : 'Generate Critic Review'}
          </button>
        )}
      </div>
    );
  }

  const { score, strengths = [], weaknesses = [], suggestions = [] } = criticReview;

  return (
    <div className="space-y-6 select-text">
      {/* Score Card */}
      <div className="glass-panel rounded-2xl p-5 border border-white/[0.04] bg-surface-950/20 flex items-center justify-between gap-6 flex-wrap">
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-surface-200">Review Report Summary</h4>
          <p className="text-[11px] text-surface-500">Actionable assessment of structure, pacing, clarity, and visual alignment.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[9px] uppercase font-bold tracking-widest text-surface-500">Overall Score</div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full border border-accent/25 bg-accent/5 text-lg font-extrabold text-accent shadow-[0_0_15px_rgba(139,92,246,0.15)] select-none">
            {score}/10
          </div>
        </div>
      </div>

      {/* Review Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="glass-panel rounded-xl p-5 border border-emerald-500/10 bg-emerald-500/[0.01]">
          <div className="flex items-center gap-2 mb-3 text-emerald-400">
            <FiCheckSquare size={13} />
            <h5 className="text-[10px] font-bold uppercase tracking-wider">Strengths</h5>
          </div>
          <ul className="space-y-2">
            {Array.isArray(strengths) && strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-surface-300 leading-relaxed animate-fade-in">
                <span className="text-emerald-400 mt-1 shrink-0">•</span>
                <span>{str}</span>
              </li>
            ))}
            {(!Array.isArray(strengths) || strengths.length === 0) && (
              <li className="text-[12px] text-surface-500 italic">No strengths listed.</li>
            )}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="glass-panel rounded-xl p-5 border border-rose-500/10 bg-rose-500/[0.01]">
          <div className="flex items-center gap-2 mb-3 text-rose-400">
            <FiAlertCircle size={13} />
            <h5 className="text-[10px] font-bold uppercase tracking-wider">Weaknesses</h5>
          </div>
          <ul className="space-y-2">
            {Array.isArray(weaknesses) && weaknesses.map((wk, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-surface-300 leading-relaxed animate-fade-in">
                <span className="text-rose-400 mt-1 shrink-0">•</span>
                <span>{wk}</span>
              </li>
            ))}
            {(!Array.isArray(weaknesses) || weaknesses.length === 0) && (
              <li className="text-[12px] text-surface-500 italic">No weaknesses listed.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Suggestions */}
      <div className="glass-panel rounded-xl p-5 border border-white/[0.03] bg-surface-950/10">
        <div className="flex items-center gap-2 mb-3 text-accent">
          <FiTrendingUp size={13} />
          <h5 className="text-[10px] font-bold uppercase tracking-wider">Refinement Suggestions</h5>
        </div>
        <ul className="space-y-2.5">
          {Array.isArray(suggestions) && suggestions.map((sug, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-surface-300 leading-relaxed animate-fade-in">
              <span className="text-accent font-semibold mt-0.5 shrink-0">{i+1}.</span>
              <span>{sug}</span>
            </li>
          ))}
          {(!Array.isArray(suggestions) || suggestions.length === 0) && (
            <li className="text-[12px] text-surface-500 italic">No suggestions listed.</li>
          )}
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-white/[0.04] pt-4">
        {approved ? (
          <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">
            <div className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 shrink-0">
                <FiAward size={15} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider">Production Approved</span>
                <span className="text-[10px] text-emerald-500/70 truncate">Ready for visual asset and video generation pipelines.</span>
              </div>
            </div>
            {onGoToProduction && (
              <button
                onClick={onGoToProduction}
                className="text-xs font-extrabold bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 px-3.5 py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span>Production Studio</span>
                <FiArrowRight size={11} />
              </button>
            )}
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

// ── Main Project Page ─────────────────────────────────────────────────────
const TABS = [
  { id: 'script',     label: 'Script',          icon: FiFileText },
  { id: 'storyboard', label: 'Storyboard',      icon: FiImage },
  { id: 'breakdown',  label: 'Scene Breakdown', icon: FiList },
  { id: 'plan',       label: 'Plan',            icon: FiClipboard },
  { id: 'review',     label: 'Review',          icon: FiStar },
];


function fmtDate(isoStr) {
  if (!isoStr) return '';
  const normalized = isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z';
  return new Date(normalized).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDayMode: d } = useTheme();
  const { 
    fetchSavedProjects, resumeGenerate, loading: contextLoading,
    sceneBreakdown: liveSceneBreakdown,
    criticReview: liveCriticReview,
    script: liveScript,
    storyboard: liveStoryboard,
    productionPlan: liveProductionPlan,
    agents,
    productionType,
  } = useProjectData();
  const [searchParams] = useSearchParams();
  const forcePreProd = searchParams.get('view') === 'preprod';

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('script');
  const scrollContainerRef = useRef(null);

  // Auto-switch tabs to follow the active agent during generation
  useEffect(() => {
    if (!contextLoading || !agents) return;
    const activeAgent = agents.find(a => a.status === 'active');
    if (!activeAgent) return;

    const agentToTabMap = {
      writer: 'script',
      storyboard: 'storyboard',
      scene_breakdown: 'breakdown',
      planner: 'plan',
      critic: 'review'
    };

    const targetTab = agentToTabMap[activeAgent.id];
    if (targetTab && targetTab !== activeTab) {
      const pType = project?.production_type || productionType;
      let isAllowed = true;
      if (pType === 'Podcast') {
        isAllowed = targetTab === 'script' || targetTab === 'plan';
      } else if (pType === 'Audio Story') {
        isAllowed = targetTab !== 'storyboard';
      }
      
      if (isAllowed) {
        setActiveTab(targetTab);
      }
    }
  }, [agents, contextLoading, project, productionType, activeTab]);

  // Auto-scroll to the bottom of the content container during streaming
  useEffect(() => {
    if (!contextLoading) return;
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [
    contextLoading,
    liveScript,
    liveStoryboard,
    liveSceneBreakdown,
    liveProductionPlan,
    liveCriticReview,
    activeTab
  ]);

  useEffect(() => {
    if (project?.production_type === 'Podcast' && activeTab !== 'script' && activeTab !== 'plan') {
      setActiveTab('script');
    } else if (project?.production_type === 'Audio Story' && activeTab === 'storyboard') {
      setActiveTab('script');
    }
  }, [project, activeTab]);
  const [modifyOpen, setModifyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // ── Toast Notification State ─────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 5000);
  }, []);

  const handleResume = async () => {
    const numericId = decodeProjectRouteId(id);
    try {
      await resumeGenerate(numericId);
      const updatedProject = await getProjectById(numericId);
      setProject(updatedProject);
    } catch (err) {
      console.error(err);
      showToast('Failed to resume generation: ' + err.message, 'error');
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const numericId = decodeProjectRouteId(id);
    getProjectById(numericId)
      .then(data => { if (!cancelled) { setProject(data); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (project && project.approved && !forcePreProd) {
      navigate(`/projects/${id}/production`, { replace: true });
    }
  }, [project, id, navigate, forcePreProd]);

  const handleProjectUpdated = useCallback((updated) => {
    setProject(updated);
    fetchSavedProjects();
  }, [fetchSavedProjects]);

  const handleSaveScript = async (newScriptText) => {
    try {
      const numericId = decodeProjectRouteId(id);
      const updated = await updateProjectScript(numericId, newScriptText);
      setProject(updated);
      fetchSavedProjects();
    } catch (err) {
      console.error('Failed to save script:', err);
      showToast('Failed to save script: ' + err.message, 'error');
    }
  };

  const handleApproveProject = async () => {
    try {
      const numericId = decodeProjectRouteId(id);
      const updated = await updateProjectApproval(numericId, true);
      setProject(updated);
      fetchSavedProjects();
      navigate(`/projects/${id}/production`);
    } catch (err) {
      console.error('Failed to approve project:', err);
      showToast('Failed to approve project: ' + err.message, 'error');
    }
  };

  const handleRefineProject = async () => {
    setLoading(true);
    try {
      const numericId = decodeProjectRouteId(id);
      const updated = await refineProjectScript(numericId);
      setProject(updated);
      fetchSavedProjects();
    } catch (err) {
      console.error('Failed to refine script:', err);
      showToast('Failed to refine script: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 ${d ? 'bg-white' : 'bg-[#06060b]'}`}>
      {/* Background glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen animate-drift-light-1" />
      <div className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[150px] pointer-events-none mix-blend-screen animate-drift-light-2" />

      {/* Sidebar */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">

        {/* Top bar */}
        <header className={`flex items-center gap-4 px-6 py-3 border-b shrink-0 transition-colors duration-500 ${d ? 'border-black/[0.07] bg-white/60 backdrop-blur-sm' : 'border-white/[0.04] bg-black/30 backdrop-blur-sm'}`}>
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 transition-all duration-200 ${d ? 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]' : 'text-surface-500 hover:text-white hover:bg-white/[0.05]'}`}
          >
            <FiArrowLeft size={13} />
            <span>Studio</span>
          </button>

          {project && (
            <div className="flex items-center gap-2.5 min-w-0">
              <ProjectIcon
                type={project.production_type}
                size="sm"
                dayMode={d}
                active={true}
              />
              <div className="min-w-0">
                <h1 className={`text-[13px] font-bold truncate transition-colors duration-500 ${d ? 'text-gray-900' : 'text-white'}`}>
                  {project.title}
                </h1>
                <div className={`flex items-center gap-1.5 text-[9px] font-mono mt-0.5 ${d ? 'text-gray-400' : 'text-surface-600'}`}>
                  <FiFilm size={8} />
                  <span>{project.production_type}</span>
                  <span className="opacity-40">·</span>
                  <FiClock size={8} />
                  <span>{fmtDate(project.updated_at)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Share button */}
            {project && (
              <button
                onClick={() => setShareOpen(true)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border ${
                  d
                    ? 'border-emerald-600/30 text-emerald-600 hover:bg-emerald-600/10 bg-emerald-600/5'
                    : 'border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/10 bg-emerald-500/5'
                }`}
              >
                <FiShare2 size={12} />
                <span>Share</span>
              </button>
            )}

            {project && project.approved && (
              <button
                onClick={() => navigate(`/projects/${id}/production`)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                  d
                    ? 'border-accent/35 text-accent hover:bg-accent/15 bg-accent/5'
                    : 'border-accent/30 text-accent hover:bg-accent/15 bg-accent/5'
                }`}
              >
                <span>Production Studio</span>
                <FiArrowRight size={12} />
              </button>
            )}

            {project && !project.approved && (
              <button
                onClick={() => setModifyOpen(o => !o)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border ${
                  modifyOpen
                    ? 'bg-accent text-white border-accent shadow-[0_0_16px_rgba(139,92,246,0.3)]'
                    : d
                      ? 'border-accent/30 text-accent hover:bg-accent/10 bg-accent/5'
                      : 'border-accent/25 text-accent hover:bg-accent/10 bg-accent/5'
                }`}
              >
                <FiEdit3 size={12} />
                <span>{modifyOpen ? 'Close Editor' : 'Modify'}</span>
              </button>
            )}
          </div>
        </header>

        {/* Content row */}
        <div className="flex flex-1 min-h-0">
          {/* Project content */}
          <div ref={scrollContainerRef} className="flex-1 min-w-0 overflow-y-auto px-6 py-5">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <FiLoader size={24} className="text-accent animate-spin" />
                  <p className={`text-sm ${d ? 'text-gray-500' : 'text-surface-500'}`}>Loading production...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-red-400 font-semibold mb-2">Failed to load project</p>
                  <p className="text-surface-600 text-sm">{error}</p>
                  <button onClick={() => navigate('/')} className="mt-4 text-accent text-sm hover:underline">
                    ← Back to Studio
                  </button>
                </div>
              </div>
            )}

            {!loading && !error && project && (
              <div className="max-w-4xl mx-auto space-y-5 pb-10">
                {/* Tab bar */}
                <div className="flex gap-1 rounded-xl bg-white/[0.02] p-1 ring-1 ring-white/[0.04]">
                  {TABS.filter(tab => {
                    if (project?.production_type === 'Podcast') {
                      return tab.id === 'script' || tab.id === 'plan';
                    }
                    if (project?.production_type === 'Audio Story') {
                      return tab.id !== 'storyboard';
                    }
                    return true;
                  }).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                        activeTab === tab.id ? 'tab-active' : 'text-surface-500 hover:text-surface-300'
                      }`}
                    >
                      <tab.icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab content — always visible; AgentActivityPanel is shown above during streaming */}
                <div className="glass-panel rounded-xl p-6 bg-surface-950/45 border border-white/[0.03]">
                  {contextLoading && (
                    <div className="space-y-3 mb-6">
                      <div className="text-center space-y-1 pb-3 border-b border-white/[0.04]">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-accent">⚡ Production Pipeline Running</h3>
                        <p className="text-[11px] text-surface-500">Autonomous agents are generating your production — content appears live below as it streams.</p>
                      </div>
                      <AgentActivityPanel />
                    </div>
                  )}
                  {/* Always render tab content so streaming data appears live */}
                  {activeTab === 'script' && (
                    <ScriptView 
                      script={(liveScript && liveScript.length > 0 ? liveScript : null) || project.script} 
                      originalScript={project.original_script} 
                      onSave={handleSaveScript} 
                      readOnly={project.approved}
                    />
                  )}
                  {activeTab === 'storyboard' && <StoryboardView storyboard={liveStoryboard?.length ? liveStoryboard : project.storyboard} productionType={project.production_type} onProceed={handleResume} loading={contextLoading} />}
                  {activeTab === 'breakdown' && (
                    <SceneBreakdownView 
                      breakdown={liveSceneBreakdown || project.scene_breakdown} 
                      storyboard={liveStoryboard?.length ? liveStoryboard : project.storyboard}
                      productionType={project.production_type} 
                      onProceed={handleResume} 
                      loading={contextLoading} 
                    />
                  )}
                  {activeTab === 'plan' && <PlanView plan={liveProductionPlan || project.production_plan} onProceed={handleResume} loading={contextLoading} />}
                  {activeTab === 'review' && (
                    <ReviewView 
                      criticReview={liveCriticReview || project.critic_review} 
                      approved={project.approved} 
                      onApprove={handleApproveProject} 
                      onRefine={handleRefineProject} 
                      loading={loading || contextLoading} 
                      onGoToProduction={() => navigate(`/projects/${id}/production`)}
                      onProceed={handleResume}
                    />
                  )}
                </div>

                {/* Prompt used */}
                {project.prompt && (
                  <details className={`rounded-xl border p-4 text-[11px] font-mono transition-colors duration-500 ${d ? 'border-black/[0.07] text-gray-500' : 'border-white/[0.05] text-surface-600'}`}>
                    <summary className="cursor-pointer font-semibold tracking-wider uppercase text-[9px] text-accent/60 select-none">
                      Original Prompt
                    </summary>
                    <p className="mt-3 leading-relaxed whitespace-pre-wrap">{project.prompt}</p>
                  </details>
                )}
              </div>
            )}
            <Footer />
          </div>

          {/* Modify panel — slides in from the right */}
          {modifyOpen && project && (
            <div className="w-[380px] shrink-0 relative z-10 h-full overflow-hidden">
              <ModifyChatPanel
                project={project}
                onClose={() => setModifyOpen(false)}
                onProjectUpdated={handleProjectUpdated}
              />
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareOpen && project && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop overlay */}
          <div 
            onClick={() => setShareOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Modal Card */}
          <div className={`relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all duration-300 scale-100 flex flex-col gap-4 animate-scale-in ${
            d 
              ? 'bg-white/95 border-neutral-200 text-neutral-800' 
              : 'bg-[#0b0b14]/95 border-white/[0.08] text-white shadow-black/80'
          }`}>
            
            {/* Header */}
            <div className={`flex items-center justify-between border-b pb-3 mb-1 transition-colors ${
              d ? 'border-neutral-200' : 'border-white/[0.06]'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg border ${
                  d ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <FiShare2 size={12} />
                </div>
                <h3 className="text-xs font-bold tracking-widest uppercase">Share Production</h3>
              </div>
              <button 
                onClick={() => setShareOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  d ? 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600' : 'hover:bg-white/[0.06] text-surface-500 hover:text-surface-300'
                }`}
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Description */}
            <p className={`text-[12px] leading-relaxed mb-1 ${d ? 'text-neutral-500' : 'text-surface-400'}`}>
              Anyone with this public link can view this production, including the screenplay, storyboard, and plan.
            </p>

            {/* Link Copy Field */}
            <div className={`flex items-center gap-2 border rounded-xl p-2.5 transition-all duration-300 ${
              d ? 'bg-neutral-50 border-neutral-200/80' : 'bg-white/[0.02] border-white/[0.08]'
            }`}>
              <input 
                type="text" 
                readOnly
                value={window.location.href}
                className={`flex-1 bg-transparent border-0 outline-none text-[11px] font-mono leading-none tracking-tight select-all focus:ring-0 ${
                  d ? 'text-neutral-600' : 'text-surface-300'
                }`}
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                }}
                className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-150 ${
                  linkCopied 
                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                    : d 
                      ? 'bg-neutral-200/60 text-neutral-700 hover:bg-neutral-200' 
                      : 'bg-white/[0.05] text-surface-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {linkCopied ? (
                  <>
                    <FiCheck size={10} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <FiClipboard size={10} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer buttons */}
            <div className="mt-2 flex justify-end">
              <button 
                onClick={() => setShareOpen(false)}
                className={`px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all ${
                  d 
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' 
                    : 'bg-white/[0.03] border border-white/[0.06] text-surface-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {toast && (
        <>
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(1.5rem);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
          <div 
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl transition-all duration-300 ${
              toast.type === 'error' 
                ? 'bg-red-950/90 border-red-500/30 text-red-200 shadow-red-950/40' 
                : toast.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200 shadow-emerald-950/40'
                  : 'bg-neutral-900/90 border-white/[0.08] text-neutral-200'
            } backdrop-blur-md`}
            style={{
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {toast.type === 'error' && <FiAlertTriangle className="w-5 h-5 text-red-400 shrink-0" />}
            {toast.type === 'success' && <FiCheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'info' && <FiInfo className="w-5 h-5 text-blue-400 shrink-0" />}
            
            <div className="text-[12px] font-medium pr-4">{toast.message}</div>
            
            <button 
              onClick={() => setToast(null)}
              className="text-white/40 hover:text-white/80 transition-colors ml-auto text-xs font-semibold px-1"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}
