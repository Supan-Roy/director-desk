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
  FiGlobe,
  FiTv,
  FiXCircle,
  FiVolume2,
  FiVolumeX,
  FiMaximize2,
  FiChevronDown,
  FiCheck,
  FiZap,
  FiUsers
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
  const originalMovieUrlRef = useRef("")

  // Audio track playback state
  const [audioTrack, setAudioTrack] = useState("Original")
  const [dubMovieUrls, setDubMovieUrls] = useState({}) // { language: full_movie_url }

  // Generation status states
  const [generating, setGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState(0)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState("")

  // Video playback states
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [activeSubtitle, setActiveSubtitle] = useState(null)

  // Tabs state
  const [activeTab, setActiveTab] = useState('editor')

  // Edit states
  const [editedSubtitles, setEditedSubtitles] = useState([])
  const [saveStatus, setSaveStatus] = useState("idle") // idle, saving, success, error

  // Dubbing states
  const [dubLanguages, setDubLanguages] = useState([])
  const [dubLang, setDubLang] = useState("Spanish")
  const [dubOpen, setDubOpen] = useState(false)
  const dubRef = useRef(null)
  const [isDubbing, setIsDubbing] = useState(false)
  const [dubTaskId, setDubTaskId] = useState(null)
  const [dubStep, setDubStep] = useState(0)
  const [dubProgress, setDubProgress] = useState(0)
  const [dubTotalClips, setDubTotalClips] = useState(0)
  const [dubCurrentClip, setDubCurrentClip] = useState(0)
  const [dubStatus, setDubStatus] = useState(null) // processing, completed, failed
  const [dubError, setDubError] = useState("")
  const [dubMovieUrl, setDubMovieUrl] = useState("")
  const [dubAudioUrl, setDubAudioUrl] = useState("")
  const [dubSubsUrl, setDubSubsUrl] = useState("")
  // Track completed dubs per language
  const [completedDubs, setCompletedDubs] = useState({})

  // Smart Speaker Casting states
  const [detectedSpeakers, setDetectedSpeakers] = useState([])
  const [castingPlan, setCastingPlan] = useState(null)
  const [analyzingSpeakers, setAnalyzingSpeakers] = useState(false)
  const [castingPlanId, setCastingPlanId] = useState(null)
  const [smartDubLang, setSmartDubLang] = useState("Hindi")
  const [smartDubOpen, setSmartDubOpen] = useState(false)
  const smartDubRef = useRef(null)
  const [smartDubbing, setSmartDubbing] = useState(false)
  const [autoDubbing, setAutoDubbing] = useState(false)

  const videoRef = useRef(null)
  const pollingRef = useRef(null)
  const dubPollRef = useRef(null)

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
          const fullUrl = `${apiBaseUrl}${data.mastered_movie_url}`
          setMovieUrl(fullUrl)
          originalMovieUrlRef.current = fullUrl
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

  // Close language dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dubRef.current && !dubRef.current.contains(e.target)) {
        setDubOpen(false)
      }
      if (smartDubRef.current && !smartDubRef.current.contains(e.target)) {
        setSmartDubOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
        originalMovieUrlRef.current = fullUrl
      }
    }
  }, [hasValidProject, fetchSubtitles, fetchProject, location.state])

  // Monitor playback time to sync active subtitle overlays
  useEffect(() => {
    const active = editedSubtitles.find(s => currentTime >= s.start && currentTime <= s.end)
    setActiveSubtitle(active ? active.text : null)
  }, [currentTime, editedSubtitles])

  // Switch video source when audio track changes
  const prevTrackRef = useRef(audioTrack)
  useEffect(() => {
    if (!videoRef.current) return
    const vid = videoRef.current
    const newSrc = audioTrack === "Original" ? movieUrl : (dubMovieUrls[audioTrack] || movieUrl)
    if (newSrc && (!vid.src || audioTrack !== prevTrackRef.current)) {
      const wasPlaying = !vid.paused
      vid.src = newSrc
      vid.load()
      if (wasPlaying) {
        vid.oncanplaythrough = () => { vid.play().catch(() => {}); vid.oncanplaythrough = null }
      }
    }
    prevTrackRef.current = audioTrack
  }, [audioTrack, movieUrl, dubMovieUrls])

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

  const handleSeek = (e) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const t = frac * (videoRef.current.duration || 0)
    videoRef.current.currentTime = t
    setCurrentTime(t)
  }

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (videoRef.current) {
      videoRef.current.volume = v
      if (v === 0) setIsMuted(true)
      else setIsMuted(false)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    const next = !isMuted
    setIsMuted(next)
    videoRef.current.muted = next
  }

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement?.parentElement
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Listen for fullscreen change and keyboard events
  useEffect(() => {
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fsHandler)

    const keyHandler = (e) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        handlePlayPause()
      }
    }
    document.addEventListener('keydown', keyHandler)

    return () => {
      document.removeEventListener('fullscreenchange', fsHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [isPlaying])

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

  // Delete all subtitles
  const handleDeleteSubtitles = async () => {
    if (!hasValidProject) {
      setSubtitles([])
      setEditedSubtitles([])
      setStatistics(null)
      return
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/subtitles?project_id=${numericId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (res.ok) {
        setSubtitles([])
        setEditedSubtitles([])
        setStatistics(null)
      }
    } catch (e) {
      console.error("Failed to delete subtitles", e)
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

  const getExportBaseName = () => {
    if (project?.title) return project.title.replace(/[^a-zA-Z0-9_-]/g, '_')
    // Derive from movie URL filename
    const url = rawMovieUrlRef.current || movieUrl
    const name = url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'subtitles'
    return name.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  const downloadSRT = () => {
    const base = getExportBaseName()
    if (hasValidProject) {
      window.open(`${apiBaseUrl}/api/post-production/export/subtitles?project_id=${numericId}&format=srt`, '_blank')
    } else {
      const content = editedSubtitles.map((s, idx) => {
        return `${idx + 1}\n${formatTimeSRT(s.start)} --> ${formatTimeSRT(s.end)}\n${s.text}\n`
      }).join('\n')
      triggerClientDownload(content, `${base}.srt`, 'text/srt')
    }
  }

  const downloadWebVTT = () => {
    const base = getExportBaseName()
    if (hasValidProject) {
      window.open(`${apiBaseUrl}/api/post-production/export/subtitles?project_id=${numericId}&format=vtt`, '_blank')
    } else {
      const content = 'WEBVTT\n\n' + editedSubtitles.map((s, idx) => {
        return `${idx + 1}\n${formatTimeVTT(s.start)} --> ${formatTimeVTT(s.end)}\n${s.text}\n`
      }).join('\n')
      triggerClientDownload(content, `${base}.vtt`, 'text/vtt')
    }
  }

  // -------------------------------------------------------------------
  // Dubbing handlers
  // -------------------------------------------------------------------

  // Fetch supported dubbing languages on mount
  useEffect(() => {
    fetch(`${apiBaseUrl}/api/post-production/dubbing/languages`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.languages?.length) setDubLanguages(d.languages) })
      .catch(() => {})
  }, [])

  const pollDubStatus = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/status/${taskId}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error("Failed to fetch dubbing status")
      const data = await res.json()

      setDubStep(data.step ?? 0)
      setDubProgress(data.step_progress ?? 0)
      setDubTotalClips(data.total_clips ?? 0)
      setDubCurrentClip(data.current_clip ?? 0)

      if (data.status === "completed") {
        if (dubPollRef.current) clearInterval(dubPollRef.current)
        dubPollRef.current = null
        setDubStatus("completed")
        setIsDubbing(false)
        setSmartDubbing(false)
        setAutoDubbing(false)
        const completedUrl = data.movie_url ? `${apiBaseUrl}${data.movie_url}` : ""
        setDubMovieUrl(completedUrl)
        setDubAudioUrl(data.audio_url ? `${apiBaseUrl}${data.audio_url}` : "")
        setDubSubsUrl(data.translated_subtitles || [])
        // Store completed dub URL for player switcher
        if (completedUrl) {
          setDubMovieUrls(prev => ({ ...prev, [dubLang]: completedUrl }))
        }
        // Track this language as completed
        setCompletedDubs(prev => ({ ...prev, [dubLang]: true }))
      } else if (data.status === "failed") {
        if (dubPollRef.current) clearInterval(dubPollRef.current)
        dubPollRef.current = null
        setDubStatus("failed")
        setDubError(data.error || "Dubbing failed.")
        setIsDubbing(false)
        setSmartDubbing(false)
        setAutoDubbing(false)
      }
    } catch (err) {
      if (dubPollRef.current) clearInterval(dubPollRef.current)
      dubPollRef.current = null
      setDubError(err.message || "Failed to poll dubbing status.")
      setIsDubbing(false)
      setSmartDubbing(false)
      setAutoDubbing(false)
    }
  }, [dubLang])

  const handleGenerateDub = async () => {
    const movieSrc = hasValidProject && project?.mastered_movie_url
      ? project.mastered_movie_url
      : rawMovieUrlRef.current || movieUrl
    if (!movieSrc) return
    setIsDubbing(true)
    setDubError("")
    setDubStatus(null)
    setDubStep(0)
    setDubProgress(0)
    setDubMovieUrl("")
    setDubAudioUrl("")

    try {
      const body = {
        project_id: numericId || 0,
        language: dubLang,
        movie_url: movieSrc,
      }
      // For non-project videos, send subtitles inline
      if (!hasValidProject) {
        body.subtitles = editedSubtitles
      }

      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to start dubbing.")
      }
      const { task_id } = await res.json()
      setDubTaskId(task_id)

      dubPollRef.current = setInterval(() => {
        pollDubStatus(task_id)
      }, 1500)
    } catch (err) {
      setDubError(err.message || "An error occurred during dubbing.")
      setIsDubbing(false)
    }
  }

  const downloadDubbedMovie = () => {
    if (dubTaskId) {
      window.open(`${apiBaseUrl}/api/post-production/dubbing/download/${dubTaskId}`, '_blank')
    }
  }

  const downloadDubbedAudio = () => {
    if (dubTaskId) {
      window.open(`${apiBaseUrl}/api/post-production/dubbing/download/audio/${dubTaskId}`, '_blank')
    }
  }

  const downloadTranslatedSubs = () => {
    if (dubTaskId) {
      window.open(`${apiBaseUrl}/api/post-production/dubbing/download/subtitles/${dubTaskId}`, '_blank')
    }
  }

  // --- Smart Speaker Casting functions ---

  const analyzeSpeakers = async () => {
    const movieSrc = hasValidProject && project?.mastered_movie_url
      ? project.mastered_movie_url
      : rawMovieUrlRef.current || movieUrl
    if (!movieSrc) return

    const subs = hasValidProject ? subtitles : editedSubtitles
    if (!subs?.length) return

    setAnalyzingSpeakers(true)
    setDetectedSpeakers([])
    setCastingPlan(null)
    setCastingPlanId(null)

    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/analyze-speakers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ movie_url: movieSrc, subtitles: subs }),
      })
      if (!res.ok) throw new Error("Speaker analysis failed")
      const data = await res.json()
      setDetectedSpeakers(data.speakers || [])
    } catch (err) {
      console.error("Speaker analysis error:", err)
    } finally {
      setAnalyzingSpeakers(false)
    }
  }

  const createCastingPlan = async (language) => {
    if (!detectedSpeakers.length) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/casting-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ speakers: detectedSpeakers, target_language: language }),
      })
      if (!res.ok) throw new Error("Failed to create casting plan")
      const plan = await res.json()
      setCastingPlan(plan)
      setCastingPlanId(plan.plan_id)
    } catch (err) {
      console.error("Casting plan error:", err)
    }
  }

  const overrideSpeakerVoice = async (speakerId, voiceName) => {
    if (!castingPlanId) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/casting-plan/${castingPlanId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ speaker_id: speakerId, voice_name: voiceName }),
      })
      if (!res.ok) throw new Error("Failed to override voice")
      const plan = await res.json()
      setCastingPlan(plan)
    } catch (err) {
      console.error("Voice override error:", err)
    }
  }

  const handleAutoDub = async () => {
    const movieSrc = hasValidProject && project?.mastered_movie_url
      ? project.mastered_movie_url
      : rawMovieUrlRef.current || movieUrl
    if (!movieSrc) return

    setAutoDubbing(true)
    setDubError("")

    try {
      const body = {
        project_id: numericId || 0,
        target_language: dubLang,
        movie_url: movieSrc,
      }
      // Don't send subtitles — backend auto-generates them if missing

      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to start auto dubbing.")
      }
      const { task_id } = await res.json()
      setDubTaskId(task_id)
      setIsDubbing(true)

      dubPollRef.current = setInterval(() => {
        pollDubStatus(task_id)
      }, 1500)
    } catch (err) {
      setDubError(err.message || "An error occurred during auto dubbing.")
      setAutoDubbing(false)
    }
  }

  const handleSmartDub = async () => {
    if (!castingPlanId) return
    const movieSrc = hasValidProject && project?.mastered_movie_url
      ? project.mastered_movie_url
      : rawMovieUrlRef.current || movieUrl
    if (!movieSrc) return

    setSmartDubbing(true)
    setDubError("")

    try {
      const body = {
        project_id: numericId || 0,
        target_language: smartDubLang,
        casting_plan_id: castingPlanId,
        movie_url: movieSrc,
      }
      if (!hasValidProject) {
        body.subtitles = editedSubtitles
      }

      const res = await fetch(`${apiBaseUrl}/api/post-production/dubbing/smart-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || "Failed to start smart dubbing.")
      }
      const { task_id } = await res.json()
      setDubTaskId(task_id)
      setIsDubbing(true)

      dubPollRef.current = setInterval(() => {
        pollDubStatus(task_id)
      }, 1500)
    } catch (err) {
      setDubError(err.message || "An error occurred during smart dubbing.")
      setSmartDubbing(false)
    }
  }

  // Cleanup dubbing poll on unmount
  useEffect(() => {
    return () => {
      if (dubPollRef.current) clearInterval(dubPollRef.current)
    }
  }, [])

  const dubSteps = [
    { title: "Loading Subtitles", desc: "Reading subtitle timeline from project..." },
    { title: "Translating Dialogue", desc: "Translating subtitle text using NLLB-200..." },
    { title: "Generating Voices", desc: "Synthesizing speech for each subtitle block..." },
    { title: "Assembling Audio", desc: "Concatenating clips and mixing with video..." },
    { title: "Rendering Movie", desc: "Encoding final dubbed movie..." },
  ]

  const bgt = (light, dark) => d ? light : dark
  const txt = (light, dark) => d ? light : dark

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <div className={`flex-1 flex flex-col min-w-0 ${bgt('bg-[#f4f4f7]', 'bg-[#06070a]')}`}>
        
        {/* Header */}
        <header className={`shrink-0 flex items-center justify-between px-6 py-4 border-b ${
          bgt('border-gray-200 bg-white', 'border-white/[0.04] bg-[#090b0f]')
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(id ? `/projects/${id}` : '/editor')}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                bgt('hover:bg-gray-100 text-gray-600', 'hover:bg-white/5 text-gray-400')
              }`}
            >
              <FiArrowLeft size={16} />
            </button>
            <div>
              <h1 className={`text-sm font-black uppercase tracking-wider ${bgt('text-gray-900', 'text-white')}`}>
                Post Production Studio
              </h1>
              {project && (
                <p className={`text-[10px] font-mono mt-0.5 ${bgt('text-gray-500', 'text-gray-400')}`}>
                  {project.title} · Post-Production Suite
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export Master Movie — white button matching Editor "Done" style */}
            <button
              onClick={downloadMovie}
              className={`bg-gradient-to-b from-[#ffffff] to-[#d6d6db] text-black font-extrabold uppercase tracking-wider rounded-sm flex items-center gap-2 cursor-pointer transition-all border border-[#ffffff] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.4)] active:translate-y-[0.5px] text-[9.5px] px-4 py-1.5`}
            >
              <FiVideo size={12} />
              <span>Export Master Movie</span>
            </button>
            {hasValidProject && (
              <button
                onClick={() => navigate(`/projects/${id}/release`)}
                className={`px-4 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all border ${
                  bgt(
                    'border-gray-300 text-gray-700 hover:bg-gray-100',
                    'border-white/[0.12] text-gray-300 hover:bg-white/5'
                  )
                }`}
              >
                Release Studio
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <FiLoader size={24} className="animate-spin text-gray-400" />
            </div>
          ) : !movieUrl ? (
            <div className="flex flex-col items-center justify-center flex-1 max-w-md mx-auto text-center gap-4 p-6">
              <FiAlertCircle size={48} className="text-amber-500 opacity-80" />
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider ${bgt('text-gray-800', 'text-white')}`}>
                  Master Movie Missing
                </h3>
                <p className={`text-[11.5px] mt-2 leading-relaxed ${bgt('text-gray-500', 'text-gray-400')}`}>
                  You must complete rendering your edit inside the Studio Editor before adding final finishing touches or generating master subtitles.
                </p>
              </div>
              <button
                onClick={() => navigate(id ? `/projects/${id}/editor` : '/editor')}
                className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                  bgt(
                    'bg-black text-white hover:bg-gray-800',
                    'bg-white text-black hover:bg-gray-200'
                  )
                }`}
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
                  bgt('bg-black border-gray-200', 'bg-black border-white/[0.06]')
                }`}>
                  <div className="aspect-video relative flex items-center justify-center">
                    <video
                      ref={videoRef}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full object-contain"
                    />

                    {/* Subtitle Overlay */}
                    {activeSubtitle && (
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[85%] text-center pointer-events-none select-none z-10">
                        <span className="px-4 py-2 rounded-lg bg-black/85 border border-white/10 text-white font-semibold text-[13px] md:text-[15px] leading-relaxed shadow-xl backdrop-blur-md">
                          {activeSubtitle}
                        </span>
                      </div>
                    )}

                    {/* Control Bar Overlay — click anywhere on video to play/pause */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end"
                      onClick={handlePlayPause}
                    >
                      {/* Seekbar track */}
                      <div
                        className="w-full h-1.5 bg-white/10 cursor-pointer group/seek relative"
                        onClick={(e) => { e.stopPropagation(); handleSeek(e) }}
                      >
                        <div
                          className="h-full bg-white transition-all duration-75"
                          style={{
                            width: `${videoRef.current?.duration ? (currentTime / videoRef.current.duration) * 100 : 0}%`,
                          }}
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/seek:opacity-100 transition-opacity shadow"
                          style={{
                            left: `${videoRef.current?.duration ? (currentTime / videoRef.current.duration) * 100 : 0}%`,
                            marginLeft: '-6px',
                          }}
                        />
                      </div>

                      <div
                        className="flex items-center justify-between px-4 pb-3 pt-2 text-white text-[11px] gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Left: Play/Pause + time */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); handlePlayPause() }}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                          >
                            {isPlaying ? <FiPause size={14} /> : <FiPlay size={14} />}
                          </button>
                          <span className="font-mono text-[10px] opacity-80">
                            {currentTime.toFixed(3)}s / {videoRef.current?.duration ? videoRef.current.duration.toFixed(3) : "0.000"}s
                          </span>
                        </div>

                        {/* Right: Volume + Audio Track + Fullscreen */}
                        <div className="flex items-center gap-3">
                          {/* Audio track selector */}
                          {(Object.keys(dubMovieUrls).length > 0) && (
                            <div className="relative">
                              <select
                                value={audioTrack}
                                onChange={(e) => { e.stopPropagation(); setAudioTrack(e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                                className="appearance-none bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 pr-6 border border-white/10 cursor-pointer transition-colors"
                              >
                                <option value="Original" className="bg-gray-900 text-white">Original</option>
                                {Object.keys(dubMovieUrls).map(lang => (
                                  <option key={lang} value={lang} className="bg-gray-900 text-white">{lang}</option>
                                ))}
                              </select>
                              <FiChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" />
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 group/vol">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMute() }}
                              className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                            >
                              {isMuted || volume === 0 ? (
                                <FiVolumeX size={14} />
                              ) : (
                                <FiVolume2 size={14} />
                              )}
                            </button>
                            <div className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-16 h-1 accent-white cursor-pointer"
                              />
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleFullscreen() }}
                            className="p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                          >
                            {isFullscreen ? (
                              <FiMaximize2 size={14} className="rotate-180" />
                            ) : (
                              <FiMaximize2 size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtitle Timeline Statistics Panel */}
                {statistics && statistics.total_subtitles > 0 && (
                  <div className={`rounded-2xl border p-5 ${
                    bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                  }`}>
                    <h3 className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-2 mb-4 ${
                      bgt('text-gray-700', 'text-gray-300')
                    }`}>
                      <FiBarChart2 size={14} /> Timeline Analytics
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className={`p-3.5 rounded-xl ${bgt('bg-gray-50', 'bg-[#101319]')}`}>
                        <span className={`block text-[9px] font-bold uppercase tracking-wider ${bgt('text-gray-400', 'text-gray-500')}`}>Total Segments</span>
                        <span className={`block text-lg font-black mt-1 font-mono ${bgt('text-gray-900', 'text-white')}`}>{statistics.total_subtitles}</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${bgt('bg-gray-50', 'bg-[#101319]')}`}>
                        <span className={`block text-[9px] font-bold uppercase tracking-wider ${bgt('text-gray-400', 'text-gray-500')}`}>Avg Segment</span>
                        <span className={`block text-lg font-black mt-1 font-mono ${bgt('text-gray-900', 'text-white')}`}>{statistics.average_duration}s</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${bgt('bg-gray-50', 'bg-[#101319]')}`}>
                        <span className={`block text-[9px] font-bold uppercase tracking-wider ${bgt('text-gray-400', 'text-gray-500')}`}>Total Words</span>
                        <span className={`block text-lg font-black mt-1 font-mono ${bgt('text-gray-900', 'text-white')}`}>{statistics.total_words}</span>
                      </div>
                      <div className={`p-3.5 rounded-xl ${bgt('bg-gray-50', 'bg-[#101319]')}`}>
                        <span className={`block text-[9px] font-bold uppercase tracking-wider ${bgt('text-gray-400', 'text-gray-500')}`}>CPS (Speed)</span>
                        <span className={`block text-lg font-black mt-1 font-mono ${bgt('text-gray-900', 'text-white')}`}>{statistics.characters_per_second}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column - Controls & Tabs (5 columns) */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Mode Select Tabs */}
                <div className={`flex border-b ${bgt('border-gray-200', 'border-white/[0.04]')}`}>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className={`flex-1 pb-3 text-[10px] font-extrabold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                      activeTab === 'editor'
                        ? bgt('border-black text-black', 'border-white text-white')
                        : bgt('border-transparent text-gray-400 hover:text-gray-700', 'border-transparent text-gray-500 hover:text-gray-300')
                    }`}
                  >
                    Subtitle Editor
                  </button>
                  <button
                    onClick={() => setActiveTab('dubbing')}
                    className={`flex-1 pb-3 text-[10px] font-extrabold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
                      activeTab === 'dubbing'
                        ? bgt('border-black text-black', 'border-white text-white')
                        : bgt('border-transparent text-gray-400 hover:text-gray-700', 'border-transparent text-gray-500 hover:text-gray-300')
                    }`}
                  >
                    Multilingual Dubbing
                  </button>
                </div>

                {/* Tab Content 1: Subtitle Editor */}
                {activeTab === 'editor' && (
                  <div className="space-y-4">
                    {editedSubtitles.length === 0 && !generating ? (
                      /* CTA to Generate Subtitles */
                      <div className={`rounded-2xl border p-8 text-center space-y-4 ${
                        bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                          bgt('bg-gray-100 text-gray-600', 'bg-white/5 text-gray-400')
                        }`}>
                          <FiFileText size={20} />
                        </div>
                        <div>
                          <h4 className={`text-[12px] font-bold uppercase tracking-wider ${bgt('text-gray-800', 'text-white')}`}>
                            Auto-Generate Master Subtitles
                          </h4>
                          <p className={`text-[10.5px] mt-1.5 leading-relaxed ${bgt('text-gray-500', 'text-gray-400')}`}>
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
                              className={`w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                                bgt(
                                  'bg-black text-white hover:bg-gray-800 shadow-black/10',
                                  'bg-white text-black hover:bg-gray-200 shadow-white/5'
                                )
                              }`}
                            >
                              Generate Subtitles
                            </button>
                            <button
                              onClick={handleAddSubtitle}
                              className={`w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                                bgt(
                                  'border-gray-300 text-gray-700 hover:bg-gray-50',
                                  'border-white/[0.12] text-gray-300 hover:bg-white/5'
                                )
                              }`}
                            >
                              Add Segment Manually
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleGenerateSubtitles}
                            className={`w-full py-2.5 rounded-xl text-[10.5px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                              bgt(
                                'bg-black text-white hover:bg-gray-800 shadow-black/10',
                                'bg-white text-black hover:bg-gray-200 shadow-white/5'
                              )
                            }`}
                          >
                            Generate Subtitles
                          </button>
                        )}
                      </div>
                    ) : generating ? (
                      /* Transcription step progress */
                      <div className={`rounded-2xl border p-8 space-y-6 ${
                        bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                      }`}>
                        <div className="flex items-center gap-3">
                          <FiLoader className="animate-spin text-white" size={18} />
                          <h4 className={`text-[12px] font-bold uppercase tracking-wider ${bgt('text-gray-800', 'text-white')}`}>
                            Transcribing Movie...
                          </h4>
                        </div>
                        
                        <div className="space-y-4">
                          {steps.map((step, idx) => {
                            const isCurrent = idx === generationStep
                            const isPast = idx < generationStep
                            const progress = isCurrent ? generationProgress : isPast ? 100 : 0
                            return (
                              <div key={idx} className={`flex items-start gap-3 transition-all duration-500 ${
                                isCurrent ? 'opacity-100' : isPast ? 'opacity-55' : 'opacity-25'
                              }`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[9px] font-bold transition-all duration-300 ${
                                  isPast
                                    ? bgt('bg-gray-800 text-white', 'bg-white text-black')
                                    : isCurrent
                                      ? bgt('bg-gray-200 text-gray-800 border border-gray-400', 'bg-white/10 text-white border border-white/20')
                                      : bgt('bg-gray-100 text-gray-400 border border-gray-200', 'bg-white/5 text-gray-500 border border-white/5')
                                }`}>
                                  {isPast ? <FiCheckCircle size={10} /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`block text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
                                    isCurrent ? (bgt('text-gray-900', 'text-white')) : (bgt('text-gray-700', 'text-gray-300'))
                                  }`}>{step.title}</span>
                                  {isCurrent && (
                                    <>
                                      <span className={`block text-[9.5px] mt-0.5 ${bgt('text-gray-500', 'text-gray-400')}`}>
                                        {step.desc}
                                      </span>
                                      <div className={`mt-2 h-1 rounded-full overflow-hidden ${bgt('bg-gray-200', 'bg-white/5')}`}>
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                                            bgt('bg-gray-800', 'bg-white')
                                          }`}
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
                        <div className={`rounded-2xl border p-5 ${
                          bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className={`text-[10px] font-black uppercase tracking-wider ${bgt('text-gray-700', 'text-gray-300')}`}>
                              Timeline Segments
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleAddSubtitle}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9.5px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                                  bgt(
                                    'border-gray-300 text-gray-700 hover:bg-gray-50',
                                    'border-white/10 text-gray-300 hover:bg-white/5'
                                  )
                                }`}
                              >
                                <FiPlus size={10} /> Add
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
                                        : bgt('bg-gray-800 hover:bg-gray-700', 'bg-white text-black hover:bg-gray-200')
                                  }`}
                                >
                                  {saveStatus === "saving" ? (
                                    <FiLoader className="animate-spin" size={10} />
                                  ) : saveStatus === "success" ? (
                                    <FiCheckCircle size={10} />
                                  ) : (
                                    <FiSave size={10} />
                                  )}
                                  {saveStatus === "saving" ? "Saving..." : saveStatus === "success" ? "Saved!" : "Save"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Download & Delete bar */}
                          <div className={`flex items-center gap-2 mb-4 p-2.5 rounded-xl ${
                            bgt('bg-gray-50', 'bg-[#101319]')
                          }`}>
                            <span className={`text-[8.5px] font-bold uppercase tracking-wider mr-1 ${bgt('text-gray-400', 'text-gray-500')}`}>Export:</span>
                            <button
                              onClick={downloadSRT}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                                bgt(
                                  'bg-black text-white border border-gray-700 hover:bg-gray-800',
                                  'bg-white text-black border border-gray-300 hover:bg-gray-100'
                                )
                              }`}
                            >
                              <FiDownload size={9} /> SRT
                            </button>
                            <button
                              onClick={downloadWebVTT}
                              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                                bgt(
                                  'bg-black text-white border border-gray-700 hover:bg-gray-800',
                                  'bg-white text-black border border-gray-300 hover:bg-gray-100'
                                )
                              }`}
                            >
                              <FiDownload size={9} /> VTT
                            </button>
                            <div className="flex-1" />
                            <button
                              onClick={handleDeleteSubtitles}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all bg-red-600 text-white hover:bg-red-500"
                            >
                              <FiTrash2 size={9} /> Delete
                            </button>
                          </div>

                          {/* Timeline Edit List */}
                          <div className={`max-h-[400px] overflow-y-auto space-y-2 ${bgt('', '')}`} style={{ scrollbarWidth: 'thin' }}>
                            {editedSubtitles.map((sub, index) => (
                              <div
                                key={sub.id}
                                className={`rounded-xl border p-3 transition-all duration-150 ${
                                  bgt(
                                    'border-gray-100 hover:border-gray-200 bg-white',
                                    'border-white/[0.03] hover:border-white/[0.08] bg-[#0a0c10]'
                                  )
                                }`}
                              >
                                {/* Time row */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <button
                                    onClick={() => seekTo(sub.start)}
                                    className={`text-[8.5px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border cursor-pointer transition-all ${
                                      bgt(
                                        'border-gray-200 text-gray-500 hover:bg-gray-100',
                                        'border-white/[0.06] text-gray-400 hover:bg-white/5'
                                      )
                                    }`}
                                  >
                                    Seek {sub.start.toFixed(0)}s
                                  </button>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 text-[9px] font-mono">
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={sub.start}
                                        onChange={(e) => handleSubtitleTimeChange(index, 'start', e.target.value)}
                                        className={`w-16 text-center rounded-md border p-1 text-[9.5px] ${
                                          bgt('bg-gray-50 border-gray-200 text-gray-800', 'bg-[#141820] border-white/5 text-gray-200')
                                        }`}
                                      />
                                      <span className={bgt('text-gray-300', 'text-gray-600')}>→</span>
                                      <input
                                        type="number"
                                        step="0.001"
                                        value={sub.end}
                                        onChange={(e) => handleSubtitleTimeChange(index, 'end', e.target.value)}
                                        className={`w-16 text-center rounded-md border p-1 text-[9.5px] ${
                                          bgt('bg-gray-50 border-gray-200 text-gray-800', 'bg-[#141820] border-white/5 text-gray-200')
                                        }`}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleDeleteSubtitle(index)}
                                      className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                        bgt(
                                          'text-gray-400 hover:text-red-500 hover:bg-red-50',
                                          'text-gray-500 hover:text-red-400 hover:bg-red-500/10'
                                        )
                                      }`}
                                    >
                                      <FiXCircle size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Text area */}
                                <textarea
                                  value={sub.text}
                                  onChange={(e) => handleSubtitleTextChange(index, e.target.value)}
                                  className={`w-full text-[11px] leading-relaxed rounded-lg border p-2.5 resize-none focus:outline-none focus:ring-1 transition-all ${
                                    bgt(
                                      'bg-gray-50 border-gray-100 text-gray-800 focus:border-gray-300 focus:ring-gray-300',
                                      'bg-[#101319] border-white/[0.04] text-gray-200 focus:border-white/10 focus:ring-white/10'
                                    )
                                  }`}
                                  rows={2}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Burn-In Captions Section */}
                        <div className={`rounded-2xl border p-5 ${
                          bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              bgt('bg-gray-100 text-gray-600', 'bg-white/5 text-gray-400')
                            }`}>
                              <FiTv size={16} />
                            </div>
                            <div className="flex-1">
                              <h4 className={`text-[11px] font-bold ${bgt('text-gray-800', 'text-white')}`}>Burn-In Captions</h4>
                              <p className={`text-[9.5px] mt-0.5 ${bgt('text-gray-500', 'text-gray-400')}`}>
                                Hardcode subtitle overlay directly onto video master
                              </p>
                            </div>
                            <button
                              className={`px-4 py-2 rounded-lg text-[9.5px] font-bold uppercase tracking-wider border cursor-pointer transition-all opacity-55 ${
                                bgt(
                                  'border-gray-300 text-gray-600 hover:bg-gray-50',
                                  'border-white/[0.08] text-gray-400 hover:bg-white/5'
                                )
                              }`}
                              disabled
                            >
                              Coming Soon
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab Content 2: Multilingual Dubbing */}
                {activeTab === 'dubbing' && (
                  <div className="space-y-4">
                    {/* Global Distribution — Speaker-Aware Dubbing with Smart Speaker Casting */}
                    <div className={`rounded-2xl border p-5 ${
                      bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                    }`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          bgt('bg-gray-100 text-gray-600', 'bg-white/5 text-gray-400')
                        }`}>
                          <FiGlobe size={16} />
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-[11px] font-bold uppercase tracking-wider ${bgt('text-gray-800', 'text-white')}`}>
                            Global Distribution
                          </h4>
                          <p className={`text-[9.5px] mt-0.5 ${bgt('text-gray-500', 'text-gray-400')}`}>
                            Detect speakers and assign gender-appropriate localized voices for dubbed versions
                          </p>
                        </div>
                      </div>

                      {/* Language dropdown */}
                      <div className="relative" ref={dubRef}>
                        <button
                          onClick={() => setDubOpen(!dubOpen)}
                          disabled={isDubbing}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                            bgt(
                              'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-40',
                              'border-white/[0.08] bg-[#101319] text-gray-200 hover:bg-[#161a22] disabled:opacity-40'
                            )
                          }`}
                        >
                          <span>{dubLang}</span>
                          <FiChevronDown size={14} className={`transition-transform ${dubOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {dubOpen && (
                          <div className={`absolute z-20 mt-1 w-full rounded-xl border shadow-xl overflow-hidden max-h-[240px] overflow-y-auto ${
                            bgt('bg-white border-gray-200', 'bg-[#101319] border-white/[0.06]')
                          }`}>
                            {dubLanguages.map(lang => (
                              <button
                                key={lang}
                                onClick={() => { setDubLang(lang); setDubOpen(false); setCastingPlan(null); }}
                                className={`w-full text-left px-4 py-2.5 text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-between ${
                                  dubLang === lang
                                    ? bgt('bg-gray-100 text-gray-900', 'bg-white/10 text-white')
                                    : bgt('text-gray-700 hover:bg-gray-50', 'text-gray-400 hover:bg-white/5')
                                }`}
                              >
                                {lang}
                                {(completedDubs[lang] || (dubStatus === 'completed' && dubLang === lang)) && (
                                  <FiCheck size={12} className="text-emerald-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Detected Speakers — shown after analysis */}
                      {detectedSpeakers.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-[8.5px] font-bold uppercase tracking-wider ${bgt('text-gray-500', 'text-gray-400')}`}>
                              Detected Speakers
                            </span>
                          </div>
                          {detectedSpeakers.map((sp) => (
                            <div key={sp.speaker_id} className={`rounded-xl border p-3 flex items-center gap-3 ${
                              bgt('border-gray-100', 'border-white/[0.04]')
                            }`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black uppercase ${
                                sp.gender === 'male'
                                  ? bgt('bg-blue-50 text-blue-600', 'bg-blue-500/10 text-blue-400')
                                  : sp.gender === 'female'
                                    ? bgt('bg-pink-50 text-pink-600', 'bg-pink-500/10 text-pink-400')
                                    : bgt('bg-gray-100 text-gray-500', 'bg-white/5 text-gray-400')
                              }`}>
                                {sp.speaker_id + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-black uppercase tracking-wider ${bgt('text-gray-700', 'text-gray-300')}`}>
                                    Speaker {sp.speaker_id + 1}
                                  </span>
                                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                    sp.gender === 'male'
                                      ? 'bg-blue-100 text-blue-700'
                                      : sp.gender === 'female'
                                        ? 'bg-pink-100 text-pink-700'
                                        : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {sp.gender} / {sp.age_group}
                                  </span>
                                  {sp.confidence > 0 && (
                                    <span className={`text-[7.5px] font-mono ${bgt('text-gray-400', 'text-gray-500')}`}>
                                      {(sp.confidence * 100).toFixed(0)}%
                                    </span>
                                  )}
                                  <span className={`text-[8px] ${bgt('text-gray-400', 'text-gray-500')}`}>
                                    {sp.subtitle_count} lines
                                  </span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span className={`text-[8px] font-bold uppercase tracking-wider ${bgt('text-gray-400', 'text-gray-500')}`}>
                                    Voice:
                                  </span>
                                  <div className="relative flex-1 max-w-[220px]">
                                    {castingPlan && castingPlan.speakers ? (
                                      <select
                                        value={castingPlan.speakers.find(s => s.speaker_id === sp.speaker_id)?.voice || ''}
                                        onChange={(e) => overrideSpeakerVoice(sp.speaker_id, e.target.value)}
                                        className={`w-full text-[9px] rounded-lg border px-2 py-1 font-medium cursor-pointer ${
                                          bgt('bg-gray-50 border-gray-200 text-gray-800', 'bg-[#141820] border-white/5 text-gray-200')
                                        }`}
                                      >
                                        {(castingPlan.voice_options?.[sp.speaker_id] || []).map((v) => (
                                          <option key={v.name} value={v.name}>{v.label}</option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span className={`text-[9px] italic ${bgt('text-gray-400', 'text-gray-500')}`}>
                                        Create plan to see options
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Auto Dub — one click */}
                      <button
                        onClick={handleAutoDub}
                        disabled={autoDubbing || isDubbing || !movieUrl || (hasValidProject && !project?.mastered_movie_url)}
                        className={`w-full py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-30 mt-4 ${
                          bgt(
                            'bg-black text-white hover:bg-gray-800 shadow-black/10',
                            'bg-white text-black hover:bg-gray-200 shadow-white/5'
                          )
                        }`}
                      >
                        {autoDubbing ? (
                          <span className="flex items-center justify-center gap-2">
                            <FiLoader className="animate-spin" size={14} />
                            Auto Dubbing...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <FiZap size={16} />
                            Auto Dub — {dubLang}
                          </span>
                        )}
                      </button>

                      {/* Advanced: Manual speaker analysis */}
                      <details className="mt-3">
                        <summary className={`text-[9px] font-bold uppercase tracking-wider cursor-pointer ${bgt('text-gray-500 hover:text-gray-700', 'text-gray-500 hover:text-gray-300')}`}>
                          Advanced: Manual voice casting
                        </summary>
                        <div className="mt-3 flex items-center gap-3">
                          {detectedSpeakers.length > 0 && !castingPlan ? (
                            <button
                              onClick={() => createCastingPlan(dubLang)}
                              className={`w-full py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border ${
                                bgt('border-gray-300 bg-white text-gray-700 hover:bg-gray-50', 'border-white/[0.08] bg-transparent text-gray-300 hover:bg-white/5')
                              }`}
                            >
                              Create Casting Plan
                            </button>
                          ) : castingPlan ? (
                            <>
                              <button
                                onClick={() => setCastingPlan(null)}
                                className={`px-3 py-2 rounded-xl text-[8px] font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                                  bgt('border-gray-300 text-gray-700 hover:bg-gray-50', 'border-white/[0.08] text-gray-300 hover:bg-white/5')
                                }`}
                              >
                                Reset
                              </button>
                              <button
                                onClick={handleSmartDub}
                                disabled={isDubbing}
                                className={`px-4 py-2 rounded-xl text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-lg disabled:opacity-30 ${
                                  bgt('bg-black text-white hover:bg-gray-800', 'bg-white text-black hover:bg-gray-200')
                                }`}
                              >
                                {isDubbing ? (
                                  <span className="flex items-center gap-1.5">
                                    <FiLoader className="animate-spin" size={10} />
                                    Dubbing...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <FiVolume2 size={12} />
                                    Generate Smart Dub
                                  </span>
                                )}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={analyzeSpeakers}
                              disabled={analyzingSpeakers || isDubbing || !movieUrl || (!hasValidProject && editedSubtitles.length === 0) || (hasValidProject && (!project?.mastered_movie_url || !subtitles?.length))}
                              className={`w-full py-2 rounded-xl text-[8px] font-extrabold uppercase tracking-wider transition-all cursor-pointer border disabled:opacity-30 ${
                                bgt('border-gray-300 bg-white text-gray-700 hover:bg-gray-50', 'border-white/[0.08] bg-transparent text-gray-300 hover:bg-white/5')
                              }`}
                            >
                              {analyzingSpeakers ? (
                                <span className="flex items-center justify-center gap-2">
                                  <FiLoader className="animate-spin" size={11} />
                                  Analyzing Speakers...
                                </span>
                              ) : (
                                <span className="flex items-center justify-center gap-2">
                                  <FiUsers size={11} />
                                  Analyze Speakers
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </details>

                      {dubError && (
                        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] flex items-start gap-2">
                          <FiAlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>{dubError}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Display */}
                    {isDubbing && (
                      <div className={`rounded-2xl border p-5 space-y-4 ${
                        bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                      }`}>
                        <div className="flex items-center gap-3">
                          <FiLoader className="animate-spin text-white" size={16} />
                          <h4 className={`text-[11px] font-bold uppercase tracking-wider ${bgt('text-gray-800', 'text-white')}`}>
                            Dubbing to {dubLang}...
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {dubSteps.map((step, idx) => {
                            const isCurrent = idx === dubStep
                            const isPast = idx < dubStep
                            const progress = isCurrent ? dubProgress : isPast ? 100 : 0
                            return (
                              <div key={idx} className={`flex items-start gap-3 transition-all duration-500 ${
                                isCurrent ? 'opacity-100' : isPast ? 'opacity-55' : 'opacity-25'
                              }`}>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 text-[9px] font-bold transition-all duration-300 ${
                                  isPast
                                    ? bgt('bg-gray-800 text-white', 'bg-white text-black')
                                    : isCurrent
                                      ? bgt('bg-gray-200 text-gray-800 border border-gray-400', 'bg-white/10 text-white border border-white/20')
                                      : bgt('bg-gray-100 text-gray-400 border border-gray-200', 'bg-white/5 text-gray-500 border border-white/5')
                                }`}>
                                  {isPast ? <FiCheckCircle size={10} /> : idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`block text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                    isCurrent ? (bgt('text-gray-900', 'text-white')) : (bgt('text-gray-700', 'text-gray-300'))
                                  }`}>{step.title}</span>
                                  {isCurrent && (
                                    <>
                                      <span className={`block text-[9px] mt-0.5 ${bgt('text-gray-500', 'text-gray-400')}`}>
                                        {step.desc}
                                        {dubStep === 2 && dubTotalClips > 0 && ` — Clip ${dubCurrentClip} / ${dubTotalClips}`}
                                      </span>
                                      <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${bgt('bg-gray-200', 'bg-white/5')}`}>
                                        <div
                                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                                            bgt('bg-gray-800', 'bg-white')
                                          }`}
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
                    )}

                    {/* Completed — preview + export */}
                    {dubStatus === 'completed' && dubMovieUrl && (
                      <>
                        {/* Preview card */}
                        <div className={`rounded-2xl border p-5 ${
                          bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                        }`}>
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                              bgt('bg-emerald-100 text-emerald-600', 'bg-emerald-500/10 text-emerald-400')
                            }`}>
                              <FiCheckCircle size={16} />
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-bold ${bgt('text-gray-800', 'text-white')}`}>
                                {dubLang} Dub Complete
                              </h4>
                              <p className={`text-[9.5px] ${bgt('text-gray-500', 'text-gray-400')}`}>
                                Dubbed movie is ready for preview and download
                              </p>
                            </div>
                          </div>

                          {/* Audio preview */}
                          {dubAudioUrl && (
                            <div className={`rounded-xl overflow-hidden border mb-4 ${
                              bgt('border-gray-200', 'border-white/[0.04]')
                            }`}>
                              <div className={`flex items-center gap-3 px-4 py-3 ${bgt('bg-gray-50', 'bg-[#0a0c10]')}`}>
                                <FiVolume2 size={16} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <audio
                                    src={dubAudioUrl}
                                    controls
                                    className="w-full h-8"
                                    style={{ outline: 'none' }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Download buttons */}
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              onClick={downloadDubbedMovie}
                              className={`flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                                bgt(
                                  'bg-black text-white border-black hover:bg-gray-800',
                                  'bg-white text-black border-white hover:bg-gray-200'
                                )
                              }`}
                            >
                              <FiDownload size={12} /> Download Dubbed Movie ({dubLang})
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={downloadDubbedAudio}
                                className={`flex items-center gap-1.5 justify-center px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                                  bgt(
                                    'border-gray-300 text-gray-700 hover:bg-gray-50',
                                    'border-white/[0.08] text-gray-300 hover:bg-white/5'
                                  )
                                }`}
                              >
                                <FiDownload size={10} /> Audio
                              </button>
                              <button
                                onClick={downloadTranslatedSubs}
                                className={`flex items-center gap-1.5 justify-center px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                                  bgt(
                                    'border-gray-300 text-gray-700 hover:bg-gray-50',
                                    'border-white/[0.08] text-gray-300 hover:bg-white/5'
                                  )
                                }`}
                              >
                                <FiFileText size={10} /> Subtitles
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Completed dubs per language */}
                        {Object.keys(completedDubs).length > 0 && (
                          <div className={`rounded-2xl border p-4 ${
                            bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')
                          }`}>
                            <h4 className={`text-[9px] font-bold uppercase tracking-wider mb-3 ${bgt('text-gray-500', 'text-gray-500')}`}>
                              Completed Languages
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(completedDubs).map(([lang, done]) => done && (
                                <span key={lang} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                  bgt('bg-emerald-50 text-emerald-700', 'bg-emerald-500/10 text-emerald-400')
                                }`}>
                                  <FiCheck size={9} /> {lang}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Initial state — nothing generated yet and not currently processing */}
                    {!isDubbing && dubStatus !== 'completed' && (
                      <div className={`rounded-2xl border p-5 ${bgt('bg-white border-gray-200', 'bg-[#0a0c10] border-white/[0.04]')}`}>
                        <div className="grid grid-cols-2 gap-3">
                          {dubLanguages.filter(l => l !== dubLang).slice(0, 4).map(lang => (
                            <div key={lang} className={`p-3 rounded-xl border text-center ${
                              bgt('border-gray-100 bg-gray-50', 'border-white/[0.03] bg-[#0a0c10]')
                            }`}>
                              <span className={`block text-[10px] font-bold ${bgt('text-gray-500', 'text-gray-500')}`}>{lang}</span>
                            </div>
                          ))}
                        </div>
                        <p className={`text-[9.5px] text-center mt-4 ${bgt('text-gray-400', 'text-gray-500')}`}>
                          Select a language above and generate your first dub
                        </p>
                      </div>
                    )}
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
