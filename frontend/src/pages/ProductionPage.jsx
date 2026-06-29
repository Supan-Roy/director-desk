import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiClock, FiFilm, FiActivity, FiUser, FiVolume2, 
  FiMapPin, FiCpu, FiLock, FiCheck, FiCheckCircle, FiInfo, FiSliders, FiDatabase,
  FiPlay, FiPause, FiSettings, FiCheckSquare, FiAlertTriangle,
  FiTerminal, FiPlus, FiVolumeX, FiMonitor
} from 'react-icons/fi';
import { 
  getProjectById, 
  updateProject, 
  getProjectCharacters, 
  selectCharacterVersion, 
  generateCharacterAsset, 
  getProjectEnvironments,
  selectEnvironmentVersion,
  generateEnvironmentAsset,
  getProjectVoices,
  selectVoiceVersion,
  generateVoiceAsset,
  getSceneVideos,
  getScenesStatus,
  generateSceneVideo,
  approveSceneVideo,
  deleteSceneVideo,
  apiBaseUrl 
} from '../services/apiClient';
import Sidebar from '../components/Sidebar';
import ProjectIcon from '../components/ProjectIcon';
import AgentActivityPanel from '../components/AgentActivityPanel';
import { useTheme } from '../context/ThemeContext';
import { useProjectData } from '../hooks/useProjectData';
import { decodeProjectRouteId } from '../utils/hashids';
import Footer from '../components/Footer';

// ── Blueprint Vector Grid ──────────────────────────────────────────────────
function BlueprintSVG({ type }) {
  return (
    <svg className="w-full h-32 bg-neutral-900 border border-white/[0.04] rounded-lg" viewBox="0 0 200 100">
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(0, 242, 254, 0.12)" strokeWidth="0.5" strokeDasharray="2" />
      <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(0, 242, 254, 0.12)" strokeWidth="0.5" strokeDasharray="2" />
      
      {type === "Exterior" ? (
        <>
          <rect x="30" y="40" width="30" height="60" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="0.75" />
          <rect x="80" y="20" width="40" height="80" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="0.75" />
          <rect x="140" y="50" width="30" height="50" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="0.75" />
          <circle cx="100" cy="20" r="10" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="0.75" strokeDasharray="2" />
          <text x="85" y="16" fill="rgba(0, 242, 254, 0.5)" fontSize="5" fontFamily="monospace">CTRL_TWR</text>
        </>
      ) : (
        <>
          <circle cx="100" cy="50" r="35" fill="none" stroke="rgba(0, 242, 254, 0.3)" strokeWidth="0.75" />
          <circle cx="100" cy="50" r="15" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="0.5" />
          <line x1="65" y1="50" x2="135" y2="50" stroke="rgba(0, 242, 254, 0.2)" strokeWidth="0.5" />
          <line x1="100" y1="15" x2="100" y2="85" stroke="rgba(0, 242, 254, 0.2)" strokeWidth="0.5" />
          <text x="105" y="45" fill="rgba(0, 242, 254, 0.5)" fontSize="5" fontFamily="monospace">MAIN_DECK</text>
        </>
      )}
      
      <rect x="5" y="5" width="45" height="15" fill="rgba(0,0,0,0.7)" rx="2" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <text x="8" y="11" fill="#00f2fe" fontSize="4.5" fontFamily="monospace" fontWeight="bold">REF_GRID_01A</text>
      <text x="8" y="16" fill="rgba(255,255,255,0.4)" fontSize="3.5" fontFamily="monospace">SCALE: 1:500</text>
      <text x="150" y="92" fill="rgba(255,255,255,0.3)" fontSize="4" fontFamily="monospace">AUTOCAD_BPRNT</text>
    </svg>
  );
}

// ── Environment Compiled Reference Mock ───────────────────────────────────
function EnvironmentRefSVG({ name, type }) {
  return (
    <svg className="w-full h-32 bg-neutral-900 border border-white/[0.04] rounded-lg" viewBox="0 0 200 100">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c071d" />
          <stop offset="60%" stopColor="#1e113a" />
          <stop offset="100%" stopColor="#6344b5" />
        </linearGradient>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#skyGrad)" />
      
      {type === "Exterior" ? (
        <>
          <circle cx="20" cy="15" r="0.5" fill="#fff" opacity="0.8" />
          <circle cx="70" cy="25" r="0.75" fill="#fff" opacity="0.9" />
          <circle cx="150" cy="10" r="0.5" fill="#fff" opacity="0.6" />
          <circle cx="180" cy="30" r="0.5" fill="#fff" opacity="0.7" />
          
          <polygon points="10,100 10,60 25,50 40,60 40,100" fill="#06030c" />
          <polygon points="35,100 35,40 55,30 75,40 75,100" fill="#0d061e" />
          <polygon points="70,100 70,30 90,20 110,30 110,100" fill="#04020a" />
          <polygon points="100,100 100,50 120,40 140,50 140,100" fill="#100a26" />
          <polygon points="135,100 135,35 160,15 185,35 185,100" fill="#070311" />
          
          <line x1="55" y1="30" x2="55" y2="100" stroke="#00f2fe" strokeWidth="0.4" opacity="0.6" />
          <line x1="90" y1="20" x2="90" y2="100" stroke="#8b5cf6" strokeWidth="0.4" opacity="0.6" />
          <line x1="160" y1="15" x2="160" y2="100" stroke="#00f2fe" strokeWidth="0.4" opacity="0.6" />
          
          <circle cx="160" cy="30" r="7" fill="rgba(255, 230, 0, 0.12)" filter="blur(2px)" />
          <circle cx="160" cy="30" r="4.5" fill="#ffd700" opacity="0.9" />
          
          <rect y="82" width="200" height="18" fill="rgba(99, 68, 181, 0.25)" filter="blur(3px)" />
        </>
      ) : (
        <>
          <path d="M 0,100 Q 100,-10 200,100" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <path d="M 25,100 Q 100,15 175,100" fill="none" stroke="rgba(0, 242, 254, 0.12)" strokeWidth="1" />
          <path d="M 50,100 Q 100,40 150,100" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          
          <line x1="100" y1="0" x2="100" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
          <line x1="50" y1="32" x2="10" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          <line x1="150" y1="32" x2="190" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2" />
          
          <circle cx="100" cy="20" r="0.5" fill="#fff" opacity="0.9" />
          <circle cx="45" cy="45" r="0.5" fill="#fff" opacity="0.6" />
          <circle cx="155" cy="40" r="0.5" fill="#fff" opacity="0.7" />
          
          <polygon points="0,88 200,88 200,100 0,100" fill="#04020a" />
          <line x1="0" y1="88" x2="200" y2="88" stroke="#00f2fe" strokeWidth="0.75" opacity="0.8" />
          
          <ellipse cx="100" cy="88" rx="18" ry="3.5" fill="rgba(139, 92, 246, 0.25)" />
          <path d="M 92,86 L 100,72 L 108,86" fill="none" stroke="#8b5cf6" strokeWidth="0.75" opacity="0.7" />
          <circle cx="100" cy="69" r="1.5" fill="#00f2fe" opacity="0.95" />
        </>
      )}
      
      <rect x="5" y="80" width="85" height="15" fill="rgba(0,0,0,0.7)" rx="2" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
      <text x="8" y="87" fill="#10b981" fontSize="4.5" fontFamily="monospace" fontWeight="bold">REF_IMAGE_COMPILED</text>
      <text x="8" y="92" fill="rgba(255,255,255,0.5)" fontSize="3.5" fontFamily="monospace">{name.slice(0, 16)}</text>
    </svg>
  );
}

