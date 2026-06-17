import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { apiBaseUrl } from '../services/apiClient'

const EditorContext = createContext(null)

// Hardcoded premium assets available out of the box
const initialSampleAssets = [
  {
    id: 'robot_transform.mp4',
    name: 'Robot Transform (CGI Sci-Fi)',
    url: '/videos/robot_transform.mp4',
    type: 'video',
    duration: 12.0,
    width: 1920,
    height: 1080,
  },
  {
    id: 'cinematic_noir.mp4',
    name: 'Cinematic Noir (Detective Walk)',
    url: '/videos/cinematic_noir.mp4',
    type: 'video',
    duration: 10.0,
    width: 1920,
    height: 1080,
  },
  {
    id: 'space_odyssey.mp4',
    name: 'Space Odyssey (Nebula View)',
    url: '/videos/space_odyssey.mp4',
    type: 'video',
    duration: 15.0,
    width: 1920,
    height: 1080,
  },
  {
    id: 'documentary_realism.mp4',
    name: 'Documentary Realism (Fisherman)',
    url: '/videos/documentary_realism.mp4',
    type: 'video',
    duration: 14.0,
    width: 1920,
    height: 1080,
  },
  {
    id: 'sci-fi_city.mp4',
    name: 'Sci-Fi Metropolis (Vast Fly-by)',
    url: '/videos/sci-fi_city.mp4',
    type: 'video',
    duration: 18.0,
    width: 1920,
    height: 1080,
  },
  {
    id: 'logo.svg',
    name: 'Director Desk Logo',
    url: '/logo.svg',
    type: 'image',
    duration: 5.0,
    width: 200,
    height: 200,
  }
]

