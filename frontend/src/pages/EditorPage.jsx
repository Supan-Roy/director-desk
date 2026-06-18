import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiGrid,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiVolume2,
  FiVolumeX,
  FiZoomIn,
  FiZoomOut,
  FiUploadCloud,
  FiTrash2,
  FiCopy,
  FiScissors,
  FiCheckCircle,
  FiDownload,
  FiAlertCircle,
  FiPlus,
  FiSliders,
  FiType,
  FiImage,
  FiLoader,
  FiDisc,
  FiSettings,
  FiMaximize,
  FiMinimize,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi'
import { apiBaseUrl } from '../services/apiClient'
import { useEditor } from '../context/EditorContext'
import { useProjectData } from '../hooks/useProjectData'
import { useTheme } from '../context/ThemeContext'
import Sidebar from '../components/Sidebar'

const PRESETS = [
  {
    id: 'original',
    name: 'Original / Rec.709',
    filters: {
      brightness: 0.0,
      contrast: 1.0,
      saturation: 1.0,
      hueRotate: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    filters: {
      brightness: 0.05,
      contrast: 1.15,
      saturation: 1.3,
      hueRotate: -10,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.1,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'classic_noir',
    name: 'Classic Noir',
    filters: {
      brightness: -0.05,
      contrast: 1.3,
      saturation: 0.0,
      hueRotate: 0,
      grayscale: true,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.2,
      edgeDetect: false,
      sharpen: true,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    filters: {
      brightness: 0.0,
      contrast: 1.1,
      saturation: 1.5,
      hueRotate: 140,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.15,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'vintage',
    name: 'Vintage Film',
    filters: {
      brightness: -0.02,
      contrast: 0.95,
      saturation: 0.75,
      hueRotate: 5,
      grayscale: false,
      sepia: true,
      invert: false,
      blur: 0.0,
      vignette: 0.35,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    filters: {
      brightness: 0.1,
      contrast: 1.05,
      saturation: 1.25,
      hueRotate: 10,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'cold_ice',
    name: 'Moody Blue',
    filters: {
      brightness: -0.05,
      contrast: 1.1,
      saturation: 0.85,
      hueRotate: -25,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.25,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'edge_art',
    name: 'Edge Sketch',
    filters: {
      brightness: 0.0,
      contrast: 1.0,
      saturation: 1.0,
      hueRotate: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: true,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'polaroid',
    name: 'Polaroid Classic',
    filters: {
      brightness: 0.05,
      contrast: 0.9,
      saturation: 0.8,
      hueRotate: 5,
      grayscale: false,
      sepia: true,
      invert: false,
      blur: 0.0,
      vignette: 0.3,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'dramatic',
    name: 'Dramatic Contrast',
    filters: {
      brightness: -0.08,
      contrast: 1.4,
      saturation: 1.1,
      hueRotate: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: true,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'dreamy',
    name: 'Dreamy Glow',
    filters: {
      brightness: 0.1,
      contrast: 0.9,
      saturation: 1.4,
      hueRotate: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 1.5,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'infrared',
    name: 'Faux Infrared',
    filters: {
      brightness: 0.0,
      contrast: 1.0,
      saturation: 1.5,
      hueRotate: 180,
      grayscale: false,
      sepia: false,
      invert: true,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'solarized',
    name: 'Solarized Neon',
    filters: {
      brightness: 0.0,
      contrast: 1.5,
      saturation: 1.6,
      hueRotate: -60,
      grayscale: false,
      sepia: false,
      invert: true,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'acid',
    name: 'Acid Trip',
    filters: {
      brightness: 0.0,
      contrast: 1.25,
      saturation: 2.0,
      hueRotate: 90,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'bleach',
    name: 'Bleach Bypass',
    filters: {
      brightness: -0.05,
      contrast: 1.35,
      saturation: 0.35,
      hueRotate: 0,
      grayscale: false,
      sepia: false,
      invert: false,
      blur: 0.0,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: true,
      mirrorH: false,
      mirrorV: false
    }
  },
  {
    id: 'amber',
    name: 'Warm Amber Retro',
    filters: {
      brightness: 0.05,
      contrast: 1.05,
      saturation: 0.7,
      hueRotate: -15,
      grayscale: false,
      sepia: true,
      invert: false,
      blur: 0.0,
      vignette: 0.2,
      edgeDetect: false,
      sharpen: false,
      mirrorH: false,
      mirrorV: false
    }
  }
]

const CREATIVE_EFFECTS = [
  {
    id: 'grayscale',
    name: 'Grayscale (B&W)',
    toggleField: 'grayscale',
    toggleValue: true,
    filters: { grayscale: true }
  },
  {
    id: 'sepia',
    name: 'Sepia Tone',
    toggleField: 'sepia',
    toggleValue: true,
    filters: { sepia: true }
  },
  {
    id: 'invert',
    name: 'Invert Colors',
    toggleField: 'invert',
    toggleValue: true,
    filters: { invert: true }
  },
  {
    id: 'edgeDetect',
    name: 'Edge Detection',
    toggleField: 'edgeDetect',
    toggleValue: true,
    filters: { edgeDetect: true }
  },
  {
    id: 'sharpen',
    name: 'Sharpen details',
    toggleField: 'sharpen',
    toggleValue: true,
    filters: { sharpen: true }
  },
  {
    id: 'mirrorH',
    name: 'Mirror Horizontal',
    toggleField: 'mirrorH',
    toggleValue: true,
    filters: { mirrorH: true }
  },
  {
    id: 'mirrorV',
    name: 'Mirror Vertical',
    toggleField: 'mirrorV',
    toggleValue: true,
    filters: { mirrorV: true }
  },
  {
    id: 'vignette',
    name: 'Vignette Lens',
    toggleField: 'vignette',
    toggleValue: 0.4,
    filters: { vignette: 0.4 }
  },
  {
    id: 'blur',
    name: 'Blur Focus',
    toggleField: 'blur',
    toggleValue: 3.0,
    filters: { blur: 3.0 }
  }
]

const VFX_LIBRARY = [
  {
    category: "Environment",
    effects: [
      { id: "rain", name: "Cinematic Rain", type: "environment", icon: "🌧️" },
      { id: "snow", name: "Gentle Snow", type: "environment", icon: "❄️" },
      { id: "fog", name: "Mystic Fog", type: "environment", icon: "🌫️" },
      { id: "sparks", name: "Sparks Overlay", type: "environment", icon: "✨" }
    ]
  },
  {
    category: "Cinematic",
    effects: [
      { id: "lens_flare", name: "Anamorphic Flare", type: "cinematic", icon: "🔆" },
      { id: "light_leaks", name: "Light Leaks", type: "cinematic", icon: "🌈" }
    ]
  },
  {
    category: "Action",
    effects: [
      { id: "explosion", name: "Explosion", type: "action", icon: "💥" },
      { id: "fire", name: "Fire Flame", type: "action", icon: "🔥" }
    ]
  },
  {
    category: "Sci-Fi & Fantasy",
    effects: [
      { id: "portal", name: "Time Portal", type: "sci-fi", icon: "🌀" },
      { id: "glitch", name: "Cyber Glitch", type: "sci-fi", icon: "📺" },
      { id: "magic", name: "Magic Particles", type: "fantasy", icon: "🔮" }
    ]
  },
  {
    category: "Procedural Camera FX",
    effects: [
      { id: "screen_shake", name: "Screen Shake", type: "camera_fx", icon: "📳" },
      { id: "zoom_punch", name: "Zoom Punch", type: "camera_fx", icon: "🔍" },
      { id: "motion_blur", name: "Motion Blur", type: "camera_fx", icon: "💨" },
      { id: "flash_frame", name: "Flash Frame", type: "camera_fx", icon: "⚡" },
      { id: "speed_ramp", name: "Speed Ramp", type: "camera_fx", icon: "⏩" },
      { id: "freeze_frame", name: "Freeze Frame", type: "camera_fx", icon: "⏸️" }
    ]
  }
]

const parseTime = (timeStr) => {
  if (!timeStr) return 0
  const cleanStr = timeStr.trim().replace(',', '.')
  const match = cleanStr.match(/(?:(\d+):)?(\d+):(\d+)(?:\.(\d+))?/)
  if (!match) {
    const rawVal = parseFloat(cleanStr)
    return isNaN(rawVal) ? 0 : rawVal
  }
  const hrs = match[1] ? parseInt(match[1], 10) : 0
  const mins = parseInt(match[2], 10)
  const secs = parseInt(match[3], 10)
  const ms = match[4] ? parseFloat("0." + match[4]) : 0
  return hrs * 3600 + mins * 60 + secs + ms
}

const parseSRTOrVTT = (content) => {
  const blocks = content.split(/\r?\n\r?\n/)
  const list = []
  
  blocks.forEach((block) => {
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return
    
    let timestampLineIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timestampLineIdx = i
        break
      }
    }
    if (timestampLineIdx === -1) return
    
    const times = lines[timestampLineIdx].split('-->')
    if (times.length < 2) return
    
    const start = parseTime(times[0])
    const end = parseTime(times[1])
    
    const textLines = lines.slice(timestampLineIdx + 1)
    const text = textLines.join('\n').trim()
    
    if (text) {
      list.push({
        id: `text_srt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text,
        start,
        end,
        x: 'center',
        y: 'bottom',
        fontSize: 24,
        fontColor: '#ffffff',
        fontFamily: 'Sofia Sans',
        bold: false,
        italic: false,
        align: 'center',
        shadowEnabled: true,
        shadowColor: '#000000',
        shadowBlur: 4
      })
    }
  })
  return list
}

const secondsToSRTTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}

const generateSRTString = (textTrackItems) => {
  const sorted = [...textTrackItems].sort((a, b) => a.start - b.start)
  let srtContent = ''
  sorted.forEach((item, index) => {
    srtContent += `${index + 1}\n`
    srtContent += `${secondsToSRTTime(item.start)} --> ${secondsToSRTTime(item.end)}\n`
    srtContent += `${item.text}\n\n`
  })
  return srtContent
}

const getPosPercent = (val, def) => {
  if (val === undefined || val === null) return def
  const str = String(val).trim().toLowerCase()
  if (str === 'center') return 50
  if (str === 'left' || str === 'top') return 10
  if (str === 'right' || str === 'bottom') return 90
  const parsed = parseFloat(str)
  return isNaN(parsed) ? def : parsed
}

const resolveUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/static/')) return `${apiBaseUrl}${url}`
  return url
}

export default function EditorPage() {
  const navigate = useNavigate()
  const { isDayMode } = useTheme()
  const {
    script,
    storyboard,
    title: projectTitle,
    hasProject
  } = useProjectData()

  const {
    assets,
    videoTrack,
    audioTrack,
    textTrack,
    vfxTrack,
    logo,
    currentTime,
    isPlaying,
    zoom,
    snapEnabled,
    selectedClipId,
    selectedTrackType,
    resolution,
    exportFormat,
    isExporting,
    exportProgress,
    exportStatus,
    exportUrl,
    exportError,
    totalDuration,
    setVideoTrack,
    setAudioTrack,
    setTextTrack,
    setVfxTrack,
    setLogo,
    setCurrentTime,
    setIsPlaying,
    setZoom,
    setSnapEnabled,
    setSelectedClipId,
    setSelectedTrackType,
    setResolution,
    setExportFormat,
    uploadAsset,
    deleteAsset,
    addAssetToTimeline,
    addVfxToTimeline,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    moveClip,
    trimClip,
    updateClipProperties,
    addTextOverlay,
    triggerExport,
    loadDirectorDeskAssets,
    resetExport,
    undo,
    redo,
    canUndo,
    canRedo,
    splitLeft,
    splitRight
  } = useEditor()

  const [activeTab, setActiveTab] = useState('media') // media, overlays
  const [activeInspectorTab, setActiveInspectorTab] = useState('properties') // properties, effects
  const [applyFiltersToAll, setApplyFiltersToAll] = useState(false)
  const [presetPage, setPresetPage] = useState(0)
  const [effectsPage, setEffectsPage] = useState(0)
  const [logoPreset, setLogoPreset] = useState(logo.position)
  const [customText, setCustomText] = useState('')
  const [subSearchQuery, setSubSearchQuery] = useState('')
  const [vfxSearchQuery, setVfxSearchQuery] = useState('')
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [timelineHeight, setTimelineHeight] = useState(288) // default height 288px
  const [isMuted, setIsMuted] = useState(false)
  const [playerVolume, setPlayerVolume] = useState(1.0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const subtitleInputRef = useRef(null)
  const previewVideoRef = useRef(null)
  const previewAudioRef = useRef(null)
  const timelineScrollRef = useRef(null)
  const confirmClearAllRef = useRef(null)
  const previewContainerRef = useRef(null)
  const controlsTimeoutRef = useRef(null)

  useEffect(() => {
    if (!confirmClearAll) return
    const handleClickOutside = (event) => {
      if (confirmClearAllRef.current && !confirmClearAllRef.current.contains(event.target)) {
        setConfirmClearAll(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [confirmClearAll])

  const resetControlsTimeout = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 5000)
  }

  useEffect(() => {
    resetControlsTimeout()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    const container = previewContainerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error("Error enabling fullscreen:", err)
      })
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Keyboard shortcut listener for spacebar, enter, and arrow keys
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setIsPlaying((prev) => !prev)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentTime((prev) => Math.max(0, prev - 5))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentTime((prev) => Math.min(totalDuration, prev + 5))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPlayerVolume((prev) => {
          const next = Math.min(1.0, prev + 0.1)
          if (next > 0) setIsMuted(false)
          return next
        })
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPlayerVolume((prev) => Math.max(0.0, prev - 0.1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [totalDuration, setIsPlaying, setCurrentTime, setPlayerVolume, setIsMuted])

  const handleTimelineResizeMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const startY = e.clientY
    const startHeight = timelineHeight

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      // Min height is 40px (toolbar only), Max height is screen height minus space for video preview (320px)
      const newHeight = Math.max(40, Math.min(window.innerHeight - 320, startHeight - deltaY))
      setTimelineHeight(newHeight)
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    try {
      const res = await uploadAsset(file)
      setLogo((prev) => ({ ...prev, url: res.url, enabled: true }))
    } catch (err) {
      alert(`Failed to upload logo: ${err.message}`)
    } finally {
      setLogoUploading(false)
      e.target.value = ''
    }
  }
  
  // Find currently active video clip at playhead
  const activeVideoClip = videoTrack.find(
    (c) => c.start <= currentTime && c.end >= currentTime
  )
  // Find active audio clip
  const activeAudioClip = audioTrack.find(
    (c) => c.start <= currentTime && c.end >= currentTime
  )
  // Find active text overlays
  const activeTexts = textTrack.filter(
    (t) => t.start <= currentTime && t.end >= currentTime
  )

  // Selected object metadata
  const selectedClip = 
    selectedTrackType === 'video' 
      ? videoTrack.find(c => c.id === selectedClipId)
      : selectedTrackType === 'audio'
        ? audioTrack.find(c => c.id === selectedClipId)
        : selectedTrackType === 'text'
          ? textTrack.find(t => t.id === selectedClipId)
          : selectedTrackType === 'vfx'
            ? vfxTrack.find(v => v.id === selectedClipId)
            : null

  // Synchronize browser native video playback with the context's playhead time
  useEffect(() => {
    const video = previewVideoRef.current
    if (video && activeVideoClip) {
      let sourceTime = activeVideoClip.sourceStart + (currentTime - activeVideoClip.start)
      
      // If freeze frame is active, freeze at the start of the freeze frame clip
      const freezeFx = vfxTrack.find(
        (v) => v.type === 'camera_fx' && v.effectId === 'freeze_frame' && v.start <= currentTime && v.end >= currentTime
      )
      if (freezeFx) {
        sourceTime = activeVideoClip.sourceStart + (freezeFx.start - activeVideoClip.start)
      }

      // Allow slight difference to avoid jittering
      if (Math.abs(video.currentTime - sourceTime) > 0.2) {
        video.currentTime = sourceTime
      }
      
      // Sync volume and mute settings
      video.volume = (activeVideoClip.volume !== undefined ? activeVideoClip.volume : 1.0) * playerVolume
      video.muted = isMuted

      // Set playback speed for speed ramp camera fx
      const speedRampFx = vfxTrack.find(
        (v) => v.type === 'camera_fx' && v.effectId === 'speed_ramp' && v.start <= currentTime && v.end >= currentTime
      )
      if (speedRampFx) {
        video.playbackRate = 2.0
      } else {
        video.playbackRate = 1.0
      }

      if (freezeFx) {
        if (!video.paused) video.pause()
      } else if (isPlaying && video.paused) {
        video.play().catch(() => {})
      } else if (!isPlaying && !video.paused) {
        video.pause()
      }
    }
  }, [currentTime, activeVideoClip, isPlaying, playerVolume, isMuted, vfxTrack])

  // Synchronize browser native audio playback with the context's playhead time
  useEffect(() => {
    const audio = previewAudioRef.current
    if (audio) {
      if (activeAudioClip) {
        // Only set src if it changed
        const targetSrc = resolveUrl(activeAudioClip.url)
        if (audio.src !== targetSrc) {
          audio.src = targetSrc
        }
        
        const sourceTime = activeAudioClip.sourceStart + (currentTime - activeAudioClip.start)
        if (Math.abs(audio.currentTime - sourceTime) > 0.2) {
          audio.currentTime = sourceTime
        }
        
        // Sync volume and mute settings
        audio.volume = (activeAudioClip.volume !== undefined ? activeAudioClip.volume : 1.0) * playerVolume
        audio.muted = isMuted

        if (isPlaying && audio.paused) {
          audio.play().catch(() => {})
        } else if (!isPlaying && !audio.paused) {
          audio.pause()
        }
      } else {
        if (!audio.paused) {
          audio.pause()
        }
        audio.src = ''
      }
    }
  }, [currentTime, activeAudioClip, isPlaying, playerVolume, isMuted])

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      try {
        await uploadAsset(file)
      } catch (err) {
        alert(`Failed to upload file ${file.name}`)
      }
    }
    e.target.value = ''
  }

  const handleSubtitleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target.result
      try {
        const parsed = parseSRTOrVTT(content)
        if (parsed.length === 0) {
          alert("Could not find any valid subtitles in this file. Please verify it is in SRT or VTT format.")
          return
        }
        setTextTrack(parsed)
      } catch (err) {
        alert("Error parsing subtitle file: " + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExportSRT = () => {
    if (textTrack.length === 0) {
      alert("No subtitles/text overlays to export.")
      return
    }
    const srtString = generateSRTString(textTrack)
    const blob = new Blob([srtString], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'subtitles.srt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleAddSubtitleAtPlayhead = () => {
    addTextOverlay("New subtitle", currentTime, currentTime + 3.0)
  }

  const isActivePreset = (preset) => {
    if (!selectedClip) return false
    const tolerance = 0.01
    const getVal = (val, def) => (val === undefined || val === null ? def : val)
    
    return (
      Math.abs(getVal(selectedClip.brightness, 0) - preset.filters.brightness) < tolerance &&
      Math.abs(getVal(selectedClip.contrast, 1) - preset.filters.contrast) < tolerance &&
      Math.abs(getVal(selectedClip.saturation, 1) - preset.filters.saturation) < tolerance &&
      Math.abs(getVal(selectedClip.hueRotate, 0) - preset.filters.hueRotate) < tolerance &&
      Math.abs(getVal(selectedClip.blur, 0) - preset.filters.blur) < tolerance &&
      Math.abs(getVal(selectedClip.vignette, 0) - preset.filters.vignette) < tolerance &&
      !!selectedClip.mirrorH === !!preset.filters.mirrorH &&
      !!selectedClip.mirrorV === !!preset.filters.mirrorV &&
      !!selectedClip.grayscale === !!preset.filters.grayscale &&
      !!selectedClip.sepia === !!preset.filters.sepia &&
      !!selectedClip.invert === !!preset.filters.invert &&
      !!selectedClip.edgeDetect === !!preset.filters.edgeDetect &&
      !!selectedClip.sharpen === !!preset.filters.sharpen
    )
  }

  const isCreativeEffectActive = (effect) => {
    if (!selectedClip) return false
    const val = selectedClip[effect.toggleField]
    if (typeof effect.toggleValue === 'boolean') {
      return !!val
    } else {
      return val > 0
    }
  }

  const handleToggleCreativeEffect = (effect) => {
    if (!selectedClip) return
    const isActive = isCreativeEffectActive(effect)
    const nextVal = isActive ? (typeof effect.toggleValue === 'boolean' ? false : 0.0) : effect.toggleValue
    handleUpdateFilterProperty({ [effect.toggleField]: nextVal })
  }

  const handleUpdateFilterProperty = (props) => {
    if (!selectedClip) return
    if (applyFiltersToAll) {
      videoTrack.forEach((clip) => {
        updateClipProperties(clip.id, 'video', props)
      })
    } else {
      updateClipProperties(selectedClip.id, 'video', props)
    }
  }

  const handleApplyToAllChange = (checked) => {
    setApplyFiltersToAll(checked)
    if (checked && selectedClip) {
      const filterProps = {
        brightness: selectedClip.brightness || 0.0,
        contrast: selectedClip.contrast ?? 1.0,
        blur: selectedClip.blur || 0.0,
        grayscale: !!selectedClip.grayscale,
        sepia: !!selectedClip.sepia,
        invert: !!selectedClip.invert,
        saturation: selectedClip.saturation ?? 1.0,
        hueRotate: selectedClip.hueRotate ?? 0,
        mirrorH: !!selectedClip.mirrorH,
        mirrorV: !!selectedClip.mirrorV,
        vignette: selectedClip.vignette || 0.0,
        edgeDetect: !!selectedClip.edgeDetect,
        sharpen: !!selectedClip.sharpen,
      }
      videoTrack.forEach((clip) => {
        if (clip.id !== selectedClip.id) {
          updateClipProperties(clip.id, 'video', filterProps)
        }
      })
    }
  }

  const handleResetFilters = () => {
    if (!selectedClip) return
    const defaultFilters = {
      brightness: 0.0,
      contrast: 1.0,
      blur: 0.0,
      grayscale: false,
      sepia: false,
      invert: false,
      saturation: 1.0,
      hueRotate: 0,
      mirrorH: false,
      mirrorV: false,
      vignette: 0.0,
      edgeDetect: false,
      sharpen: false,
    }
    if (applyFiltersToAll) {
      videoTrack.forEach((clip) => {
        updateClipProperties(clip.id, 'video', defaultFilters)
      })
    } else {
      updateClipProperties(selectedClip.id, 'video', defaultFilters)
    }
  }

  // Visual position converter for text elements
  const getTextPositionStyles = (txt) => {
    const style = {
      fontSize: `${txt.fontSize || 28}px`,
      color: txt.fontColor || '#ffffff',
      fontFamily: txt.fontFamily || 'Sofia Sans',
      fontWeight: txt.bold ? 'bold' : 'normal',
      fontStyle: txt.italic ? 'italic' : 'normal',
      textAlign: txt.align || 'center',
      textShadow: txt.shadowEnabled 
        ? `0px 2px ${txt.shadowBlur || 4}px ${txt.shadowColor || '#000000'}` 
        : 'none',
      position: 'absolute',
      zIndex: 45, // Set above controls overlay (z-40) to prevent click interception and allow dragging
      width: txt.width && txt.width !== 'auto' ? txt.width : 'max-content',
      height: txt.height || 'auto',
      minWidth: txt.width && txt.width !== 'auto' ? 'none' : 'max-content', // Prevent text from getting squashed when dragged close to the right screen boundary
      display: 'flex',
      alignItems: 'center',
      justifyContent: txt.align === 'left' ? 'flex-start' : txt.align === 'right' ? 'flex-end' : 'center',
      wordBreak: 'break-word',
      whiteSpace: 'pre-wrap',
      overflow: 'hidden',
    }
    
    // Horizontal positioning
    if (txt.x === 'center') {
      if (txt.align === 'left') {
        style.left = '10%'
      } else if (txt.align === 'right') {
        style.right = '10%'
      } else {
        style.left = '50%'
        style.transform = 'translateX(-50%)'
      }
    } else {
      const xStr = String(txt.x || 'center')
      style.left = xStr.includes('%') || xStr.includes('w') ? xStr : `${xStr}px`
      if (xStr.includes('%')) {
        style.transform = `${style.transform || ''} translateX(-50%)`
      }
    }

    // Vertical positioning (default bottom shifted from 10% to 22% to avoid overlapping video seek/controls)
    if (txt.y === 'bottom') {
      style.bottom = '22%'
    } else if (txt.y === 'top') {
      style.top = '10%'
    } else if (txt.y === 'center') {
      style.top = '50%'
      style.transform = `${style.transform || ''} translateY(-50%)`
    } else {
      const yStr = String(txt.y || 'bottom')
      style.top = yStr.includes('%') || yStr.includes('h') ? yStr : `${yStr}px`
      if (yStr.includes('%')) {
        style.transform = `${style.transform || ''} translateY(-50%)`
      }
    }
    return style
  }

  // Interactive mouse dragging handler for text overlays on the player canvas
  const handleTextOverlayMouseDown = (e, txt) => {
    e.stopPropagation()
    e.preventDefault()
    
    setSelectedClipId(txt.id)
    setSelectedTrackType('text')
    
    const container = e.currentTarget.parentElement
    if (!container) return
    
    const rect = container.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    
    // Parse current x and y positions
    let initialXPercent = 50
    if (txt.x !== 'center') {
      const parsedX = parseFloat(txt.x)
      initialXPercent = isNaN(parsedX) ? 50 : parsedX
    } else {
      if (txt.align === 'left') initialXPercent = 10
      if (txt.align === 'right') initialXPercent = 90
    }
    
    let initialYPercent = 78 // default bottom is 78% (above 22% bottom margin)
    if (txt.y === 'top') {
      initialYPercent = 10
    } else if (txt.y === 'center') {
      initialYPercent = 50
    } else if (txt.y === 'bottom') {
      initialYPercent = 78
    } else {
      const parsedY = parseFloat(txt.y)
      initialYPercent = isNaN(parsedY) ? 78 : parsedY
    }

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      
      const deltaXPercent = (deltaX / rect.width) * 100
      const deltaYPercent = (deltaY / rect.height) * 100
      
      const newXPercent = Math.max(0, Math.min(100, initialXPercent + deltaXPercent))
      const newYPercent = Math.max(0, Math.min(100, initialYPercent + deltaYPercent))
      
      updateClipProperties(txt.id, 'text', {
        x: `${newXPercent.toFixed(1)}%`,
        y: `${newYPercent.toFixed(1)}%`
      })
    }
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Interactive mouse resizing handler for text overlays
  const handleTextOverlayResizeMouseDown = (e, txt) => {
    e.stopPropagation()
    e.preventDefault()
    
    setSelectedClipId(txt.id)
    setSelectedTrackType('text')
    
    // Find the text container element
    const textEl = e.currentTarget.parentElement
    if (!textEl) return
    
    const rect = textEl.getBoundingClientRect()
    // Compute center coordinates of the text box
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const startX = e.clientX
    const startY = e.clientY
    
    // Initial distance of the cursor from the center of the text box
    const initialDist = Math.sqrt(Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2))
    const initialFontSize = txt.fontSize || 28

    const handleMouseMove = (moveEvent) => {
      const currentDist = Math.sqrt(Math.pow(moveEvent.clientX - centerX, 2) + Math.pow(moveEvent.clientY - centerY, 2))
      const scaleFactor = currentDist / (initialDist || 1)
      
      const newFontSize = Math.max(12, Math.min(120, Math.round(initialFontSize * scaleFactor)))
      updateClipProperties(txt.id, 'text', { fontSize: newFontSize })
    }
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Interactive mouse resizing handler for textbox borders (sides and top/bottom edges)
  const handleTextOverlayEdgeResizeMouseDown = (e, txt, edge) => {
    e.stopPropagation()
    e.preventDefault()
    
    setSelectedClipId(txt.id)
    setSelectedTrackType('text')
    
    const textEl = e.currentTarget.parentElement
    if (!textEl) return
    
    const rect = textEl.getBoundingClientRect()
    const initialWidth = rect.width
    const initialHeight = rect.height
    
    const startX = e.clientX
    const startY = e.clientY
    
    const isHorizontal = edge === 'left' || edge === 'right'
    const isVertical = edge === 'top' || edge === 'bottom'
    
    // Determine centering properties to adjust delta scaling
    const isXCentered = txt.x === 'center' || String(txt.x).includes('50%')
    const isYCentered = txt.y === 'center' || String(txt.y).includes('50%')

    const handleMouseMove = (moveEvent) => {
      if (isHorizontal) {
        const deltaX = moveEvent.clientX - startX
        const factor = isXCentered ? 2 : 1
        const direction = edge === 'right' ? 1 : -1
        const newWidth = Math.max(50, initialWidth + deltaX * direction * factor)
        updateClipProperties(txt.id, 'text', { width: `${newWidth.toFixed(0)}px` })
      }
      
      if (isVertical) {
        const deltaY = moveEvent.clientY - startY
        const factor = isYCentered ? 2 : 1
        const direction = edge === 'bottom' ? 1 : -1
        const newHeight = Math.max(25, initialHeight + deltaY * direction * factor)
        updateClipProperties(txt.id, 'text', { height: `${newHeight.toFixed(0)}px` })
      }
    }
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Drag-to-move & Drag-to-resize/trim handlers
  const handleClipMouseDown = (e, clip, trackType, actionType) => {
    e.stopPropagation()
    e.preventDefault()
    const startX = e.clientX
    const originalStart = clip.start
    const originalEnd = clip.end

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaSeconds = deltaX / zoom

      if (actionType === 'move') {
        const newStart = Math.max(0, originalStart + deltaSeconds)
        moveClip(clip.id, trackType, newStart)
      } else if (actionType === 'trim-start') {
        const newStart = Math.max(0, originalStart + deltaSeconds)
        trimClip(clip.id, trackType, 'start', newStart)
      } else if (actionType === 'trim-end') {
        const newEnd = Math.max(clip.start + 0.2, originalEnd + deltaSeconds)
        trimClip(clip.id, trackType, 'end', newEnd)
      }
    }

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  // Format second counts to timeline format MM:SS.HH
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    const hundredths = Math.floor((seconds % 1) * 100)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`
  }

  // Camera FX computations
  const activeCameraFx = vfxTrack.find(
    (v) => v.type === 'camera_fx' && v.start <= currentTime && v.end >= currentTime
  )
  
  let cameraTransform = ''
  let cameraFilter = ''
  let flashOpacity = 0
  
  if (activeCameraFx) {
    const elapsed = currentTime - activeCameraFx.start
    if (activeCameraFx.effectId === 'screen_shake') {
      const dx = 15 * Math.sin(2 * Math.PI * 12 * elapsed)
      const dy = 15 * Math.cos(2 * Math.PI * 12 * elapsed)
      cameraTransform = `translate(${dx}px, ${dy}px) scale(1.08)`
    } else if (activeCameraFx.effectId === 'zoom_punch') {
      const zoomVal = 1.0 + 0.35 * Math.exp(-3.5 * elapsed)
      cameraTransform = `scale(${zoomVal})`
    } else if (activeCameraFx.effectId === 'motion_blur') {
      cameraFilter = 'blur(4px) saturate(1.2)'
    } else if (activeCameraFx.effectId === 'flash_frame') {
      const dur = activeCameraFx.end - activeCameraFx.start
      flashOpacity = Math.max(0, 1.0 - (elapsed / (dur || 1.0)))
    }
  }

  const filteredSubtitles = textTrack
    .filter((sub) => sub.text && sub.text.toLowerCase().includes(subSearchQuery.toLowerCase()))
    .sort((a, b) => a.start - b.start)

  return (
    <div className={`flex h-screen overflow-hidden select-none font-display relative transition-colors duration-500 ${
      isDayMode ? 'bg-[#f0ede8]' : 'bg-[#06060b]'
    }`}>
      {/* Background radial lens flares */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-cinematic lens-flare-radial opacity-95" />

      {/* Viewport Sidebar */}
      <div className="relative z-30 shrink-0 h-screen">
        <Sidebar />
      </div>

      {/* Editor Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-20">
        
        {/* Editor Top Control Bar */}
        <header className="h-14 border-b flex items-center justify-between px-6 shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-extrabold tracking-[0.25em] uppercase text-surface-500">
              Studio Post-Production
            </span>
            <span className="text-surface-700">/</span>
            <span className="text-[11.5px] font-bold text-accent truncate max-w-[200px]">
              {hasProject ? projectTitle : 'Standalone Sequence'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Resolution Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-500">Resolution</span>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className={`text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                  isDayMode 
                    ? 'bg-white border-black/10 text-neutral-800' 
                    : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                }`}
              >
                <option value="1080p">1080p (FHD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
                <option value="360p">360p (Low)</option>
              </select>
            </div>

            {/* Format Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-500">Format</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className={`text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                  isDayMode 
                    ? 'bg-white border-black/10 text-neutral-800' 
                    : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                }`}
              >
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="mov">MOV</option>
                <option value="avi">AVI</option>
              </select>
            </div>

            {/* Export Trigger */}
            <button
              onClick={triggerExport}
              disabled={isExporting || videoTrack.length === 0}
              className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r from-accent to-purple-600 hover:from-accent hover:to-purple-500 text-white shadow-[0_4px_16px_rgba(139,92,246,0.2)] disabled:opacity-40 flex items-center gap-2 cursor-pointer transition-all"
            >
              {isExporting ? (
                <>
                  <FiLoader size={12} className="animate-spin" />
                  <span>Exporting</span>
                </>
              ) : (
                <>
                  <FiDownload size={12} />
                  <span>Export</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Multi-Panel Editor Layout (Library, Player, Properties) */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Left Panel: Media Library & Context Loader */}
          <div className="w-80 border-r flex flex-col shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-black/[0.15]">
            {/* Tabs selector */}
            <div className="flex border-b border-white/[0.04] [data-theme='day']_&:border-black/[0.05] p-2 gap-1">
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors text-center ${
                  activeTab === 'media' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                Media
              </button>
              <button
                onClick={() => setActiveTab('overlays')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors text-center ${
                  activeTab === 'overlays' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-555 hover:text-surface-300'
                }`}
              >
                Logo & Text
              </button>
              <button
                onClick={() => setActiveTab('subtitles')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors text-center ${
                  activeTab === 'subtitles' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                Subtitles
              </button>
              <button
                onClick={() => setActiveTab('vfx')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors text-center ${
                  activeTab === 'vfx' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                VFX
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'media' && (
                <>
                  {/* Showrunner Connector (Import Storyboard) */}
                  {hasProject && (
                    <div className="glass-panel p-3.5 rounded-xl border border-accent/20 bg-accent/[0.02] space-y-2">
                      <p className="text-[11.5px] font-bold text-accent uppercase tracking-wider">Showrunner Link</p>
                      <p className="text-[10px] text-surface-400 leading-relaxed">
                        Load the active storyboard slides, scripts, and media items directly into the multi-track editor timeline.
                      </p>
                      <button
                        onClick={() => loadDirectorDeskAssets(storyboard, script)}
                        className="w-full py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/30 transition-all cursor-pointer"
                      >
                        Load Storyboard Track
                      </button>
                    </div>
                  )}

                  {/* Upload Block */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/[0.1] hover:border-accent/40 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white/[0.01] hover:bg-white/[0.02]"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      multiple
                      accept="video/*,audio/*,image/*"
                      className="hidden"
                    />
                    <FiUploadCloud size={28} className="mx-auto mb-2 text-surface-500" />
                    <p className="text-[11px] font-bold text-surface-300">Import Media Assets</p>
                    <p className="text-[9px] text-surface-500 mt-1">Video, audio, images, or branding assets</p>
                  </div>

                  {/* Assets Grid */}
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Asset Inventory</p>
                    <div className="space-y-2">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-[11px] transition-colors relative group ${
                            isDayMode
                              ? 'bg-white border-black/5 hover:bg-neutral-50'
                              : 'bg-[#0a0a12]/80 border-white/[0.04] hover:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-lg shrink-0">
                              {asset.type === 'video' ? '🎬' : asset.type === 'audio' ? '🎵' : '🖼️'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate text-surface-300" title={asset.name}>{asset.name}</p>
                              <p className="text-[9px] font-mono text-surface-555 mt-0.5">{asset.duration.toFixed(1)}s</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => addAssetToTimeline(asset, asset.type === 'audio' ? 'audio' : 'video', currentTime)}
                              title="Add to Timeline"
                              className="p-1 rounded bg-accent/20 text-accent hover:bg-accent/30 cursor-pointer"
                            >
                              <FiPlus size={11} />
                            </button>
                            <button
                              onClick={() => deleteAsset(asset.id)}
                              title="Delete Asset"
                              className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                            >
                              <FiTrash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'overlays' && (
                <div className="space-y-5">
                  
                  {/* Custom Logo Overlay Section */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Custom Logo Overlay</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-surface-300">Show Logo on Video</span>
                      <input
                        type="checkbox"
                        checked={logo.enabled}
                        onChange={(e) => setLogo((prev) => ({ ...prev, enabled: e.target.checked }))}
                        className="accent-accent cursor-pointer"
                      />
                    </div>

                    {/* Logo Image Picker & Preview */}
                    <div className="space-y-2">
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                        isDayMode ? 'bg-white border-black/5' : 'bg-[#0a0a12]/80 border-white/[0.04]'
                      }`}>
                        <div className="w-12 h-12 rounded bg-black/25 flex items-center justify-center overflow-hidden shrink-0 border border-white/5">
                          {logo.url ? (
                            <img src={resolveUrl(logo.url)} alt="logo preview" className="max-w-full max-h-full object-contain" />
                          ) : (
                            <FiImage className="text-surface-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-surface-400 font-mono truncate">
                            {logo.url ? logo.url.split('/').pop() : 'No logo active'}
                          </p>
                          <button
                            onClick={() => logoInputRef.current?.click()}
                            disabled={logoUploading}
                            className="text-[10.5px] font-bold text-accent hover:underline flex items-center gap-1 mt-1 cursor-pointer disabled:opacity-50"
                          >
                            {logoUploading ? <FiLoader className="animate-spin" size={10} /> : <FiUploadCloud size={10} />}
                            <span>Upload Custom Logo</span>
                          </button>
                          <input
                            type="file"
                            ref={logoInputRef}
                            onChange={handleLogoUpload}
                            accept=".png,.jpg,.jpeg,.svg"
                            className="hidden"
                          />
                        </div>
                      </div>
                      
                      {logo.url && (
                        <button
                          onClick={() => setLogo(prev => ({ ...prev, url: null, enabled: false }))}
                          className="text-[9px] font-bold text-red-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <FiTrash2 size={9} />
                          <span>Remove Logo</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 pt-2">
                      {/* Logo Opacity */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-500 uppercase">
                          <span>Opacity</span>
                          <span>{Math.round(logo.opacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={logo.opacity}
                          onChange={(e) => setLogo((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          disabled={!logo.enabled}
                        />
                      </div>

                      {/* Logo Size */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-500 uppercase">
                          <span>Width</span>
                          <span>{logo.size}px</span>
                        </div>
                        <input
                          type="range"
                          min="30"
                          max="200"
                          step="5"
                          value={logo.size}
                          onChange={(e) => setLogo((prev) => ({ ...prev, size: parseInt(e.target.value) }))}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          disabled={!logo.enabled}
                        />
                      </div>

                      {/* Logo Position */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-semibold text-surface-500 uppercase">Position Corner</div>
                        <select
                          value={logo.position}
                          onChange={(e) => setLogo((prev) => ({ ...prev, position: e.target.value }))}
                          className={`w-full text-[11px] font-semibold border rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                          disabled={!logo.enabled}
                        >
                          <option value="top-left">Top Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="bottom-right">Bottom Right</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.04] my-2" />

                  {/* Custom Text Adder Section */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Custom Text Overlay</p>
                    
                    <div className="space-y-1.5">
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Enter custom subtitle or text overlay..."
                        className={`w-full text-[11px] font-semibold border rounded-lg p-2.5 focus:outline-none h-16 resize-none ${
                          isDayMode 
                            ? 'bg-white border-black/10 text-neutral-800' 
                            : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                        }`}
                      />
                      <button
                        onClick={() => {
                          if (!customText.trim()) return
                          addTextOverlay(customText, currentTime, currentTime + 4.0)
                          setCustomText('')
                        }}
                        disabled={!customText.trim()}
                        className="w-full py-2.5 rounded-xl bg-accent hover:bg-purple-600 text-white font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        <FiType size={11} />
                        <span>Add Text Overlay</span>
                      </button>
                    </div>
                    
                    <p className="text-[9.5px] text-surface-500 italic leading-normal">
                      Tip: Once added, select the text clip on the timeline below to change colors, size, alignment, and durations.
                    </p>
                  </div>

                </div>
              )}

              {activeTab === 'subtitles' && (
                <div className="space-y-4">
                  {/* Subtitle File Management Controls */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Subtitle Settings</p>
                      {textTrack.length > 0 && (
                        <div ref={confirmClearAllRef}>
                          {confirmClearAll ? (
                            <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-lg border border-red-500/20">
                              <span className="text-[8.5px] font-bold text-red-400 uppercase tracking-wider">Clear all?</span>
                              <button
                                onClick={() => {
                                  setTextTrack([])
                                  setConfirmClearAll(false)
                                }}
                                className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmClearAll(false)}
                                className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-white/10 text-neutral-200 hover:bg-white/20 transition-colors cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmClearAll(true)}
                              className="text-[9px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Clear all subtitles"
                            >
                              <FiTrash2 size={10} />
                              <span>Clear All</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => subtitleInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent font-bold uppercase tracking-wider text-[10px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FiUploadCloud size={12} />
                        <span>Import SRT/VTT</span>
                      </button>
                      <input
                        type="file"
                        ref={subtitleInputRef}
                        onChange={handleSubtitleUpload}
                        accept=".srt,.vtt,.txt"
                        className="hidden"
                      />
                      
                      <button
                        onClick={handleExportSRT}
                        disabled={textTrack.length === 0}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed font-bold uppercase tracking-wider text-[10px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                        title="Export timeline subtitles to SRT file"
                      >
                        <FiDownload size={12} />
                        <span>Export SRT</span>
                      </button>
                    </div>
                    
                    <button
                      onClick={handleAddSubtitleAtPlayhead}
                      className="w-full py-2 px-4 rounded-xl bg-accent hover:bg-purple-600 text-white font-bold uppercase tracking-widest text-[10px] cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FiPlus size={11} />
                      <span>Add Subtitle at Playhead</span>
                    </button>
                  </div>
                  
                  <div className="h-px bg-white/[0.04] my-2" />
                  
                  {/* Search and Interactive editor list */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Subtitle Track Editor</p>
                    <input
                      type="text"
                      placeholder="Search subtitle text..."
                      value={subSearchQuery}
                      onChange={(e) => setSubSearchQuery(e.target.value)}
                      className={`w-full text-[11px] font-semibold border rounded-lg p-2 focus:outline-none ${
                        isDayMode 
                          ? 'bg-white border-black/10 text-neutral-800' 
                          : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                      }`}
                    />
                  </div>

                  <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {filteredSubtitles.length === 0 ? (
                      <div className="text-center py-8 text-surface-600 text-xs font-mono">
                        {textTrack.length === 0 ? "No subtitles uploaded yet." : "No matching subtitles found."}
                      </div>
                    ) : (
                      filteredSubtitles.map((sub) => {
                        const isSelected = selectedClipId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              setSelectedClipId(sub.id);
                              setSelectedTrackType('text');
                            }}
                            className={`p-3 rounded-xl border text-[11px] space-y-2 transition-colors relative group cursor-pointer ${
                              isSelected
                                ? 'bg-accent/10 border-accent shadow-[0_0_8px_rgba(139,92,246,0.15)]'
                                : isDayMode
                                  ? 'bg-white border-black/5 hover:bg-neutral-50'
                                  : 'bg-[#0a0a12]/80 border-white/[0.04] hover:bg-white/[0.02]'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[9px] font-mono text-surface-500">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentTime(sub.start);
                                }}
                                className="hover:text-accent font-bold cursor-pointer transition-colors"
                                title="Seek playhead to start time"
                              >
                                ⏱️ {formatTime(sub.start)} ➔ {formatTime(sub.end)}
                              </button>
                              
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteClip(sub.id, 'text');
                                  }}
                                  className="p-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/25 cursor-pointer"
                                  title="Delete subtitle"
                                >
                                  <FiTrash2 size={10} />
                                </button>
                              </div>
                            </div>
                            
                            <textarea
                              value={sub.text}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateClipProperties(sub.id, 'text', { text: e.target.value })}
                              className={`w-full text-[10.5px] font-semibold border rounded-lg p-2 focus:outline-none h-14 resize-none ${
                                isDayMode 
                                  ? 'bg-neutral-50 border-black/10 text-neutral-800 focus:bg-white' 
                                  : 'bg-black/30 border-white/5 text-neutral-200 focus:bg-black/55'
                              }`}
                              placeholder="Enter subtitle text..."
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'vfx' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">VFX & Camera FX</p>
                    <input
                      type="text"
                      placeholder="Search effects..."
                      value={vfxSearchQuery}
                      onChange={(e) => setVfxSearchQuery(e.target.value)}
                      className={`w-full text-[11px] font-semibold border rounded-lg p-2 focus:outline-none ${
                        isDayMode 
                          ? 'bg-white border-black/10 text-neutral-800' 
                          : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                      }`}
                    />
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {VFX_LIBRARY.map((cat) => {
                      const matchedEffects = cat.effects.filter(
                        (eff) =>
                          eff.name.toLowerCase().includes(vfxSearchQuery.toLowerCase()) ||
                          cat.category.toLowerCase().includes(vfxSearchQuery.toLowerCase())
                      );
                      if (matchedEffects.length === 0) return null;
                      return (
                        <div key={cat.category} className="space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-surface-500">{cat.category}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {matchedEffects.map((eff) => (
                              <button
                                key={eff.id}
                                onClick={() => addVfxToTimeline(eff.type, eff.id, eff.name, currentTime)}
                                className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                                  isDayMode
                                    ? 'bg-white border-black/5 hover:bg-neutral-50 hover:border-accent'
                                    : 'bg-[#0a0a12]/80 border-white/[0.04] hover:bg-white/[0.02] hover:border-accent'
                                }`}
                              >
                                <span className="text-lg">{eff.icon}</span>
                                <span className="text-[9.5px] font-bold text-surface-300 truncate max-w-full">{eff.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center Column: Real-time Video Preview Player */}
          <div className="flex-1 flex flex-col bg-black/40 relative">
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                  {/* Preview Window Monitor */}
              <div 
                ref={previewContainerRef}
                onMouseMove={resetControlsTimeout}
                onMouseEnter={resetControlsTimeout}
                onTouchStart={resetControlsTimeout}
                className={`relative bg-[#030305] shadow-[0_24px_50px_rgba(0,0,0,0.8)] overflow-hidden flex items-center justify-center transition-all ${
                  isFullscreen 
                    ? 'w-screen h-screen max-w-none rounded-none border-none' 
                    : 'w-full max-w-[480px] border border-white/[0.04] rounded-none aspect-video'
                }`}
              >
                {/* Cinematic camera movement and post-processing wrapper */}
                <div
                  className="relative w-full h-full flex items-center justify-center overflow-hidden"
                  style={{
                    transform: cameraTransform,
                    filter: cameraFilter,
                    transition: cameraTransform ? 'none' : 'transform 0.15s ease'
                  }}
                >
                  {/* Visual Video Stream Tag */}
                  {activeVideoClip ? (
                    <>
                      <video
                        ref={previewVideoRef}
                        src={resolveUrl(activeVideoClip.url)}
                        muted={isMuted}
                        className="w-full h-full object-contain transition-transform"
                        style={{
                          filter: [
                            `brightness(${1.0 + (activeVideoClip.brightness || 0)})`,
                            `contrast(${activeVideoClip.contrast || 1.0})`,
                            `blur(${activeVideoClip.blur || 0}px)`,
                            activeVideoClip.grayscale ? 'grayscale(100%)' : '',
                            activeVideoClip.sepia ? 'sepia(100%)' : '',
                            activeVideoClip.invert ? 'invert(100%)' : '',
                            activeVideoClip.saturation !== undefined ? `saturate(${activeVideoClip.saturation})` : '',
                            activeVideoClip.hueRotate !== undefined ? `hue-rotate(${activeVideoClip.hueRotate}deg)` : '',
                            activeVideoClip.edgeDetect ? 'grayscale(100%) contrast(500%) invert(100%)' : '',
                            activeVideoClip.sharpen ? 'contrast(1.15) brightness(1.03)' : '',
                          ].filter(Boolean).join(' '),
                          transform: `scaleX(${activeVideoClip.mirrorH ? -1 : 1}) scaleY(${activeVideoClip.mirrorV ? -1 : 1})`
                        }}
                      />
                      {/* Vignette Overlay */}
                      {activeVideoClip.vignette > 0 && (
                        <div 
                          className="absolute inset-0 pointer-events-none z-10"
                          style={{
                            background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${activeVideoClip.vignette}) 100%)`
                          }}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-center text-surface-600 text-xs p-4 flex flex-col items-center gap-2 font-mono">
                      <FiDisc size={20} className="animate-spin text-surface-600" />
                      <span>No active video clip at playhead</span>
                    </div>
                  )}

                  {/* Active VFX visual overlays */}
                  {vfxTrack
                    .filter((v) => v.type !== 'camera_fx' && v.start <= currentTime && v.end >= currentTime)
                    .map((v) => {
                      const xPercent = getPosPercent(v.x, 50)
                      const yPercent = getPosPercent(v.y, 50)
                      return (
                        <video
                          key={v.id}
                          src={resolveUrl(`/static/overlays/${v.effectId}.mp4`)}
                          muted
                          loop
                          playsInline
                          className="absolute pointer-events-none z-25 object-cover"
                          style={{
                            left: `${xPercent}%`,
                            top: `${yPercent}%`,
                            width: '100%',
                            height: '100%',
                            opacity: v.opacity !== undefined ? v.opacity : 1.0,
                            mixBlendMode: v.blendMode === 'add' ? 'screen' : (v.blendMode || 'screen'),
                            transform: `translate(-50%, -50%) scale(${v.scale || 1.0}) rotate(${v.rotation || 0}deg)`
                          }}
                          ref={(el) => {
                            if (el) {
                              const offset = currentTime - v.start
                              if (Math.abs(el.currentTime - offset) > 0.25) {
                                el.currentTime = offset
                              }
                              if (isPlaying && el.paused) {
                                el.play().catch(() => {})
                              } else if (!isPlaying && !el.paused) {
                                el.pause()
                              }
                            }
                          }}
                        />
                      )
                    })}

                  {/* Subtitle / Text overlays layer */}
                  {activeTexts.map((txt) => {
                    const isSelected = selectedClipId === txt.id
                    return (
                      <div
                        key={txt.id}
                        style={getTextPositionStyles(txt)}
                        onMouseDown={(e) => handleTextOverlayMouseDown(e, txt)}
                        className={`font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] px-4 select-none cursor-move transition-all border relative ${
                          isSelected 
                            ? 'border-accent bg-accent/10 border-dashed rounded-lg' 
                            : 'border-transparent hover:border-white/30 hover:border-dashed rounded-lg'
                        }`}
                      >
                        {txt.text}
                        
                        {/* Invisible Corner Resize Handles */}
                        {isSelected && (
                          <>
                            {/* Corner handles */}
                            <div
                              onMouseDown={(e) => handleTextOverlayResizeMouseDown(e, txt)}
                              className="w-3.5 h-3.5 absolute top-[-7px] left-[-7px] cursor-nwse-resize z-50 bg-transparent"
                              title="Drag corner to scale text size"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayResizeMouseDown(e, txt)}
                              className="w-3.5 h-3.5 absolute top-[-7px] right-[-7px] cursor-nesw-resize z-50 bg-transparent"
                              title="Drag corner to scale text size"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayResizeMouseDown(e, txt)}
                              className="w-3.5 h-3.5 absolute bottom-[-7px] left-[-7px] cursor-nesw-resize z-50 bg-transparent"
                              title="Drag corner to scale text size"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayResizeMouseDown(e, txt)}
                              className="w-3.5 h-3.5 absolute bottom-[-7px] right-[-7px] cursor-nwse-resize z-50 bg-transparent"
                              title="Drag corner to scale text size"
                            />

                            {/* Edge handles for box resizing */}
                            <div
                              onMouseDown={(e) => handleTextOverlayEdgeResizeMouseDown(e, txt, 'left')}
                              className="absolute top-[4px] bottom-[4px] left-[-4px] w-2 cursor-ew-resize z-40 bg-transparent"
                              title="Drag edge to resize width"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayEdgeResizeMouseDown(e, txt, 'right')}
                              className="absolute top-[4px] bottom-[4px] right-[-4px] w-2 cursor-ew-resize z-40 bg-transparent"
                              title="Drag edge to resize width"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayEdgeResizeMouseDown(e, txt, 'top')}
                              className="absolute left-[4px] right-[4px] top-[-4px] h-2 cursor-ns-resize z-40 bg-transparent"
                              title="Drag edge to resize height"
                            />
                            <div
                              onMouseDown={(e) => handleTextOverlayEdgeResizeMouseDown(e, txt, 'bottom')}
                              className="absolute left-[4px] right-[4px] bottom-[-4px] h-2 cursor-ns-resize z-40 bg-transparent"
                              title="Drag edge to resize height"
                            />
                          </>
                        )}
                      </div>
                    )
                  })}

                  {/* Logo overlay layer */}
                  {logo.enabled && logo.url && (
                    <img
                      src={resolveUrl(logo.url)}
                      alt="Logo Overlay"
                      className={`absolute z-30 transition-all ${
                        logo.position === 'top-left' ? 'top-4 left-4' :
                        logo.position === 'top-right' ? 'top-4 right-4' :
                        logo.position === 'bottom-left' ? 'bottom-4 left-4' :
                        'bottom-4 right-4'
                      }`}
                      style={{
                        width: `${logo.size}px`,
                        opacity: logo.opacity,
                      }}
                    />
                  )}
                </div>

                {/* White Flash overlay (above wrapper, below controls) */}
                {flashOpacity > 0 && (
                  <div 
                    className="absolute inset-0 bg-white pointer-events-none z-35"
                    style={{ opacity: flashOpacity }}
                  />
                )}

                {/* Audio sync player */}
                <audio
                  ref={previewAudioRef}
                  className="hidden"
                />

                {/* Active VFX audio SFX */}
                {vfxTrack
                  .filter((v) => v.hasAudio && v.start <= currentTime && v.end >= currentTime)
                  .map((v) => (
                    <audio
                      key={v.id}
                      src={resolveUrl(`/static/sfx/${v.effectId}.mp3`)}
                      className="hidden"
                      ref={(el) => {
                        if (el) {
                          const offset = currentTime - v.start
                          if (Math.abs(el.currentTime - offset) > 0.25) {
                            el.currentTime = offset
                          }
                          el.volume = (v.audioVolume !== undefined ? v.audioVolume : 1.0) * playerVolume
                          el.muted = isMuted
                          if (isPlaying && el.paused) {
                            el.play().catch(() => {})
                          } else if (!isPlaying && !el.paused) {
                            el.pause()
                          }
                        }
                      }}
                    />
                  ))}

                {/* Controls Overlay inside video preview */}
                <div 
                  className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-40 transition-opacity duration-300 flex flex-col space-y-2.5 ${
                    showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {/* Seek Bar (Slider) */}
                  <div className="flex items-center gap-2.5 w-full">
                    <span className="font-mono text-[9px] text-white shrink-0">{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min="0"
                      max={totalDuration}
                      step="0.05"
                      value={currentTime}
                      onChange={(e) => {
                        setCurrentTime(parseFloat(e.target.value) || 0)
                        setIsPlaying(false) // pause on scrubbing
                      }}
                      className="flex-1 accent-accent h-1 bg-white/20 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[9px] text-white text-right shrink-0">{formatTime(totalDuration)}</span>
                  </div>

                  {/* Control Buttons Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                         onClick={() => setIsPlaying(!isPlaying)}
                         className="w-7 h-7 rounded-full bg-accent hover:bg-purple-600 text-white flex items-center justify-center cursor-pointer transition-colors shadow-lg"
                      >
                        {isPlaying ? <FiPause size={10} /> : <FiPlay size={10} className="ml-0.5" />}
                      </button>
                      <button
                        onClick={() => setCurrentTime(0.0)}
                        title="Rewind to Start"
                        className="p-1 rounded-lg text-neutral-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <FiRotateCcw size={11} />
                      </button>

                      {/* Player Volume Controls */}
                      <div className="h-3 w-px bg-white/10 mx-0.5" />

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? "Unmute" : "Mute"}
                        className="p-1 rounded-lg text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                      >
                        {isMuted ? <FiVolumeX size={12} className="text-red-400" /> : <FiVolume2 size={12} />}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={playerVolume}
                        onChange={(e) => {
                          setPlayerVolume(parseFloat(e.target.value))
                          if (isMuted) setIsMuted(false)
                        }}
                        className="w-12 accent-accent h-1 bg-white/20 rounded-lg cursor-pointer"
                        title={`Volume: ${Math.round(playerVolume * 100)}%`}
                      />
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        className="p-1 rounded-lg text-neutral-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                      >
                        {isFullscreen ? <FiMinimize size={12} /> : <FiMaximize size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Panel: Properties & Effects controls */}
          <div className="w-80 border-l flex flex-col shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-black/[0.15]">
            <div className="p-4 border-b border-white/[0.04] [data-theme='day']_&:border-black/[0.05] flex items-center gap-2 text-accent shrink-0">
              <FiSliders size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-surface-300">Property inspector</span>
            </div>

            {selectedClip && selectedTrackType === 'video' && (
              <div className="flex border-b border-white/[0.04] [data-theme='day']_&:border-black/[0.05] p-2 gap-1 bg-black/5 shrink-0">
                <button
                  onClick={() => setActiveInspectorTab('properties')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeInspectorTab === 'properties'
                      ? 'bg-white/5 text-white-force'
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Properties
                </button>
                <button
                  onClick={() => setActiveInspectorTab('effects')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeInspectorTab === 'effects'
                      ? 'bg-white/5 text-white-force'
                      : 'text-surface-500 hover:text-surface-300'
                  }`}
                >
                  Filters & Effects
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedClip ? (
                <div className="space-y-4 text-[11px]">
                  {/* Clip ID Details */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-surface-500">Selected Clip</p>
                    <p className="font-semibold text-white leading-tight truncate">{selectedClip.name || selectedClip.text || 'Text Overlay'}</p>
                    <p className="text-[9px] font-mono text-surface-500">Track: {selectedTrackType.toUpperCase()}</p>
                  </div>

                  <div className="h-px bg-white/[0.04] my-2" />

                  {/* Render Tab Contents */}
                  {selectedTrackType === 'video' && activeInspectorTab === 'effects' ? (
                    // Filters & Effects Tab
                    <div className="space-y-4">

                      {/* Reset and Apply to All Toolbar */}
                      <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={handleResetFilters}
                            className="py-1.5 px-3 rounded-lg border border-red-500/20 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Reset All Effects</span>
                          </button>
                        </div>
                        <div className="h-px bg-white/[0.04] my-0.5" />
                        <div className="flex justify-between items-center text-[10.5px] text-surface-400">
                          <span className="font-semibold">Apply to all timeline clips</span>
                          <input 
                            type="checkbox"
                            checked={applyFiltersToAll}
                            onChange={(e) => handleApplyToAllChange(e.target.checked)}
                            className="accent-accent cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.04] my-2" />

                      {/* Creative Presets Gallery */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9.5px] font-bold uppercase tracking-widest text-surface-500">
                          <span>Creative Presets</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          {PRESETS.slice(presetPage * 4, (presetPage + 1) * 4).map((preset) => {
                            const active = isActivePreset(preset);
                            return (
                              <div
                                key={preset.id}
                                onClick={() => handleUpdateFilterProperty(preset.filters)}
                                className={`relative aspect-video rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
                                  active
                                    ? 'border-accent shadow-[0_0_12px_rgba(139,92,246,0.3)] ring-1 ring-accent'
                                    : 'border-white/10 hover:border-white/30 bg-black/40'
                                }`}
                              >
                                {/* Preset Live Video Preview */}
                                <video
                                  src={resolveUrl(selectedClip.url)}
                                  muted
                                  className="w-full h-full object-cover select-none pointer-events-none"
                                  style={{
                                    filter: [
                                      `brightness(${1.0 + (preset.filters.brightness || 0)})`,
                                      `contrast(${preset.filters.contrast || 1.0})`,
                                      `blur(${preset.filters.blur || 0}px)`,
                                      preset.filters.grayscale ? 'grayscale(100%)' : '',
                                      preset.filters.sepia ? 'sepia(100%)' : '',
                                      preset.filters.invert ? 'invert(100%)' : '',
                                      preset.filters.saturation !== undefined ? `saturate(${preset.filters.saturation})` : '',
                                      preset.filters.hueRotate !== undefined ? `hue-rotate(${preset.filters.hueRotate}deg)` : '',
                                      preset.filters.edgeDetect ? 'grayscale(100%) contrast(500%) invert(100%)' : '',
                                      preset.filters.sharpen ? 'contrast(1.15) brightness(1.03)' : '',
                                    ].filter(Boolean).join(' '),
                                    transform: `scaleX(${preset.filters.mirrorH ? -1 : 1}) scaleY(${preset.filters.mirrorV ? -1 : 1})`
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const clipTime = Math.max(0, Math.min(selectedClip.end - selectedClip.start, currentTime - selectedClip.start))
                                      const targetTime = selectedClip.sourceStart + clipTime
                                      if (Math.abs(el.currentTime - targetTime) > 0.3) {
                                        el.currentTime = targetTime
                                      }
                                    }
                                  }}
                                />
                                {/* Preset Vignette Overlay */}
                                {preset.filters.vignette > 0 && (
                                  <div
                                    className="absolute inset-0 pointer-events-none z-10"
                                    style={{
                                      background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${preset.filters.vignette}) 100%)`
                                    }}
                                  />
                                )}
                                {/* Glassmorphic Banner */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent p-1 px-2 text-[9px] font-bold text-white tracking-wide truncate transition-colors duration-300 group-hover:from-black/90">
                                  {preset.name}
                                </div>
                                {/* Active Checkmark Badge */}
                                {active && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                                    <FiCheckCircle size={10} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Presets Pagination Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => setPresetPage(p => Math.max(0, p - 1))}
                            disabled={presetPage === 0}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase rounded bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => setPresetPage(p => Math.min(Math.ceil(PRESETS.length / 4) - 1, p + 1))}
                            disabled={presetPage === Math.ceil(PRESETS.length / 4) - 1}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase rounded bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.04] my-2" />

                      {/* Color & Light adjustments */}
                      <div className="space-y-3">
                        <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Color & Light</p>
                        
                        {/* Brightness */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Brightness</span>
                            <span>{selectedClip.brightness > 0 ? '+' : ''}{Math.round(selectedClip.brightness * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="-0.5"
                            max="0.5"
                            step="0.05"
                            value={selectedClip.brightness || 0.0}
                            onChange={(e) => handleUpdateFilterProperty({ brightness: parseFloat(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Contrast */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Contrast</span>
                            <span>{Math.round((selectedClip.contrast ?? 1.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={selectedClip.contrast ?? 1.0}
                            onChange={(e) => handleUpdateFilterProperty({ contrast: parseFloat(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Saturation */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Saturation</span>
                            <span>{Math.round((selectedClip.saturation ?? 1.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.0"
                            max="3.0"
                            step="0.1"
                            value={selectedClip.saturation ?? 1.0}
                            onChange={(e) => handleUpdateFilterProperty({ saturation: parseFloat(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Hue Rotate */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Hue Rotate</span>
                            <span>{selectedClip.hueRotate ?? 0}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="5"
                            value={selectedClip.hueRotate ?? 0}
                            onChange={(e) => handleUpdateFilterProperty({ hueRotate: parseInt(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.04] my-2" />

                      {/* Lens & Focus */}
                      <div className="space-y-3">
                        <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Lens & Focus</p>

                        {/* Blur */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Blur Strength</span>
                            <span>{selectedClip.blur || 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={selectedClip.blur || 0.0}
                            onChange={(e) => handleUpdateFilterProperty({ blur: parseFloat(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        {/* Vignette */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                            <span>Vignette Strength</span>
                            <span>{Math.round((selectedClip.vignette || 0.0) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedClip.vignette || 0.0}
                            onChange={(e) => handleUpdateFilterProperty({ vignette: parseFloat(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="h-px bg-white/[0.04] my-2" />

                      {/* Creative Effects Gallery */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-[9.5px] font-bold uppercase tracking-widest text-surface-500">
                          <span>Creative Effects</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2.5">
                          {CREATIVE_EFFECTS.slice(effectsPage * 4, (effectsPage + 1) * 4).map((effect) => {
                            const active = isCreativeEffectActive(effect);
                            return (
                              <div
                                key={effect.id}
                                onClick={() => handleToggleCreativeEffect(effect)}
                                className={`relative aspect-video rounded-xl overflow-hidden border cursor-pointer group transition-all duration-300 ${
                                  active
                                    ? 'border-accent shadow-[0_0_12px_rgba(139,92,246,0.3)] ring-1 ring-accent'
                                    : 'border-white/10 hover:border-white/30 bg-black/40'
                                }`}
                              >
                                {/* Effect Live Video Preview */}
                                <video
                                  src={resolveUrl(selectedClip.url)}
                                  muted
                                  className="w-full h-full object-cover select-none pointer-events-none"
                                  style={{
                                    filter: [
                                      effect.id === 'grayscale' ? 'grayscale(100%)' : '',
                                      effect.id === 'sepia' ? 'sepia(100%)' : '',
                                      effect.id === 'invert' ? 'invert(100%)' : '',
                                      effect.id === 'edgeDetect' ? 'grayscale(100%) contrast(500%) invert(100%)' : '',
                                      effect.id === 'sharpen' ? 'contrast(1.15) brightness(1.03)' : '',
                                      effect.id === 'blur' ? 'blur(3px)' : '',
                                    ].filter(Boolean).join(' '),
                                    transform: `scaleX(${effect.id === 'mirrorH' ? -1 : 1}) scaleY(${effect.id === 'mirrorV' ? -1 : 1})`
                                  }}
                                  ref={(el) => {
                                    if (el) {
                                      const clipTime = Math.max(0, Math.min(selectedClip.end - selectedClip.start, currentTime - selectedClip.start))
                                      const targetTime = selectedClip.sourceStart + clipTime
                                      if (Math.abs(el.currentTime - targetTime) > 0.3) {
                                        el.currentTime = targetTime
                                      }
                                    }
                                  }}
                                />
                                {/* Effect Vignette Overlay */}
                                {effect.id === 'vignette' && (
                                  <div
                                    className="absolute inset-0 pointer-events-none z-10"
                                    style={{
                                      background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,0.4) 100%)`
                                    }}
                                  />
                                )}
                                {/* Glassmorphic Banner */}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/55 to-transparent p-1 px-2 text-[9px] font-bold text-white tracking-wide truncate transition-colors duration-300 group-hover:from-black/90">
                                  {effect.name}
                                </div>
                                {/* Active Checkmark Badge */}
                                {active && (
                                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                                    <FiCheckCircle size={10} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Effects Pagination Controls */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => setEffectsPage(p => Math.max(0, p - 1))}
                            disabled={effectsPage === 0}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase rounded bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => setEffectsPage(p => Math.min(Math.ceil(CREATIVE_EFFECTS.length / 4) - 1, p + 1))}
                            disabled={effectsPage === Math.ceil(CREATIVE_EFFECTS.length / 4) - 1}
                            className="px-2.5 py-1 text-[9px] font-bold uppercase rounded bg-white/5 text-neutral-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Properties Tab (For video properties or non-video tracks)
                    <div className="space-y-4">
                      {/* Sizing Details */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className={selectedTrackType === 'text' ? 'col-span-2' : ''}>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Timeline Start</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.start ? selectedClip.start.toFixed(1) : '0.0'}
                            onChange={(e) => moveClip(selectedClip.id, selectedTrackType, parseFloat(e.target.value) || 0)}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                        {selectedTrackType !== 'text' && (
                          <div>
                            <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Trim Start</span>
                            <input
                              type="number"
                              step="0.1"
                              value={selectedClip.sourceStart ? selectedClip.sourceStart.toFixed(1) : '0.0'}
                              onChange={(e) => trimClip(selectedClip.id, selectedTrackType, 'start', parseFloat(e.target.value) || 0)}
                              className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                                isDayMode 
                                  ? 'bg-white border-black/10 text-neutral-800' 
                                  : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                              }`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Video specific audio & fade properties */}
                      {selectedTrackType === 'video' && (
                        <div className="space-y-3">
                          <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Audio Controls</p>
                          
                          {/* Volume */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                              <span>Volume</span>
                              <span>{Math.round((selectedClip.volume ?? 1.0) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.05"
                              value={selectedClip.volume ?? 1.0}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'video', { volume: parseFloat(e.target.value) })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          <div className="h-px bg-white/[0.04] my-2" />

                          <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Transitions</p>

                          {/* Video Fade in / out */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Fade In (s)</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedClip.fadeIn || 0}
                                onChange={(e) => updateClipProperties(selectedClip.id, 'video', { fadeIn: parseFloat(e.target.value) || 0 })}
                                className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                                  isDayMode 
                                    ? 'bg-white border-black/10 text-neutral-800' 
                                    : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                                }`}
                              />
                            </div>
                            <div>
                              <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Fade Out (s)</span>
                              <input
                                type="number"
                                step="0.1"
                                value={selectedClip.fadeOut || 0}
                                onChange={(e) => updateClipProperties(selectedClip.id, 'video', { fadeOut: parseFloat(e.target.value) || 0 })}
                                className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                                  isDayMode 
                                    ? 'bg-white border-black/10 text-neutral-800' 
                                    : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Filters */}
                  {selectedTrackType === 'audio' && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Audio Controls</p>
                      
                      {/* Volume */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                          <span>Volume</span>
                          <span>{Math.round(selectedClip.volume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.05"
                          value={selectedClip.volume}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'audio', { volume: parseFloat(e.target.value) })}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Fade in / out */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Fade In (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.fadeIn}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'audio', { fadeIn: parseFloat(e.target.value) || 0 })}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Fade Out (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.fadeOut}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'audio', { fadeOut: parseFloat(e.target.value) || 0 })}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Text Properties */}
                  {selectedTrackType === 'text' && (
                    <div className="space-y-3.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">Text Customization</p>
                      
                      {/* Text Input */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Content</span>
                        <textarea
                          value={selectedClip.text || ''}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { text: e.target.value })}
                          className={`w-full text-[11px] font-semibold border rounded-lg p-2.5 focus:outline-none h-16 resize-none ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                        />
                      </div>

                      {/* Font Family Selection */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Font Style</span>
                        <select
                          value={selectedClip.fontFamily || 'Sofia Sans'}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontFamily: e.target.value })}
                          className={`w-full text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                          style={{ fontFamily: selectedClip.fontFamily || 'Sofia Sans' }}
                        >
                          <option value="Sofia Sans" style={{ fontFamily: 'Sofia Sans' }}>Sofia Sans (Modern)</option>
                          <option value="Poppins" style={{ fontFamily: 'Poppins' }}>Poppins (Clean Sans)</option>
                          <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat (Tech Sans)</option>
                          <option value="Playfair Display" style={{ fontFamily: 'Playfair Display' }}>Playfair Display (Elegant Serif)</option>
                          <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New (Screenplay Mono)</option>
                          <option value="Impact" style={{ fontFamily: 'Impact' }}>Impact (Bold Display)</option>
                        </select>
                      </div>

                      {/* Font Size & Alignment */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                            <span>Size</span>
                            <span>{selectedClip.fontSize || 28}px</span>
                          </div>
                          <input
                            type="range"
                            min="12"
                            max="72"
                            step="1"
                            value={selectedClip.fontSize || 28}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontSize: parseInt(e.target.value) })}
                            className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Alignment</span>
                          <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5 p-0.5">
                            {['left', 'center', 'right'].map((alignOpt) => (
                              <button
                                key={alignOpt}
                                onClick={() => updateClipProperties(selectedClip.id, 'text', { align: alignOpt })}
                                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-md transition-colors ${
                                  (selectedClip.align || 'center') === alignOpt
                                    ? 'bg-accent text-white'
                                    : 'text-surface-400 hover:text-white'
                                }`}
                              >
                                {alignOpt === 'left' ? 'L' : alignOpt === 'center' ? 'C' : 'R'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Text Style: Bold & Italic Toggles */}
                      <div className="flex gap-2.5">
                        <button
                          onClick={() => updateClipProperties(selectedClip.id, 'text', { bold: !selectedClip.bold })}
                          className={`flex-1 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            selectedClip.bold 
                              ? 'bg-accent/20 border-accent text-white font-black' 
                              : 'border-white/10 text-surface-400 hover:text-white'
                          }`}
                        >
                          Bold
                        </button>
                        <button
                          onClick={() => updateClipProperties(selectedClip.id, 'text', { italic: !selectedClip.italic })}
                          className={`flex-1 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            selectedClip.italic 
                              ? 'bg-accent/20 border-accent text-white italic' 
                              : 'border-white/10 text-surface-400 hover:text-white'
                          }`}
                        >
                          Italic
                        </button>
                      </div>

                      {/* Font Color Picker & Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Text Color</span>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={(selectedClip.fontColor || '#ffffff').startsWith('#') ? selectedClip.fontColor || '#ffffff' : '#ffffff'}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontColor: e.target.value })}
                            className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={selectedClip.fontColor || '#ffffff'}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontColor: e.target.value })}
                            className={`flex-1 text-[11px] font-mono border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>

                        {/* Premium Preset Palettes */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {[
                            '#ffffff', // White
                            '#f5f5dc', // Cream
                            '#fef08a', // Soft Yellow
                            '#fbbf24', // Yellow
                            '#f87171', // Red
                            '#86efac', // Green
                            '#67e8f9', // Cyan
                            '#f472b6', // Pink
                            '#c084fc', // Purple
                          ].map((colorHex) => (
                            <button
                              key={colorHex}
                              onClick={() => updateClipProperties(selectedClip.id, 'text', { fontColor: colorHex })}
                              className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110 cursor-pointer shadow-md"
                              style={{ backgroundColor: colorHex }}
                              title={colorHex}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Text Glow / Shadow Customizer */}
                      <div className="space-y-2 border border-white/5 bg-white/[0.02] p-2.5 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-surface-400">Text Shadow / Outline</span>
                          <input
                            type="checkbox"
                            checked={selectedClip.shadowEnabled !== false}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { shadowEnabled: e.target.checked })}
                            className="accent-accent cursor-pointer"
                          />
                        </div>

                        {selectedClip.shadowEnabled !== false && (
                          <div className="space-y-2 pt-1 transition-opacity">
                            {/* Blur range */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-surface-500 uppercase font-semibold">
                                <span>Glow Blur</span>
                                <span>{selectedClip.shadowBlur || 4}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="15"
                                step="1"
                                value={selectedClip.shadowBlur || 4}
                                onChange={(e) => updateClipProperties(selectedClip.id, 'text', { shadowBlur: parseInt(e.target.value) })}
                                className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                              />
                            </div>
                            
                            {/* Glow Color */}
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-surface-555 uppercase font-semibold">Glow Color</span>
                              <input
                                type="color"
                                value={selectedClip.shadowColor || '#000000'}
                                onChange={(e) => updateClipProperties(selectedClip.id, 'text', { shadowColor: e.target.value })}
                                className="w-6 h-6 rounded border border-white/10 cursor-pointer bg-transparent"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Y alignment */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase font-bold">Y-Position Preset</span>
                        <select
                          value={selectedClip.y || 'bottom'}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { y: e.target.value })}
                          className={`w-full text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                        >
                          <option value="top">Top Third</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom Third</option>
                        </select>
                      </div>

                      {/* Start / End Duration */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Start (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.start.toFixed(1)}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { start: parseFloat(e.target.value) || 0 })}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">End (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.end.toFixed(1)}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { end: parseFloat(e.target.value) || 0 })}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VFX Properties */}
                  {selectedTrackType === 'vfx' && (
                    <div className="space-y-3.5 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-surface-500">VFX Configuration</p>
                      
                      {/* Timeline Duration details */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Timeline Start (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedClip.start.toFixed(1)}
                            onChange={(e) => moveClip(selectedClip.id, 'vfx', parseFloat(e.target.value) || 0)}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Duration (s)</span>
                          <input
                            type="number"
                            step="0.1"
                            value={(selectedClip.end - selectedClip.start).toFixed(1)}
                            onChange={(e) => {
                              const dur = parseFloat(e.target.value) || 0.2
                              updateClipProperties(selectedClip.id, 'vfx', { end: selectedClip.start + dur })
                            }}
                            className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                      </div>

                      {selectedClip.type !== 'camera_fx' ? (
                        <>
                          {/* Scale */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                              <span>Scale</span>
                              <span>{Math.round((selectedClip.scale || 1.0) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="3.0"
                              step="0.05"
                              value={selectedClip.scale || 1.0}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { scale: parseFloat(e.target.value) })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Rotation */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                              <span>Rotation</span>
                              <span>{selectedClip.rotation || 0}°</span>
                            </div>
                            <input
                              type="range"
                              min="-180"
                              max="180"
                              step="5"
                              value={selectedClip.rotation || 0}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { rotation: parseInt(e.target.value) })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Opacity */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                              <span>Opacity</span>
                              <span>{Math.round((selectedClip.opacity !== undefined ? selectedClip.opacity : 1.0) * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="1.0"
                              step="0.05"
                              value={selectedClip.opacity !== undefined ? selectedClip.opacity : 1.0}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { opacity: parseFloat(e.target.value) })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Position X Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                              <span>Position X</span>
                              <span>{getPosPercent(selectedClip.x, 50)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={getPosPercent(selectedClip.x, 50)}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { x: `${e.target.value}%` })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Position Y Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                              <span>Position Y</span>
                              <span>{getPosPercent(selectedClip.y, 50)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={getPosPercent(selectedClip.y, 50)}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { y: `${e.target.value}%` })}
                              className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                            />
                          </div>

                          {/* Blend Mode Selection */}
                          <div className="space-y-1">
                            <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Blend Mode</span>
                            <select
                              value={selectedClip.blendMode || 'screen'}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { blendMode: e.target.value })}
                              className={`w-full text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                                isDayMode 
                                  ? 'bg-white border-black/10 text-neutral-800' 
                                  : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                              }`}
                            >
                              <option value="normal">Normal (Overlay)</option>
                              <option value="screen">Screen (Light overlays)</option>
                              <option value="add">Add (Bright Glows)</option>
                              <option value="lighten">Lighten (Light parts)</option>
                              <option value="multiply">Multiply (Darken overlays)</option>
                            </select>
                          </div>
                        </>
                      ) : (
                        <p className="text-[9.5px] text-surface-500 italic mt-2">
                          Procedural Camera FX properties are hardcoded and optimized for cinematic rendering.
                        </p>
                      )}

                      <div className="h-px bg-white/[0.04] my-2" />

                      {/* VFX Audio properties */}
                      {selectedClip.type !== 'camera_fx' && (
                        <div className="space-y-3.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-surface-400">Play Linked SFX</span>
                            <input
                              type="checkbox"
                              checked={!!selectedClip.hasAudio}
                              onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { hasAudio: e.target.checked })}
                              className="accent-accent cursor-pointer"
                            />
                          </div>

                          {selectedClip.hasAudio && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9.5px] font-semibold text-surface-400 uppercase">
                                <span>SFX Volume</span>
                                <span>{Math.round((selectedClip.audioVolume !== undefined ? selectedClip.audioVolume : 1.0) * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.05"
                                value={selectedClip.audioVolume !== undefined ? selectedClip.audioVolume : 1.0}
                                onChange={(e) => updateClipProperties(selectedClip.id, 'vfx', { audioVolume: parseFloat(e.target.value) })}
                                className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-px bg-white/[0.04] my-2" />

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => duplicateClip(selectedClip.id, selectedTrackType)}
                      className="flex-1 py-2 rounded-lg border border-white/[0.06] text-[10.5px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FiCopy size={11} />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => deleteClip(selectedClip.id, selectedTrackType)}
                      className="flex-1 py-2 rounded-lg border border-red-500/20 text-[10.5px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FiTrash2 size={11} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-surface-500 font-mono text-[10.5px]">
                  Select a clip on the timeline to configure parameters and visual/audio effects.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Multi-track Timeline Panel */}
        <div 
          className="border-t flex flex-col shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-[#08080f]/90 relative z-30 overflow-hidden"
          style={{ height: `${timelineHeight}px` }}
        >
          {/* Timeline Resize Handle */}
          <div
            onMouseDown={handleTimelineResizeMouseDown}
            className="absolute top-0 left-0 right-0 h-1 hover:bg-accent/80 cursor-ns-resize z-50 transition-colors duration-200"
            title="Drag to resize timeline"
          />
          
          {/* Timeline Toolbar */}
          <div className="h-10 border-b border-white/[0.04] [data-theme='day']_&:border-black/[0.05] flex items-center justify-between px-6 shrink-0 bg-black/10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => addTextOverlay("New Text overlay", currentTime, currentTime + 4.0)}
                title="Add Text Overlay"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-200 cursor-pointer flex items-center justify-center border border-white/[0.05]"
              >
                <FiType size={11} />
              </button>

              <div className="h-4 w-px bg-white/[0.08]" />

              {/* Undo / Redo Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  title="Undo"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center justify-center border border-white/[0.05]"
                >
                  <FiCornerUpLeft size={11} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  title="Redo"
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-surface-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer flex items-center justify-center border border-white/[0.05]"
                >
                  <FiCornerUpRight size={11} />
                </button>
              </div>

              <div className="h-4 w-px bg-white/[0.08]" />

              {/* Clip Actions (Split Left, Split, Split Right, Delete) */}
              <div className="flex items-center gap-1">
                <button
                  onClick={splitLeft}
                  disabled={!selectedClipId || selectedTrackType === 'text'}
                  title="Split Left (Trim start to playhead)"
                  className="p-1.5 rounded-lg border border-white/[0.08] text-surface-200 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer bg-white/5"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <path d="M 7 5 H 4 V 19 H 7" strokeDasharray="3 2" opacity="0.35" />
                    <path d="M 17 5 H 20 V 19 H 17" />
                  </svg>
                </button>
                
                <button
                  onClick={splitClipAtPlayhead}
                  disabled={!selectedClipId || selectedTrackType === 'text'}
                  title="Split Clip at Playhead"
                  className="p-1.5 rounded-lg border border-white/[0.08] text-surface-200 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer bg-white/5"
                >
                  <FiScissors size={11} />
                </button>

                <button
                  onClick={splitRight}
                  disabled={!selectedClipId || selectedTrackType === 'text'}
                  title="Split Right (Trim playhead to end)"
                  className="p-1.5 rounded-lg border border-white/[0.08] text-surface-200 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer bg-white/5"
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="3" x2="12" y2="21" />
                    <path d="M 7 5 H 4 V 19 H 7" />
                    <path d="M 17 5 H 20 V 19 H 17" strokeDasharray="3 2" opacity="0.35" />
                  </svg>
                </button>

                <div className="h-4 w-px bg-white/[0.08] mx-1" />

                <button
                  onClick={() => deleteClip(selectedClipId, selectedTrackType)}
                  disabled={!selectedClipId}
                  title="Delete Selected Clip"
                  className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center cursor-pointer bg-red-500/5"
                >
                  <FiTrash2 size={11} />
                </button>
              </div>

              <div className="h-4 w-px bg-white/[0.08]" />

              {/* Snap Settings */}
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  id="snap-chk"
                  checked={snapEnabled}
                  onChange={(e) => setSnapEnabled(e.target.checked)}
                  className="accent-accent cursor-pointer"
                />
                <label htmlFor="snap-chk" className="text-[10px] font-bold uppercase tracking-wider text-surface-400 cursor-pointer select-none">
                  Snap Edges
                </label>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom(Math.max(5, zoom - 5))}
                className="p-1 rounded text-surface-400 hover:text-white transition-colors cursor-pointer"
              >
                <FiZoomOut size={13} />
              </button>
              <span className="text-[9px] font-mono text-surface-555">Zoom: {zoom}px/s</span>
              <button
                onClick={() => setZoom(Math.min(50, zoom + 5))}
                className="p-1 rounded text-surface-400 hover:text-white transition-colors cursor-pointer"
              >
                <FiZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Tracks Area (Video, Audio, Text Tracks) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 flex" ref={timelineScrollRef}>
            
            {/* Headers Left Column */}
            <div className="w-24 border-r border-white/[0.04] [data-theme='day']_&:border-black/[0.05] shrink-0 bg-black/20 flex flex-col font-mono text-[9px] font-black uppercase text-surface-500 select-none">
              <div className="h-6 border-b border-white/[0.03] flex items-center px-3 tracking-widest shrink-0">Ruler</div>
              <div className="h-16 border-b border-white/[0.03] flex items-center px-3 tracking-widest">Video v1</div>
              <div className="h-16 border-b border-white/[0.03] flex items-center px-3 tracking-widest">Audio a1</div>
              <div className="h-16 border-b border-white/[0.03] flex items-center px-3 tracking-widest">Text t1</div>
              <div className="h-16 flex items-center px-3 tracking-widest">VFX fx1</div>
            </div>

            {/* Scrollable Tracks Canvas */}
            <div 
              className="flex-1 overflow-x-auto overflow-y-hidden relative flex flex-col"
              onScroll={(e) => {
                // Keep the scroll in sync if needed
              }}
            >
              {/* Timeline Ruler */}
              <div 
                className="h-6 border-b border-white/[0.03] relative bg-black/5 select-none shrink-0"
                style={{ width: `${Math.max(totalDuration * zoom + 300, 1200)}px` }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  setCurrentTime(Math.max(0, clickX / zoom))
                }}
              >
                {/* 1-second ticks on the ruler */}
                {Array.from({ length: totalDuration > 0 ? Math.ceil(totalDuration) + 15 : 0 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 h-2 border-l border-white/10 text-[7.5px] font-mono text-surface-600 pl-1 leading-none pb-0.5"
                    style={{ left: `${i * zoom}px` }}
                  >
                    {i % 5 === 0 ? `${i}s` : ''}
                  </div>
                ))}

                {/* Timeline Current Time Indicator Needle */}
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-accent z-40 pointer-events-none"
                  style={{ left: `${currentTime * zoom}px` }}
                >
                  <div className="w-2.5 h-2.5 bg-accent rounded-full -ml-1 -mt-0.5 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                </div>
              </div>

              {/* Tracks wrapper (Video, Audio, Text) */}
              <div 
                className="flex-1 relative flex flex-col min-h-0"
                style={{ width: `${Math.max(totalDuration * zoom + 300, 1200)}px` }}
              >
                
                {/* Video Track Row */}
                <div className="h-16 border-b border-white/[0.03] relative flex items-center bg-white/[0.005]">
                  {videoTrack.map((clip) => {
                    const isSelected = selectedClipId === clip.id
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedTrackType('video')
                        }}
                        className={`absolute h-12 rounded-xl flex items-center px-3 font-semibold text-[10.5px] cursor-pointer shadow-lg group select-none border transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-accent/70 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                            : 'bg-purple-950/40 border-purple-800/30 hover:border-purple-600/50 text-purple-200'
                        }`}
                        style={{
                          left: `${clip.start * zoom}px`,
                          width: `${(clip.end - clip.start) * zoom}px`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'video', 'move')}
                      >
                        {/* Trim handlers */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-l-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'video', 'trim-start')}
                        />
                        <span className="truncate flex-1 select-none pr-2">{clip.name}</span>
                        <span className="text-[8.5px] font-mono opacity-60">{(clip.end - clip.start).toFixed(1)}s</span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-r-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'video', 'trim-end')}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Audio Track Row */}
                <div className="h-16 border-b border-white/[0.03] relative flex items-center bg-white/[0.005]">
                  {audioTrack.map((clip) => {
                    const isSelected = selectedClipId === clip.id
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedTrackType('audio')
                        }}
                        className={`absolute h-12 rounded-xl flex items-center px-3 font-semibold text-[10.5px] cursor-pointer shadow-lg group select-none border transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-accent/70 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                            : 'bg-cyan-950/40 border-cyan-800/30 hover:border-cyan-600/50 text-cyan-200'
                        }`}
                        style={{
                          left: `${clip.start * zoom}px`,
                          width: `${(clip.end - clip.start) * zoom}px`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'audio', 'move')}
                      >
                        {/* Trim handlers */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-l-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'audio', 'trim-start')}
                        />
                        <span className="truncate flex-1 select-none pr-2">🔊 {clip.name}</span>
                        <span className="text-[8.5px] font-mono opacity-60">{(clip.end - clip.start).toFixed(1)}s</span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-r-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'audio', 'trim-end')}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Text Track Row */}
                <div className="h-16 border-b border-white/[0.03] relative flex items-center bg-white/[0.005]">
                  {textTrack.map((clip) => {
                    const isSelected = selectedClipId === clip.id
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedTrackType('text')
                        }}
                        className={`absolute h-12 rounded-xl flex items-center px-3 font-semibold text-[10.5px] cursor-pointer shadow-lg group select-none border transition-all ${
                          isSelected
                            ? 'bg-accent/20 border-accent/70 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                            : 'bg-amber-950/40 border-amber-800/30 hover:border-amber-600/50 text-amber-200'
                        }`}
                        style={{
                          left: `${clip.start * zoom}px`,
                          width: `${(clip.end - clip.start) * zoom}px`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'text', 'move')}
                      >
                        {/* Trim handlers */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-l-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'text', 'trim-start')}
                        />
                        <span className="truncate flex-1 select-none pr-2">💬 {clip.text}</span>
                        <span className="text-[8.5px] font-mono opacity-60">{(clip.end - clip.start).toFixed(1)}s</span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-r-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'text', 'trim-end')}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* VFX Track Row */}
                <div className="h-16 relative flex items-center bg-white/[0.005]">
                  {vfxTrack.map((clip) => {
                    const isSelected = selectedClipId === clip.id
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedClipId(clip.id)
                          setSelectedTrackType('vfx')
                        }}
                        className={`absolute h-12 rounded-xl flex items-center px-3 font-semibold text-[10.5px] cursor-pointer shadow-lg group select-none border transition-all ${
                          isSelected
                            ? 'bg-purple-900/35 border-accent/80 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                            : 'bg-indigo-950/40 border-indigo-850/30 hover:border-indigo-600/50 text-indigo-200'
                        }`}
                        style={{
                          left: `${clip.start * zoom}px`,
                          width: `${(clip.end - clip.start) * zoom}px`,
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip, 'vfx', 'move')}
                      >
                        {/* Trim handlers */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-l-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'vfx', 'trim-start')}
                        />
                        <span className="truncate flex-1 select-none pr-2">
                          {clip.type === 'camera_fx' ? '🎥' : '✨'} {clip.name}
                        </span>
                        <span className="text-[8.5px] font-mono opacity-60">{(clip.end - clip.start).toFixed(1)}s</span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 hover:bg-accent/80 rounded-r-xl cursor-ew-resize transition-colors"
                          onMouseDown={(e) => handleClipMouseDown(e, clip, 'vfx', 'trim-end')}
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Playhead indicator bar (inside tracks area) */}
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-accent/40 pointer-events-none z-30"
                  style={{ left: `${currentTime * zoom}px` }}
                />

              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Export Process Overlay Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#090912] border border-white/[0.08] rounded-2xl p-6 w-[420px] max-w-full space-y-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3">
              <FiLoader size={20} className="animate-spin text-accent" />
              <span className="text-sm font-bold uppercase tracking-wider text-white">Exporting Video Package</span>
            </div>
            
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Assembling timeline tracks and exporting video. Do not close this window.
            </p>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-mono text-surface-500">
                <span>Rendering Status: {exportStatus.toUpperCase()}</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-accent to-purple-600 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Completion Modal */}
      {exportStatus === 'completed' && exportUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#090912] border border-white/[0.08] rounded-2xl p-6 w-[420px] max-w-full text-center space-y-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
            <FiCheckCircle size={44} className="mx-auto text-emerald-400" />
            
            <h3 className="text-base font-bold uppercase tracking-wider text-white">Export Completed!</h3>
            
            <p className="text-[11.5px] text-surface-400 leading-relaxed">
              Your video clip has been successfully exported. The file is ready for download.
            </p>

            <video 
              src={exportUrl} 
              controls 
              className="w-full rounded-lg border border-white/10 max-h-40 bg-black object-contain"
            />

            <div className="flex gap-3 pt-2">
              <a
                href={exportUrl}
                download={`export_${Date.now()}.${exportFormat}`}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white font-bold uppercase tracking-widest text-[10.5px] flex items-center justify-center gap-2 hover:bg-purple-600 transition-all"
              >
                <FiDownload size={12} />
                <span>Download {exportFormat.toUpperCase()}</span>
              </a>
              <button
                onClick={resetExport}
                className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-surface-400 hover:text-white font-bold uppercase tracking-widest text-[10.5px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Failure Modal */}
      {exportStatus === 'failed' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-[#090912] border border-white/[0.08] rounded-2xl p-6 w-[420px] max-w-full text-center space-y-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
            <FiAlertCircle size={44} className="mx-auto text-red-400" />
            
            <h3 className="text-base font-bold uppercase tracking-wider text-white">Export Failed</h3>
            
            <p className="text-[11.5px] text-surface-400 leading-relaxed">
              An error occurred during video rendering. Details below:
            </p>

            <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-left text-[10px] font-mono text-red-300 max-h-32 overflow-y-auto">
              {exportError}
            </div>

            <button
              onClick={resetExport}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10.5px] transition-all"
            >
              Back to Editor
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
