import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiDatabase, FiSearch, FiSliders, FiDownload, FiPlay,
  FiX, FiVolume2, FiImage, FiVideo, FiUser, FiLoader, FiExternalLink,
  FiChevronDown, FiTrash2, FiAward, FiFileText, FiClock, FiChevronRight, FiChevronLeft
} from 'react-icons/fi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { apiBaseUrl } from '../services/apiClient'

// ── Custom Dropdown (replaces native <select>) ──────────────────────────────

function CustomSelect({ options, value, onChange, d, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => o.key === value);
  const displayLabel = selected?.label ?? (typeof value === 'string' ? value : String(value));

  return (
    <div className={`relative ${className || ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 text-[11px] font-bold rounded-xl px-3 py-2.5 border focus:outline-hidden cursor-pointer whitespace-nowrap transition-all ${
          d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
        }`}
      >
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <FiChevronDown size={12} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-50 w-full min-w-[160px] rounded-xl border shadow-lg py-1 ${
          d ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/[0.06]'
        }`}>
          {options.map(opt => (
            <button
              key={String(opt.key)}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] font-bold transition-colors cursor-pointer ${
                opt.key === value
                  ? d ? 'bg-gray-100 text-gray-900' : 'bg-surface-700 text-white'
                  : d ? 'text-gray-600 hover:bg-gray-50' : 'text-surface-400 hover:bg-surface-700/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Download helper ─────────────────────────────────────────────────────────

function handleDownload(url, filename) {
  return async (e) => {
    e.stopPropagation();
    try {
      const res = await fetch(url, { credentials: 'include' });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed', err);
    }
  };
}

// ── Delete confirmation modal ──────────────────────────────────────────────

function ConfirmModal({ show, onConfirm, onCancel, d }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div
        className={`relative rounded-xl p-5 shadow-xl border max-w-[280px] w-full ${d ? 'bg-white border-gray-200' : 'bg-surface-800 border-white/[0.06]'}`}
        onClick={e => e.stopPropagation()}
      >
        <p className={`text-[12px] font-bold text-center ${d ? 'text-gray-800' : 'text-white'}`}>Delete this asset?</p>
        <p className={`text-[10px] text-center mt-1.5 ${d ? 'text-gray-500' : 'text-surface-400'}`}>This cannot be undone.</p>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={onCancel} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${d ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-white/5 text-surface-400 hover:bg-white/10'}`}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer bg-red-600 text-white hover:bg-red-500">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Delete button helper ─────────────────────────────────────────────────────

function DeleteButton({ assetType, assetId, onDeleted, d }) {
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setShowConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/assets/${assetType}/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        onDeleted();
      } else {
        alert('Failed to delete asset');
      }
    } catch (e) {
      alert('Failed to delete asset');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
        disabled={deleting}
        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer border ${
          d ? 'bg-black text-white border-black/30 hover:bg-gray-800' : 'bg-white text-black border-white/20 hover:bg-gray-100'
        } ${deleting ? 'opacity-40 cursor-not-allowed' : ''}`}
        title="Delete asset"
      >
        {deleting ? <FiLoader size={14} className="animate-spin" /> : <FiTrash2 size={14} />}
      </button>
      <ConfirmModal show={showConfirm} onConfirm={handleDelete} onCancel={() => setShowConfirm(false)} d={d} />
    </>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AssetsPage() {
  const navigate = useNavigate()
  const { isDayMode: d } = useTheme()
  const tabScrollRef = useRef(null)

  const [assets, setAssets] = useState({ characters: [], environments: [], voices: [], videos: [], posters: [], video_promos: [], end_credits: [] })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // all, characters, environments, voices, videos, posters, video_promos, end_credits
  const [selectedProject, setSelectedProject] = useState('all') // project_id or 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Video preview modal state
  const [playingVideo, setPlayingVideo] = useState(null)
  
  // Selected asset expand state
  const [expandedAsset, setExpandedAsset] = useState(null)
  // Refresh counter to trigger re-fetch
  const [refreshKey, setRefreshKey] = useState(0)

  const handleToggleExpand = (type, id) => {
    if (expandedAsset?.type === type && expandedAsset?.id === id) {
      setExpandedAsset(null)
    } else {
      setExpandedAsset({ type, id })
    }
  }

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 350)
    return () => clearTimeout(handler)
  }, [searchQuery])

  // Fetch projects list for dropdown
  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/projects`)
        if (!res.ok) throw new Error("Failed to load projects")
        const data = await res.json()
        setProjects(data)
      } catch (err) {
        console.error(err)
      }
    }
    fetchProjects()
  }, [])

  // Fetch assets list from backend based on filters
  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true)
        let url = `${apiBaseUrl}/api/assets/global?`
        if (selectedProject !== 'all') {
          url += `project_id=${selectedProject}&`
        }
        if (debouncedSearch.trim() !== '') {
          url += `search=${encodeURIComponent(debouncedSearch.trim())}&`
        }

        const res = await fetch(url)
        if (!res.ok) throw new Error("Failed to load assets")
        const data = await res.json()
        setAssets(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [selectedProject, debouncedSearch, refreshKey])

  // Count items helper
  const getAssetCount = (type) => {
    if (type === 'all') {
      return (
        (assets.characters?.length || 0) +
        (assets.environments?.length || 0) +
        (assets.voices?.length || 0) +
        (assets.videos?.length || 0) +
        (assets.posters?.length || 0) +
        (assets.video_promos?.length || 0) +
        (assets.end_credits?.length || 0)
      )
    }
    return assets[type]?.length || 0
  }

  const handleDeleted = () => {
    setRefreshKey(k => k + 1);
  };

  const TABS = [
    { id: 'all', label: 'All', icon: FiDatabase },
    { id: 'characters', label: 'Characters', icon: FiUser },
    { id: 'environments', label: 'Environments', icon: FiImage },
    { id: 'voices', label: 'Voices', icon: FiVolume2 },
    { id: 'videos', label: 'Videos', icon: FiVideo },
    { id: 'posters', label: 'Posters', icon: FiAward },
    { id: 'video_promos', label: 'Video Promo', icon: FiVideo },
    { id: 'end_credits', label: 'End Credits', icon: FiFileText },
  ];

  const PROJECT_OPTIONS = [
    { key: 'all', label: 'All Projects' },
    ...projects.map(p => ({ key: String(p.id), label: p.title })),
  ];

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-300 relative ${d ? 'bg-white text-black' : 'bg-black text-white'}`}>

      {/* Sidebar Navigation */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main Workspace */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">
        
        {/* Header Navbar */}
        <header className={`flex items-center justify-between px-6 py-3 border-b shrink-0 transition-colors duration-500 ${d ? 'border-black/[0.07] bg-white/60 backdrop-blur-sm' : 'border-white/[0.04] bg-black/30 backdrop-blur-sm'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all duration-200 ${d ? 'text-gray-500 hover:text-gray-900 hover:bg-black/[0.05]' : 'text-surface-550 hover:text-white hover:bg-white/[0.05]'}`}
            >
              <FiArrowLeft size={14} /> Back
            </button>
            <div className={`h-4 w-px ${d ? 'bg-black/10' : 'bg-white/10'}`} />
            <h1 className={`text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${d ? 'text-neutral-900' : 'text-white'}`}>
              <FiDatabase className="text-purple-500" size={16} /> Asset Library
            </h1>
          </div>
        </header>

        {/* Filters Top bar */}
        <div className={`p-5 border-b shrink-0 flex flex-col sm:flex-row items-center gap-4 justify-between transition-colors ${
          d ? 'border-neutral-200 bg-neutral-50/40' : 'border-white/[0.04] bg-black/10'
        }`}>
          {/* Search & Project dropdown */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets by name or tags..."
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                  d
                    ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400'
                    : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                }`}
              />
            </div>

            <div className="w-full sm:w-56">
              <CustomSelect
                options={PROJECT_OPTIONS}
                value={String(selectedProject)}
                onChange={(v) => setSelectedProject(v === 'all' ? 'all' : Number(v))}
                d={d}
              />
            </div>
          </div>

          {/* Sub tabs filtering */}
          <div className="relative w-full sm:w-auto flex items-center gap-1">
            <button
              onClick={() => {
                const el = tabScrollRef.current;
                if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
              }}
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-all cursor-pointer ${
                d
                  ? 'bg-white border-neutral-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  : 'bg-black/30 border-white/10 text-surface-450 hover:bg-white/5 hover:text-white'
              }`}
              title="Scroll tabs left"
            >
              <FiChevronLeft size={14} />
            </button>
            <div ref={tabScrollRef} className="flex overflow-x-auto gap-2 scrollbar-none w-full sm:max-w-[520px]">
              {TABS.map(tab => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all whitespace-nowrap ${
                      isActive
                        ? d
                          ? 'bg-black text-white border-black'
                          : 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/10'
                        : d
                          ? 'bg-white border-neutral-200 text-gray-500 hover:border-neutral-350 hover:text-gray-800'
                          : 'bg-black/20 border-white/5 text-surface-450 hover:bg-white/[0.02] hover:border-white/10 hover:text-surface-200'
                    }`}
                  >
                    <tab.icon size={13} />
                    <span>{tab.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : d ? 'bg-black/5 text-black/50' : 'bg-white/5 text-white/40'
                    }`}>
                      {getAssetCount(tab.id)}
                    </span>
                  </button>
                )
              })}
            </div>
            <button
              onClick={() => {
                const el = tabScrollRef.current;
                if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
              }}
              className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-all cursor-pointer ${
                d
                  ? 'bg-white border-neutral-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  : 'bg-black/30 border-white/10 text-surface-450 hover:bg-white/5 hover:text-white'
              }`}
              title="Scroll tabs"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Content Display area */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <FiLoader className={`animate-spin ${d ? 'text-neutral-800' : 'text-purple-500'}`} size={32} />
            <span className={`text-[12px] font-semibold tracking-wider uppercase ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Fetching assets...</span>
          </div>
        ) : getAssetCount(activeTab) === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
            <div className={`p-4 rounded-full border mb-3 ${
              d ? 'bg-neutral-150 border-neutral-200' : 'bg-white/5 border-white/10'
            }`}>
              <FiDatabase className="text-purple-400" size={24} />
            </div>
            <h3 className={`text-[13px] font-bold uppercase tracking-wider ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>No assets found</h3>
            <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-500' : 'text-surface-450'}`}>
              Spawning a project style and running the automated showrunner will generate scene footage, character illustrations, and audio tracks.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            
            {/* Characters section */}
            {(activeTab === 'all' || activeTab === 'characters') && assets.characters?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiUser className="text-purple-450" /> Characters ({assets.characters.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.characters.map(char => {
                    const isExpanded = expandedAsset?.type === 'character' && expandedAsset?.id === char.id
                    return (
                      <div
                        key={char.id}
                        onClick={() => handleToggleExpand('character', char.id)}
                        className={`rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all duration-300 relative group cursor-pointer ${
                          isExpanded
                            ? d
                              ? 'bg-neutral-100 border-neutral-350 shadow-md md:col-span-2'
                              : 'bg-[#12121b] border-neutral-800 shadow-xl md:col-span-2'
                            : d
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-md'
                              : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                        }`}
                      >
                        <div className="flex gap-4 items-start">
                          {/* Character avatar */}
                          <div className={`shrink-0 rounded-xl overflow-hidden border ${d ? 'border-neutral-200' : 'border-white/5'} bg-black/20 flex items-center justify-center transition-all duration-300 relative ${isExpanded ? 'h-20 w-20' : 'h-14 w-14'}`}>
                            {char.image_url ? (
                              <>
                                <img 
                                  src={`${apiBaseUrl}${char.image_url}`} 
                                  alt={char.character_name} 
                                  draggable="false"
                                  className="h-full w-full object-cover select-none" 
                                  onContextMenu={(e) => e.preventDefault()}
                                />
                                <div className="absolute inset-0 z-10 bg-transparent select-none" onContextMenu={(e) => e.preventDefault()} />
                              </>
                            ) : (
                              <FiUser size={isExpanded ? 30 : 20} className="text-gray-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-[13.5px] font-black tracking-wide truncate ${d ? 'text-neutral-900' : 'text-white'}`}>
                                {char.character_name}
                              </h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/projects/${char.project_id}`)
                                }}
                                className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0"
                                title={char.project_title}
                              >
                                <span className="truncate max-w-[100px]">{char.project_title}</span> <FiExternalLink size={10} />
                              </button>
                            </div>
                            <p className={`text-[10.5px] leading-relaxed mt-1.5 ${isExpanded ? '' : 'line-clamp-2'} ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                              {char.character_profile?.description || 'AI Cast character profile'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {char.image_url && (
                              <button
                                onClick={handleDownload(`${apiBaseUrl}${char.image_url}`, `character_${char.character_name}.png`)}
                                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer border ${d ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-800' : 'bg-black/40 text-white/60 border-white/[0.12] hover:bg-white/10 hover:text-white/90'}`}
                                title="Download character image"
                              >
                                <FiDownload size={14} />
                              </button>
                            )}
                            <DeleteButton assetType="character" assetId={char.id} onDeleted={handleDeleted} d={d} />
                          </div>
                        </div>

                        {/* Expanded details */}
                        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 border-t border-dashed border-neutral-300/40 pt-3.5 mt-1' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-[10.5px] leading-normal">
                            {char.character_profile?.gender && (
                              <div>
                                <span className="text-[7.5px] uppercase tracking-wider font-bold text-purple-400 block mb-0.5">Gender</span>
                                <span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{char.character_profile.gender}</span>
                              </div>
                            )}
                            {char.character_profile?.age && (
                              <div>
                                <span className="text-[7.5px] uppercase tracking-wider font-bold text-emerald-400 block mb-0.5">Age Group</span>
                                <span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{char.character_profile.age}</span>
                              </div>
                            )}
                            {char.character_profile?.ethnicity && (
                              <div>
                                <span className="text-[7.5px] uppercase tracking-wider font-bold text-amber-400 block mb-0.5">Ethnicity</span>
                                <span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{char.character_profile.ethnicity}</span>
                              </div>
                            )}
                            {char.character_profile?.attire && (
                              <div className="col-span-2 sm:col-span-3">
                                <span className="text-[7.5px] uppercase tracking-wider font-bold text-blue-400 block mb-0.5">Attire & Appearance</span>
                                <span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{char.character_profile.attire}</span>
                              </div>
                            )}
                            {char.character_profile?.personality && (
                              <div className="col-span-2 sm:col-span-3">
                                <span className="text-[7.5px] uppercase tracking-wider font-bold text-purple-400 block mb-0.5">Personality & Demeanor</span>
                                <span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{char.character_profile.personality}</span>
                              </div>
                            )}
                            {char.character_profile?.prompt_instructions && (
                              <div className={`col-span-2 sm:col-span-3 p-2.5 rounded-lg border font-mono text-[9px] mt-1 ${
                                d ? 'bg-neutral-100 border-neutral-200 text-neutral-600' : 'bg-black/30 border-white/5 text-gray-400'
                              }`}>
                                <span className="font-bold text-[7.5px] uppercase tracking-wider text-purple-400 block mb-1">Visual Generation Instructions</span>
                                "{char.character_profile.prompt_instructions}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Environments section */}
            {(activeTab === 'all' || activeTab === 'environments') && assets.environments?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiImage className="text-emerald-450" /> Environments ({assets.environments.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.environments.map(env => {
                    const isExpanded = expandedAsset?.type === 'environment' && expandedAsset?.id === env.id
                    return (
                      <div
                        key={env.id}
                        onClick={() => handleToggleExpand('environment', env.id)}
                        className={`rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all duration-300 relative group cursor-pointer ${
                          isExpanded
                            ? d
                              ? 'bg-neutral-100 border-neutral-350 shadow-md md:col-span-2'
                              : 'bg-[#12121b] border-neutral-800 shadow-xl md:col-span-2'
                            : d
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-md'
                              : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                        }`}
                      >
                        <div className="flex gap-4 items-start">
                          <div className={`shrink-0 rounded-xl overflow-hidden border ${d ? 'border-neutral-200' : 'border-white/5'} bg-black/20 flex items-center justify-center transition-all duration-300 relative ${isExpanded ? 'h-20 w-20' : 'h-14 w-14'}`}>
                            {env.image_url ? (
                              <>
                                <img src={`${apiBaseUrl}${env.image_url}`} alt={env.environment_name} draggable="false" className="h-full w-full object-cover select-none" onContextMenu={(e) => e.preventDefault()} />
                                <div className="absolute inset-0 z-10 bg-transparent select-none" onContextMenu={(e) => e.preventDefault()} />
                              </>
                            ) : (
                              <FiImage size={isExpanded ? 30 : 20} className="text-gray-500" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-[13.5px] font-black tracking-wide truncate ${d ? 'text-neutral-900' : 'text-white'}`}>{env.environment_name}</h4>
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${env.project_id}`); }} className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0" title={env.project_title}>
                                <span className="truncate max-w-[100px]">{env.project_title}</span> <FiExternalLink size={10} />
                              </button>
                            </div>
                            <p className={`text-[10.5px] leading-relaxed mt-1.5 ${isExpanded ? '' : 'line-clamp-2'} ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                              {env.environment_profile?.description || 'Generated environment visual cues'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {env.image_url && (
                              <button
                                onClick={handleDownload(`${apiBaseUrl}${env.image_url}`, `environment_${env.environment_name}.png`)}
                                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer border ${d ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-800' : 'bg-black/40 text-white/60 border-white/[0.12] hover:bg-white/10 hover:text-white/90'}`}
                                title="Download environment image"
                              >
                                <FiDownload size={14} />
                              </button>
                            )}
                            <DeleteButton assetType="environment" assetId={env.id} onDeleted={handleDeleted} d={d} />
                          </div>
                        </div>

                        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 border-t border-dashed border-neutral-300/40 pt-3.5 mt-1' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-[10.5px] leading-normal">
                            {env.environment_profile?.time_of_day && (
                              <div><span className="text-[7.5px] uppercase tracking-wider font-bold text-amber-500 block mb-0.5">Time of Day</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{env.environment_profile.time_of_day}</span></div>
                            )}
                            {env.environment_profile?.lighting && (
                              <div><span className="text-[7.5px] uppercase tracking-wider font-bold text-emerald-450 block mb-0.5">Lighting Setup</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{env.environment_profile.lighting}</span></div>
                            )}
                            {env.environment_profile?.atmosphere && (
                              <div><span className="text-[7.5px] uppercase tracking-wider font-bold text-purple-400 block mb-0.5">Atmosphere</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{env.environment_profile.atmosphere}</span></div>
                            )}
                            {env.environment_profile?.key_props && (
                              <div className="col-span-2 sm:col-span-3"><span className="text-[7.5px] uppercase tracking-wider font-bold text-blue-400 block mb-0.5">Key Props & Objects</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{env.environment_profile.key_props}</span></div>
                            )}
                            {env.environment_profile?.architecture && (
                              <div className="col-span-2 sm:col-span-3"><span className="text-[7.5px] uppercase tracking-wider font-bold text-purple-450 block mb-0.5">Architecture & Setting</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{env.environment_profile.architecture}</span></div>
                            )}
                            {env.environment_profile?.prompt_instructions && (
                              <div className={`col-span-2 sm:col-span-3 p-2.5 rounded-lg border font-mono text-[9px] mt-1 ${d ? 'bg-neutral-100 border-neutral-200 text-neutral-600' : 'bg-black/30 border-white/5 text-gray-400'}`}>
                                <span className="font-bold text-[7.5px] uppercase tracking-wider text-purple-400 block mb-1">Visual Generation Instructions</span>
                                "{env.environment_profile.prompt_instructions}"
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Voices section */}
            {(activeTab === 'all' || activeTab === 'voices') && assets.voices?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiVolume2 className="text-amber-450" /> Voices ({assets.voices.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.voices.map(voice => {
                    const isExpanded = expandedAsset?.type === 'voice' && expandedAsset?.id === voice.id
                    return (
                      <div
                        key={voice.id}
                        onClick={() => handleToggleExpand('voice', voice.id)}
                        className={`rounded-xl border p-4.5 flex flex-col justify-between gap-4 transition-all duration-300 relative group cursor-pointer ${
                          isExpanded
                            ? d
                              ? 'bg-neutral-100 border-neutral-350 shadow-md md:col-span-2'
                              : 'bg-[#12121b] border-neutral-800 shadow-xl md:col-span-2'
                            : d
                              ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-md'
                              : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`text-[13.5px] font-black tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>{voice.character_name}</h4>
                            <span className={`text-[8.5px] font-mono tracking-wide mt-1 inline-block opacity-65 ${d ? 'text-neutral-600' : 'text-neutral-450'}`}>
                              SIG: {voice.voice_signature || 'QwenTTS-Male'}
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${voice.project_id}`); }} className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0" title={voice.project_title}>
                                <span className="truncate max-w-[100px]">{voice.project_title}</span> <FiExternalLink size={10} />
                          </button>
                        </div>

                        {voice.preview_url ? (
                          <div onClick={(e) => e.stopPropagation()} className={`flex items-center gap-2 p-2.5 rounded-xl border ${d ? 'bg-white border-neutral-250' : 'bg-black/35 border-white/5'}`}>
                            <audio controls src={`${apiBaseUrl}${voice.preview_url}`} className="flex-1 h-8 text-[11px]" />
                            <button
                              onClick={handleDownload(`${apiBaseUrl}${voice.preview_url}`, `voice_${voice.character_name || 'preview'}.wav`)}
                              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all cursor-pointer border ${d ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100 hover:text-gray-800' : 'bg-black/40 text-white/60 border-white/[0.12] hover:bg-white/10 hover:text-white/90'}`}
                              title="Download voice"
                            >
                              <FiDownload size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10.5px] italic text-gray-500">No preview voice clip generated yet</div>
                        )}
                        <div className="flex justify-end">
                          <DeleteButton assetType="voice" assetId={voice.id} onDeleted={handleDeleted} d={d} />
                        </div>

                        <div className={`transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-96 opacity-100 border-t border-dashed border-neutral-300/40 pt-3.5 mt-1' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          <div className="grid grid-cols-2 gap-4 text-[10.5px] leading-normal">
                            <div><span className="text-[7.5px] uppercase tracking-wider font-bold text-amber-500 block mb-0.5">Gender Target</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{voice.gender_tag || 'Male'}</span></div>
                            <div><span className="text-[7.5px] uppercase tracking-wider font-bold text-emerald-450 block mb-0.5">Speaker Age</span><span className={`font-semibold block ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{voice.age_tag || 'Adult'}</span></div>
                            <div className="col-span-2"><span className="text-[7.5px] uppercase tracking-wider font-bold text-purple-450 block mb-0.5">Technical Signature</span><span className={`font-mono text-[9px] block ${d ? 'text-neutral-700' : 'text-neutral-300'}`}>{voice.voice_signature || 'qwen-tts-v2-multilingual'}</span></div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Videos section */}
            {(activeTab === 'all' || activeTab === 'videos') && assets.videos?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiVideo className="text-blue-400" /> Videos ({assets.videos.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.videos.map(video => {
                    const isRendered = video.status === 'completed'
                    return (
                      <div
                        key={video.id}
                        className={`rounded-xl border overflow-hidden flex flex-col justify-between transition-all duration-300 relative group hover:shadow-lg ${
                          d
                            ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-neutral-200'
                            : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                        }`}
                      >
                        <div className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 overflow-hidden select-none" onContextMenu={(e) => e.preventDefault()}>
                          {isRendered ? (
                            <>
                              {video.thumbnail_url ? (
                                <img src={`${apiBaseUrl}${video.thumbnail_url}`} alt="Video Thumbnail" draggable="false" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none" onContextMenu={(e) => e.preventDefault()} />
                              ) : (
                                <div className="absolute inset-0 bg-[#0a0a0f]" />
                              )}
                              <div onClick={() => setPlayingVideo(video)} className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer">
                                <div className="p-3.5 rounded-full bg-white text-black shadow-lg hover:scale-105 transition-transform"><FiPlay size={18} fill="black" /></div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <FiLoader className="animate-spin text-purple-400" size={24} />
                              <span className="text-[10px] text-surface-450 tracking-wider font-semibold uppercase">Rendering...</span>
                            </div>
                          )}
                          <span className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white">Scene {video.scene_number}</span>
                        </div>

                        <div className="p-4.5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] uppercase font-bold tracking-wider ${d ? 'text-gray-400' : 'text-surface-550'}`}>Model: {video.generation_model}</span>
                              <button onClick={() => navigate(`/projects/${video.project_id}`)} className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold min-w-0" title={video.project_title}>
                                <span className="truncate max-w-[100px]">{video.project_title}</span> <FiExternalLink size={10} />
                              </button>
                            </div>
                            <p className={`text-[10.5px] leading-relaxed mt-2 font-mono line-clamp-2 ${d ? 'text-neutral-700' : 'text-neutral-350'}`}>"{video.prompt_used}"</p>
                          </div>

                          {isRendered && (
                            <div className="flex gap-2.5 pt-3.5 border-t border-dashed border-white/5">
                              <button onClick={handleDownload(`${apiBaseUrl}${video.video_url}`, `scene_${video.scene_number}_clip.mp4`)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors text-center cursor-pointer ${d ? 'border-neutral-250 text-neutral-800 hover:bg-neutral-100' : 'border-white/10 text-neutral-200 hover:bg-white/5'}`}>
                                <FiDownload size={12} /> Download
                              </button>
                              <DeleteButton assetType="video" assetId={video.id} onDeleted={handleDeleted} d={d} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Posters section */}
            {(activeTab === 'all' || activeTab === 'posters') && assets.posters?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiAward className="text-rose-400" /> Release Posters ({assets.posters.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.posters.map(poster => (
                    <div key={poster.id} className={`rounded-xl border overflow-hidden flex flex-col transition-all duration-300 group hover:shadow-lg ${
                      d ? 'bg-neutral-50 border-neutral-200' : 'bg-[#0f0f15] border-neutral-900'
                    }`}>
                      <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                        <img src={`${apiBaseUrl}${poster.url}`} alt={poster.label} className="w-full h-full object-contain select-none" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-[12px] font-black tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>{poster.label}</h4>
                            <button onClick={() => navigate(`/projects/${poster.project_id}`)} className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0" title={poster.project_title}>
                                <span className="truncate max-w-[100px]">{poster.project_title}</span> <FiExternalLink size={10} />
                              </button>
                          </div>
                          <p className={`text-[9px] font-mono mt-1 ${d ? 'text-neutral-500' : 'text-surface-500'}`}>{poster.asset_key}</p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-dashed border-white/5">
                          <button onClick={handleDownload(`${apiBaseUrl}${poster.url}`, `${poster.asset_key}.jpg`)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${d ? 'border-neutral-250 text-neutral-800 hover:bg-neutral-100' : 'border-white/10 text-neutral-200 hover:bg-white/5'}`}>
                            <FiDownload size={11} /> Download
                          </button>
                          <DeleteButton assetType="release_asset" assetId={poster.id} onDeleted={handleDeleted} d={d} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Promo section */}
            {(activeTab === 'all' || activeTab === 'video_promos') && assets.video_promos?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiVideo className="text-cyan-400" /> Video Promos ({assets.video_promos.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.video_promos.map(promo => (
                    <div key={promo.id} className={`rounded-xl border overflow-hidden flex flex-col transition-all duration-300 group hover:shadow-lg ${
                      d ? 'bg-neutral-50 border-neutral-200' : 'bg-[#0f0f15] border-neutral-900'
                    }`}>
                      <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                        <video src={`${apiBaseUrl}${promo.url}`} className="w-full h-full object-contain" controls controlsList="nodownload" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-[12px] font-black tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>{promo.label}</h4>
                            <button onClick={() => navigate(`/projects/${promo.project_id}`)} className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0" title={promo.project_title}>
                                <span className="truncate max-w-[100px]">{promo.project_title}</span> <FiExternalLink size={10} />
                            </button>
                          </div>
                          {promo.duration && <p className={`text-[9px] font-mono mt-1 ${d ? 'text-neutral-500' : 'text-surface-500'}`}>Duration: {promo.duration}s</p>}
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-dashed border-white/5">
                          <button onClick={handleDownload(`${apiBaseUrl}${promo.url}`, `trailer.mp4`)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${d ? 'border-neutral-250 text-neutral-800 hover:bg-neutral-100' : 'border-white/10 text-neutral-200 hover:bg-white/5'}`}>
                            <FiDownload size={11} /> Download
                          </button>
                          <DeleteButton assetType="release_asset" assetId={promo.id} onDeleted={handleDeleted} d={d} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Credits section */}
            {(activeTab === 'all' || activeTab === 'end_credits') && assets.end_credits?.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiFileText className="text-amber-400" /> End Credits ({assets.end_credits.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.end_credits.map(credit => (
                    <div key={credit.id} className={`rounded-xl border overflow-hidden flex flex-col transition-all duration-300 group hover:shadow-lg ${
                      d ? 'bg-neutral-50 border-neutral-200' : 'bg-[#0f0f15] border-neutral-900'
                    }`}>
                      <div className={`p-5 flex flex-col items-center justify-center min-h-[140px] ${d ? 'bg-gray-100' : 'bg-black/40'}`}>
                        <FiFileText className={`mb-2 ${d ? 'text-gray-400' : 'text-surface-500'}`} size={28} />
                        <h4 className={`text-base font-black uppercase tracking-wider text-center ${d ? 'text-gray-900' : 'text-white'}`} style={{ fontFamily: "'Sofia Sans', sans-serif" }}>
                          {credit.credit_data?.title || 'Untitled'}
                        </h4>
                      </div>
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-[12px] font-black tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>End Credits</h4>
                            <button onClick={() => navigate(`/projects/${credit.project_id}`)} className="text-[9.5px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer shrink-0 min-w-0" title={credit.project_title}>
                                <span className="truncate max-w-[100px]">{credit.project_title}</span> <FiExternalLink size={10} />
                            </button>
                          </div>
                          <p className={`text-[9px] font-mono mt-1 ${d ? 'text-neutral-500' : 'text-surface-500'}`}>
                            {credit.credit_data?.director ? `Dir: ${credit.credit_data.director}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-dashed border-white/5">
                          <button onClick={handleDownload(`${apiBaseUrl}${credit.url}`, `credits.json`)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-colors cursor-pointer ${d ? 'border-neutral-250 text-neutral-800 hover:bg-neutral-100' : 'border-white/10 text-neutral-200 hover:bg-white/5'}`}>
                            <FiDownload size={11} /> Download
                          </button>
                          <DeleteButton assetType="release_asset" assetId={credit.id} onDeleted={handleDeleted} d={d} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Video Overlay Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-3xl flex flex-col gap-4 relative">
            <button onClick={() => setPlayingVideo(null)} className="absolute top-[-42px] right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer">
              <FiX size={18} />
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video src={`${apiBaseUrl}${playingVideo.video_url}`} controls controlsList="nodownload" disablePictureInPicture onContextMenu={(e) => e.preventDefault()} className="w-full h-auto aspect-video max-h-[75vh] select-none" />
            </div>
            <div className="px-4">
              <h4 className="text-[13px] uppercase font-bold tracking-widest text-purple-400 truncate">Scene {playingVideo.scene_number} — {playingVideo.project_title}</h4>
              <p className="text-[11.5px] text-surface-300 font-mono leading-relaxed mt-1.5">"{playingVideo.prompt_used}"</p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
