import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiArrowLeft, FiClock, FiFilm, FiActivity, FiUser, FiVolume2, 
  FiMapPin, FiCpu, FiLock, FiCheck, FiCheckCircle, FiInfo, FiSliders, FiDatabase,
  FiPlay, FiPause, FiSettings, FiCheckSquare, FiAlertTriangle,
  FiTerminal, FiPlus, FiVolumeX, FiMonitor, FiArrowRight
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
import { useEditor } from '../context/EditorContext';
import Footer from '../components/Footer';
import CustomVideoPlayer from '../components/CustomVideoPlayer';

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
    const isAnySceneGenerating = Object.keys(runningJobs).length > 0;
    if (isAnySceneGenerating) {
      showToast("A generation job is already running. Please wait.", 'error');
      return;
    }
    
    const isPodcast = project?.production_type === 'Podcast';
    const targetId = isPodcast ? `podcast_duration_${podcastDuration}` : sceneNumberStr;
    const trackingKey = sceneNumberStr; // Use "Podcast Audio" or scene number for tracking
    
    setRunningJobs(prev => ({
      ...prev,
      [trackingKey]: {
        status: 'queued',
        progress: 0,
        message: 'Preparing generation...'
      }
    }));
    
    // Clear manual selection map for this scene name so the approved version is shown
    setSelectedVersionsMap(prevMap => {
      const updatedMap = { ...prevMap };
      delete updatedMap[trackingKey];
      return updatedMap;
    });

    try {
      await generateSceneVideo(numericId, targetId);
      showToast(isPodcast ? `Podcast audio synthesis started.` : `Video generation queued for ${sceneNumberStr}.`, 'success');
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

  const handleDownloadFile = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Failed to download file:", err);
      window.open(url, '_blank');
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
  const [activeStudioTab, setActiveStudioTab] = useState(() => {
    try {
      const saved = localStorage.getItem(`activeStudioTab_${id}`);
      return saved || 'dashboard';
    } catch (e) {
      return 'dashboard';
    }
  });

  useEffect(() => {
    if (id && activeStudioTab) {
      localStorage.setItem(`activeStudioTab_${id}`, activeStudioTab);
    }
  }, [id, activeStudioTab]);

  const [highlightTarget, setHighlightTarget] = useState(null);

  const handleGoToAsset = useCallback((msg) => {
    if (!msg) return;
    
    const normalize = (text) => {
      if (!text) return '';
      return text.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    let target = null;
    const match = msg.match(/for ['"`‘“]([^'"`’”]+)['"`’”]/) || msg.match(/for ([^' ]+)/);
    const parsedName = match ? match[1] : '';

    if (msg.includes("Character asset for")) {
      if (parsedName) {
        const normalized = normalize(parsedName);
        const chars = project?.characters || [];
        const matchedChar = chars.find(c => normalize(c.name) === normalized);
        const finalName = matchedChar ? matchedChar.name : parsedName;
        target = { type: 'character', name: finalName };
        setActiveStudioTab('characters');
      }
    } else if (msg.includes("Voice profile for")) {
      if (parsedName) {
        const normalized = normalize(parsedName);
        const voices = project?.voices || [];
        const matchedVoice = voices.find(v => normalize(v.character) === normalized);
        const finalName = matchedVoice ? matchedVoice.character : parsedName;
        target = { type: 'voice', name: finalName };
        setActiveStudioTab('voices');
      }
    } else if (msg.includes("Environment asset for")) {
      if (parsedName) {
        const normalized = normalize(parsedName);
        const envs = project?.environments || [];
        const matchedEnv = envs.find(e => {
          const eNorm = normalize(e.name);
          return normalized.includes(eNorm) || eNorm.includes(normalized);
        });
        const finalName = matchedEnv ? matchedEnv.name : parsedName;
        target = { type: 'environment', name: finalName };
        setActiveStudioTab('environments');
      }
    }
    
    if (target) {
      setHighlightTarget(target);
      
      let attempts = 0;
      const findAndScroll = () => {
        const btnId = `gen-btn-${target.type}-${target.name}`;
        const element = document.getElementById(btnId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (attempts < 15) {
          attempts++;
          setTimeout(findAndScroll, 80);
        }
      };
      
      setTimeout(findAndScroll, 200);

      setTimeout(() => {
        setHighlightTarget(current => 
          (current?.type === target.type && current?.name === target.name) ? null : current
        );
      }, 4000);
    }
  }, [project]);
  
  useEffect(() => {
    const isAudio = project?.production_type === 'Podcast' || project?.production_type === 'Audio Story';
    if (isAudio && (activeStudioTab === 'characters' || activeStudioTab === 'environments')) {
      setActiveStudioTab('dashboard');
    }
  }, [project, activeStudioTab]);
  
  const [podcastDuration, setPodcastDuration] = useState(5); // 5, 10, or 15 minutes
  
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

  const { loadProjectGeneratedClips } = useEditor();
  const hasCompletedClips = sceneVideos.some(v => v.status === 'completed');

  const handleTakeToEditor = async () => {
    const isAudio = project?.production_type === 'Podcast' || project?.production_type === 'Audio Story';
    
    // Collect all available completed/approved clips
    const availableClips = [];
    scenesStatus.forEach(scene => {
      // Find active version for this scene
      const versions = sceneVideos.filter(v => v.scene_number === scene.scene_number);
      let activeVideo = versions.find(v => v.is_approved);
      if (!activeVideo && versions.length > 0) {
        activeVideo = versions.reduce((latest, current) => {
          if (current.status !== 'completed') return latest;
          if (!latest || current.version > latest.version) return current;
          return latest;
        }, null);
      }
      if (activeVideo && activeVideo.status === 'completed') {
        availableClips.push({
          scene_number: scene.scene_number,
          scene_number_str: scene.scene_number_str || `Scene ${scene.scene_number}`,
          video_url: activeVideo.video_url,
          duration: activeVideo.duration || 10,
          thumbnail_url: activeVideo.thumbnail_url || `https://placehold.co/640x360.png?text=Scene+${scene.scene_number}`
        });
      }
    });

    if (availableClips.length > 0) {
      showToast("Analyzing media durations...", "info");
      
      // Query HTML5 elements for true file durations
      const resolvedClips = await Promise.all(
        availableClips.map(async (clip) => {
          const resolvedUrl = clip.video_url.startsWith('http') 
            ? clip.video_url 
            : `${apiBaseUrl}${clip.video_url}`;
            
          return new Promise((resolve) => {
            const media = document.createElement(isAudio ? 'audio' : 'video');
            media.src = resolvedUrl;
            media.preload = 'metadata';
            media.onloadedmetadata = () => {
              const dur = (media.duration && isFinite(media.duration) && media.duration > 0)
                ? media.duration 
                : (clip.duration || 10.0);
              resolve({ ...clip, duration: dur });
            };
            media.onerror = () => {
              resolve({ ...clip, duration: clip.duration || 10.0 });
            };
          });
        })
      );

      loadProjectGeneratedClips(resolvedClips, isAudio);
      showToast(`Imported ${resolvedClips.length} clips to Editor timeline.`, 'success');
      navigate('/editor');
    } else {
      showToast("No generated clips available to load.", 'error');
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

  const handleUpdateSceneSpecs = async (sceneNumber, specs) => {
    try {
      const updatedBreakdown = { ...project.scene_breakdown };
      const scenes = [...(updatedBreakdown.scenes || [])];
      const sceneIdx = scenes.findIndex(s => {
        const digits = (s.scene_number || '').match(/\d+/);
        return digits ? parseInt(digits[0]) === sceneNumber : false;
      });
      
      if (sceneIdx !== -1) {
        scenes[sceneIdx] = {
          ...scenes[sceneIdx],
          ...specs
        };
        updatedBreakdown.scenes = scenes;
        await handleUpdateFields({ scene_breakdown: updatedBreakdown });
        showToast(`Scene ${sceneNumber} specifications updated.`, 'success');
      } else {
        // Fallback to storyboard modification if scene breakdown is not found
        const updatedStoryboard = [...(project.storyboard || [])];
        if (updatedStoryboard.length >= sceneNumber) {
          updatedStoryboard[sceneNumber - 1] = {
            ...updatedStoryboard[sceneNumber - 1],
            ...specs
          };
          await handleUpdateFields({ storyboard: updatedStoryboard });
          showToast(`Scene ${sceneNumber} storyboard specifications updated.`, 'success');
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save scene specifications: " + err.message, 'error');
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
  
  const approvedScenesCount = scenesStatus.filter(s => sceneVideos.some(v => v.scene_number === s.scene_number && v.is_approved)).length;
  const sceneVideosReadiness = scenesStatus.length > 0 ? Math.round((approvedScenesCount / scenesStatus.length) * 100) : 0;
  
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
            } else if (prodType === 'Trailer') {
              characterLabel = 'Cast & Characters';
              environmentLabel = 'Cinematic Locations';
            } else if (prodType === 'Drama') {
              characterLabel = 'Cast & Actors';
              environmentLabel = 'Stages & Sets';
            } else if (prodType === 'Series Episode') {
              characterLabel = 'Cast & Characters';
              environmentLabel = 'Sets & Locations';
            } else if (prodType === 'Podcast') {
              characterLabel = 'Hosts & Guests';
              voiceLabel = 'Host & Guest Voices';
              environmentLabel = 'Sets & Backdrops';
              filmGenLabel = 'Audio Production Console';
            } else if (prodType === 'Interview') {
              characterLabel = 'Interviewer & Guests';
              voiceLabel = 'Host & Guest Voices';
              environmentLabel = 'Sets & Backdrops';
              filmGenLabel = 'Interview Production Console';
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
            
            // Filter out tabs for audio-only formats
            return allTabs.filter(tab => {
              if (prodType === 'Podcast') {
                return tab.id === 'dashboard' || tab.id === 'filmgen';
              }
              if (isAudio) {
                return !tab.isVisual;
              }
              return true;
            });
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
                        className="btn-primary whitespace-nowrap"
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
                    <div className={`rounded-xl border p-6 transition-colors duration-500 ${
                      d ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#08080c] border-white/[0.04]'
                    }`}>
                      <div className="flex items-center gap-2 border-b pb-3.5 mb-5 border-white/[0.03]">
                        <FiSettings className="text-accent" size={14} />
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-accent">
                          Production Progress Widget
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        {/* Overall progress indicator */}
                        <div className="lg:col-span-5 flex flex-col justify-center p-4 border-r border-dashed border-white/[0.04] pr-8">
                          <span className="text-[10px] font-extrabold tracking-widest text-surface-500 uppercase block mb-1">Overall Project Status</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black tracking-tight text-white">{overallReadiness}%</span>
                            <span className="text-[9px] font-mono text-emerald-400 font-extrabold">READY FOR ASSEMBLY</span>
                          </div>
                          <div className={`w-full h-2 rounded-sm overflow-hidden mt-3 border ${
                            d ? 'bg-neutral-100 border-neutral-200' : 'bg-[#15151b] border-[#212128]'
                          }`}>
                            <div 
                              className={`h-full rounded-sm transition-all duration-1000 ${
                                overallReadiness === 100 
                                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                  : 'bg-gradient-to-r from-[#b25b15] to-[#e57e25]'
                              }`} 
                              style={{ width: `${overallReadiness}%` }} 
                            />
                          </div>
                        </div>

                        {/* Breakdown Progress Bars */}
                        <div className="lg:col-span-7 space-y-4">
                          {/* Characters Progress */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Cast & Characters</span>
                              <span className="font-mono text-emerald-400">{characterReadiness}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-sm overflow-hidden mt-1.5 border ${
                              d ? 'bg-neutral-100 border-neutral-200' : 'bg-[#15151b] border-[#212128]'
                            }`}>
                              <div 
                                className={`h-full rounded-sm transition-all duration-1000 ${
                                  characterReadiness === 100 
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                    : 'bg-gradient-to-r from-[#b25b15] to-[#e57e25]'
                                }`} 
                                style={{ width: `${characterReadiness}%` }} 
                              />
                            </div>
                          </div>

                          {/* Environment Progress */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Cinematic Locations</span>
                              <span className={`${environmentReadiness === 100 ? 'text-emerald-400' : 'text-accent'} font-mono`}>{environmentReadiness}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-sm overflow-hidden mt-1.5 border ${
                              d ? 'bg-neutral-100 border-neutral-200' : 'bg-[#15151b] border-[#212128]'
                            }`}>
                              <div 
                                className={`h-full rounded-sm transition-all duration-1000 ${
                                  environmentReadiness === 100 
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                    : 'bg-gradient-to-r from-[#b25b15] to-[#e57e25]'
                                }`} 
                                style={{ width: `${environmentReadiness}%` }} 
                              />
                            </div>
                          </div>

                          {/* Voice Profiles Progress */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Voice Synthesis Profiles</span>
                              <span className={`${voiceReadiness === 100 ? 'text-emerald-400' : 'text-accent'} font-mono`}>{voiceReadiness}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-sm overflow-hidden mt-1.5 border ${
                              d ? 'bg-neutral-100 border-neutral-200' : 'bg-[#15151b] border-[#212128]'
                            }`}>
                              <div 
                                className={`h-full rounded-sm transition-all duration-1000 ${
                                  voiceReadiness === 100 
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                    : 'bg-gradient-to-r from-[#b25b15] to-[#e57e25]'
                                }`} 
                                style={{ width: `${voiceReadiness}%` }} 
                              />
                            </div>
                          </div>

                          {/* Scenes Video Composites Progress */}
                          <div>
                            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-surface-450 tracking-wider">
                              <span>Approved Scenes</span>
                              <span className={`${sceneVideosReadiness === 100 ? 'text-emerald-400' : 'text-accent'} font-mono`}>{sceneVideosReadiness}%</span>
                            </div>
                            <div className={`w-full h-1.5 rounded-sm overflow-hidden mt-1.5 border ${
                              d ? 'bg-neutral-100 border-neutral-200' : 'bg-[#15151b] border-[#212128]'
                            }`}>
                              <div 
                                className={`h-full rounded-sm transition-all duration-1000 ${
                                  sceneVideosReadiness === 100 
                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' 
                                    : 'bg-gradient-to-r from-[#b25b15] to-[#e57e25]'
                                }`} 
                                style={{ width: `${sceneVideosReadiness}%` }} 
                              />
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
                          const description = activeAsset?.character_profile?.appearance || activeAsset?.character_profile?.visual_profile || char.description;
                          const age = activeAsset?.character_profile?.age || 'Extracting...';
                          const gender = activeAsset?.character_profile?.gender || 'Extracting...';
                          const role = activeAsset?.character_profile?.role || char.role || 'Supporting';
                          const personality = activeAsset?.character_profile?.personality || 'Extracting...';
                          const wardrobe = activeAsset?.character_profile?.wardrobe || 'Extracting...';
                          const hair = activeAsset?.character_profile?.hair || 'Extracting...';
                          const face = activeAsset?.character_profile?.face || 'Extracting...';
                          const accessories = activeAsset?.character_profile?.accessories || 'Extracting...';
                          const colorPalette = activeAsset?.character_profile?.color_palette || 'Extracting...';
                          const bodyType = activeAsset?.character_profile?.body_type || 'Extracting...';
                          
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
                              <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950 flex flex-col justify-center items-center">
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
                                        className="bg-accent h-full rounded-full transition-all duration-300"
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
                                      id={`gen-btn-character-${char.name}`}
                                      onClick={() => handleGenerateCharacter(char.name)}
                                      className={`btn-accent relative z-20 px-5 py-2.5 font-bold text-[11px] uppercase tracking-wider rounded transition-all duration-300 transform active:scale-[0.98] cursor-pointer shadow-none ${
                                        highlightTarget?.type === 'character' && highlightTarget?.name === char.name ? 'animate-highlight-glow' : ''
                                      }`}
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
                                      draggable="false"
                                      className="w-full h-full object-cover rounded-t-lg transition-transform duration-700 hover:scale-105 select-none" 
                                      onContextMenu={(e) => e.preventDefault()}
                                    />
                                    {/* Security Overlay */}
                                    <div 
                                      className="absolute inset-0 z-10 bg-transparent select-none" 
                                      onContextMenu={(e) => e.preventDefault()}
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
                                      id={`gen-btn-character-${char.name}`}
                                      onClick={() => handleGenerateCharacter(char.name)}
                                      className={`btn-accent absolute bottom-3 right-3 px-2.5 py-1 text-[9px] flex items-center gap-1 shadow-none z-20 ${
                                        highlightTarget?.type === 'character' && highlightTarget?.name === char.name ? 'animate-highlight-glow' : ''
                                      }`}
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
                                        <span className="status-badge approved">
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
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Body Type</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{bodyType}</span>
                                    </div>
                                    <div>
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Color Palette</span>
                                      <span className={`truncate block mt-0.5 font-bold ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{colorPalette}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Hair Specs</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`}>{hair}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Face Specs</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`}>{face}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Wardrobe</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`}>{wardrobe}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-surface-500 block uppercase text-[8px] tracking-wider">Accessories</span>
                                      <span className={`block mt-0.5 text-xs ${d ? 'text-neutral-800' : 'text-neutral-350'}`}>{accessories}</span>
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
                                <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-950 flex flex-col justify-center items-center">
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
                                          className="bg-accent h-full rounded-full transition-all duration-300"
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
                                        id={`gen-btn-environment-${env.name}`}
                                        onClick={() => handleGenerateEnvironment(env.name)}
                                        className={`btn-accent relative z-20 px-4 py-2 font-bold text-[10px] uppercase tracking-wider rounded transition-all duration-300 transform active:scale-[0.98] cursor-pointer shadow-none ${
                                          highlightTarget?.type === 'environment' && highlightTarget?.name === env.name ? 'animate-highlight-glow' : ''
                                        }`}
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
                                        draggable="false"
                                        className="w-full h-full object-cover rounded-t-lg transition-transform duration-700 hover:scale-105 select-none" 
                                        onContextMenu={(e) => e.preventDefault()}
                                      />
                                      {/* Security Overlay */}
                                      <div 
                                        className="absolute inset-0 z-10 bg-transparent select-none" 
                                        onContextMenu={(e) => e.preventDefault()}
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
                                        id={`gen-btn-environment-${env.name}`}
                                        onClick={() => handleGenerateEnvironment(env.name)}
                                        className={`btn-accent absolute bottom-3 right-3 px-2.5 py-1 text-[9px] flex items-center gap-1 shadow-none z-20 ${
                                          highlightTarget?.type === 'environment' && highlightTarget?.name === env.name ? 'animate-highlight-glow' : ''
                                        }`}
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
                                          <span className="status-badge approved shrink-0">
                                            APPROVED
                                          </span>
                                        ) : (
                                          <span className="status-badge waiting shrink-0">
                                            WAITING
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
                                        className="bg-accent h-full rounded-full transition-all duration-300"
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
                                        <div className="relative w-10 h-10 shrink-0 select-none">
                                          <img 
                                            src={activeCharAsset.image_url.startsWith('/') ? apiBaseUrl + activeCharAsset.image_url : activeCharAsset.image_url} 
                                            alt={v.character} 
                                            draggable="false"
                                            className="w-full h-full rounded-lg object-cover border border-white/[0.08] select-none" 
                                            onContextMenu={(e) => e.preventDefault()}
                                          />
                                          {/* Security Overlay */}
                                          <div 
                                            className="absolute inset-0 z-10 bg-transparent select-none" 
                                            onContextMenu={(e) => e.preventDefault()}
                                          />
                                        </div>
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
                                      id={`gen-btn-voice-${v.character}`}
                                      onClick={() => handleGenerateVoice(v.character)}
                                      disabled={isCompiling}
                                      className={`px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] hover:border-cyan-500/30 whitespace-nowrap ${
                                        highlightTarget?.type === 'voice' && highlightTarget?.name === v.character ? 'animate-highlight-glow' : ''
                                      }`}
                                    >
                                      Regenerate
                                    </button>
                                  </div>
                                ) : (
                                  <div className="mt-5 border-t border-white/[0.04] pt-4">
                                    <button
                                      id={`gen-btn-voice-${v.character}`}
                                      onClick={() => handleGenerateVoice(v.character)}
                                      disabled={isCompiling}
                                      className={`btn-accent w-full py-2.5 shadow-none ${
                                        highlightTarget?.type === 'voice' && highlightTarget?.name === v.character ? 'animate-highlight-glow' : ''
                                      }`}
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
                              {project?.production_type === 'Podcast' ? 'Podcast Audio Console' : 'Scene Production Console'}
                            </h3>
                            <p className={`text-[9px] font-mono mt-0.5 ${d ? 'text-neutral-400' : 'text-surface-500'}`}>
                              {project?.production_type === 'Podcast' ? 'Generate and export full-length podcast audio tracks' : 'Sequential scene rendering queue and visual asset compositor'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`text-[9px] font-bold font-mono tracking-widest uppercase px-2.5 py-1 rounded border ${
                            scenesStatus.length > 0 && scenesStatus.every(s => s.package_ready) 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse' 
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}>
                            {scenesStatus.length > 0 && scenesStatus.every(s => s.package_ready) ? 'PRODUCTION READY' : 'PRE-PROD PENDING'}
                          </div>

                          <button
                            onClick={handleTakeToEditor}
                            disabled={!hasCompletedClips}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              hasCompletedClips
                                ? 'btn-accent transform hover:scale-[1.02] active:scale-[0.98] shadow-none'
                                : d
                                  ? 'bg-neutral-100 border-neutral-200 text-neutral-400'
                                  : 'bg-white/[0.02] border-white/[0.06] text-surface-500'
                            }`}
                            title={hasCompletedClips ? "Transition to Multi-Track Editor Room with generated media clips" : "Generate at least one clip to unlock Edit Room"}
                          >
                            <span>Next: Edit Room</span>
                            <FiArrowRight size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">
                            {project?.production_type === 'Podcast' ? 'Total Audio Tracks' : 'Total Scenes'}
                          </span>
                          <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                            {scenesStatus.length}
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">
                            {project?.production_type === 'Podcast' ? 'Completed Tracks' : 'Completed Scenes'}
                          </span>
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
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">
                            {project?.production_type === 'Podcast' ? 'Selected Duration' : 'Est. Runtime'}
                          </span>
                          <span className={`text-base font-black block mt-0.5 ${d ? 'text-gray-900' : 'text-neutral-200'}`}>
                            {project?.production_type === 'Podcast' 
                              ? `${podcastDuration} Mins`
                              : `${scenesStatus.reduce((acc, s) => {
                                  const d_str = s.details?.duration || "8 seconds";
                                  const sec = parseInt(d_str) || 8;
                                  return acc + sec;
                                }, 0)}s`}
                          </span>
                        </div>
                        <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-lg col-span-2 md:col-span-1">
                          <span className="text-[9px] font-extrabold tracking-widest text-surface-500 uppercase block">Overall Progress</span>
                          <div className="flex items-center gap-2 mt-1.5 w-full">
                            <div className="h-2 flex-1 bg-black/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent rounded-full transition-all duration-500" 
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
                          
                          let badgeClass = "waiting";
                          let statusLabel = "LOCKED";
                          
                          if (activeJob) {
                            statusLabel = "RENDERING";
                            badgeClass = "generating";
                          } else if (activeVideo?.is_approved) {
                            statusLabel = "APPROVED";
                            badgeClass = "approved";
                          } else if (versions.length > 0) {
                            statusLabel = "PENDING REVIEW";
                            badgeClass = "ready";
                          } else if (isUnlocked) {
                            statusLabel = "READY";
                            badgeClass = "ready";
                          }

                          const raw_ref_image = scene.details?.reference_url || scene.details?.image_url || null;

                          return (
                            <div 
                              key={scene.scene_number}
                              className={`rounded-xl border p-6 text-left transition-all duration-300 relative overflow-hidden ${
                                isUnlocked 
                                  ? d
                                    ? 'bg-white border-neutral-200 shadow-sm'
                                    : 'bg-[#08080c] border-white/[0.04] shadow-[0_4px_25px_rgba(0,0,0,0.25)]'
                                  : d
                                    ? 'bg-neutral-50/50 border-neutral-100 opacity-60'
                                    : 'bg-white/[0.005] border-white/[0.02] opacity-40'
                              }`}
                            >
                              {/* Left lock border overlay */}
                              {!isUnlocked && (
                                <div className="absolute top-0 bottom-0 left-0 w-1 bg-neutral-800" />
                              )}

                              {/* Media Player Box (Top, Full Width) */}
                              {isUnlocked && (
                                <div className="w-full mb-6 rounded-lg overflow-hidden border border-white/[0.06] bg-black">
                                  {activeJob ? (
                                    /* Active Job progress */
                                    <div className="bg-black/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center space-y-3.5 h-[280px] select-none">
                                      <div className="relative flex items-center justify-center">
                                        <div className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="absolute text-[10px] font-mono font-bold text-cyan-400">{activeJob.progress}%</span>
                                      </div>
                                      <div className="space-y-1 w-full max-w-xs">
                                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 animate-pulse block">
                                          {activeJob.message || 'Generating...'}
                                        </span>
                                        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-2">
                                          <div 
                                            className="bg-accent h-full rounded-full transition-all duration-300"
                                            style={{ width: `${activeJob.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  ) : activeVideo ? (
                                    activeVideo.status === 'completed' ? (
                                      project?.production_type === 'Podcast' || project?.production_type === 'Audio Story' ? (
                                        <div className="flex flex-col items-center justify-center w-full h-[180px] p-4 bg-gradient-to-br from-neutral-900 to-neutral-950">
                                          <FiVolume2 className="text-accent animate-pulse mb-3" size={32} />
                                          <audio 
                                             controls 
                                             controlsList="nodownload"
                                             src={apiBaseUrl + activeVideo.video_url} 
                                            className="w-full max-w-md" 
                                            onContextMenu={(e) => e.preventDefault()}
                                          />
                                          <span className="text-[10px] text-surface-500 font-mono mt-3 select-none">AUDIO SPEECH TRACK ACTIVE</span>
                                        </div>
                                      ) : (
                                        <CustomVideoPlayer 
                                          src={apiBaseUrl + activeVideo.video_url} 
                                          className="w-full aspect-[21/9] md:aspect-[2.39/1]" 
                                          poster={activeVideo.thumbnail_url && (activeVideo.thumbnail_url.startsWith('/') ? apiBaseUrl + activeVideo.thumbnail_url : activeVideo.thumbnail_url)}
                                        />
                                      )
                                    ) : (
                                      /* Failed run block */
                                      <div className="h-[200px] border border-red-500/20 bg-red-950/15 p-4 flex flex-col items-center justify-center text-center space-y-2 select-none overflow-y-auto">
                                        <span className="text-red-400 text-lg">⚠️</span>
                                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">Generation Failed</span>
                                        <p className="text-[10px] text-red-300/80 leading-relaxed font-mono">
                                          {activeVideo.error_message || "Video synthesis error."}
                                        </p>
                                      </div>
                                    )
                                  ) : (
                                    /* Render box if ready to generate */
                                    <div className="border border-dashed border-white/[0.08] bg-[#09090d]/50 p-5 flex flex-col items-center justify-center text-center space-y-4 h-[240px] select-none">
                                      <FiVolume2 size={24} className="text-accent animate-pulse animate-duration-1000" />
                                      <div className="space-y-1 w-full max-w-xs">
                                        <span className="text-[10px] font-bold text-surface-450 uppercase tracking-widest block">Awaiting Render</span>
                                        {project?.production_type === 'Podcast' ? (
                                          <div className="flex flex-col gap-2 mt-2">
                                            <label className="text-[9px] font-mono text-surface-500 uppercase tracking-wider text-left block">Select Podcast Duration</label>
                                            <select
                                              value={podcastDuration}
                                              onChange={(e) => setPodcastDuration(Number(e.target.value))}
                                              className="text-xs bg-neutral-900 border border-white/[0.08] rounded-md p-1.5 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                            >
                                              <option value={5}>5 Minutes (approx. 750 words)</option>
                                              <option value={10}>10 Minutes (approx. 1500 words)</option>
                                              <option value={15}>15 Minutes (approx. 2250 words)</option>
                                            </select>
                                          </div>
                                        ) : (
                                          <p className="text-[9px] text-surface-550 max-w-[200px] leading-normal mx-auto">
                                            {scene.package_ready ? "Production assets mapped. Ready to synthesize." : "Requires missing pre-production assets."}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleGenerateScene(scene.scene_number_str)}
                                        disabled={!scene.package_ready}
                                        className="btn-accent px-5 py-2 text-[10px] tracking-wider transition-all transform active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none whitespace-nowrap shadow-none"
                                      >
                                        Generate Scene
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="flex flex-col lg:flex-row gap-6">
                                {/* Left column: Info & dependencies */}
                                <div className="flex-1 space-y-4">
                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <h4 className={`text-base font-extrabold uppercase tracking-wide flex items-center gap-2 ${d ? 'text-neutral-900' : 'text-white'}`}>
                                        {project?.production_type === 'Podcast' ? (
                                          <span>Podcast Audio Track</span>
                                        ) : (
                                          <span>Scene {String(scene.scene_number).padStart(2, '0')}</span>
                                        )}
                                        <span className={`status-badge ${badgeClass} inline-flex items-center gap-1.5`}>
                                          {!isUnlocked && <FiLock size={10} />}
                                          <span>{statusLabel}</span>
                                        </span>
                                      </h4>

                                      {/* Rich Scene Metadata Details */}
                                      {isUnlocked && (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[9px] font-mono text-surface-500 uppercase">
                                          <span>Model: {activeVideo?.generation_model || (raw_ref_image ? "HappyHorse I2V" : "Wan2.7 T2V")}</span>
                                          <span>•</span>
                                          <span>Aspect: {project.aspect_ratio || "16:9"}</span>
                                          <span>•</span>
                                          <span>Length: {activeVideo?.duration ? `${activeVideo.duration}s` : "10s"}</span>
                                          {activeVideo?.status === 'completed' && (
                                            <>
                                              <span>•</span>
                                              <span className="text-emerald-400 font-semibold">Generated: Just Now</span>
                                            </>
                                          )}
                                        </div>
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
                                          <span className="text-surface-500 block uppercase text-[8px] tracking-wider font-semibold">Reference Strategy</span>
                                          <select
                                            value={scene.details?.reference_strategy || 'automatic'}
                                            onChange={(e) => handleUpdateSceneSpecs(scene.scene_number, { reference_strategy: e.target.value })}
                                            className="text-[9px] mt-1 bg-neutral-900 border border-white/[0.08] rounded-md p-1 focus:outline-none focus:border-accent text-surface-200 w-full font-mono cursor-pointer"
                                          >
                                            <option value="automatic">Automatic (Recommended)</option>
                                            <option value="character_priority">Character Priority</option>
                                            <option value="environment_priority">Environment Priority</option>
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Dependency diagnostic logs */}
                                  {isUnlocked && !scene.package_ready && (
                                    <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-200 rounded-lg text-[10px] font-mono space-y-1.5">
                                      <span className="font-bold uppercase tracking-wider block text-red-400 mb-1">✕ Missing Production Assets</span>
                                      {scene.missing_assets.map((msg, mIdx) => (
                                        <div key={mIdx} className="flex items-center justify-between gap-2.5 py-0.5 border-b border-white/[0.02] last:border-b-0">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-red-400 shrink-0">•</span>
                                            <span className="truncate" title={msg}>{msg}</span>
                                          </div>
                                          <button
                                            onClick={() => handleGoToAsset(msg)}
                                            className="shrink-0 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[8px] text-red-300 font-bold uppercase tracking-wider hover:bg-red-500/25 transition-all flex items-center gap-0.5 cursor-pointer active:scale-95 shadow-none"
                                            title="Go directly to compile page"
                                          >
                                            <span>Go</span>
                                            <FiArrowRight size={8} />
                                          </button>
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

                                {/* Right column: Action Controls & Versions Bar */}
                                {isUnlocked && activeVideo && (
                                  <div className="w-full lg:w-[300px] shrink-0 flex flex-col justify-end border-t lg:border-t-0 lg:border-l border-white/[0.03] lg:pt-0 lg:pl-6 pt-4 space-y-4">
                                    <div className="flex flex-col gap-1 text-left">
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

                                    <div className="flex flex-col gap-2">
                                      {activeVideo.status === 'completed' && !activeVideo.is_approved && (
                                        <button
                                          onClick={() => handleApproveScene(activeVideo.id)}
                                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.15)] whitespace-nowrap active:scale-[0.98]"
                                        >
                                          Approve Version
                                        </button>
                                      )}
                                      
                                      <div className="flex gap-2">
                                        {activeVideo.status === 'completed' && (
                                          <button
                                            onClick={() => handleDownloadFile(
                                              apiBaseUrl + activeVideo.video_url,
                                              project?.production_type === 'Podcast' ? `podcast_v${activeVideo.version}.mp3` : `scene_${scene.scene_number}_v${activeVideo.version}.mp4`
                                            )}
                                            className="flex-1 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] inline-flex items-center justify-center whitespace-nowrap active:scale-[0.98]"
                                            title="Download generated asset"
                                          >
                                            Download
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleGenerateScene(scene.scene_number_str)}
                                          className="flex-1 py-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-white font-bold rounded-md text-[10px] uppercase tracking-wider transition-all cursor-pointer h-[32px] whitespace-nowrap active:scale-[0.98]"
                                        >
                                          Regen
                                        </button>
                                      </div>
                                    </div>

                                    {activeVideo.status === 'completed' && (
                                      <div className="flex justify-between items-center text-[9px] font-mono text-surface-600 border-t border-white/[0.03] pt-2">
                                        <span>Cost: 80 Credits</span>
                                      </div>
                                    )}
                                  </div>
                                )}
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
