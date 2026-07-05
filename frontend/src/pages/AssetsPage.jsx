import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiDatabase, FiSearch, FiSliders, FiDownload, FiPlay,
  FiX, FiVolume2, FiImage, FiVideo, FiUser, FiLoader, FiExternalLink
} from 'react-icons/fi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { apiBaseUrl } from '../services/apiClient'

export default function AssetsPage() {
  const navigate = useNavigate()
  const { isDayMode: d } = useTheme()

  const [assets, setAssets] = useState({ characters: [], environments: [], voices: [], videos: [] })
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all') // all, characters, environments, voices, videos
  const [selectedProject, setSelectedProject] = useState('all') // project_id or 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Video preview modal state
  const [playingVideo, setPlayingVideo] = useState(null)

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
  }, [selectedProject, debouncedSearch])

  // Count items helper
  const getAssetCount = (type) => {
    if (type === 'all') {
      return (
        assets.characters.length +
        assets.environments.length +
        assets.voices.length +
        assets.videos.length
      )
    }
    return assets[type]?.length || 0
  }

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 relative ${d ? 'bg-white' : 'bg-[#06060b]'}`}>
      
      {/* Background ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen" />

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

            <div className="relative w-full sm:w-56">
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                  d
                    ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400'
                    : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                }`}
              >
                <option value="all">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sub tabs filtering */}
          <div className="flex overflow-x-auto gap-2 w-full sm:w-auto scrollbar-none">
            {[
              { id: 'all', label: 'All', icon: FiDatabase },
              { id: 'characters', label: 'Characters', icon: FiUser },
              { id: 'environments', label: 'Environments', icon: FiImage },
              { id: 'voices', label: 'Voices', icon: FiVolume2 },
              { id: 'videos', label: 'Videos', icon: FiVideo }
            ].map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
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
            {(activeTab === 'all' || activeTab === 'characters') && assets.characters.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiUser className="text-purple-400" /> Characters ({assets.characters.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.characters.map(char => (
                    <div
                      key={char.id}
                      className={`rounded-2xl border p-4.5 flex gap-4 transition-all duration-300 relative group ${
                        d
                          ? 'bg-neutral-50/65 border-neutral-200 hover:border-neutral-350'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-purple-500/35 hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Character avatar */}
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/5 bg-black/20 flex items-center justify-center">
                        {char.image_url ? (
                          <img src={`${apiBaseUrl}${char.image_url}`} alt={char.character_name} className="h-full w-full object-cover" />
                        ) : (
                          <FiUser size={24} className="text-gray-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-[13px] font-bold tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>
                            {char.character_name}
                          </h4>
                          <button
                            onClick={() => navigate(`/projects/${char.project_id}`)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                            title="Go to project"
                          >
                            {char.project_title} <FiExternalLink size={10} />
                          </button>
                        </div>
                        <p className={`text-[10.5px] leading-relaxed mt-1 line-clamp-2 ${d ? 'text-neutral-600' : 'text-surface-450'}`}>
                          {char.character_profile?.description || 'AI Cast character profile'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environments section */}
            {(activeTab === 'all' || activeTab === 'environments') && assets.environments.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiImage className="text-emerald-400" /> Environments ({assets.environments.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.environments.map(env => (
                    <div
                      key={env.id}
                      className={`rounded-2xl border p-4.5 flex gap-4 transition-all duration-300 relative group ${
                        d
                          ? 'bg-neutral-50/65 border-neutral-200 hover:border-neutral-350'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-purple-500/35 hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Environment preview */}
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/5 bg-black/20 flex items-center justify-center">
                        {env.image_url ? (
                          <img src={`${apiBaseUrl}${env.image_url}`} alt={env.environment_name} className="h-full w-full object-cover" />
                        ) : (
                          <FiImage size={24} className="text-gray-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-[13px] font-bold tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>
                            {env.environment_name}
                          </h4>
                          <button
                            onClick={() => navigate(`/projects/${env.project_id}`)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                          >
                            {env.project_title} <FiExternalLink size={10} />
                          </button>
                        </div>
                        <p className={`text-[10.5px] leading-relaxed mt-1 line-clamp-2 ${d ? 'text-neutral-600' : 'text-surface-450'}`}>
                          {env.environment_profile?.description || 'Generated environment visual cues'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voices section */}
            {(activeTab === 'all' || activeTab === 'voices') && assets.voices.length > 0 && (
              <div>
                <h3 className={`text-[12px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>
                  <FiVolume2 className="text-amber-400" /> Voices ({assets.voices.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {assets.voices.map(voice => (
                    <div
                      key={voice.id}
                      className={`rounded-2xl border p-4.5 flex flex-col justify-between gap-4.5 transition-all duration-300 relative group ${
                        d
                          ? 'bg-neutral-50/65 border-neutral-200 hover:border-neutral-350'
                          : 'bg-white/[0.02] border-white/[0.04] hover:border-purple-500/35 hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className={`text-[13px] font-bold tracking-wide ${d ? 'text-neutral-900' : 'text-white'}`}>
                            {voice.character_name}
                          </h4>
                          <span className={`text-[9px] font-mono tracking-wide mt-1 inline-block opacity-65 ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                            SIG: {voice.voice_signature || 'QwenTTS-Male'}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/projects/${voice.project_id}`)}
                          className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                        >
                          {voice.project_title} <FiExternalLink size={10} />
                        </button>
                      </div>

                      {/* HTML5 Audio Player */}
                      {voice.preview_url ? (
                        <div className={`p-2.5 rounded-xl border ${d ? 'bg-white border-neutral-200' : 'bg-black/35 border-white/5'}`}>
                          <audio
                            controls
                            src={`${apiBaseUrl}${voice.preview_url}`}
                            className="w-full h-8 text-[11px]"
                          />
                        </div>
                      ) : (
                        <div className="text-[10.5px] italic text-gray-500">No preview voice clip generated yet</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Videos section */}
            {(activeTab === 'all' || activeTab === 'videos') && assets.videos.length > 0 && (
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
                        className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all duration-300 relative group ${
                          d
                            ? 'bg-neutral-50/65 border-neutral-200 hover:border-neutral-350 hover:shadow-xs'
                            : 'bg-white/[0.02] border-white/[0.04] hover:border-purple-500/35 hover:bg-white/[0.03]'
                        }`}
                      >
                        {/* Video thumbnail and hover-play badge */}
                        <div className="aspect-video bg-black relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                          {isRendered ? (
                            <>
                              {video.thumbnail_url ? (
                                <img src={`${apiBaseUrl}${video.thumbnail_url}`} alt="Video Thumbnail" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <div className="absolute inset-0 bg-[#0a0a0f]" />
                              )}
                              
                              {/* Hover Play overlay */}
                              <div
                                onClick={() => setPlayingVideo(video)}
                                className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer"
                              >
                                <div className="p-3.5 rounded-full bg-white text-black shadow-lg hover:scale-105 transition-transform">
                                  <FiPlay size={18} fill="black" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <FiLoader className="animate-spin text-purple-400" size={24} />
                              <span className="text-[10px] text-surface-450 tracking-wider font-semibold uppercase">Rendering...</span>
                            </div>
                          )}
                          
                          <span className="absolute bottom-2.5 right-2.5 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono font-bold text-white">
                            Scene {video.scene_number}
                          </span>
                        </div>

                        {/* Video metadata information */}
                        <div className="p-4.5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] uppercase font-bold tracking-wider ${d ? 'text-gray-400' : 'text-surface-550'}`}>
                                Model: {video.generation_model}
                              </span>
                              <button
                                onClick={() => navigate(`/projects/${video.project_id}`)}
                                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                              >
                                {video.project_title} <FiExternalLink size={10} />
                              </button>
                            </div>
                            <p className={`text-[10.5px] leading-relaxed mt-2 font-mono line-clamp-2 ${d ? 'text-neutral-700' : 'text-surface-300'}`}>
                              "{video.prompt_used}"
                            </p>
                          </div>

                          {isRendered && (
                            <div className="flex gap-2.5 pt-3.5 border-t border-dashed border-white/5">
                              <a
                                href={`${apiBaseUrl}${video.video_url}`}
                                download={`scene_${video.scene_number}_clip.mp4`}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border transition-colors text-center ${
                                  d
                                    ? 'border-neutral-250 text-neutral-800 hover:bg-neutral-100'
                                    : 'border-white/10 text-neutral-200 hover:bg-white/5'
                                }`}
                              >
                                <FiDownload size={12} /> Download
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
            <button
              onClick={() => setPlayingVideo(null)}
              className="absolute top-[-42px] right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">
              <video
                src={`${apiBaseUrl}${playingVideo.video_url}`}
                controls
                autoPlay
                className="w-full h-auto aspect-video max-h-[75vh]"
              />
            </div>
            <div className="px-4">
              <h4 className="text-[13px] uppercase font-bold tracking-widest text-purple-400">
                Scene {playingVideo.scene_number} — {playingVideo.project_title}
              </h4>
              <p className="text-[11.5px] text-surface-300 font-mono leading-relaxed mt-1.5">
                "{playingVideo.prompt_used}"
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