// Heuristic function to extract unique characters from project data
const extractCharacters = (project) => {
  const charactersMap = {};
  const scenes = project?.scene_breakdown?.scenes || [];

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

  const storyboard = project?.storyboard || [];
  if (Object.keys(charactersMap).length === 0) {
    storyboard.forEach((shot, index) => {
      const sceneNum = `Scene ${index + 1}`;
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

// ── Audio Waves Visual Animation Helper ───────────────────────────────────
function AudioWaveLines({ isPlaying }) {
  const barCount = 18;
  const [heights, setHeights] = useState(new Array(barCount).fill(15));
  
  useEffect(() => {
    if (!isPlaying) {
      setHeights(new Array(barCount).fill(4));
      return;
    }
    
    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, () => Math.floor(Math.random() * 24) + 6)
      );
    }, 110);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="flex items-center justify-center gap-1.5 h-10 w-full bg-black/30 border border-white/[0.03] rounded-lg px-4">
      {heights.map((h, idx) => (
        <span 
          key={idx} 
          className="w-1.5 bg-cyan-400 rounded-full transition-all duration-100" 
          style={{ height: `${h}px`, opacity: isPlaying ? 0.9 : 0.25 }}
        />
      ))}
    </div>
  );
}

export default function ProductionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDayMode: d } = useTheme();
  const { fetchSavedProjects, resumeGenerate, loading: contextLoading } = useProjectData();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjectDetails = useCallback(() => {
    let cancelled = false;
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
    setLoading(true);
    fetchProjectDetails();
  }, [id, fetchProjectDetails]);

  // ── Toast Notification State ─────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 5000);
  }, []);

  // ── Character, Environment & Voice Studio State & Handlers ───────────────────────
  const [generatedAssets, setGeneratedAssets] = useState([]);
  const [generatedEnvAssets, setGeneratedEnvAssets] = useState([]);
  const [generatedVoiceAssets, setGeneratedVoiceAssets] = useState([]);
  const [runningJobs, setRunningJobs] = useState({});

  const fetchCharactersList = useCallback(() => {
    const numericId = decodeProjectRouteId(id);
    getProjectCharacters(numericId)
      .then(data => {
        setGeneratedAssets(data);
      })
      .catch(err => {
        console.error("Failed to load character assets:", err);
      });
  }, [id]);

  const fetchEnvironmentsList = useCallback(() => {
    const numericId = decodeProjectRouteId(id);
    getProjectEnvironments(numericId)
      .then(data => {
        setGeneratedEnvAssets(data);
      })
      .catch(err => {
        console.error("Failed to load environment assets:", err);
      });
  }, [id]);

  const fetchVoicesList = useCallback(() => {
    const numericId = decodeProjectRouteId(id);
    getProjectVoices(numericId)
      .then(data => {
        setGeneratedVoiceAssets(data);
      })
      .catch(err => {
        console.error("Failed to load voice assets:", err);
      });
  }, [id]);

  const [sceneVideos, setSceneVideos] = useState([]);
  const [scenesStatus, setScenesStatus] = useState([]);
  const [sceneStatusLoading, setSceneStatusLoading] = useState(true);

  const fetchSceneVideosAndStatus = useCallback(() => {
    const numericId = decodeProjectRouteId(id);
    setSceneStatusLoading(true);
    Promise.all([
      getSceneVideos(numericId),
      getScenesStatus(numericId)
    ]).then(([videos, status]) => {
      setSceneVideos(videos);
      setScenesStatus(status);
      setSceneStatusLoading(false);
    }).catch(err => {
      console.error("Failed to load scene videos/status:", err);
      setSceneStatusLoading(false);
    });
  }, [id]);

  useEffect(() => {
    fetchCharactersList();
    fetchEnvironmentsList();
    fetchVoicesList();
    fetchSceneVideosAndStatus();
  }, [id, fetchCharactersList, fetchEnvironmentsList, fetchVoicesList, fetchSceneVideosAndStatus]);

  // SSE Stream Listener for characters, environments, and voices
  useEffect(() => {
    const eventSource = new EventSource(`${apiBaseUrl}/jobs/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'connected') {
          console.log("Connected to jobs stream");
          return;
        }
        
        const numericId = decodeProjectRouteId(id);
        if (String(data.project_id) === String(numericId)) {
          if (data.type === 'character_generation') {
            const charName = data.target_id;
            if (charName) {
              setRunningJobs(prev => {
                const updated = { ...prev };
                if (data.status === 'completed' || data.status === 'failed') {
                  delete updated[charName];
                  fetchCharactersList();
                  fetchSceneVideosAndStatus();
                } else {
                  updated[charName] = {
                    status: data.status,
                    progress: data.progress || 0,
                    message: data.message || "Processing..."
                  };
                }
                return updated;
              });
            }
          } else if (data.type === 'environment_generation') {
            const envName = data.target_id;
            if (envName) {
              setRunningJobs(prev => {
                const updated = { ...prev };
                if (data.status === 'completed' || data.status === 'failed') {
                  delete updated[envName];
                  fetchEnvironmentsList();
                  fetchProjectDetails();
                  fetchSceneVideosAndStatus();
                } else {
                  updated[envName] = {
                    status: data.status,
                    progress: data.progress || 0,
                    message: data.message || "Processing..."
                  };
                }
                return updated;
              });
            }
          } else if (data.type === 'voice_generation') {
            const charName = data.target_id;
            if (charName) {
              setRunningJobs(prev => {
                const updated = { ...prev };
                if (data.status === 'completed' || data.status === 'failed') {
                  delete updated[charName];
                  fetchVoicesList();
                  fetchProjectDetails();
                  fetchSceneVideosAndStatus();
                } else {
                  updated[charName] = {
                    status: data.status,
                    progress: data.progress || 0,
                    message: data.message || "Processing..."
                  };
                }
                return updated;
              });
            }
          } else if (data.type === 'scene_generation') {
            const sceneName = data.target_id;
            if (sceneName) {
              setRunningJobs(prev => {
                const updated = { ...prev };
                if (data.status === 'completed' || data.status === 'failed') {
                  delete updated[sceneName];
                  // Reset manual selection map for this scene name so the approved version is shown
                  setSelectedVersionsMap(prevMap => {
                    const updatedMap = { ...prevMap };
                    delete updatedMap[sceneName];
                    return updatedMap;
                  });
                  fetchSceneVideosAndStatus();
                } else {
                  updated[sceneName] = {
                    status: data.status,
                    progress: data.progress || 0,
                    message: data.message || "Processing..."
                  };
                }
                return updated;
              });
            }
          }
        }
      } catch (err) {
        console.error("Error parsing jobs stream event:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("Jobs SSE connection error:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, fetchCharactersList, fetchEnvironmentsList, fetchVoicesList, fetchProjectDetails, fetchSceneVideosAndStatus]);

  const handleGenerateCharacter = async (characterName) => {
    const numericId = decodeProjectRouteId(id);
    setRunningJobs(prev => ({
      ...prev,
      [characterName]: {
        status: 'queued',
        progress: 0,
        message: 'Initializing job...'
      }
    }));
    try {
      await generateCharacterAsset(numericId, characterName);
    } catch (err) {
      console.error("Failed to trigger character generation:", err);
      showToast("Failed to start character generation: " + err.message, 'error');
      setRunningJobs(prev => {
        const updated = { ...prev };
        delete updated[characterName];
        return updated;
      });
    }
  };

  const handleSelectVersion = async (characterName, preferredAssetId) => {
    const numericId = decodeProjectRouteId(id);
    try {
      await selectCharacterVersion(numericId, characterName, preferredAssetId);
      await fetchCharactersList();
    } catch (err) {
      console.error("Failed to select character version:", err);
      showToast("Failed to switch version: " + err.message, 'error');
    }
  };

  const handleGenerateEnvironment = async (envName) => {
    const numericId = decodeProjectRouteId(id);
    setRunningJobs(prev => ({
      ...prev,
      [envName]: {
        status: 'queued',
        progress: 0,
        message: 'Initializing job...'
      }
    }));
    try {
      await generateEnvironmentAsset(numericId, envName);
    } catch (err) {
      console.error("Failed to trigger environment generation:", err);
      showToast("Failed to start environment generation: " + err.message, 'error');
      setRunningJobs(prev => {
        const updated = { ...prev };
        delete updated[envName];
        return updated;
      });
    }
  };

  const handleSelectEnvVersion = async (envName, preferredAssetId) => {
    const numericId = decodeProjectRouteId(id);
    try {
      await selectEnvironmentVersion(numericId, envName, preferredAssetId);
      await fetchEnvironmentsList();
    } catch (err) {
      console.error("Failed to select environment version:", err);
      showToast("Failed to switch version: " + err.message, 'error');
    }
  };

  const handleGenerateVoice = async (characterName) => {
    const numericId = decodeProjectRouteId(id);
    setRunningJobs(prev => ({
      ...prev,
      [characterName]: {
        status: 'queued',
        progress: 0,
        message: 'Initializing voice job...'
      }
    }));
    try {
      await generateVoiceAsset(numericId, characterName);
    } catch (err) {
      console.error("Failed to trigger voice generation:", err);
      showToast("Failed to start voice generation: " + err.message, 'error');
      setRunningJobs(prev => {
        const updated = { ...prev };
        delete updated[characterName];
        return updated;
      });
    }
  };

  const handleSelectVoiceVersion = async (characterName, preferredAssetId) => {
    const numericId = decodeProjectRouteId(id);
    try {
      await selectVoiceVersion(numericId, characterName, preferredAssetId);
      await fetchVoicesList();
    } catch (err) {
      console.error("Failed to select voice version:", err);
      showToast("Failed to switch version: " + err.message, 'error');
    }
  };

  const handleGenerateScene = async (sceneNumberStr) => {
    const numericId = decodeProjectRouteId(id);
    
    // Check if any scene is currently generating
    const isAnySceneGenerating = Object.keys(runningJobs).some(key => key.startsWith("SCENE") || key.includes("Scene"));
    if (isAnySceneGenerating) {
      showToast("A scene is already generating. Please wait until it completes.", 'error');
      return;
    }
    
    setRunningJobs(prev => ({
      ...prev,
      [sceneNumberStr]: {
        status: 'queued',
        progress: 0,
        message: 'Preparing scene package...'
      }
    }));
    
    // Clear manual selection map for this scene name so the approved version is shown
    setSelectedVersionsMap(prevMap => {
      const updatedMap = { ...prevMap };
      delete updatedMap[sceneNumberStr];
      return updatedMap;
    });

    try {
      await generateSceneVideo(numericId, sceneNumberStr);
      showToast(`Video generation queued for ${sceneNumberStr}.`, 'success');
      fetchSceneVideosAndStatus();
    } catch (err) {
      console.error("Failed to trigger scene generation:", err);
      const customMsg = err.response?.data?.detail || err.message || "Network error";
      showToast("Failed to start scene generation: " + customMsg, 'error');
      setRunningJobs(prev => {
        const updated = { ...prev };
        delete updated[sceneNumberStr];
        return updated;
      });
    }
  };

  const handleApproveScene = async (videoId) => {
    const numericId = decodeProjectRouteId(id);
    try {
      await approveSceneVideo(numericId, videoId);
      showToast("Scene version approved successfully.", 'success');
      fetchSceneVideosAndStatus();
    } catch (err) {
      console.error("Failed to approve scene:", err);
      showToast("Failed to approve scene: " + err.message, 'error');
    }
  };

  const handleDeleteSceneVideo = async (videoId) => {
    const numericId = decodeProjectRouteId(id);
    try {
      await deleteSceneVideo(numericId, videoId);
      showToast("Scene version deleted.", 'info');
      fetchSceneVideosAndStatus();
    } catch (err) {
      console.error("Failed to delete scene video:", err);
      showToast("Failed to delete scene version: " + err.message, 'error');
    }
  };

  const [selectedVersionsMap, setSelectedVersionsMap] = useState({});
  
  // ── Tab Management ──────────────────────────────────────────────────────
  const [activeStudioTab, setActiveStudioTab] = useState('dashboard'); // dashboard, characters, environments, voices, filmgen
  
  useEffect(() => {
    const isAudio = project?.production_type === 'Podcast' || project?.production_type === 'Audio Story';
    if (isAudio && (activeStudioTab === 'characters' || activeStudioTab === 'environments')) {
      setActiveStudioTab('dashboard');
    }
  }, [project, activeStudioTab]);
  
  // ── Interactive State Compilation Mock ──────────────────────────────────
  const [compilingVoice, setCompilingVoice] = useState(null); // name of char voice being compiled
  const [activeVoicePreview, setActiveVoicePreview] = useState(null); // name of char voice previewing
  const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
  const previewTimer = useRef(null);
  const audioInstanceRef = useRef(null);

  // ── Film Render Console State ───────────────────────────────────────────
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderLogs, setRenderLogs] = useState([]);
  const [renderSuccess, setRenderSuccess] = useState(false);

  useEffect(() => {
    if (project && !project.approved) {
      navigate(`/projects/${id}`, { replace: true });
    }
  }, [project, id, navigate]);

  const handleResume = async () => {
    const numericId = decodeProjectRouteId(id);
    try {
      await resumeGenerate(numericId);
      const updatedProject = await getProjectById(numericId);
      setProject(updatedProject);
    } catch (err) {
      console.error(err);
      showToast("Failed to resume generation: " + err.message, 'error');
    }
  };

  const handleUpdateFields = async (updates) => {
    try {
      const numericId = decodeProjectRouteId(id);
      const updated = await updateProject(numericId, updates);
      setProject(updated);
      fetchSavedProjects();
    } catch (err) {
      console.error("Failed to update database record:", err);
      showToast("Database error: " + err.message, 'error');
    }
  };

  // ── Compile Voice Model ID ──────────────────────────────────────────────
  const handleCompileVoice = (charName) => {
    if (compilingVoice) return;
    setCompilingVoice(charName);
    
    setTimeout(() => {
      const randomId = `V-${charName.toUpperCase().slice(0,4)}-${Math.floor(Math.random() * 8999) + 1000}`;
      const updatedVoices = (project?.voices || []).map(v => {
        if (v.character === charName) {
          return {
            ...v,
            status: 'Voice Model Ready',
            voice_id: randomId,
            consistency_status: 'Verified'
          };
        }
        return v;
      });
      handleUpdateFields({ voices: updatedVoices }).then(() => {
        setCompilingVoice(null);
      });
    }, 2500);
  };

  // ── Voice Preview Playback Handler ──────────────────────────────────────
  const handlePlayVoicePreview = (charName, previewUrl) => {
    if (voicePreviewPlaying && activeVoicePreview === charName) {
      // Pause
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause();
      }
      setVoicePreviewPlaying(false);
      if (previewTimer.current) clearInterval(previewTimer.current);
      return;
    }
    
    // Stop any existing playing preview
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }
    if (previewTimer.current) clearInterval(previewTimer.current);
    
    setActiveVoicePreview(charName);
    setVoicePreviewPlaying(true);

    if (previewUrl) {
      const fullUrl = previewUrl.startsWith('/') ? apiBaseUrl + previewUrl : previewUrl;
      const audio = new Audio(fullUrl);
      audioInstanceRef.current = audio;
      audio.play().catch(err => {
        console.error("Browser audio play failed, using simulated timer:", err);
        // Fallback simulation
        let playSec = 0;
        previewTimer.current = setInterval(() => {
          playSec += 1;
          if (playSec >= 5) {
            setVoicePreviewPlaying(false);
            clearInterval(previewTimer.current);
          }
        }, 1000);
      });
      
      audio.onended = () => {
        setVoicePreviewPlaying(false);
        setActiveVoicePreview(null);
      };
    } else {
      // Fallback simulation if no previewUrl
      let playSec = 0;
      previewTimer.current = setInterval(() => {
        playSec += 1;
        if (playSec >= 5) {
          setVoicePreviewPlaying(false);
          clearInterval(previewTimer.current);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause();
    }
    setVoicePreviewPlaying(false);
  }, [activeStudioTab]);

  useEffect(() => {
    return () => {
      if (previewTimer.current) clearInterval(previewTimer.current);
      if (audioInstanceRef.current) audioInstanceRef.current.pause();
    };
  }, []);

  // ── Render Film Simulator ────────────────────────────────────────────────
  const handleStartRender = () => {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderSuccess(false);
    setRenderLogs([]);
    
    const logsList = [
      "[INFO] Initializing Veo Temporal Synthesizer pipeline...",
      "[INFO] Fetching 3D environment blueprints & spatial lighting setups...",
      "[INFO] Mapping character cast voice profiles...",
      `[INFO] Loaded Voice Models: ${project?.voices?.map(v => v.voice_id).join(', ')}`,
      "[INFO] Launching Scene 1 render job (Camera: Wide Shot, Mood: Cinematic)...",
      "[INFO] Compiling Scene 1 frames (100% complete)...",
      "[INFO] Launching Scene 2 render job (Camera: Close Up)...",
      "[INFO] Compiling Scene 2/3 frames (100% complete)...",
      "[INFO] Integrating audio synthesizer (soundscapes + speech track)...",
      "[INFO] Assembling final cut clip and color correction overlay...",
      "[SUCCESS] Video compilation successfully generated!"
    ];

    let currentLogIdx = 0;
    const interval = setInterval(() => {
      setRenderProgress(prev => {
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next >= 100) {
          clearInterval(interval);
          setRenderSuccess(true);
          return 100;
        }
        return next;
      });

      if (currentLogIdx < logsList.length) {
        setRenderLogs(prev => [...prev, logsList[currentLogIdx]]);
        currentLogIdx += 1;
      }
    }, 600);
  };

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

  const isMissingSpecs = !project.scene_breakdown || !project.production_plan || !project.critic_review;
  
  // ── Asset Quantities and Statistics ──────────────────────────────────────
  const sceneCount = project.scene_breakdown?.scenes?.length || project.storyboard?.length || 0;
  const runtime = project.scene_breakdown?.total_runtime || (sceneCount > 0 ? `${sceneCount * 8}s` : '0s');

  const costEstimate = sceneCount * 120 + 50; 
  const generationTimeSeconds = sceneCount * 30 + 15;
  const generationTimeStr = generationTimeSeconds >= 60 
    ? `${Math.floor(generationTimeSeconds / 60)}m ${generationTimeSeconds % 60}s` 
    : `${generationTimeSeconds}s`;

  const characters = extractCharacters(project);
  const environments = project.environments || [];
  const voices = project.voices || [];

  const locationsCount = project.scene_breakdown?.asset_requirements?.locations_needed?.length || 0;
  const environmentsCount = environments.length;

  // ── Production Readiness Calculations ────────────────────────────────────
  const generatedCharacterNames = new Set(generatedAssets.map(asset => asset.character_name));
  const characterAssetCount = characters.filter(char => generatedCharacterNames.has(char.name)).length;
  const characterReadiness = characters.length > 0 ? Math.round((characterAssetCount / characters.length) * 100) : 100;

  const generatedEnvNames = new Set(generatedEnvAssets.map(asset => asset.environment_name));
  const readyEnvs = environments.filter(e => generatedEnvNames.has(e.name)).length;
  const environmentReadiness = environmentsCount > 0 ? Math.round((readyEnvs / environmentsCount) * 100) : 0;
  const generatedVoiceNames = new Set(generatedVoiceAssets.map(asset => asset.character_name));
  const readyVoices = voices.filter(v => generatedVoiceNames.has(v.character)).length;
  const voiceReadiness = voices.length > 0 ? Math.round((readyVoices / voices.length) * 100) : 0;
  
  const assetsReadiness = (characterReadiness === 100 && environmentReadiness === 100 && voiceReadiness === 100) ? 100 : 0;
  
  const overallReadiness = Math.round((characterReadiness + environmentReadiness + voiceReadiness + assetsReadiness) / 4);
  const isProductionReady = overallReadiness === 100;

  // Pipeline Stages config
  const pipelineStages = [
    { name: 'Characters', status: characterReadiness === 100 ? 'Ready' : 'Pending', desc: 'Virtual Cast Definition', icon: FiUser },
    { name: 'Environments', status: environmentReadiness === 100 ? 'Ready' : 'Pending', desc: 'Spatial Context Models', icon: FiMapPin },
    { name: 'Voices', status: voiceReadiness === 105 ? 'Ready' : (voiceReadiness === 100 ? 'Ready' : 'Pending'), desc: 'Speech Synthesis Profiles', icon: FiVolume2 },
    { name: 'Assets', status: assetsReadiness === 100 ? 'Ready' : 'Locked', desc: 'Downstream Production Files', icon: FiDatabase },
    { name: 'Video Generation', status: isProductionReady ? 'Ready' : 'Locked', desc: 'Temporal Synthesizer Orchestration', icon: FiCpu },
    { name: 'Editing', status: isProductionReady ? 'Ready' : 'Locked', desc: 'Final Montage Assembly', icon: FiSliders },
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 ${d ? 'bg-neutral-550' : 'bg-[#030303]'}`}>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-purple-950/[0.03] via-transparent to-cyan-950/[0.02] z-0" />
      <div className="absolute top-0 right-[25%] w-[400px] h-[400px] rounded-full bg-cyan-500/[0.02] blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] rounded-full bg-purple-500/[0.02] blur-[150px] pointer-events-none z-0" />

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

        {/* Studio Phase Navigation Tabs */}
        <div className={`flex gap-1 border-b px-6 py-2 shrink-0 select-none transition-colors duration-500 ${
          d ? 'bg-neutral-50/50 border-neutral-200' : 'bg-[#08080C]/20 border-white/[0.04]'
        }`}>
          {(() => {
            const isAudio = project?.production_type === 'Podcast' || project?.production_type === 'Audio Story';
            const prodType = project?.production_type || 'Short Film';
            
            // Dynamic Labels based on project production type
            let characterLabel = 'Character Studio';
            let environmentLabel = 'Environment Studio';
            let voiceLabel = 'Voice Studio';
            let filmGenLabel = 'Scene Production Console';
            
            if (prodType === 'Documentary') {
              characterLabel = 'Subjects & Narrators';
              environmentLabel = 'Locations & B-Roll';
            } else if (prodType === 'Interview' || prodType === 'Podcast') {
              characterLabel = 'Hosts & Guests';
              voiceLabel = 'Host & Guest Voices';
              environmentLabel = 'Sets & Backdrops';
              filmGenLabel = 'Audio Production Console';
            } else if (prodType === 'YouTube Video') {
              characterLabel = 'Presenters & Avatars';
              environmentLabel = 'Backdrops & Sets';
            } else if (prodType === 'Educational Show') {
              characterLabel = 'Presenters & Instructors';
              environmentLabel = 'Slides & Classrooms';
            } else if (prodType === 'Audio Story') {
              voiceLabel = 'Narrators & Cast';
              filmGenLabel = 'Audio Production Console';
            }
            
            const allTabs = [
              { id: 'dashboard', label: 'Dashboard', icon: FiActivity },
              { id: 'characters', label: characterLabel, icon: FiUser, isVisual: true },
              { id: 'environments', label: environmentLabel, icon: FiMapPin, isVisual: true },
              { id: 'voices', label: voiceLabel, icon: FiVolume2 },
              { id: 'filmgen', label: filmGenLabel, icon: FiMonitor },
            ];
            
            // Filter out visual tabs for audio-only formats
            return allTabs.filter(tab => !isAudio || !tab.isVisual);
          })().map(tab => {
            const Icon = tab.icon;
            const isActive = activeStudioTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveStudioTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? d 
                      ? 'bg-neutral-100 text-neutral-950 font-extrabold border border-neutral-200' 
                      : 'bg-white/[0.06] text-white border border-white/[0.08] shadow-[0_0_12px_rgba(255,255,255,0.03)]' 
                    : d 
                      ? 'text-neutral-500 hover:text-neutral-800' 
                      : 'text-surface-450 hover:text-surface-200'
                }`}
              >
                <Icon size={12} className={isActive ? 'text-accent' : ''} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Console Workspace viewport */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {contextLoading ? (
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
              <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
                <div className={`rounded-xl border p-6 space-y-6 transition-colors duration-500 ${
                  d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
                }`}>
                  <div className="text-center space-y-1 py-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-accent">Resuming Pipeline Execution</h3>
                    <p className={`text-[11px] ${d ? 'text-gray-550' : 'text-surface-500'}`}>Orchestrating autonomous agents to build subsequent production phases.</p>
                  </div>
                  <div className="border-t border-white/[0.04] pt-5">
                    <AgentActivityPanel />
                  </div>
                </div>
              </div>
              <Footer />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {isMissingSpecs && (
                <div className="px-6 pt-4 shrink-0">
                  <div className="max-w-7xl mx-auto">
                    <div className={`rounded-xl border p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300 ${
                      d 
                        ? 'bg-amber-50/50 border-amber-300 text-neutral-800' 
                        : 'bg-amber-500/[0.02] border-amber-500/20 text-white'
                    }`}>
                      <div className="flex items-start gap-3">
                        <span className="text-amber-500 text-lg mt-0.5">⚠️</span>
                        <div>
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-500">
                            Missing Pre-Production Specifications
                          </h4>
                          <p className={`text-[11px] mt-1 ${d ? 'text-gray-650' : 'text-surface-400'}`}>
                            This project is missing scene breakdown, production plan, or critic reviews. 
                            Click "Proceed Generation" to compile these requirements from the existing script.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleResume}
                        className="px-4 py-2 bg-accent hover:bg-purple-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
                      >
                        Proceed Generation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB CONTENT ── */}
              {activeStudioTab === 'dashboard' && (
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
                  <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
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

                    {/* 2. PRODUCTION READINESS HUD */}
                    <div className={`rounded-xl border p-5 transition-colors duration-500 ${
                      d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
                    }`}>
                      <div className="flex items-center gap-2 border-b pb-3.5 mb-5 border-white/[0.03]">
                        <FiSettings className="text-accent" size={14} />
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                          Production Readiness HUD
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Dial Indicator */}
                        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 border-r border-dashed border-white/[0.05]">
                          <div className="relative flex items-center justify-center">
                            {/* Outer radial boundary */}
                            <svg className="w-28 h-28 transform -rotate-90">
                              <circle cx="56" cy="56" r="46" stroke="rgba(255,255,255,0.02)" strokeWidth="6" fill="transparent" />
                              <circle 
                                cx="56" 
                                cy="56" 
                                r="46" 
                                stroke="#8b5cf6" 
                                strokeWidth="6" 
                                fill="transparent" 
                                strokeDasharray={2 * Math.PI * 46}
                                strokeDashoffset={2 * Math.PI * 46 * (1 - overallReadiness / 100)}
                                className="transition-all duration-1000 ease-out"
                              />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-2xl font-black block tracking-tight">{overallReadiness}%</span>
                              <span className="text-[8px] font-extrabold font-mono tracking-widest text-surface-500 uppercase">READINESS</span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Grid */}
                        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Cast Profiles</span>
                              <span className="text-emerald-400 font-mono">100%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '100%' }} />
                            </div>
                          </div>

                          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Environment Specs</span>
                              <span className={`${environmentReadiness === 100 ? 'text-emerald-400' : 'text-accent'} font-mono`}>{environmentReadiness}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${environmentReadiness}%` }} />
                            </div>
                          </div>

                          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Voice Profiles</span>
                              <span className={`${voiceReadiness === 100 ? 'text-emerald-400' : 'text-accent'} font-mono`}>{voiceReadiness}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${voiceReadiness}%` }} />
                            </div>
                          </div>

                          <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Asset Packages</span>
                              <span className={`${assetsReadiness === 100 ? 'text-emerald-400' : 'text-surface-500'} font-mono`}>{assetsReadiness}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/40 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${assetsReadiness}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. PRODUCTION PROGRESS PIPELINE */}
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
                        {pipelineStages.map((stage) => {
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
                                    ? 'bg-neutral-550/50 border-neutral-100 opacity-60'
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
                  </div>
                  <Footer />
                </div>
              )}

              {activeStudioTab === 'characters' && (
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
                  <div className="max-w-7xl mx-auto w-full pb-12">
                    {/* 3. CHARACTER STUDIO (Cast extraction) */}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {characters.map((char) => {
                          const characterAssets = generatedAssets.filter(asset => asset.character_name === char.name);
                          const activeAsset = characterAssets.find(asset => asset.character_profile?.is_preferred) || characterAssets[characterAssets.length - 1];
                          const activeJob = runningJobs[char.name];
                          
                          // Determine description
                          const description = activeAsset?.character_profile?.visual_profile || char.description;
                          const age = activeAsset?.character_profile?.age || 'Extracting...';
                          const gender = activeAsset?.character_profile?.gender || 'Extracting...';
                          const role = activeAsset?.character_profile?.role || char.role || 'Supporting';
                          const personality = activeAsset?.character_profile?.personality || 'Extracting...';
                          const wardrobe = activeAsset?.character_profile?.wardrobe || 'Extracting...';
                          
                          const hasAsset = !!activeAsset;

                          return (
                            <div 
                              key={char.name}
                              className={`rounded-xl border flex flex-col overflow-hidden text-left transition-all duration-300 ${
                                d 
                                  ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm' 
                                  : 'bg-[#0b0b0f] border-white/[0.05] hover:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                              }`}
                            >
                              {/* Top Portrait Frame */}
                              <div className="relative aspect-[3/4] max-h-[300px] w-full overflow-hidden bg-neutral-950 flex flex-col justify-center items-center">
                                {activeJob ? (
                                  /* Active generation job overlay */
                                  <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center select-none">
                                    <div className="relative flex items-center justify-center mb-4">
                                      <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                      <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{activeJob.progress}%</span>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse">
                                      {activeJob.message || 'Generating...'}
                                    </span>
                                    <div className="w-full h-1 bg-white/[0.06] rounded-full mt-4 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${activeJob.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : !hasAsset ? (
                                  /* Viewfinder placeholder when not generated */
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-white/[0.08] rounded-t-xl bg-[#09090d]">
                                    {/* Viewfinder brackets */}
                                    <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20" />
                                    <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20" />
                                    <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20" />
                                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20" />
                                    
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                      <div className="w-6 h-0.5 bg-white" />
                                      <div className="w-0.5 h-6 bg-white absolute" />
                                      <div className="w-8 h-8 border border-white rounded-full absolute" />
                                    </div>

                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[8px] font-mono text-red-500 tracking-wider">
                                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                      <span>AWAITING CAST</span>
                                    </div>

                                    <div className="mb-4 text-surface-600 opacity-60">
                                      <FiUser size={36} className="mx-auto text-surface-500 mb-1" />
                                      <span className="font-bold text-[9px] text-surface-500 uppercase tracking-widest block">No Visual Reference</span>
                                    </div>
                                    
                                    <button
                                      onClick={() => handleGenerateCharacter(char.name)}
                                      className="relative z-20 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-[11px] uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(0,242,254,0.15)] hover:shadow-[0_0_20px_rgba(0,242,254,0.25)] transition-all duration-300 transform active:scale-[0.98] cursor-pointer"
                                    >
                                      Generate Cast Asset
                                    </button>
                                  </div>
                                ) : (
                                  /* Generated portrait rendering */
                                  <>
                                    <img 
                                      src={activeAsset.image_url.startsWith('/') ? apiBaseUrl + activeAsset.image_url : activeAsset.image_url} 
                                      alt={char.name} 
                                      className="w-full h-full object-cover rounded-t-lg transition-transform duration-700 hover:scale-105" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                                    
                                    {/* Badges */}
                                    <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/[0.1] text-cyan-400 font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                                      V{activeAsset.character_profile?.version || 1}
                                    </span>
                                    
                                    <span className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md ${
                                      role === 'Lead'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    }`}>
                                      {role} Role
                                    </span>

                                    <div className="absolute bottom-3 left-3 flex flex-col gap-0.5 font-mono text-[8px] text-surface-450 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-white/[0.04]">
                                      <span>ID: {activeAsset.character_profile?.character_id?.split('_').pop() || 'char'}</span>
                                      <span>HASH: {activeAsset.character_profile?.consistency_hash || 'N/A'}</span>
                                    </div>
                                    
                                    <button
                                      onClick={() => handleGenerateCharacter(char.name)}
                                      className="absolute bottom-3 right-3 px-2.5 py-1 bg-accent hover:bg-purple-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-md z-20"
                                      title="Generate a new version of this character portrait"
                                    >
                                      <span>Regenerate</span>
                                    </button>
                                  </>
                                )}
                              </div>

                              {/* Bottom Details Section */}
                              <div className="p-5 flex flex-col justify-between flex-1 bg-[#09090d]/30 border-t border-white/[0.02]">
                                <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                                  <div>
                                    <div className="flex justify-between items-center">
                                      <h4 className={`text-base font-extrabold uppercase tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>
                                        {char.name}
                                      </h4>
                                      {hasAsset && (
                                        <span className="text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                          Active Reference
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-[11px] leading-relaxed mt-3">
                                      <span className="text-surface-500 font-semibold block uppercase text-[8px] tracking-wider mb-0.5">Visual Identity Profile</span>
                                      <p className={`line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-pointer ${d ? 'text-neutral-600' : 'text-surface-400'}`} title="Click to expand">
                                        {description}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Metadata Grid */}
                                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-dashed border-white/[0.05] pt-3.5 mt-auto">
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Gender</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{gender}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Age</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{age}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Personality Schema</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={personality}>{personality}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Wardrobe Palette</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`} title={wardrobe}>{wardrobe}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Controls Bar (Only visible if assets exist) */}
                                {hasAsset && (
                                  <div className="flex gap-3 items-end mt-5 border-t border-white/[0.04] pt-4 shrink-0">
                                    <div className="flex-1 flex flex-col gap-1">
                                      <label className="text-[8px] font-extrabold uppercase text-surface-500 tracking-wider">Asset Version</label>
                                      <select
                                        value={activeAsset.id}
                                        onChange={(e) => handleSelectVersion(char.name, Number(e.target.value))}
                                        className="text-xs bg-neutral-900/60 border border-white/[0.08] rounded-md p-1.5 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                      >
                                        {characterAssets.map(asset => (
                                          <option key={asset.id} value={asset.id}>
                                            Version {asset.character_profile?.version || 1} {asset.id === activeAsset.id ? '(Active)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      onClick={() => handleGenerateCharacter(char.name)}
                                      className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] hover:border-cyan-500/30"
                                    >
                                      Regenerate
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  </div>
                  <Footer />
                </div>
              )}

              {activeStudioTab === 'environments' && (
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
                  <div className="max-w-7xl mx-auto w-full pb-12">
                    {/* ── ENVIRONMENT STUDIO ── */}
                    <div className={`rounded-xl border p-5 transition-colors duration-500 ${
                      d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3.5 mb-6 border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-accent" size={14} />
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                              Environment Studio
                            </h3>
                            <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                              Compiling spatial blueprints, weather states, and architectural references
                            </p>
                          </div>
                        </div>
                        <div className={`text-[9px] font-bold font-mono tracking-widest uppercase px-2 py-1 rounded border ${
                          d ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-white/[0.02] border-white/[0.06] text-surface-400'
                        }`}>
                          Environments: {environments.length}
                        </div>
                      </div>

                      {environments.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-surface-600 text-xs italic">No environments extracted. Check script or breakdown stages.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {environments.map((env) => {
                            const envAssets = generatedEnvAssets.filter(asset => asset.environment_name === env.name);
                            const activeAsset = envAssets.find(asset => asset.environment_profile?.is_preferred) || envAssets[envAssets.length - 1];
                            const activeJob = runningJobs[env.name];
                            
                            const hasAsset = !!activeAsset;
                            
                            // Extracted fields
                            const description = activeAsset?.environment_profile?.description || "Extracting from script...";
                            const architecture = activeAsset?.environment_profile?.architecture || env.architecture || "Extracting...";
                            const lighting = activeAsset?.environment_profile?.lighting || env.lighting || "Extracting...";
                            const weather = activeAsset?.environment_profile?.weather || env.weather || "Extracting...";
                            const colorPalette = activeAsset?.environment_profile?.color_palette || "Extracting...";
                            const mood = activeAsset?.environment_profile?.mood || "Extracting...";
                            const timeOfDay = activeAsset?.environment_profile?.time_of_day || "Extracting...";
                            const envType = activeAsset?.environment_profile?.environment_type || env.type || "Exterior";
                            const scenes = env.scenes || [];
                            
                            return (
                              <div 
                                key={env.name}
                                className={`rounded-xl border flex flex-col overflow-hidden text-left transition-all duration-300 ${
                                  d 
                                    ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm' 
                                    : 'bg-[#0b0b0f] border-white/[0.05] hover:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                                }`}
                              >
                                {/* Top Portrait Frame */}
                                <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-950 flex flex-col justify-center items-center">
                                  {activeJob ? (
                                    /* Active generation job overlay */
                                    <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center select-none">
                                      <div className="relative flex items-center justify-center mb-4">
                                        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{activeJob.progress}%</span>
                                      </div>
                                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse">
                                        {activeJob.message || 'Generating...'}
                                      </span>
                                      <div className="w-full h-1 bg-white/[0.06] rounded-full mt-4 overflow-hidden">
                                        <div 
                                          className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                                          style={{ width: `${activeJob.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : !hasAsset ? (
                                    /* Viewfinder placeholder when not generated */
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-white/[0.08] bg-[#09090d]">
                                      {/* Viewfinder brackets */}
                                      <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20" />
                                      <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20" />
                                      <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20" />
                                      <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20" />
                                      
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                        <div className="w-6 h-0.5 bg-white" />
                                        <div className="w-0.5 h-6 bg-white absolute" />
                                        <div className="w-8 h-8 border border-white rounded-full absolute" />
                                      </div>

                                      <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[8px] font-mono text-red-500 tracking-wider">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                        <span>AWAITING WORLD REFERENCE</span>
                                      </div>

                                      <div className="mb-3 text-surface-600 opacity-60">
                                        <FiMapPin size={28} className="mx-auto text-surface-500 mb-1" />
                                        <span className="font-bold text-[8px] text-surface-500 uppercase tracking-widest block">No Visual Reference</span>
                                      </div>
                                      
                                      <button
                                        onClick={() => handleGenerateEnvironment(env.name)}
                                        className="relative z-20 px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(0,242,254,0.15)] hover:shadow-[0_0_20px_rgba(0,242,254,0.25)] transition-all duration-300 transform active:scale-[0.98] cursor-pointer"
                                      >
                                        Generate Environment
                                      </button>
                                    </div>
                                  ) : (
                                    /* Generated portrait rendering */
                                    <>
                                      <img 
                                        src={activeAsset.image_url.startsWith('/') ? apiBaseUrl + activeAsset.image_url : activeAsset.image_url} 
                                        alt={env.name} 
                                        className="w-full h-full object-cover rounded-t-lg transition-transform duration-700 hover:scale-105" 
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                                      
                                      {/* Badges */}
                                      <span className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/[0.1] text-cyan-400 font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-md">
                                        V{activeAsset.environment_profile?.version || 1}
                                      </span>
                                      
                                      <span className={`absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md bg-purple-500/20 text-purple-300 border border-purple-500/30`}>
                                        {envType}
                                      </span>

                                      <div className="absolute bottom-3 left-3 flex flex-col gap-0.5 font-mono text-[8px] text-surface-450 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-white/[0.04]">
                                        <span>ID: {activeAsset.environment_profile?.environment_id?.split('_').pop() || 'env'}</span>
                                        <span>HASH: {activeAsset.environment_profile?.consistency_hash || 'N/A'}</span>
                                      </div>
                                      
                                      <button
                                        onClick={() => handleGenerateEnvironment(env.name)}
                                        className="absolute bottom-3 right-3 px-2.5 py-1 bg-accent hover:bg-purple-600 text-white font-bold text-[9px] uppercase tracking-wider rounded-md transition-all cursor-pointer flex items-center gap-1 shadow-md z-20"
                                        title="Generate a new version of this environment portrait"
                                      >
                                        <span>Regenerate</span>
                                      </button>
                                    </>
                                  )}
                                </div>

                                {/* Bottom Details Section */}
                                <div className="p-5 flex flex-col justify-between flex-1 bg-[#09090d]/30 border-t border-white/[0.02]">
                                  <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                                    <div>
                                      <div className="flex justify-between items-center">
                                        <h4 className={`text-sm font-extrabold uppercase tracking-wide truncate pr-2 ${d ? 'text-neutral-900' : 'text-white'}`} title={env.name}>
                                          {env.name}
                                        </h4>
                                        {hasAsset ? (
                                          <span className="text-[8px] font-extrabold font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                                            VERIFIED
                                          </span>
                                        ) : (
                                          <span className="text-[8px] font-extrabold font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                                            PENDING
                                          </span>
                                        )}
                                      </div>

                                      <div className="text-[11px] leading-relaxed mt-3">
                                        <span className="text-surface-500 font-semibold block uppercase text-[8px] tracking-wider mb-0.5">Location Description</span>
                                        <p className={`line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-pointer ${d ? 'text-neutral-600' : 'text-surface-400'}`} title="Click to expand">
                                          {description}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-dashed border-white/[0.05] pt-3.5 mt-auto">
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Architecture</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={architecture}>{architecture}</span>
                                      </div>
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Lighting</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={lighting}>{lighting}</span>
                                      </div>
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Weather</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={weather}>{weather}</span>
                                      </div>
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Time of Day</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={timeOfDay}>{timeOfDay}</span>
                                      </div>
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Mood</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={mood}>{mood}</span>
                                      </div>
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Color Palette</span>
                                        <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`} title={colorPalette}>{colorPalette}</span>
                                      </div>
                                      <div className="col-span-2">
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Scene Appearances ({scenes.length} count)</span>
                                        <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`}>{scenes.join(', ')}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Controls Bar (Only visible if assets exist) */}
                                  {hasAsset && (
                                    <div className="flex gap-3 items-end mt-5 border-t border-white/[0.04] pt-4 shrink-0">
                                      <div className="flex-1 flex flex-col gap-1">
                                        <label className="text-[8px] font-extrabold uppercase text-surface-500 tracking-wider">Asset Version</label>
                                        <select
                                          value={activeAsset.id}
                                          onChange={(e) => handleSelectEnvVersion(env.name, Number(e.target.value))}
                                          className="text-xs bg-neutral-900/60 border border-white/[0.08] rounded-md p-1.5 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                        >
                                          {envAssets.map(asset => (
                                            <option key={asset.id} value={asset.id}>
                                              Version {asset.environment_profile?.version || 1} {asset.id === activeAsset.id ? '(Active)' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <button
                                        onClick={() => handleGenerateEnvironment(env.name)}
                                        className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] hover:border-cyan-500/30"
                                      >
                                        Regenerate
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Footer />
                </div>
              )}

              {activeStudioTab === 'voices' && (
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
                  <div className="max-w-7xl mx-auto w-full pb-12">
                    {/* ── VOICE STUDIO ── */}
                    <div className={`rounded-xl border p-5 transition-colors duration-500 ${
                      d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3.5 mb-6 border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <FiVolume2 className="text-accent" size={14} />
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                              Voice Studio
                            </h3>
                            <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                              Mapping synthetic character accents, emotion ranges, and compiling speech IDs
                            </p>
                          </div>
                        </div>
                        <div className={`text-[9px] font-bold font-mono tracking-widest uppercase px-2 py-1 rounded border ${
                          d ? 'bg-neutral-50 border-neutral-200 text-neutral-600' : 'bg-white/[0.02] border-white/[0.06] text-surface-400'
                        }`}>
                          Cast Voices: {voices.length}
                        </div>
                      </div>

                      {voices.length === 0 ? (
                        <div className="text-center py-10">
                          <p className="text-surface-600 text-xs italic">No voice profiles mapped. Ensure pre-production script is generated.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {voices.map((v) => {
                            const characterVoiceAssets = generatedVoiceAssets.filter(asset => asset.character_name === v.character);
                            const activeVoiceAsset = characterVoiceAssets.find(asset => asset.voice_profile?.is_preferred) || characterVoiceAssets[characterVoiceAssets.length - 1];
                            const hasVoiceAsset = !!activeVoiceAsset;
                            
                            const charAssets = generatedAssets.filter(asset => asset.character_name === v.character);
                            const activeCharAsset = charAssets.find(asset => asset.character_profile?.is_preferred) || charAssets[charAssets.length - 1];

                            const activeJob = runningJobs[v.character];
                            const isCompiled = hasVoiceAsset;
                            const isCompiling = !!activeJob;
                            const isPlaying = voicePreviewPlaying && activeVoicePreview === v.character;

                            const ageRange = activeVoiceAsset?.voice_profile?.age_range || v.age_range || 'Extracting...';
                            const tone = activeVoiceAsset?.voice_profile?.voice_tone || v.tone || 'Extracting...';
                            const energy = activeVoiceAsset?.voice_profile?.voice_energy || 'Medium';
                            const pace = activeVoiceAsset?.voice_profile?.speech_pace || 'Measured';
                            const accent = activeVoiceAsset?.voice_profile?.accent || v.accent || 'Extracting...';
                            const speakingStyle = activeVoiceAsset?.voice_profile?.speaking_style || v.speech_style || 'Extracting...';
                            const emotionRange = activeVoiceAsset?.voice_profile?.emotion_range || v.emotion_range || 'Extracting...';
                            const narrativeFunction = activeVoiceAsset?.voice_profile?.narrative_function || 'Dialogue contributor';

                            return (
                              <div 
                                key={v.character}
                                className={`relative rounded-xl border p-5 flex flex-col justify-between overflow-hidden text-left transition-all duration-300 ${
                                  d 
                                    ? 'bg-white border-neutral-200 hover:border-neutral-300 shadow-sm' 
                                    : 'bg-[#0b0b0f] border-white/[0.05] hover:border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                                }`}
                              >
                                {activeJob && (
                                  <div className="absolute inset-0 bg-black/85 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center select-none rounded-xl">
                                    <div className="relative flex items-center justify-center mb-4">
                                      <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                      <span className="absolute text-[9px] font-mono font-bold text-cyan-400">{activeJob.progress}%</span>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse">
                                      {activeJob.message || 'Generating Voice...'}
                                    </span>
                                    <div className="w-full h-1 bg-white/[0.06] rounded-full mt-4 overflow-hidden">
                                      <div 
                                        className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${activeJob.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-4">
                                  {/* Voice Card Header */}
                                  <div className="flex justify-between items-start gap-3 border-b border-white/[0.03] pb-3">
                                    <div className="flex items-center gap-3">
                                      {activeCharAsset?.image_url ? (
                                        <img 
                                          src={activeCharAsset.image_url.startsWith('/') ? apiBaseUrl + activeCharAsset.image_url : activeCharAsset.image_url} 
                                          alt={v.character} 
                                          className="w-10 h-10 rounded-lg object-cover border border-white/[0.08] shrink-0" 
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-surface-400 shrink-0">
                                          <FiUser size={16} />
                                        </div>
                                      )}
                                      <div>
                                        <h4 className={`text-sm font-extrabold tracking-wide uppercase ${d ? 'text-neutral-900' : 'text-white'}`}>
                                          {v.character}
                                        </h4>
                                        <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                          v.role === 'Lead' ? 'text-purple-400' : 'text-blue-400'
                                        }`}>
                                          {v.role || 'Supporting'} Role
                                        </span>
                                      </div>
                                    </div>

                                    <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${
                                      isCompiled 
                                        ? d ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/5 border-emerald-500/25 text-emerald-400'
                                        : d ? 'bg-neutral-100 border-neutral-200 text-neutral-500' : 'bg-white/[0.02] border-white/[0.06] text-surface-500'
                                    }`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${isCompiled ? 'bg-emerald-400 animate-pulse' : 'bg-surface-500'}`} />
                                      {isCompiled ? 'Model Ready' : 'Pending'}
                                    </span>
                                  </div>

                                  {/* Specs / Attributes Grid */}
                                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Age Range</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{ageRange}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Voice Tone</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{tone}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Voice Energy</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{energy}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Speech Pace</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{pace}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Accent</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{accent}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Emotion Range</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{emotionRange}</span>
                                    </div>
                                    <div className="col-span-2 border-t border-dashed border-white/[0.04] pt-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Speaking Style</span>
                                      <span className={`block mt-0.5 text-xs leading-normal ${d ? 'text-neutral-700' : 'text-surface-350'}`}>{speakingStyle}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Narrative Function</span>
                                      <span className={`block mt-0.5 text-xs leading-normal ${d ? 'text-neutral-700' : 'text-surface-350'}`}>{narrativeFunction}</span>
                                    </div>
                                  </div>

                                  {/* Audio Preview space */}
                                  <div className="pt-2">
                                    <h5 className="text-[9px] font-extrabold uppercase tracking-widest text-accent mb-2">Voice Model Preview</h5>
                                    {isCompiled ? (
                                      <div className="bg-black/25 border border-white/[0.04] rounded-lg p-3 space-y-2.5">
                                        <div className="flex justify-between items-center text-[8px] font-mono text-surface-500 uppercase">
                                          <span>Voice Waveform</span>
                                          <span>Duration: 00:05</span>
                                        </div>
                                        <AudioWaveLines isPlaying={isPlaying} />
                                        <button
                                          onClick={() => handlePlayVoicePreview(v.character, activeVoiceAsset?.preview_url || v.voice_preview || "")}
                                          className={`w-full flex items-center justify-center gap-1.5 rounded-lg py-2 border text-[10px] font-bold tracking-wider uppercase transition-all ${
                                            isPlaying 
                                              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                                              : 'bg-cyan-500/5 border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/10'
                                          }`}
                                        >
                                          {isPlaying ? (
                                            <>
                                              <FiPause size={10} />
                                              <span>Pause Preview</span>
                                            </>
                                          ) : (
                                            <>
                                              <FiPlay size={10} fill="currentColor" />
                                              <span>Play Voice Sample</span>
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="h-28 w-full bg-white/[0.005] border border-dashed border-white/[0.04] rounded-lg flex flex-col items-center justify-center text-center p-3 opacity-40">
                                        <FiVolume2 size={24} className="text-surface-500 mb-1" />
                                        <span className="text-[10px] text-surface-550 uppercase tracking-wider font-mono">Voice Preview Offline</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Bottom Selection & Generation Control Bar */}
                                {isCompiled ? (
                                  <div className="flex gap-3 items-end mt-5 border-t border-white/[0.04] pt-4 shrink-0">
                                    <div className="flex-1 flex flex-col gap-1">
                                      <label className="text-[8px] font-extrabold uppercase text-surface-500 tracking-wider">Voice Version</label>
                                      <select
                                        value={activeVoiceAsset.id}
                                        onChange={(e) => handleSelectVoiceVersion(v.character, Number(e.target.value))}
                                        className="text-xs bg-[#0b0b0f] border border-white/[0.08] rounded-md p-1.5 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                      >
                                        {characterVoiceAssets.map(asset => (
                                          <option key={asset.id} value={asset.id}>
                                            Version {asset.voice_profile?.version || 1} {asset.id === activeVoiceAsset.id ? '(Active)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <button
                                      onClick={() => handleGenerateVoice(v.character)}
                                      disabled={isCompiling}
                                      className="px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] hover:border-cyan-500/30 whitespace-nowrap"
                                    >
                                      Regenerate
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-5 border-t border-white/[0.04] pt-4">
                                    <button
                                      onClick={() => handleGenerateVoice(v.character)}
                                      disabled={isCompiling}
                                      className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 bg-accent border-accent text-white hover:bg-accent/90 shadow-[0_0_15px_rgba(139,92,246,0.25)] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                      Generate Voice Profile
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <Footer />
                </div>
              )}

              {activeStudioTab === 'filmgen' && (
                <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col justify-between">
                  <div className="max-w-7xl mx-auto w-full pb-12 space-y-6">
                    {/* Overview Header / Diagnostics */}
                    <div className={`rounded-xl border p-5 transition-colors duration-500 ${
                      d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#0B0B0B] border-white/[0.05]'
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3.5 mb-5 border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <FiMonitor className="text-accent" size={14} />
                          <div>
                            <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                              Scene Production Console
                            </h3>
                            <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                              Sequential scene rendering queue and visual asset compositor
                            </p>
                          </div>
                        </div>
                        <div className={`text-[9px] font-bold font-mono tracking-widest uppercase px-2.5 py-1 rounded border ${
                          scenesStatus.length > 0 && scenesStatus.every(s => s.package_ready) 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {scenesStatus.length > 0 && scenesStatus.every(s => s.package_ready) ? 'PRODUCTION READY' : 'PRE-PROD PENDING'}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Total Scenes</span>
                          <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                            {scenesStatus.length}
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Completed Scenes</span>
                          <span className="text-base font-black text-emerald-400 block mt-0.5">
                            {scenesStatus.filter(s => sceneVideos.some(v => v.scene_number === s.scene_number && v.is_approved)).length} / {scenesStatus.length}
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Est. Cost</span>
                          <span className="text-base font-black text-accent block mt-0.5 select-none">
                            {scenesStatus.length * 80} Credits
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Est. Runtime</span>
                          <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                            {scenesStatus.reduce((acc, s) => {
                              const d_str = s.details?.duration || "8 seconds";
                              const sec = parseInt(d_str) || 8;
                              return acc + sec;
                            }, 0)}s
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg col-span-2 md:col-span-1">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Overall Progress</span>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-2 flex-1 bg-black/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-500" 
                                style={{ 
                                  width: `${scenesStatus.length > 0 
                                    ? Math.round((scenesStatus.filter(s => sceneVideos.some(v => v.scene_number === s.scene_number && v.is_approved)).length / scenesStatus.length) * 100) 
                                    : 0}%` 
                                }} 
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold">
                              {scenesStatus.length > 0 
                                ? Math.round((scenesStatus.filter(s => sceneVideos.some(v => v.scene_number === s.scene_number && v.is_approved)).length / scenesStatus.length) * 100) 
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sequential Scene Cards List */}
                    <div className="space-y-4">
                      {sceneStatusLoading ? (
                        <div className="text-center py-10">
                          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                          <p className="text-xs text-surface-550">Analyzing scene dependency blueprints...</p>
                        </div>
                      ) : scenesStatus.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/[0.05] rounded-xl bg-white/[0.005]">
                          <p className="text-surface-500 text-xs italic">No scene definitions available in the project plan.</p>
                        </div>
                      ) : (
                        scenesStatus.map((scene, idx) => {
                          // Unlocked check: index 0 is always unlocked, other indices require all previous scenes to have at least one approved video
                          let isUnlocked = true;
                          for (let i = 0; i < idx; i++) {
                            const priorNum = scenesStatus[i].scene_number;
                            const approvedVideo = sceneVideos.find(v => v.scene_number === priorNum && v.is_approved);
                            if (!approvedVideo) {
                              isUnlocked = false;
                              break;
                            }
                          }

                          const versions = sceneVideos.filter(v => v.scene_number === scene.scene_number).sort((a, b) => b.version - a.version);
                          const activeVideoId = selectedVersionsMap[scene.scene_number];
                          const activeVideo = activeVideoId 
                            ? versions.find(v => v.id === activeVideoId) 
                            : (versions.find(v => v.is_approved) || versions[0]);

                          const activeJob = runningJobs[scene.scene_number_str] || runningJobs[`Scene ${String(scene.scene_number).padStart(2, '0')}`];
                          
                          let statusLabel = "Locked";
                          let statusColor = "bg-neutral-800 text-surface-500 border-white/[0.03]";
                          
                          if (activeJob) {
                            statusLabel = "Generating";
                            statusColor = "bg-cyan-500/10 border-cyan-500/30 text-cyan-400";
                          } else if (activeVideo?.is_approved) {
                            statusLabel = "Approved";
                            statusColor = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
                          } else if (versions.length > 0) {
                            statusLabel = "Pending Review";
                            statusColor = "bg-amber-500/10 border-amber-500/30 text-amber-400";
                          } else if (isUnlocked) {
                            statusLabel = "Ready";
                            statusColor = "bg-blue-500/10 border-blue-500/30 text-blue-400";
                          }

                          return (
                            <div 
                              key={scene.scene_number}
                              className={`rounded-xl border p-5 text-left transition-all duration-300 relative overflow-hidden ${
                                isUnlocked 
                                  ? d
                                    ? 'bg-white border-neutral-200 shadow-sm'
                                    : 'bg-[#0b0b0f] border-white/[0.04] shadow-[0_4px_25px_rgba(0,0,0,0.25)]'
                                  : d
                                    ? 'bg-neutral-50/50 border-neutral-100 opacity-60'
                                    : 'bg-white/[0.005] border-white/[0.02] opacity-40'
                              }`}
                            >
                              {/* Left lock border overlay */}
                              {!isUnlocked && (
                                <div className="absolute top-0 bottom-0 left-0 w-1 bg-neutral-800" />
                              )}

                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Left column: Info & dependencies */}
                                <div className="flex-1 space-y-4">
                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <h4 className={`text-base font-extrabold uppercase tracking-wide flex items-center gap-2 ${d ? 'text-neutral-900' : 'text-white'}`}>
                                        <span>Scene {String(scene.scene_number).padStart(2, '0')}</span>
                                        <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${statusColor}`}>
                                          {!isUnlocked && <FiLock size={10} />}
                                          <span>{statusLabel}</span>
                                        </span>
                                      </h4>
                                      {project?.production_type === 'Podcast' || project?.production_type === 'Audio Story' ? (
                                        <span className={`text-[9px] font-mono block mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                                          Segment: {scene.scene_number_str} | Runtime: {scene.details?.duration || "10s"}
                                        </span>
                                      ) : (
                                        <span className={`text-[9px] font-mono block mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                                          Location: {scene.details?.location || "Not Set"} | Runtime: {scene.details?.duration || "10s"}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <p className={`text-xs leading-relaxed ${d ? 'text-neutral-600' : 'text-surface-400'}`}>
                                    <span className="font-bold text-accent uppercase text-[9px] tracking-wider block mb-0.5">
                                      {project?.production_type === 'Podcast' || project?.production_type === 'Audio Story' ? 'Dialogue/Narration Script' : 'Scene Description'}
                                    </span>
                                    {scene.details?.summary || "No description compiled."}
                                  </p>

                                  {/* Technical specifications panel */}
                                  {isUnlocked && (
                                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono border-t border-dashed border-white/[0.05] pt-3.5">
                                      <div>
                                        <span className="text-surface-500 block uppercase text-[8px] tracking-wider font-semibold">Speakers</span>
                                        <span className={`block truncate mt-0.5 ${d ? 'text-neutral-800' : 'text-surface-300'}`}>
                                          {scene.details?.characters?.length > 0 ? scene.details.characters.join(', ') : 'None'}
                                        </span>
                                      </div>
                                      {!(project?.production_type === 'Podcast' || project?.production_type === 'Audio Story') && (
                                        <div>
                                          <span className="text-surface-500 block uppercase text-[8px] tracking-wider font-semibold">Camera movement</span>
                                          <span className={`block truncate mt-0.5 ${d ? 'text-neutral-800' : 'text-surface-300'}`}>
                                            {scene.details?.prompt ? 'Anamorphic Frame' : 'Standard'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Dependency diagnostic logs */}
                                  {isUnlocked && !scene.package_ready && (
                                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-200 rounded-lg text-[10px] font-mono space-y-1">
                                      <span className="font-bold uppercase tracking-wider block text-red-400 mb-1">✕ Missing Production Assets</span>
                                      {scene.missing_assets.map((msg, mIdx) => (
                                        <div key={mIdx} className="flex items-center gap-1.5">
                                          <span className="text-red-400">•</span>
                                          <span>{msg}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {isUnlocked && scene.package_ready && !activeVideo && !activeJob && (
                                    <div className="p-3 bg-emerald-950/10 border border-emerald-500/15 text-emerald-400 rounded-lg text-[10px] font-mono flex items-center gap-2">
                                      <FiCheckCircle className="shrink-0" />
                                      <span>Production Package complete. Ready to compose.</span>
                                    </div>
                                  )}
                                </div>

                                {/* Right column: Generation HUD / Video Viewer */}
                                <div className="w-full lg:w-[350px] shrink-0 flex flex-col justify-center">
                                  {activeJob ? (
                                    /* Active Job progress */
                                    <div className="border border-white/[0.05] bg-black/60 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3.5 h-48 select-none">
                                      <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{activeJob.progress}%</span>
                                      </div>
                                      <div className="space-y-1 w-full">
                                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse block">
                                          {activeJob.message || 'Generating...'}
                                        </span>
                                        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-2">
                                          <div 
                                            className="bg-gradient-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-300"
                                            style={{ width: `${activeJob.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : activeVideo ? (
                                    /* Completed scene block */
                                    <div className="space-y-3.5">
                                      {activeVideo.status === 'completed' ? (
                                        <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.05] bg-black group h-48 flex items-center justify-center">
                                          {(project?.production_type === 'Podcast' || project?.production_type === 'Audio Story') ? (
                                            <div className="flex flex-col items-center justify-center w-full h-full p-4 bg-gradient-to-br from-neutral-900 to-neutral-950">
                                              <FiVolume2 className="text-accent animate-pulse mb-3" size={32} />
                                              <audio 
                                                controls 
                                                src={apiBaseUrl + activeVideo.video_url} 
                                                className="w-full max-w-xs" 
                                              />
                                              <span className="text-[10px] text-surface-500 font-mono mt-3 select-none">AUDIO SPEECH TRACK ACTIVE</span>
                                            </div>
                                          ) : (
                                            <video 
                                              controls 
                                              src={apiBaseUrl + activeVideo.video_url} 
                                              className="w-full h-full object-cover" 
                                              poster={activeVideo.thumbnail_url && (activeVideo.thumbnail_url.startsWith('/') ? apiBaseUrl + activeVideo.thumbnail_url : activeVideo.thumbnail_url)}
                                            />
                                          )}
                                        </div>
                                      ) : (
                                        /* Failed run block */
                                        <div className="h-48 border border-red-500/20 bg-red-950/15 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-2 select-none overflow-y-auto">
                                          <span className="text-red-400 text-lg">⚠️</span>
                                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">Generation Failed</span>
                                          <p className="text-[10px] text-red-300/80 leading-relaxed font-mono">
                                            {activeVideo.error_message || "Video synthesis error."}
                                          </p>
                                        </div>
                                      )}

                                      {/* Controls & Versions bar */}
                                      <div className="flex gap-2 items-center">
                                        <div className="flex-1 flex flex-col gap-0.5 text-left">
                                          <label className="text-[8px] font-extrabold uppercase text-surface-500 tracking-wider">Version Cut</label>
                                          <select
                                            value={activeVideo.id}
                                            onChange={(e) => setSelectedVersionsMap(prev => ({ ...prev, [scene.scene_number]: Number(e.target.value) }))}
                                            className="text-xs bg-neutral-900 border border-white/[0.08] rounded-md p-1.5 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                          >
                                            {versions.map(v => (
                                              <option key={v.id} value={v.id}>
                                                V{v.version} {v.is_approved ? '(Approved)' : ''}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="flex gap-1.5 mt-auto">
                                          {activeVideo.status === 'completed' && !activeVideo.is_approved && (
                                            <button
                                              onClick={() => handleApproveScene(activeVideo.id)}
                                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] shadow-[0_0_10px_rgba(16,185,129,0.15)] whitespace-nowrap"
                                            >
                                              Approve
                                            </button>
                                          )}
                                          {activeVideo.status === 'completed' && (
                                            <a
                                              href={apiBaseUrl + activeVideo.video_url}
                                              download={`scene_${scene.scene_number}_v${activeVideo.version}.mp4`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="px-2.5 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] inline-flex items-center justify-center whitespace-nowrap"
                                              title="Download MP4 video file"
                                            >
                                              Download
                                            </a>
                                          )}
                                          <button
                                            onClick={() => handleGenerateScene(scene.scene_number_str)}
                                            className="px-2 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] whitespace-nowrap"
                                            title="Queue a new version render"
                                          >
                                            Regen
                                          </button>
                                        </div>
                                      </div>

                                      {/* Model badge */}
                                      {activeVideo.status === 'completed' && (
                                        <div className="flex justify-between items-center text-[9px] font-mono text-surface-500 border-t border-white/[0.03] pt-2">
                                          <span>Model: <strong className="text-cyan-400">{activeVideo.generation_model}</strong></span>
                                          <span>Cost: 80 Credits</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : isUnlocked ? (
                                    /* Render box if ready to generate */
                                    <div className="border border-dashed border-white/[0.08] bg-[#09090d]/50 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4 h-48 select-none">
                                      <FiMonitor size={24} className="text-surface-500 opacity-60" />
                                      <div className="space-y-1">
                                        <span className="text-[10px] font-bold text-surface-450 uppercase tracking-widest block">Awaiting Render</span>
                                        <p className="text-[9px] text-surface-550 max-w-[200px] leading-normal">
                                          {scene.package_ready ? "Production assets mapped. Ready to synthesize." : "Requires missing pre-production assets."}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleGenerateScene(scene.scene_number_str)}
                                        disabled={!scene.package_ready}
                                        className={`px-5 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(0,242,254,0.1)] hover:shadow-[0_0_18px_rgba(0,242,254,0.2)] transition-all duration-300 transform active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none whitespace-nowrap`}
                                      >
                                        Generate Scene
                                      </button>
                                    </div>
                                  ) : (
                                    /* Locked state */
                                    <div className="border border-white/[0.02] bg-white/[0.002] rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2 h-48 select-none">
                                      <FiLock size={20} className="text-surface-600" />
                                      <span className="text-[10px] font-bold text-surface-550 uppercase tracking-wider">Locked</span>
                                      <p className="text-[9px] text-surface-600 max-w-[200px] leading-normal">
                                        Approve prior scenes to unlock this sequence in the production pipeline.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  <Footer />
                  
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
