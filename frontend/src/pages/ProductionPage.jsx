import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiClock, FiFilm, FiActivity, FiUser, FiVolume2, 
  FiMapPin, FiCpu, FiLock, FiCheck, FiCheckCircle, FiInfo, FiSliders, FiDatabase
} from 'react-icons/fi';
import { getProjectById } from '../services/apiClient';
import Sidebar from '../components/Sidebar';
import ProjectIcon from '../components/ProjectIcon';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../hooks/useProjectData';
import { decodeProjectRouteId } from '../utils/hashids';
import Footer from '../components/Footer';

// A high-tech soundwave icon for character packages
function SoundwaveIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10v4M8 6v12M12 3v18M16 8v8M20 11v2" strokeLinecap="round" />
    </svg>
  );
}

// Heuristic function to extract unique characters from project data
const extractCharacters = (project) => {
  const charactersMap = {};
  const scenes = project?.scene_breakdown?.scenes || [];

  // 1. Pull from Scene Breakdown scenes
  scenes.forEach((scene, index) => {
    const sceneNum = scene.scene_number || `Scene ${index + 1}`;
    const chars = Array.isArray(scene.characters) 
      ? scene.characters 
      : typeof scene.characters === 'string' 
        ? [scene.characters] 
        : [];

    chars.forEach(charName => {
      const trimmedName = typeof charName === 'string' ? charName.trim() : (charName ? String(charName).trim() : '');
      if (!trimmedName) return;

      if (!charactersMap[trimmedName]) {
        charactersMap[trimmedName] = {
          name: trimmedName,
          role: 'Supporting',
          scenes: [],
          description: scene.character_descriptions || scene.wardrobe || 'No visual description compiled.',
        };
      }
      if (!charactersMap[trimmedName].scenes.includes(sceneNum)) {
        charactersMap[trimmedName].scenes.push(sceneNum);
      }
      if (!charactersMap[trimmedName].description && (scene.character_descriptions || scene.wardrobe)) {
        charactersMap[trimmedName].description = scene.character_descriptions || scene.wardrobe;
      }
    });
  });

  // 2. Fallback to asset requirements list
  const charactersNeeded = project?.scene_breakdown?.asset_requirements?.characters_needed || [];
  charactersNeeded.forEach(charName => {
    const trimmedName = typeof charName === 'string' ? charName.trim() : (charName ? String(charName).trim() : '');
    if (trimmedName && !charactersMap[trimmedName]) {
      charactersMap[trimmedName] = {
        name: trimmedName,
        role: 'Supporting',
        scenes: ['Scene 1'],
        description: 'Asset requisition logged via Scene Breakdown.',
      };
    }
  });

  // 3. Fallback to storyboard if still empty
  const storyboard = project?.storyboard || [];
  if (Object.keys(charactersMap).length === 0) {
    storyboard.forEach((shot, index) => {
      const sceneNum = `Scene ${index + 1}`;
      // Basic heuristic: check descriptions for capitalized names or terms (placeholder fallback)
      if (shot.description) {
        const matches = shot.description.match(/[A-Z][a-z]+/g) || [];
        matches.forEach(name => {
          if (['The', 'A', 'An', 'In', 'On', 'At', 'With', 'Under', 'By', 'Scene', 'Shot'].includes(name)) return;
          if (!charactersMap[name]) {
            charactersMap[name] = {
              name,
              role: 'Supporting',
              scenes: [sceneNum],
              description: shot.description,
            };
          }
        });
      }
    });
  }

  const characterList = Object.values(charactersMap);

  // Classify lead vs supporting based on appearance frequency
  if (characterList.length > 0) {
    const sorted = [...characterList].sort((a, b) => b.scenes.length - a.scenes.length);
    const maxAppearances = sorted[0].scenes.length;
    characterList.forEach(char => {
      if (char.scenes.length === maxAppearances || char.scenes.length > scenes.length / 2) {
        char.role = 'Lead';
      } else {
        char.role = 'Supporting';
      }
      char.status = 'Ready';
    });
  }

  return characterList;
};

