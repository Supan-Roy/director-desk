import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  FiArrowLeft,
  FiDownload,
  FiPlay,
  FiPause,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiFileText,
  FiVideo,
  FiTrash2,
  FiPlus,
  FiSave,
  FiBarChart2,
  FiSettings,
  FiMusic,
  FiGlobe,
  FiTv
} from 'react-icons/fi'
import { apiBaseUrl } from '../services/apiClient'
import { useTheme } from '../context/ThemeContext'
import Sidebar from '../components/Sidebar'
import Footer from '../components/Footer'
import { decodeProjectRouteId } from '../utils/hashids'

const formatTimeSRT = (secs) => {
  const val = parseFloat(secs) || 0
  const hours = Math.floor(val / 3600)
  const minutes = Math.floor((val % 3600) / 60)
  const seconds = Math.floor(val % 60)
  const ms = Math.floor((val - Math.floor(val)) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

const formatTimeVTT = (secs) => {
  const val = parseFloat(secs) || 0
  const hours = Math.floor(val / 3600)
  const minutes = Math.floor((val % 3600) / 60)
  const seconds = Math.floor(val % 60)
  const ms = Math.floor((val - Math.floor(val)) * 1000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

const triggerClientDownload = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function PostProductionStudio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isDayMode: d } = useTheme()
  const numericId = decodeProjectRouteId(id) || 0
  const hasValidProject = !!numericId && numericId > 0

  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subtitles, setSubtitles] = useState([])
  const [statistics, setStatistics] = useState(null)
  const [movieUrl, setMovieUrl] = useState("")
  const rawMovieUrlRef = useRef("")

  // Generation status states
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState("")

  // Video playback states
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState(null)

  // Tabs state
  const [activeTab, setActiveTab] = useState('subtitles')

  // Edit states
  const [editedSubtitles, setEditedSubtitles] = useState([])
  const [saveStatus, setSaveStatus] = useState("idle") // idle, saving, success, error

  const videoRef = useRef(null)
  const pollingRef = useRef(null)

  const steps = [
    { title: "FFmpeg Audio Extraction", desc: "Extracting audio track from high-resolution movie canvas..." },
    { title: "Speech Recognition Initialization", desc: "Spinning up the transcription model engine..." },
    { title: "Timestamp Alignment", desc: "Generating word boundaries and sync markers..." },
    { title: "Creating Subtitle Timeline", desc: "Finalizing alignment and compiling subtitles track..." }
  ]

  // Fetch project subtitles and movie
  const fetchSubtitles = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/subtitles?project_id=${numericId}`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setSubtitles(data.subtitles || [])
        setEditedSubtitles(data.subtitles || [])
        setStatistics(data.statistics)
        if (data.mastered_movie_url) {
          setMovieUrl(`${apiBaseUrl}${data.mastered_movie_url}`)
        }
      }
    } catch (e) {
      console.error("Failed to fetch subtitles", e)
    }
  }, [numericId])

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/projects/${numericId}`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setProject(data)
      }
    } catch (e) {
      console.error("Failed to fetch project", e)
    } finally {
      setLoading(false)
    }
  }, [numericId])

  useEffect(() => {
    if (hasValidProject) {
      fetchSubtitles()
      fetchProject()
    } else {
      setLoading(false)
      let url = location.state?.movieUrl
      if (url) {
        sessionStorage.setItem('temp_post_prod_movie_url', url)
        rawMovieUrlRef.current = url
      } else {
        url = sessionStorage.getItem('temp_post_prod_movie_url')
        rawMovieUrlRef.current = url || ''
      }
      if (url) {
        const fullUrl = url.startsWith('http') ? url : `${apiBaseUrl}${url}`
        setMovieUrl(fullUrl)
      }
    }
  }, [hasValidProject, fetchSubtitles, fetchProject, location.state])

  // Monitor playback time to sync active subtitle overlays
  useEffect(() => {
    const active = editedSubtitles.find(s => currentTime >= s.start && currentTime <= s.end)
    setActiveSubtitle(active ? active.text : null)
  }, [currentTime, editedSubtitles])

  const handlePlayPause = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const seekTo = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      setCurrentTime(seconds)
      if (!isPlaying) {
        videoRef.current.play()
        setIsPlaying(true)
      }
    }
  }

  // Poll generation progress from the backend
  const pollGenerationStatus = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/subtitles/generate/status/${taskId}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error("Failed to fetch generation status")

      const data = await res.json()

      // Update step and progress from real backend data
      setGenerationStep(data.step ?? 0)
      setGenerationProgress(data.step_progress ?? 0)

      if (data.status === "completed") {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = null
        setSubtitles(data.subtitles || [])
        setEditedSubtitles(data.subtitles || [])
        setStatistics(data.statistics)
        setGenerating(false)
      } else if (data.status === "failed") {
        if (pollingRef.current) clearInterval(pollingRef.current)
        pollingRef.current = null
        setGenerationError(data.error || "Transcription failed.")
        setGenerating(false)
      }
    } catch (err) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      pollingRef.current = null
      setGenerationError(err.message || "Failed to poll generation status.")
      setGenerating(false)
    }
  }, [])

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  // Trigger Subtitle Generation (async, polls backend for real progress)
  const handleGenerateSubtitles = async () => {
    const url = hasValidProject && project?.mastered_movie_url
      ? project.mastered_movie_url
      : rawMovieUrlRef.current
    if (!url) return

    setGenerating(true)
    setGenerationError("")
    setGenerationStep(0)
    setGenerationProgress(0)

    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/subtitles/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: numericId,
          movie_url: url
        })
      })

      if (!res.ok) {
        throw new Error("Failed to start subtitle generation. Please check if the file is rendered correctly.")
      }

      const { task_id } = await res.json()

      // Poll real progress every 1.5 s
      pollingRef.current = setInterval(() => {
        pollGenerationStatus(task_id)
      }, 1500)
    } catch (err) {
      setGenerationError(err.message || "An error occurred during transcription.")
      setGenerating(false)
    }
  }

  // Update subtitle values locally in the form
  const handleSubtitleTextChange = (index, value) => {
    setEditedSubtitles(prev => {
      const next = [...prev]
      next[index].text = value
      return next
    })
  }

  const handleSubtitleTimeChange = (index, field, value) => {
    setEditedSubtitles(prev => {
      const next = [...prev]
      next[index][field] = parseFloat(value) || 0.0
      return next
    })
  }

  const handleAddSubtitle = () => {
    setEditedSubtitles(prev => {
      const next = [...prev]
      const lastItem = next[next.length - 1]
      const nextStart = lastItem ? lastItem.end + 0.5 : 0.0
      next.push({
        id: next.length + 1,
        start: nextStart,
        end: nextStart + 3.0,
        text: "New Subtitle segment"
      })
      return next
    })
  }

  const handleDeleteSubtitle = (index) => {
    setEditedSubtitles(prev => {
      const next = prev.filter((_, i) => i !== index)
      // re-index IDs
      return next.map((sub, idx) => ({ ...sub, id: idx + 1 }))
    })
  }

  // Save subtitle edits to database
  const handleSaveSubtitles = async () => {
    setSaveStatus("saving")
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/subtitles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: numericId,
          subtitles: editedSubtitles
        })
      })
      if (!res.ok) throw new Error("Failed to save subtitles.")
      
      const data = await res.json()
      setSubtitles(data.subtitles)
      setStatistics(data.statistics)
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2500)
    } catch (err) {
      setSaveStatus("error")
      setTimeout(() => setSaveStatus("idle"), 4000)
    }
  }

  // Downloads
  const downloadMovie = () => {
    if (hasValidProject) {
      window.open(`${apiBaseUrl}/api/post-production/export/movie?project_id=${numericId}`, '_blank')
    } else if (movieUrl) {
      const a = document.createElement('a')
      a.href = movieUrl
      a.download = movieUrl.split('/').pop() || 'master_movie.mp4'
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const downloadSRT = () => {
    if (hasValidProject) {
      window.open(`${apiBaseUrl}/api/post-production/export/subtitles?project_id=${numericId}&format=srt`, '_blank')
    } else {
      const content = editedSubtitles.map((s, idx) => {
        return `${idx + 1}\n${formatTimeSRT(s.start)} --> ${formatTimeSRT(s.end)}\n${s.text}\n`
      }).join('\n')
      triggerClientDownload(content, 'subtitles.srt', 'text/srt')
    }
  }

  const downloadWebVTT = () => {
    if (hasValidProject) {
      window.open(`${apiBaseUrl}/api/post-production/export/subtitles?project_id=${numericId}&format=vtt`, '_blank')
    } else {
      const content = 'WEBVTT\n\n' + editedSubtitles.map((s, idx) => {
        return `${idx + 1}\n${formatTimeVTT(s.start)} --> ${formatTimeVTT(s.end)}\n${s.text}\n`
      }).join('\n')
      triggerClientDownload(content, 'subtitles.vtt', 'text/vtt')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`flex-1 flex flex-col min-w-0 ${d ? 'bg-[#f4f4f7]' : 'bg-[#06070a]'}`}>
        
        {/* Header */}
        <header className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
          d ? 'border-gray-200 bg-white' : 'border-white/[0.04] bg-[#090b0f]'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(id ? `/projects/${id}` : '/editor')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                d ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-white/5 text-gray-400'
              }`}
            >
              <FiArrowLeft size={16} />
            </button>
            <div>
              <h1 className={`text-sm font-black uppercase tracking-wider ${d ? 'text-gray-900' : 'text-white'}`}>
                Post Production Studio
              </h1>
              {project && (
                <p className={`text-[10px] font-mono mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  {project.title} · Finishing Suite
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasValidProject && (
              <button
                onClick={() => navigate(`/projects/${id}/release`)}
                className={`px-4 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all border ${
                  d
                    ? 'bg-black text-white hover:bg-gray-800 border-black'
                    : 'bg-white text-black hover:bg-gray-200 border-white shadow-[0_2px_10px_rgba(255,255,255,0.05)]'
                }`}
              >
                To Release Studio
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <FiLoader size={24} className="animate-spin text-purple-500" />
            </div>
          ) : !movieUrl ? (
            /* Warning if no movie has been rendered from EditorPage yet */
            <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto text-center gap-4 p-6">
              <FiAlertCircle size={48} className="text-amber-500 opacity-80" />
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${d ? 'text-gray-800' : 'text-white'}`}>
                  Master Movie Missing
                </h3>
                <p className={`text-[11.5px] mt-2 leading-relaxed ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                  You must complete rendering your edit inside the Studio Editor before adding final finishing touches or generating master subtitles.
                </p>
              </div>
              <button
                onClick={() => navigate(id ? `/projects/${id}/editor` : '/editor')}
                className="px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-all"
              >
                Open Studio Editor
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-6 flex-1 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column - Movie Player & Stats (7 columns on large screens) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Master Player Container */}
                <div className={`relative rounded-2xl overflow-hidden border shadow-2xl ${
                  d ? 'bg-black border-gray-200' : 'bg-black border-white/[0.06]'
                }`}>
                  <div className="aspect-video relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      src={movieUrl}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full object-contain"
                      onClick={handlePlayPause}
                    />

                    {/* Subtitle Overlay Overlay */}
                    {activeSubtitle && (
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[85%] text-center pointer-events-none select-none z-10">
                        <span className="px-4 py-2 rounded-lg bg-black/85 border border-white/10 text-white font-semibold text-[13px] md:text-[15px] leading-relaxed shadow-xl backdrop-blur-md">
                          {activeSubtitle}
                        </span>
                      </div>
                    )}

                    {/* Control HUD Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <div className="flex items-center justify-between text-white text-[11px]">
                        <button
                          onClick={handlePlayPause}
                          className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                        >
                          {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                        </button>
                        <span className="font-mono text-[10.5px]">
                          {currentTime.toFixed(2)}s / {videoRef.current?.duration ? videoRef.current.duration.toFixed(2) : "0.00"}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtitle Timeline Statistics Panel */}
                <div className={`rounded-2xl border p-5 ${
                  d ? 'bg-white border-gray-200 text-gray-800' : 'bg-[#0a0c10] border-white/[0.04] text-white'
                }`}>
                  <h3 className="text-[11px] font-black uppercase tracking-wider flex items-center gap-2 opacity-80 mb-4">
                    <FiBarChart2 className="text-purple-500" /> Subtitle Timeline Analytics
                  </h3>
                  {statistics && statistics.total_subtitles > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className={`p-3.5 rounded-xl ${d ? 'bg-gray-50' : 'bg-[#101319]'}`}>
                        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-50">Total Segments</span>
                        <span className="block text-lg font-black mt-1 font-mono">{statistics.total_subtitles}</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${d ? 'bg-gray-50' : 'bg-[#101319]'}`}>
                        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-50">Avg Segment</span>
                        <span className="block text-lg font-black mt-1 font-mono">{statistics.average_duration}s</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${d ? 'bg-gray-50' : 'bg-[#101319]'}`}>
                        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-50">Total Words</span>
                        <span className="block text-lg font-black mt-1 font-mono">{statistics.total_words}</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${d ? 'bg-gray-50' : 'bg-[#101319]'}`}>
                        <span className="block text-[9px] font-bold uppercase tracking-wider opacity-50">CPS (Speed)</span>
                        <span className="block text-lg font-black mt-1 font-mono text-purple-400">{statistics.characters_per_second}</span>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-[11px] text-center py-4 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                      No subtitles generated yet. Run generator to gather timeline statistics.
                    </p>
                  )}
                </div>

              </div>

              {/* Right Column - Controls & Tabs (5 columns) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Mode Select Tabs */}
                <div className="flex border-b border-white/[0.04]">
                  <button
                    onClick={() => setActiveTab('subtitles')}
                    className={`flex-1 pb-3 text-[10px] font-extrabold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                      activeTab === 'subtitles'
                        ? 'border-purple-500 text-purple-400'
                        : d ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Subtitles Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('export')}
                    className={`flex-1 pb-3 text-[10px] font-extrabold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                      activeTab === 'export'
                        ? 'border-purple-500 text-purple-400'
                        : d ? 'border-transparent text-gray-500 hover:text-gray-900' : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Finishing & Exports
                  </button>
                </div>

                {/* Tab Content 1: Subtitles Editor */}
                {activeTab === 'subtitles' && (
                  <div className="space-y-4">
                    {editedSubtitles.length === 0 && !generating ? (
                      /* CTA to Generate Subtitles */
                      <div className={`rounded-2xl border p-8 text-center space-y-4 ${
                        d ? 'bg-white border-gray-200' : 'bg-[#0a0c10] border-white/[0.04]'
                      }`}>
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400">
                          <FiFileText size={20} />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-bold uppercase tracking-wider ${d ? 'text-gray-800' : 'text-white'}`}>
                            Auto-Generate Master Subtitles
                          </h4>
                          <p className={`text-[10.5px] mt-1.5 leading-relaxed ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                            Extract video speech tracks and automatically produce time-synchronized subtitles. Uses local FFmpeg + faster-whisper — entirely API-cost-free.
                          </p>
                        </div>
                        {generationError && (
                          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-left flex items-start gap-2">
                            <FiAlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{generationError}</span>
                          </div>
                        )}
                        {!hasValidProject ? (
                          <div className="space-y-3">
                            <button
                              onClick={handleGenerateSubtitles}
                              className="w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                            >
                              Generate Subtitles
                            </button>
                            <button
                              onClick={handleAddSubtitle}
                              className="w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider border border-purple-600 text-purple-400 hover:bg-purple-600/10 transition-all cursor-pointer"
                            >
                              Add Segment Manually
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleGenerateSubtitles}
                            className="w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider bg-purple-600 text-white hover:bg-purple-500 transition-all cursor-pointer shadow-lg shadow-purple-500/10"
                          >
                            Generate Subtitles
                          </button>
                        )}
                      </div>
                    ) : generating ? (
                      /* Beautiful transcription step progress status display */
                      <div className={`rounded-2xl border p-8 space-y-6 ${
                        d ? 'bg-white border-gray-200' : 'bg-[#0a0c10] border-white/[0.04]'
                      }`}>
                        <div className="flex items-center gap-3">
                          <FiLoader className="animate-spin text-purple-400" size={18} />
                          <h4 className={`text-[12px] font-bold uppercase tracking-wider ${d ? 'text-gray-800' : 'text-white'}`}>
                            Transcribing Movie...
                          </h4>
                        </div>
                        
                        <div className="space-y-4">
                          {steps.map((step, idx) => {
                            const isCurrent = idx === generationStep
                            const isPast = idx < generationStep
                            const progress = isCurrent ? generationProgress : isPast ? 100 : 0
                            return (
                              <div key={idx} className={`flex items-start gap-3 transition-opacity ${
                                isCurrent ? 'opacity-100' : isPast ? 'opacity-55' : 'opacity-25'
                              }`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[9px] font-bold ${
                                  isPast
                                    ? 'bg-purple-600 text-white'
                                    : isCurrent
                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                      : 'bg-white/5 text-gray-500 border border-white/5'
                                }`}>
                                  {isPast ? <FiCheckCircle size={10} /> : idx + 1}
                                </div>
                                <div className="flex-1">
                                  <span className={`block text-[10.5px] font-bold uppercase tracking-wider ${
                                    isCurrent ? 'text-purple-400' : d ? 'text-gray-800' : 'text-white'
                                  }`}>{step.title}</span>
                                  {isCurrent && (
                                    <>
                                      <span className={`block text-[9.5px] mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {step.desc}
                                      </span>
                                      {/* Real progress bar */}
                                      <div className={`mt-2 h-1 rounded-full overflow-hidden ${d ? 'bg-gray-200' : 'bg-white/5'}`}>
                                        <div
                                          className="h-full rounded-full bg-purple-500 transition-all duration-300"
                                          style={{ width: `${progress}%` }}
                                        />
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Subtitle Timeline Table Editor */
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-[10px] font-black uppercase tracking-wider opacity-85 ${d ? 'text-gray-700' : 'text-gray-300'}`}>
                            Timeline Segments
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleAddSubtitle}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                                d
                                  ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  : 'bg-[#101319] border-white/5 text-gray-300 hover:bg-[#161a22]'
                              }`}
                            >
                              <FiPlus size={10} /> Add Segment
                            </button>
                            {hasValidProject && (
                              <button
                                onClick={handleSaveSubtitles}
                                disabled={saveStatus === "saving"}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider text-white transition-all cursor-pointer ${
                                  saveStatus === "success"
                                    ? 'bg-emerald-600'
                                    : saveStatus === "error"
                                      ? 'bg-red-600'
                                      : 'bg-purple-600 hover:bg-purple-500'
                                }`}
                              >
                                {saveStatus === "saving" ? (
                                  <FiLoader className="animate-spin" size={10} />
                                ) : saveStatus === "success" ? (
                                  <FiCheckCircle size={10} />
                                ) : (
                                  <FiSave size={10} />
                                )}
                                {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save Changes"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timeline Edit List container */}
                        <div className={`rounded-2xl border overflow-hidden max-h-[480px] overflow-y-auto ${
                          d ? 'bg-white border-gray-200' : 'bg-[#0a0c10] border-white/[0.04]'
                        }`}>
                          <div className="divide-y divide-white/[0.04]">
                            {editedSubtitles.map((sub, index) => (
                              <div
                                key={sub.id}
                                className={`p-3.5 transition-colors flex flex-col gap-2 ${
                                  d
                                    ? 'hover:bg-gray-50/80 divide-gray-100'
                                    : 'hover:bg-[#12151c]/60'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <button
                                    onClick={() => seekTo(sub.start)}
                                    className="text-[9px] font-mono font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full hover:bg-purple-500/20 cursor-pointer"
                                  >
                                    Seek to {sub.start.toFixed(2)}s
                                  </button>
                                  
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-[9px] font-mono">
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={sub.start}
                                        onChange={(e) => handleSubtitleTimeChange(index, 'start', e.target.value)}
                                        className={`w-12 text-center rounded border p-0.5 ${
                                          d ? 'bg-gray-50 border-gray-200' : 'bg-[#141820] border-white/5'
                                        }`}
                                      />
                                      <span className="opacity-40">to</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={sub.end}
                                        onChange={(e) => handleSubtitleTimeChange(index, 'end', e.target.value)}
                                        className={`w-12 text-center rounded border p-0.5 ${
                                          d ? 'bg-gray-50 border-gray-200' : 'bg-[#141820] border-white/5'
                                        }`}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleDeleteSubtitle(index)}
                                      className="p-1 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition-all cursor-pointer"
                                    >
                                      <FiTrash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                <textarea
                                  value={sub.text}
                                  onChange={(e) => handleSubtitleTextChange(index, e.target.value)}
                                  className={`w-full text-[11px] leading-relaxed rounded-xl border p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                                    d
                                      ? 'bg-gray-50 border-gray-200 text-gray-800'
                                      : 'bg-[#101319] border-white/5 text-gray-200 focus:bg-[#141922]'
                                  }`}
                                  rows={2}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 2: Finishing & Exports */}
                {activeTab === 'export' && (
                  <div className="space-y-4">
                    <h3 className={`text-[10px] font-black uppercase tracking-wider opacity-85 ${d ? 'text-gray-700' : 'text-gray-300'}`}>
                      Available Downloads
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {/* Movie Download */}
                      <div
                        onClick={downloadMovie}
                        className={`p-4 rounded-2xl border flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                          d
                            ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                            : 'bg-[#0a0c10] border-white/[0.04] text-white hover:bg-[#0e1117]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <FiVideo size={16} />
                          </div>
                          <div>
                            <span className="block text-[11.5px] font-bold">Final Mastered Movie</span>
                            <span className={`block text-[9px] mt-0.5 opacity-60`}>Download rendered video in full quality</span>
                          </div>
                        </div>
                        <FiDownload size={14} className="opacity-50" />
                      </div>

                      {/* SRT Download */}
                      <div
                        onClick={downloadSRT}
                        className={`p-4 rounded-2xl border flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                          d
                            ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                            : 'bg-[#0a0c10] border-white/[0.04] text-white hover:bg-[#0e1117]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                            <FiFileText size={16} />
                          </div>
                          <div>
                            <span className="block text-[11.5px] font-bold">Download Subtitles (SRT)</span>
                            <span className={`block text-[9px] mt-0.5 opacity-60`}>SubRip timeline file for media players</span>
                          </div>
                        </div>
                        <FiDownload size={14} className="opacity-50" />
                      </div>

                      {/* WebVTT Download */}
                      <div
                        onClick={downloadWebVTT}
                        className={`p-4 rounded-2xl border flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer ${
                          d
                            ? 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                            : 'bg-[#0a0c10] border-white/[0.04] text-white hover:bg-[#0e1117]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                            <FiFileText size={16} />
                          </div>
                          <div>
                            <span className="block text-[11.5px] font-bold">Download Subtitles (VTT)</span>
                            <span className={`block text-[9px] mt-0.5 opacity-60`}>WebVTT format optimized for modern browsers</span>
                          </div>
                        </div>
                        <FiDownload size={14} className="opacity-50" />
                      </div>
                    </div>

                    <h3 className={`text-[10px] font-black uppercase tracking-wider opacity-85 pt-4 ${d ? 'text-gray-700' : 'text-gray-300'}`}>
                      Studio Upgrades & Mastering
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-55">
                      {/* AI Dubbing */}
                      <div className={`p-4 rounded-2xl border relative overflow-hidden select-none border-white/[0.04] bg-[#090a0d]`}>
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[7.5px] font-extrabold uppercase tracking-wider">
                          Coming Soon
                        </div>
                        <FiGlobe size={18} className="text-purple-400" />
                        <span className="block text-[11px] font-bold mt-2.5">Multilingual AI Dubbing</span>
                        <span className="block text-[9px] mt-1 opacity-60">Translate and synchronize voice tracks</span>
                      </div>

                      {/* Burn-In Captions */}
                      <div className={`p-4 rounded-2xl border relative overflow-hidden select-none border-white/[0.04] bg-[#090a0d]`}>
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[7.5px] font-extrabold uppercase tracking-wider">
                          Coming Soon
                        </div>
                        <FiTv size={18} className="text-purple-400" />
                        <span className="block text-[11px] font-bold mt-2.5">Burn-In Captions</span>
                        <span className="block text-[9px] mt-1 opacity-60">Hardcode subtitle overlay directly onto video</span>
                      </div>

                      {/* Equalizer/Mastering */}
                      <div className={`p-4 rounded-2xl border relative overflow-hidden select-none border-white/[0.04] bg-[#090a0d] sm:col-span-2`}>
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[7.5px] font-extrabold uppercase tracking-wider">
                          Coming Soon
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMusic size={18} className="text-purple-400" />
                          <div>
                            <span className="block text-[11px] font-bold">Dynamic Audio Mastering</span>
                            <span className="block text-[9px] mt-0.5 opacity-60">Auto gain control, equalizer preset filters, and loudness normalization</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

              </div>
              
            </div>
          )}
          <Footer />
        </div>
      </div>
    </div>
  )
}
