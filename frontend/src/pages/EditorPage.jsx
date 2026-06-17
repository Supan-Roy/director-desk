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
  FiCornerUpRight
} from 'react-icons/fi'
import { useEditor } from '../context/EditorContext'
import { useProjectData } from '../hooks/useProjectData'
import { useTheme } from '../context/ThemeContext'
import Sidebar from '../components/Sidebar'

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
    resetExport,
    undo,
    redo,
    canUndo,
    canRedo
  } = useEditor()

  const [activeTab, setActiveTab] = useState('media') // media, overlays
  const [logoPreset, setLogoPreset] = useState(logo.position)
  const fileInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const previewVideoRef = useRef(null)
  const previewAudioRef = useRef(null)
  const timelineScrollRef = useRef(null)
  const [customText, setCustomText] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [timelineHeight, setTimelineHeight] = useState(288) // default height 288px
  const [isMuted, setIsMuted] = useState(false)
  const [playerVolume, setPlayerVolume] = useState(1.0)
  const previewContainerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef(null)

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
          : null

  // Synchronize browser native video playback with the context's playhead time
  useEffect(() => {
    const video = previewVideoRef.current
    if (video && activeVideoClip) {
      const sourceTime = activeVideoClip.sourceStart + (currentTime - activeVideoClip.start)
      // Allow slight difference to avoid jittering
      if (Math.abs(video.currentTime - sourceTime) > 0.2) {
        video.currentTime = sourceTime
      }
      
      // Sync volume and mute settings
      video.volume = (activeVideoClip.volume !== undefined ? activeVideoClip.volume : 1.0) * playerVolume
      video.muted = isMuted

      if (isPlaying && video.paused) {
        video.play().catch(() => {})
      } else if (!isPlaying && !video.paused) {
        video.pause()
      }
    }
  }, [currentTime, activeVideoClip, isPlaying, playerVolume, isMuted])

  // Synchronize browser native audio playback with the context's playhead time
  useEffect(() => {
    const audio = previewAudioRef.current
    if (audio) {
      if (activeAudioClip) {
        // Only set src if it changed
        const currentSrc = audio.getAttribute('src') || ''
        const targetSrc = activeAudioClip.url
        if (!currentSrc.endsWith(targetSrc)) {
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

  // Visual position converter for text elements
  const getTextPositionStyles = (txt) => {
    const style = {
      fontSize: `${txt.fontSize}px`,
      color: txt.fontColor,
      position: 'absolute',
      zIndex: 20,
    }
    
    if (txt.x === 'center') {
      style.left = '50%'
      style.transform = 'translateX(-50%)'
    } else {
      style.left = txt.x.includes('%') || txt.x.includes('w') ? txt.x : `${txt.x}px`
    }

    if (txt.y === 'bottom') {
      style.bottom = '10%'
    } else if (txt.y === 'top') {
      style.top = '10%'
    } else if (txt.y === 'center') {
      style.top = '50%'
      style.transform = `${style.transform || ''} translateY(-50%)`
    } else {
      style.top = txt.y.includes('%') || txt.y.includes('h') ? txt.y : `${txt.y}px`
    }
    return style
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
              <span className="text-[10px] uppercase font-bold tracking-wider text-surface-500">Output</span>
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
                  <span>Export MP4</span>
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
                className={`flex-1 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'media' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-500 hover:text-surface-300'
                }`}
              >
                Media Library
              </button>
              <button
                onClick={() => setActiveTab('overlays')}
                className={`flex-1 py-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-colors ${
                  activeTab === 'overlays' 
                    ? 'bg-white/5 text-white-force' 
                    : 'text-surface-555 hover:text-surface-300'
                }`}
              >
                Logo & Text
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
                            <img src={logo.url.startsWith('http') || logo.url.startsWith('/') ? logo.url : `${logo.url}`} alt="logo preview" className="max-w-full max-h-full object-contain" />
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
                {/* Visual Video Stream Tag */}
                {activeVideoClip ? (
                  <video
                    ref={previewVideoRef}
                    src={activeVideoClip.url}
                    muted={isMuted}
                    className="w-full h-full object-contain"
                    style={{
                      filter: `brightness(${1.0 + activeVideoClip.brightness}) contrast(${activeVideoClip.contrast}) blur(${activeVideoClip.blur}px)`,
                    }}
                  />
                ) : (
                  <div className="text-center text-surface-600 text-xs p-4 flex flex-col items-center gap-2 font-mono">
                    <FiDisc size={20} className="animate-spin text-surface-600" />
                    <span>No active video clip at playhead</span>
                  </div>
                )}

                {/* Audio sync player */}
                <audio
                  ref={previewAudioRef}
                  className="hidden"
                />

                {/* Subtitle / Text overlays layer */}
                {activeTexts.map((txt) => (
                  <div
                    key={txt.id}
                    style={getTextPositionStyles(txt)}
                    className="font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] px-4 text-center select-none"
                  >
                    {txt.text}
                  </div>
                ))}

                {/* Logo overlay layer */}
                {logo.enabled && logo.url && (
                  <img
                    src={logo.url}
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

            {/* Playback Control Bar */}
            <div className="h-14 border-t flex items-center justify-end px-6 shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-black/10">
              {/* Tracks operations */}
              <div className="flex items-center gap-2">
                <button
                  onClick={splitClipAtPlayhead}
                  disabled={!selectedClipId || selectedTrackType === 'text'}
                  title="Split Selected Clip"
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-bold uppercase tracking-wider hover:bg-white/5 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <FiScissors size={10} />
                  <span>Split</span>
                </button>
                <button
                  onClick={() => deleteClip(selectedClipId, selectedTrackType)}
                  disabled={!selectedClipId}
                  title="Delete Selected Clip"
                  className="px-3 py-1.5 rounded-lg border border-red-500/20 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <FiTrash2 size={10} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Properties & Effects controls */}
          <div className="w-80 border-l flex flex-col shrink-0 border-white/[0.03] [data-theme='day']_&:border-black/[0.06] bg-black/[0.15]">
            <div className="p-4 border-b border-white/[0.04] [data-theme='day']_&:border-black/[0.05] flex items-center gap-2 text-accent">
              <FiSliders size={13} />
              <span className="text-[11px] font-bold uppercase tracking-wider text-surface-300">Property inspector</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedClip ? (
                <div className="space-y-4 text-[11px]">
                  {/* Clip ID Details */}
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-surface-500">Selected Clip</p>
                    <p className="font-semibold text-white leading-tight truncate">{selectedClip.name}</p>
                    <p className="text-[9px] font-mono text-surface-500">Track: {selectedTrackType.toUpperCase()}</p>
                  </div>

                  <div className="h-px bg-white/[0.04] my-2" />

                  {/* Sizing Details */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Timeline Start</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedClip.start.toFixed(1)}
                        onChange={(e) => moveClip(selectedClip.id, selectedTrackType, parseFloat(e.target.value) || 0)}
                        className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                          isDayMode 
                            ? 'bg-white border-black/10 text-neutral-800' 
                            : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                        }`}
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] font-semibold text-surface-500 uppercase block">Trim Start</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedClip.sourceStart.toFixed(1)}
                        onChange={(e) => trimClip(selectedClip.id, selectedTrackType, 'start', parseFloat(e.target.value) || 0)}
                        className={`w-full text-[11px] font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                          isDayMode 
                            ? 'bg-white border-black/10 text-neutral-800' 
                            : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Video Filters */}
                  {selectedTrackType === 'video' && (
                    <div className="space-y-3 pt-2">
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Visual Effects</p>
                      
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
                          value={selectedClip.brightness}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'video', { brightness: parseFloat(e.target.value) })}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                          <span>Contrast</span>
                          <span>{Math.round(selectedClip.contrast * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={selectedClip.contrast}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'video', { contrast: parseFloat(e.target.value) })}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Blur */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                          <span>Blur Strength</span>
                          <span>{selectedClip.blur}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={selectedClip.blur}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'video', { blur: parseFloat(e.target.value) })}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500 pt-2">Audio Controls</p>
                      
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
                    <div className="space-y-3 pt-2">
                      <p className="text-[9.5px] font-bold uppercase tracking-widest text-surface-500">Text Config</p>
                      
                      {/* Text Input */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Content</span>
                        <textarea
                          value={selectedClip.text}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { text: e.target.value })}
                          className={`w-full text-[11px] font-semibold border rounded-lg p-2 focus:outline-none h-16 resize-none ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                        />
                      </div>

                      {/* Font size */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-semibold text-surface-400">
                          <span>Font Size</span>
                          <span>{selectedClip.fontSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="12"
                          max="72"
                          step="1"
                          value={selectedClip.fontSize}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontSize: parseInt(e.target.value) })}
                          className="w-full accent-accent bg-white/10 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Font Color */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Text Color</span>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={selectedClip.fontColor.startsWith('#') ? selectedClip.fontColor : '#ffffff'}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontColor: e.target.value })}
                            className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={selectedClip.fontColor}
                            onChange={(e) => updateClipProperties(selectedClip.id, 'text', { fontColor: e.target.value })}
                            className={`flex-1 text-[11px] font-mono border rounded-lg px-2 py-1.5 focus:outline-none ${
                              isDayMode 
                                ? 'bg-white border-black/10 text-neutral-800' 
                                : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Y alignment */}
                      <div className="space-y-1">
                        <span className="text-[9.5px] font-semibold text-surface-400 uppercase">Y-Position Align</span>
                        <select
                          value={selectedClip.y}
                          onChange={(e) => updateClipProperties(selectedClip.id, 'text', { y: e.target.value })}
                          className={`w-full text-[11px] font-semibold border rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer ${
                            isDayMode 
                              ? 'bg-white border-black/10 text-neutral-800' 
                              : 'bg-[#0c0c16] border-white/10 text-neutral-200'
                          }`}
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
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
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-surface-200 flex items-center gap-1.5 cursor-pointer border border-white/[0.05]"
              >
                <FiType size={11} />
                <span>Add Text</span>
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
              <div className="h-16 flex items-center px-3 tracking-widest">Text t1</div>
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
                <div className="h-16 relative flex items-center bg-white/[0.005]">
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
              Generating dynamic FFmpeg filters and assembling timeline operations. Do not close this window.
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
            
            <h3 className="text-base font-bold uppercase tracking-wider text-white">Render Completed!</h3>
            
            <p className="text-[11.5px] text-surface-400 leading-relaxed">
              Your video clip has been successfully rendered through FFmpeg. The output MP4 file is ready for download.
            </p>

            <video 
              src={exportUrl} 
              controls 
              className="w-full rounded-lg border border-white/10 max-h-40 bg-black object-contain"
            />

            <div className="flex gap-3 pt-2">
              <a
                href={exportUrl}
                download={`export_${Date.now()}.mp4`}
                className="flex-1 py-2.5 rounded-xl bg-accent text-white font-bold uppercase tracking-widest text-[10.5px] flex items-center justify-center gap-2 hover:bg-purple-600 transition-all"
              >
                <FiDownload size={12} />
                <span>Download MP4</span>
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
            
            <h3 className="text-base font-bold uppercase tracking-wider text-white">Rendering Failed</h3>
            
            <p className="text-[11.5px] text-surface-400 leading-relaxed">
              An error occurred during FFmpeg subprocess execution. Details below:
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