export function EditorProvider({ children }) {
  const [assets, setAssets] = useState(initialSampleAssets)
  const [videoTrack, setVideoTrack] = useState([])
  const [audioTrack, setAudioTrack] = useState([])
  const [textTrack, setTextTrack] = useState([])
  const [logo, setLogo] = useState({
    url: null,
    position: 'top-right',
    size: 80,
    opacity: 0.8,
    enabled: false
  })

  // Playback control state
  const [currentTime, setCurrentTime] = useState(0.0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [zoom, setZoom] = useState(15) // pixels per second
  const [snapEnabled, setSnapEnabled] = useState(true)

  // Selections
  const [selectedClipId, setSelectedClipId] = useState(null)
  const [selectedTrackType, setSelectedTrackType] = useState(null) // 'video', 'audio', 'text'

  // Export properties
  const [resolution, setResolution] = useState('1080p')
  const [isExporting, setIsExporting] = useState(false)
  const [exportTaskId, setExportTaskId] = useState(null)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState('idle') // idle, rendering, completed, failed
  const [exportUrl, setExportUrl] = useState(null)
  const [exportError, setExportError] = useState(null)

  // Timer Ref for preview playback
  const animationFrameRef = useRef(null)
  const lastTimeRef = useRef(null)

  // Ref for holding export polling interval
  const exportIntervalRef = useRef(null)

  // Determine timeline duration
  const totalDuration = Math.max(
    ...videoTrack.map((c) => c.end),
    ...audioTrack.map((c) => c.end),
    ...textTrack.map((t) => t.end),
    10.0
  )

  // Play/Pause ticker
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now()
      const update = () => {
        const now = performance.now()
        const delta = (now - lastTimeRef.current) / 1000.0
        lastTimeRef.current = now

        setCurrentTime((prev) => {
          const next = prev + delta
          if (next >= totalDuration) {
            setIsPlaying(false)
            return 0.0
          }
          return next
        })
        animationFrameRef.current = requestAnimationFrame(update)
      }
      animationFrameRef.current = requestAnimationFrame(update)
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, totalDuration])

  // Asset Uploading
  const uploadAsset = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await fetch(`${apiBaseUrl}/api/editor/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file, // Raw binary
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        }
      })
      if (!response.ok) throw new Error('Upload failed')
      const data = await response.json()
      
      setAssets((prev) => {
        // Avoid duplicate upload registration
        if (prev.some(a => a.id === data.id)) return prev
        return [...prev, data]
      })
      return data
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  // Snap checking helper
  const getSnappedTime = useCallback((time, currentClipId, tracks) => {
    if (!snapEnabled) return time
    const snapThreshold = 0.35 // snap if within 0.35 seconds
    
    // Snapping points: 0, playhead, clip boundaries
    const snapPoints = [0]
    
    tracks.video.forEach((c) => {
      if (c.id !== currentClipId) {
        snapPoints.push(c.start, c.end)
      }
    })
    tracks.audio.forEach((c) => {
      if (c.id !== currentClipId) {
        snapPoints.push(c.start, c.end)
      }
    })

    for (const point of snapPoints) {
      if (Math.abs(time - point) < snapThreshold) {
        return point
      }
    }
    return time
  }, [snapEnabled])

  // Add asset to track
  const addAssetToTimeline = useCallback((asset, trackType, startOffset = 0) => {
    const id = `${asset.id}_${Date.now()}`
    const clipDur = asset.duration || 5.0
    
    const newClip = {
      id,
      name: asset.name,
      url: asset.url,
      start: startOffset,
      end: startOffset + clipDur,
      sourceStart: 0.0,
      sourceEnd: clipDur,
      brightness: 0.0,
      contrast: 1.0,
      blur: 0.0,
      volume: 1.0,
      fadeIn: 0.0,
      fadeOut: 0.0
    }

    if (trackType === 'video') {
      setVideoTrack((prev) => [...prev, newClip])
    } else if (trackType === 'audio') {
      setAudioTrack((prev) => [...prev, newClip])
    }
    
    setSelectedClipId(id)
    setSelectedTrackType(trackType)
  }, [])

  // Split selected clip at playhead
  const splitClipAtPlayhead = useCallback(() => {
    if (!selectedClipId || !selectedTrackType) return

    let currentClips = []
    let setClips = null

    if (selectedTrackType === 'video') {
      currentClips = videoTrack
      setClips = setVideoTrack
    } else if (selectedTrackType === 'audio') {
      currentClips = audioTrack
      setClips = setAudioTrack
    } else {
      return // cannot split text this way
    }

    const clip = currentClips.find((c) => c.id === selectedClipId)
    if (!clip) return

    // Verify playhead is inside clip bounds
    if (currentTime <= clip.start || currentTime >= clip.end) return

    const splitOffset = currentTime - clip.start
    const splitSourceTime = clip.sourceStart + splitOffset

    const leftClip = {
      ...clip,
      end: currentTime,
      sourceEnd: splitSourceTime
    }

    const rightClip = {
      ...clip,
      id: `${clip.id}_split_${Date.now()}`,
      start: currentTime,
      sourceStart: splitSourceTime
    }

    setClips((prev) => {
      const filtered = prev.filter((c) => c.id !== selectedClipId)
      return [...filtered, leftClip, rightClip]
    })

    setSelectedClipId(rightClip.id)
  }, [selectedClipId, selectedTrackType, videoTrack, audioTrack, currentTime])

  // Delete selected clip
  const deleteClip = useCallback((clipId, trackType) => {
    if (trackType === 'video') {
      setVideoTrack((prev) => prev.filter((c) => c.id !== clipId))
    } else if (trackType === 'audio') {
      setAudioTrack((prev) => prev.filter((c) => c.id !== clipId))
    } else if (trackType === 'text') {
      setTextTrack((prev) => prev.filter((c) => c.id !== clipId))
    }
    
    if (selectedClipId === clipId) {
      setSelectedClipId(null)
      setSelectedTrackType(null)
    }
  }, [selectedClipId])

  // Duplicate clip
  const duplicateClip = useCallback((clipId, trackType) => {
    let currentClips = []
    let setClips = null

    if (trackType === 'video') {
      currentClips = videoTrack
      setClips = setVideoTrack
    } else if (trackType === 'audio') {
      currentClips = audioTrack
      setClips = setAudioTrack
    } else if (trackType === 'text') {
      currentClips = textTrack
      setClips = setTextTrack
    } else {
      return
    }

    const clip = currentClips.find((c) => c.id === clipId)
    if (!clip) return

    const duration = clip.end - clip.start
    const newClip = {
      ...clip,
      id: `${clip.id}_dup_${Date.now()}`,
      start: clip.end,
      end: clip.end + duration
    }

    setClips((prev) => [...prev, newClip])
    setSelectedClipId(newClip.id)
    setSelectedTrackType(trackType)
  }, [videoTrack, audioTrack, textTrack])

  // Move clip start/end (Dragging or resizing)
  const moveClip = useCallback((clipId, trackType, newStart) => {
    const handleMove = (prev) => {
      return prev.map((c) => {
        if (c.id === clipId) {
          const duration = c.end - c.start
          const snappedStart = getSnappedTime(newStart, clipId, { video: videoTrack, audio: audioTrack })
          return {
            ...c,
            start: snappedStart,
            end: snappedStart + duration
          }
        }
        return c
      })
    }

    if (trackType === 'video') {
      setVideoTrack(handleMove)
    } else if (trackType === 'audio') {
      setAudioTrack(handleMove)
    } else if (trackType === 'text') {
      setTextTrack((prev) => prev.map((t) => {
        if (t.id === clipId) {
          const dur = t.end - t.start
          return { ...t, start: newStart, end: newStart + dur }
        }
        return t
      }))
    }
  }, [videoTrack, audioTrack, getSnappedTime])

  // Trim clip start/end
  const trimClip = useCallback((clipId, trackType, handleType, newTime) => {
    const handleTrim = (prev) => {
      return prev.map((c) => {
        if (c.id === clipId) {
          if (handleType === 'start') {
            // Trim start must not exceed end
            const actualStart = Math.min(newTime, c.end - 0.2)
            const durationChange = actualStart - c.start
            return {
              ...c,
              start: actualStart,
              sourceStart: Math.min(c.sourceEnd - 0.2, c.sourceStart + durationChange)
            }
          } else {
            // Trim end must not fall below start
            const actualEnd = Math.max(newTime, c.start + 0.2)
            const durationChange = actualEnd - c.end
            return {
              ...c,
              end: actualEnd,
              sourceEnd: Math.max(c.sourceStart + 0.2, c.sourceEnd + durationChange)
            }
          }
        }
        return c
      })
    }

    if (trackType === 'video') {
      setVideoTrack(handleTrim)
    } else if (trackType === 'audio') {
      setAudioTrack(handleTrim)
    } else if (trackType === 'text') {
      setTextTrack((prev) => prev.map((t) => {
        if (t.id === clipId) {
          if (handleType === 'start') {
            return { ...t, start: Math.min(newTime, t.end - 0.1) }
          } else {
            return { ...t, end: Math.max(newTime, t.start + 0.1) }
          }
        }
        return t
      }))
    }
  }, [])

  // Update clip properties (brightness, volume, etc)
  const updateClipProperties = useCallback((clipId, trackType, props) => {
    const handleUpdate = (prev) => prev.map((c) => (c.id === clipId ? { ...c, ...props } : c))
    
    if (trackType === 'video') {
      setVideoTrack(handleUpdate)
    } else if (trackType === 'audio') {
      setAudioTrack(handleUpdate)
    } else if (trackType === 'text') {
      setTextTrack(handleUpdate)
    }
  }, [])

  // Add text overlay
  const addTextOverlay = useCallback((text = "Double click to edit", start = 0, end = 5) => {
    const newText = {
      id: `text_${Date.now()}`,
      text,
      start,
      end,
      x: 'center',
      y: 'bottom',
      fontSize: 28,
      fontColor: '#ffffff'
    }
    setTextTrack((prev) => [...prev, newText])
    setSelectedClipId(newText.id)
    setSelectedTrackType('text')
  }, [])

  // Start FFmpeg Export
  const triggerExport = async () => {
    setIsExporting(true)
    setExportStatus('rendering')
    setExportProgress(0)
    setExportError(null)
    setExportUrl(null)

    const payload = {
      resolution,
      videoTrack,
      audioTrack,
      textTrack,
      logo: logo.enabled ? {
        url: logo.url,
        position: logo.position,
        size: logo.size,
        opacity: logo.opacity
      } : null
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/editor/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to initiate export process')
      const data = await response.json()
      setExportTaskId(data.task_id)

      // Start polling
      pollExportStatus(data.task_id)
    } catch (err) {
      console.error(err)
      setExportStatus('failed')
      setExportError(err.message || 'Export failed')
      setIsExporting(false)
    }
  }

  // Poll render status
  const pollExportStatus = async (taskId) => {
    if (exportIntervalRef.current) clearInterval(exportIntervalRef.current)
    exportIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/editor/export/status/${taskId}`)
        if (!response.ok) throw new Error('Status poll failed')
        const data = await response.json()

        setExportProgress(data.progress)
        setExportStatus(data.status)

        if (data.status === 'completed') {
          if (exportIntervalRef.current) {
            clearInterval(exportIntervalRef.current)
            exportIntervalRef.current = null
          }
          setExportUrl(`${apiBaseUrl}${data.url}`)
          setIsExporting(false)
        } else if (data.status === 'failed') {
          if (exportIntervalRef.current) {
            clearInterval(exportIntervalRef.current)
            exportIntervalRef.current = null
          }
          setExportError(data.error || 'Video rendering failed')
          setIsExporting(false)
        }
      } catch (err) {
        console.error(err)
        if (exportIntervalRef.current) {
          clearInterval(exportIntervalRef.current)
          exportIntervalRef.current = null
        }
        setExportStatus('failed')
        setExportError(err.message)
        setIsExporting(false)
      }
    }, 1000)
  }

  // Reset/Dismiss export state
  const resetExport = useCallback(() => {
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current)
      exportIntervalRef.current = null
    }
    setExportStatus('idle')
    setExportProgress(0)
    setExportUrl(null)
    setExportError(null)
    setIsExporting(false)
    setExportTaskId(null)
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (exportIntervalRef.current) {
        clearInterval(exportIntervalRef.current)
      }
    }
  }, [])

  // Load active assets automatically from Storyboard & script
  const loadDirectorDeskAssets = useCallback((storyboardScenes, scriptContent) => {
    // Parse any video items or presets corresponding to storyboard
    if (!storyboardScenes || storyboardScenes.length === 0) return

    // Reset current timeline
    setVideoTrack([])
    setAudioTrack([])
    setTextTrack([])

    let currentTimelineOffset = 0.0

    // Auto load corresponding videos for each scene storyboard
    storyboardScenes.forEach((scene, index) => {
      // Rotate between cyberpunk, noir, space, documentary, metopolis presets for visual variance
      const presets = [
        initialSampleAssets[0], // robot_transform
        initialSampleAssets[1], // cinematic_noir
        initialSampleAssets[2], // space_odyssey
        initialSampleAssets[3], // documentary_realism
        initialSampleAssets[4]  // sci-fi_city
      ]
      const matchingAsset = presets[index % presets.length]
      
      const sceneId = `storyboard_${scene.scene_number}_${Date.now()}`
      const clipDur = matchingAsset.duration || 5.0

      const newClip = {
        id: sceneId,
        name: `Scene ${scene.scene_number} - ${scene.camera_shot}`,
        url: matchingAsset.url,
        start: currentTimelineOffset,
        end: currentTimelineOffset + clipDur,
        sourceStart: 0.0,
        sourceEnd: clipDur,
        brightness: 0.0,
        contrast: 1.0,
        blur: 0.0,
        volume: 1.0,
        fadeIn: 0.0,
        fadeOut: 0.0
      }

      setVideoTrack((prev) => [...prev, newClip])

      // Add corresponding scene subtitle block
      const subtitle = `Scene ${scene.scene_number}: ${scene.camera_shot} - ${scene.environment}`
      const textId = `subtitle_${scene.scene_number}_${Date.now()}`
      const newText = {
        id: textId,
        text: subtitle,
        start: currentTimelineOffset + 0.5,
        end: currentTimelineOffset + clipDur - 0.5,
        x: 'center',
        y: 'bottom',
        fontSize: 26,
        fontColor: '#f3f4f6'
      }
      setTextTrack((prev) => [...prev, newText])

      currentTimelineOffset += clipDur
    })

    // Also auto-add a default ambient audio soundtrack
    const defaultAudio = {
      id: `bg_music_${Date.now()}`,
      name: 'Ambient Cinematic Soundtrack',
      url: '/videos/cinematic_noir.mp4', // can use video audio track
      start: 0.0,
      end: currentTimelineOffset,
      sourceStart: 0.0,
      sourceEnd: Math.min(10.0, currentTimelineOffset),
      brightness: 0.0,
      contrast: 1.0,
      blur: 0.0,
      volume: 0.3, // Soft bg music
      fadeIn: 1.0,
      fadeOut: 1.0
    }
    setAudioTrack([defaultAudio])

    setCurrentTime(0.0)
  }, [])

  const value = {
    assets,
    videoTrack,
    audioTrack,
    textTrack,
    logo,
    currentTime,
    isPlaying,
    zoom,
    snapEnabled,
    selectedClipId,
    selectedTrackType,
    resolution,
    isExporting,
    exportProgress,
    exportStatus,
    exportUrl,
    exportError,
    totalDuration,
    setVideoTrack,
    setAudioTrack,
    setTextTrack,
    setLogo,
    setCurrentTime,
    setIsPlaying,
    setZoom,
    setSnapEnabled,
    setSelectedClipId,
    setSelectedTrackType,
    setResolution,
    uploadAsset,
    addAssetToTimeline,
    splitClipAtPlayhead,
    deleteClip,
    duplicateClip,
    moveClip,
    trimClip,
    updateClipProperties,
    addTextOverlay,
    triggerExport,
    loadDirectorDeskAssets,
    resetExport
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return ctx
}