export default function ProductionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDayMode: d } = useTheme();
  const { fetchSavedProjects } = useProjectData();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const numericId = decodeProjectRouteId(id);
    getProjectById(numericId)
      .then(data => {
        if (!cancelled) {
          setProject(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (project && !project.approved) {
      navigate(`/projects/${id}`, { replace: true });
    }
  }, [project, id, navigate]);

  if (loading) {
    return (
      <div className={`flex h-screen overflow-hidden font-display ${d ? 'bg-white' : 'bg-[#030303]'}`}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className={`text-sm ${d ? 'text-gray-500' : 'text-surface-500'}`}>Entering Production Control Room...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={`flex h-screen overflow-hidden font-display ${d ? 'bg-white' : 'bg-[#030303]'}`}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <p className="text-red-500 font-semibold mb-2">Production Studio Connection Failed</p>
            <p className="text-surface-600 text-xs mb-4">{error || "Project data unavailable."}</p>
            <button onClick={() => navigate('/')} className="text-accent text-xs font-bold uppercase tracking-wider hover:underline">
              ← Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sceneCount = project.scene_breakdown?.scenes?.length || project.storyboard?.length || 0;
  const runtime = project.scene_breakdown?.total_runtime || (sceneCount > 0 ? `${sceneCount * 8}s` : '0s');

  // Estimate values
  const costEstimate = sceneCount * 120 + 50; // credits
  const generationTimeSeconds = sceneCount * 30 + 15;
  const generationTimeStr = generationTimeSeconds >= 60 
    ? `${Math.floor(generationTimeSeconds / 60)}m ${generationTimeSeconds % 60}s` 
    : `${generationTimeSeconds}s`;

  // Pipeline Stages config
  const pipelineStages = [
    { name: 'Characters', status: 'Ready', desc: 'Virtual Cast Definition', icon: FiUser },
    { name: 'Environments', status: 'Locked', desc: 'Spatial Context Models', icon: FiMapPin },
    { name: 'Voices', status: 'Locked', desc: 'Speech Synthesis Profiles', icon: FiVolume2 },
    { name: 'Assets', status: 'Locked', desc: 'Downstream Production Files', icon: FiDatabase },
    { name: 'Video Generation', status: 'Locked', desc: 'Temporal Synthesizer Orchestration', icon: FiCpu },
    { name: 'Editing', status: 'Locked', desc: 'Final Montage Assembly', icon: FiSliders },
  ];

  const characters = extractCharacters(project);
  const locationsCount = project.scene_breakdown?.asset_requirements?.locations_needed?.length || 0;
  const environmentsSet = new Set();
  (project.scene_breakdown?.scenes || []).forEach(s => { if (s.environment) environmentsSet.add(s.environment); });
  const environmentsCount = environmentsSet.size;

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 ${d ? 'bg-neutral-50' : 'bg-[#030303]'}`}>
      {/* Cinematic glows */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-purple-950/[0.03] via-transparent to-cyan-950/[0.02] z-0" />
      <div className="absolute top-0 right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.02] blur-[150px] pointer-events-none z-0" />

      {/* Sidebar */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main Studio Console */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Console Header */}
        <header className={`flex items-center gap-4 px-6 py-4 border-b shrink-0 transition-colors duration-500 ${
          d ? 'border-neutral-200 bg-white/70 backdrop-blur-sm' : 'border-white/[0.04] bg-[#08080C]/40 backdrop-blur-sm'
        }`}>
          <button
            onClick={() => navigate(`/projects/${id}?view=preprod`)}
            className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-3 py-2 border transition-all duration-200 ${
              d 
                ? 'text-gray-500 hover:text-gray-900 bg-white border-neutral-200 hover:bg-neutral-50' 
                : 'text-surface-400 hover:text-white bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05]'
            }`}
            title="View Pre-Production planning specs"
          >
            <FiArrowLeft size={13} />
            <span>Pre-Production Plan</span>
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <ProjectIcon
              type={project.production_type}
              size="sm"
              dayMode={d}
              active={true}
            />
            <div className="min-w-0">
              <h1 className={`text-[14px] font-extrabold tracking-wide uppercase truncate ${d ? 'text-neutral-900' : 'text-white'}`}>
                {project.title}
              </h1>
              <div className="flex items-center gap-1.5 text-[9px] font-mono mt-0.5 select-none tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-bold uppercase">PRODUCTION STUDIO</span>
                <span className="text-surface-600 font-normal">| CONTROL PANEL</span>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2" />
        </header>

        {/* Console Workspace viewport */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6 pb-12">
            
            {/* 1. TOP OVERVIEW DASHBOARD */}
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 rounded-xl border p-4 transition-colors duration-500 ${
              d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.04]'
            }`}>
              <div className="p-3 border-r border-dashed border-white/[0.04]">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Project Phase</span>
                <span className="text-xs font-bold text-accent uppercase block mt-1">Production</span>
              </div>
              <div className="p-3 border-r border-dashed border-white/[0.04]">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Total Scenes</span>
                <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                  {sceneCount}
                </span>
              </div>
              <div className="p-3 border-r border-dashed border-white/[0.04]">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Total Runtime</span>
                <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                  {runtime}
                </span>
              </div>
              <div className="p-3 border-r border-dashed border-white/[0.04]">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Project Type</span>
                <span className={`text-xs font-bold block mt-1 truncate ${d ? 'text-gray-800' : 'text-neutral-300'}`}>
                  {project.production_type || 'Short Film'}
                </span>
              </div>
              <div className="p-3 border-r border-dashed border-white/[0.04]">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Est. Cost</span>
                <span className="text-sm font-black text-accent block mt-0.5 select-none">
                  {costEstimate} Credits
                </span>
              </div>
              <div className="p-3">
                <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Est. Gen Time</span>
                <span className={`text-xs font-bold block mt-1 ${d ? 'text-gray-800' : 'text-neutral-300'}`}>
                  {generationTimeStr}
                </span>
              </div>
            </div>

            {/* 2. PRODUCTION PROGRESS PIPELINE */}
            <div className={`rounded-xl border p-5 transition-colors duration-500 ${
              d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
            }`}>
              <div className="flex items-center gap-2 border-b pb-3.5 mb-5 border-white/[0.03]">
                <FiActivity className="text-accent" size={14} />
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                  Production Progress Pipeline
                </h3>
              </div>

              {/* Horizontal grid pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 relative">
                {pipelineStages.map((stage, idx) => {
                  const isReady = stage.status === 'Ready';
                  const Icon = stage.icon;

                  return (
                    <div 
                      key={stage.name} 
                      className={`relative rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${
                        isReady 
                          ? d
                            ? 'bg-emerald-50/20 border-emerald-500/20 shadow-sm'
                            : 'bg-emerald-500/[0.01] border-emerald-500/10'
                          : d
                            ? 'bg-neutral-50/50 border-neutral-100 opacity-60'
                            : 'bg-white/[0.005] border-white/[0.03] opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${
                          isReady 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : d ? 'bg-neutral-200 text-neutral-400' : 'bg-white/[0.02] text-surface-600'
                        }`}>
                          <Icon size={16} />
                        </div>
                        {isReady ? (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        ) : (
                          <FiLock size={12} className={d ? 'text-neutral-400' : 'text-surface-600'} />
                        )}
                      </div>

                      <div>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                          isReady ? 'text-accent' : d ? 'text-neutral-500' : 'text-surface-550'
                        }`}>
                          {stage.name}
                        </span>
                        <span className={`text-[9px] font-mono block mt-0.5 truncate ${d ? 'text-neutral-400' : 'text-surface-600'}`}>
                          {stage.desc}
                        </span>
                        <div className="mt-3 flex items-center justify-between">
                          <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded ${
                            isReady 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : d ? 'bg-neutral-100 text-neutral-400' : 'bg-white/[0.02] text-surface-600 border border-white/[0.04]'
                          }`}>
                            {stage.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. CHARACTER STUDIO (Live extraction) */}
            <div className={`rounded-xl border p-5 transition-colors duration-500 ${
              d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3.5 mb-6 border-white/[0.03]">
                <div className="flex items-center gap-2">
                  <FiUser className="text-accent" size={14} />
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                      Character Studio
                    </h3>
                    <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                      Extracting cast profiles and technical assets for generation models
                    </p>
                  </div>
                </div>
                <div className={`text-[9px] font-bold font-mono tracking-widest uppercase px-2 py-1 rounded border ${
                  d ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-white/[0.02] border-white/[0.06] text-surface-400'
                }`}>
                  Cast Count: {characters.length}
                </div>
              </div>

              {characters.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-surface-600 text-xs italic">No character definitions could be extracted from planning data.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {characters.map((char) => (
                    <div 
                      key={char.name}
                      className={`rounded-xl border p-5 text-left transition-all duration-300 ${
                        d 
                          ? 'bg-neutral-50/30 border-neutral-200 hover:border-neutral-300' 
                          : 'bg-[#050507] border-white/[0.04] hover:border-white/[0.07]'
                      }`}
                    >
                      {/* Character Card Header */}
                      <div className="flex flex-wrap justify-between items-start gap-3 border-b border-white/[0.03] pb-3.5 mb-4">
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className={`text-sm font-extrabold tracking-wide uppercase ${d ? 'text-neutral-900' : 'text-white'}`}>
                              {char.name}
                            </h4>
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                              char.role === 'Lead'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {char.role} Role
                            </span>
                            <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border ${
                              d ? 'bg-neutral-100 border-neutral-200 text-neutral-600' : 'bg-white/[0.02] border-white/[0.04] text-surface-400'
                            }`}>
                              Appears in: {char.scenes.join(', ')}
                            </span>
                          </div>
                          <p className={`text-[11.5px] leading-relaxed mt-2 max-w-3xl ${d ? 'text-neutral-600' : 'text-surface-400'}`}>
                            <strong className={`font-semibold mr-1.5 ${d ? 'text-neutral-700' : 'text-neutral-300'}`}>Visual Profile:</strong>
                            {char.description}
                          </p>
                        </div>
                        <div>
                          <span className={`text-[9px] font-bold font-mono uppercase px-2 py-1 rounded border inline-flex items-center gap-1.5 ${
                            d ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400'
                          }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {char.status} for Asset Gen
                          </span>
                        </div>
                      </div>

                      {/* Character Package Slots Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 text-[10px]">
                        
                        {/* Reference Images */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className={`font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500`}>
                            REF_IMG_HUD
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1">
                            <span className="text-base text-surface-600 opacity-60">📷</span>
                            <span className="font-bold text-[8px] text-surface-500 uppercase tracking-wide">NO REF IMAGE</span>
                          </div>
                          <span className="text-[7.5px] font-bold font-mono tracking-widest text-accent uppercase select-none opacity-80">
                            AWAITING GEN
                          </span>
                        </div>

                        {/* Character Sheet */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className="font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500">
                            SHEET_SCHEMA
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1">
                            <span className="text-base text-surface-600 opacity-60">📄</span>
                            <span className="font-bold text-[8px] text-surface-500 uppercase tracking-wide">CHAR SCHEMA</span>
                          </div>
                          <span className="text-[7.5px] font-bold font-mono tracking-widest text-surface-600 uppercase select-none">
                            PENDING GEN
                          </span>
                        </div>

                        {/* Wardrobe */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className="font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500">
                            WARDROBE_SPEC
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1">
                            <span className="text-base text-surface-600 opacity-60">👕</span>
                            <span className="font-bold text-[8px] text-surface-550 uppercase tracking-wide">WARDROBE CARD</span>
                          </div>
                          <span className="text-[7.5px] font-bold font-mono tracking-widest text-surface-600 uppercase select-none">
                            AWAITING SPEC
                          </span>
                        </div>

                        {/* Personality Summary */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className="font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500">
                            COGNITIVE_SPEC
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1">
                            <span className="text-base text-surface-600 opacity-60">🧠</span>
                            <span className="font-bold text-[8px] text-surface-550 uppercase tracking-wide">PERSONALITY</span>
                          </div>
                          <span className="text-[7.5px] font-bold font-mono tracking-widest text-surface-600 uppercase select-none">
                            AWAITING COG
                          </span>
                        </div>

                        {/* Voice Profile */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className="font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500">
                            VOICE_MODEL
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1 w-full">
                            <SoundwaveIcon className="h-4 w-4 text-surface-600 opacity-60 animate-pulse" />
                            <span className="font-bold text-[8px] text-surface-500 uppercase tracking-wide block mt-1">VOICE MODEL</span>
                          </div>
                          <span className="text-[7.5px] font-bold font-mono tracking-widest text-surface-600 uppercase select-none">
                            AWAITING CHOOSE
                          </span>
                        </div>

                        {/* Consistency Status */}
                        <div className={`rounded-lg border p-3 flex flex-col justify-between items-center text-center aspect-[4/3] ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#08080C] border-white/[0.03]'
                        }`}>
                          <span className="font-mono text-[8px] font-extrabold uppercase tracking-widest block w-full border-b border-white/[0.03] pb-1.5 text-surface-500">
                            AUDIT_STATUS
                          </span>
                          <div className="my-auto flex flex-col items-center gap-1">
                            <span className="text-base text-surface-600 opacity-60">⚖️</span>
                            <span className="font-bold text-[8px] text-surface-550 uppercase tracking-wide">CONSISTENCY</span>
                          </div>
                          <span className={`text-[7.5px] font-bold font-mono tracking-widest uppercase px-1 py-0.5 rounded ${
                            d ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            Pending Audit
                          </span>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. PLACEHOLDERS ROW (Voice Studio & Environment Studio) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Voice Studio Placeholder */}
              <div className={`rounded-xl border p-5 relative overflow-hidden flex flex-col justify-between transition-colors duration-500 min-h-[220px] ${
                d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
              }`}>
                {/* Coming soon glass overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 select-none">
                  <div className="border border-white/10 bg-black/60 rounded-xl px-5 py-2.5 text-center shadow-2xl">
                    <span className="text-[10px] font-extrabold tracking-[0.25em] text-accent uppercase block">VOICE STUDIO</span>
                    <span className="text-[8px] font-mono text-surface-500 uppercase tracking-widest block mt-1">COMING SOON</span>
                  </div>
                </div>

                <div className="relative z-0">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4 border-white/[0.03]">
                    <FiVolume2 className="text-accent opacity-50" size={14} />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-surface-400">
                      Voice Studio
                    </h3>
                  </div>
                  
                  <div className="space-y-3.5 text-[12px]">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.02]">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Voice Profiles Required</span>
                      <span className={`font-mono font-bold ${d ? 'text-neutral-900' : 'text-white'}`}>{characters.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.02]">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Character Voice Count</span>
                      <span className={`font-mono font-bold ${d ? 'text-neutral-900' : 'text-white'}`}>{characters.length}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Status</span>
                      <span className="text-[9px] font-bold font-mono bg-white/[0.03] border border-white/[0.06] text-surface-500 px-2 py-0.5 rounded uppercase">
                        AWAITING CHARACTER LOCK
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Studio Placeholder */}
              <div className={`rounded-xl border p-5 relative overflow-hidden flex flex-col justify-between transition-colors duration-500 min-h-[220px] ${
                d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
              }`}>
                {/* Coming soon glass overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 select-none">
                  <div className="border border-white/10 bg-black/60 rounded-xl px-5 py-2.5 text-center shadow-2xl">
                    <span className="text-[10px] font-extrabold tracking-[0.25em] text-accent uppercase block">ENVIRONMENT STUDIO</span>
                    <span className="text-[8px] font-mono text-surface-500 uppercase tracking-widest block mt-1">COMING SOON</span>
                  </div>
                </div>

                <div className="relative z-0">
                  <div className="flex items-center gap-2 border-b pb-3 mb-4 border-white/[0.03]">
                    <FiMapPin className="text-accent opacity-50" size={14} />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-surface-400">
                      Environment Studio
                    </h3>
                  </div>

                  <div className="space-y-3.5 text-[12px]">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.02]">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Unique Locations Required</span>
                      <span className={`font-mono font-bold ${d ? 'text-neutral-900' : 'text-white'}`}>{locationsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/[0.02]">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Unique Environments</span>
                      <span className={`font-mono font-bold ${d ? 'text-neutral-900' : 'text-white'}`}>{environmentsCount}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className={`font-semibold ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Status</span>
                      <span className="text-[9px] font-bold font-mono bg-white/[0.03] border border-white/[0.06] text-surface-500 px-2 py-0.5 rounded uppercase">
                        AWAITING PRE-PRO CONVERGENCE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
