import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiPlus, FiLayers, FiVideo, FiTrash2,
  FiSliders, FiCpu, FiExternalLink, FiX, FiCheckCircle, FiInfo, FiLoader
} from 'react-icons/fi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { creativeTemplates } from '../data/presets'
import { apiBaseUrl } from '../services/apiClient'

export default function TemplatesPage() {
  const navigate = useNavigate()
  const { isDayMode: d } = useTheme()

  const [customTemplates, setCustomTemplates] = useState([])
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null) // display preview drawer

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [productionType, setProductionType] = useState('Short Film')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [cameraStyle, setCameraStyle] = useState('pan')
  const [lenses, setLenses] = useState('Anamorphic 50mm')
  const [lighting, setLighting] = useState('Cinematic Three-Point')
  const [colorGrade, setColorGrade] = useState('Teal & Orange Split Tone')
  const [promptExamplesText, setPromptExamplesText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch custom templates from SQLite database
  const fetchCustomTemplates = async () => {
    try {
      setLoadingCustom(true)
      const res = await fetch(`${apiBaseUrl}/api/templates/custom`)
      if (!res.ok) throw new Error("Failed to load custom templates")
      const data = await res.json()
      setCustomTemplates(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingCustom(false)
    }
  }

  useEffect(() => {
    fetchCustomTemplates()
  }, [])

  // Create new custom template
  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    if (!title.trim() || submitting) return
    
    setSubmitting(true)
    const prompt_examples = promptExamplesText
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    try {
      const res = await fetch(`${apiBaseUrl}/api/templates/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          production_type: productionType,
          aspect_ratio: aspectRatio,
          camera_style: cameraStyle,
          lenses: lenses.trim() || null,
          lighting: lighting.trim() || null,
          color_grade: colorGrade.trim() || null,
          prompt_examples
        })
      })

      if (!res.ok) throw new Error("Failed to save template")
      
      // Reset form and refresh
      setTitle('')
      setDescription('')
      setPromptExamplesText('')
      setShowCreateModal(false)
      fetchCustomTemplates()
    } catch (err) {
      alert(`Error creating template: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Delete template
  const handleDeleteTemplate = async (e, id) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this custom template?")) return
    try {
      const res = await fetch(`${apiBaseUrl}/api/templates/custom/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to delete template")
      if (selectedTemplate?.id === id && selectedTemplate.isCustom) {
        setSelectedTemplate(null)
      }
      fetchCustomTemplates()
    } catch (err) {
      alert(`Error deleting template: ${err.message}`)
    }
  }

  // Combine presets with custom templates
  const allTemplates = [
    ...creativeTemplates.map(t => ({ ...t, isCustom: false })),
    ...customTemplates.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || 'Custom style preset',
      productionType: t.production_type,
      aspect: t.aspect_ratio,
      camera: t.camera_style,
      prompts: t.prompt_examples || [],
      isCustom: true,
      specs: {
        lenses: t.lenses || 'Default Cinematic Prime',
        lighting: t.lighting || 'Ambient Studio Light',
        colorGrade: t.color_grade || 'None (Flat Log profile)'
      }
    }))
  ]

  const handleStartProject = (tmpl) => {
    // Populate dashboard project form by navigating with query/preset
    navigate(`/?preset=${tmpl.isCustom ? `custom_${tmpl.id}` : tmpl.id}`)
  }

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-300 relative ${d ? 'bg-white text-black' : 'bg-black text-white'}`}>
      
      {/* Sidebar Navigation */}
      <div className="relative z-30">
        <Sidebar />
      </div>

      {/* Main Workspace */}
      <div className="relative z-20 flex flex-1 min-w-0 flex-col overflow-hidden">
        
        {/* Header Navbar */}
        <header className={`flex items-center justify-between px-6 py-3 border-b shrink-0 transition-colors duration-300 ${d ? 'border-neutral-200 bg-white' : 'border-neutral-900 bg-black'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all duration-200 cursor-pointer ${d ? 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100' : 'text-neutral-450 hover:text-white hover:bg-neutral-900'}`}
            >
              <FiArrowLeft size={14} /> Back
            </button>
            <div className={`h-4 w-px ${d ? 'bg-neutral-200' : 'bg-neutral-800'}`} />
            <h1 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${d ? 'text-neutral-950' : 'text-white'}`}>
              <FiLayers className="text-purple-500" size={16} /> Production Templates
            </h1>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-650 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg cursor-pointer transition-colors"
          >
            <FiPlus size={14} /> Create Custom Preset
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Main List Gallery */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className={`text-[13px] font-bold uppercase tracking-widest ${d ? 'text-neutral-850' : 'text-neutral-200'}`}>Visual presets library</h2>
              <p className={`text-[11px] mt-1 ${d ? 'text-neutral-500' : 'text-neutral-450'}`}>Hover over the card video preview to play the template style. Spawn studio projects with pre-configured lenses and color grading.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {allTemplates.map((tmpl) => {
                const getRelatedFilms = (id) => {
                  switch (id) {
                    case 'cyberpunk': return 'Blade Runner 2049, Ghost in the Shell, Cyberpunk'
                    case 'noir': return 'The Maltese Falcon, Chinatown, Sin City'
                    case 'space': return 'Interstellar, 2001: A Space Odyssey, Prometheus'
                    case 'documentary': return 'Free Solo, Samsara, The Cove'
                    case 'fantasy': return 'Minority Report, Altered Carbon, Akira'
                    default: return 'User Directed Custom Style'
                  }
                }

                return (
                  <div
                    key={tmpl.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-4 transition-all duration-300 relative group ${
                      d
                        ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-md'
                        : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                    }`}
                  >
                    {/* Video on top */}
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black relative border border-neutral-800/10 flex items-center justify-center shrink-0">
                      {tmpl.video ? (
                        <video
                          src={tmpl.video}
                          poster={tmpl.image}
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                          onMouseEnter={(e) => {
                            e.target.play().catch(() => {});
                          }}
                          onMouseLeave={(e) => {
                            e.target.pause();
                            e.target.currentTime = 0;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950/80 text-neutral-600 font-mono text-[9px] uppercase">
                          <FiVideo size={20} className="text-neutral-700 mb-1" />
                          Custom Preset
                        </div>
                      )}
                    </div>

                    {/* Details below */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded shrink-0 ${
                              tmpl.isCustom 
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                : d ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-900 text-neutral-450'
                            }`}>
                              {tmpl.isCustom ? 'Custom' : 'Studio'}
                            </span>
                            <span className={`text-[8.5px] font-mono tracking-wider opacity-60 uppercase truncate`}>
                              {tmpl.productionType}
                            </span>
                          </div>
                          {tmpl.isCustom && (
                            <button
                              onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                              className="text-neutral-500 hover:text-red-500 transition-colors p-1 rounded-md border border-transparent hover:border-neutral-800/10 cursor-pointer shrink-0"
                              title="Delete custom preset"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          )}
                        </div>

                        <h3 className={`text-[13.5px] font-black tracking-wide transition-colors ${d ? 'text-neutral-900' : 'text-white'}`}>
                          {tmpl.title}
                        </h3>

                        <p className={`text-[10.5px] leading-relaxed mt-2 line-clamp-3 ${d ? 'text-neutral-650' : 'text-neutral-400'}`}>
                          {tmpl.description}
                        </p>

                        {/* Cinematic Film Inspirations */}
                        <div className="mt-2.5 flex items-start gap-1">
                          <span className={`text-[9px] font-black uppercase tracking-wider shrink-0 ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Film Inspirations:</span>
                          <span className={`text-[9.5px] italic truncate ${d ? 'text-neutral-750' : 'text-neutral-300'}`}>
                            {getRelatedFilms(tmpl.id)}
                          </span>
                        </div>
                      </div>

                      {/* Specifications Grid */}
                      <div className={`mt-3 pt-2.5 border-t border-dashed ${d ? 'border-neutral-200' : 'border-neutral-900'} grid grid-cols-2 gap-x-2.5 gap-y-2`}>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase font-bold tracking-wider text-purple-400 block">Lens</span>
                          <span className={`text-[9.5px] font-semibold block truncate ${d ? 'text-neutral-855' : 'text-neutral-200'}`}>
                            {tmpl.specs?.lenses || 'Cinematic Prime'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase font-bold tracking-wider text-emerald-400 block">Lighting</span>
                          <span className={`text-[9.5px] font-semibold block truncate ${d ? 'text-neutral-855' : 'text-neutral-200'}`}>
                            {tmpl.specs?.lighting || 'Three-Point'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase font-bold tracking-wider text-amber-400 block">Color profile</span>
                          <span className={`text-[9.5px] font-semibold block truncate ${d ? 'text-neutral-855' : 'text-neutral-200'}`}>
                            {tmpl.specs?.colorGrade || 'Teal & Orange'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-[8px] uppercase font-bold tracking-wider text-blue-400 block">Camera style</span>
                          <span className={`text-[9.5px] font-semibold block truncate ${d ? 'text-neutral-855' : 'text-neutral-200'}`}>
                            {tmpl.specs?.movement || tmpl.camera || 'Pan'}
                          </span>
                        </div>
                      </div>

                      {/* Apply Style Button */}
                      <button
                        onClick={() => handleStartProject(tmpl)}
                        className="w-full mt-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-650 text-white text-[9.5px] font-bold uppercase tracking-wider shadow-md cursor-pointer transition-colors text-center"
                      >
                        Apply Preset Style
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Create Custom Preset Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl border p-6 flex flex-col gap-4 shadow-2xl ${
            d ? 'bg-[#fcfbfa] border-neutral-200 text-neutral-800 shadow-neutral-450/40' : 'bg-[#0b0b14]/95 border-white/[0.08] text-white shadow-black/80'
          }`}>
            <div className="flex items-center justify-between border-b border-dashed border-white/5 pb-2.5">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5"><FiLayers size={16} className="text-purple-500" /> Create Custom Style Preset</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-1 rounded-lg border transition-colors ${d ? 'border-neutral-200 hover:bg-neutral-100' : 'border-white/10 hover:bg-white/5'}`}
              >
                <FiX size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplate} className="flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Preset Name *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cybernetic Neon Noir"
                  className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                    d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Style Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the core visual aesthetic, camera cues, and lighting palette..."
                  rows={2}
                  className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                    d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Production Type</label>
                  <select
                    value={productionType}
                    onChange={(e) => setProductionType(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                      d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                    }`}
                  >
                    <option value="Feature Film">Feature Film</option>
                    <option value="Short Film">Short Film</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Podcast">Podcast</option>
                    <option value="Audio Story">Audio Story</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                      d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                    }`}
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Vertical)</option>
                    <option value="2.39:1">2.39:1 (Cinemascope)</option>
                    <option value="4:3">4:3 (Classic Academy)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Lenses</label>
                  <input
                    type="text"
                    value={lenses}
                    onChange={(e) => setLenses(e.target.value)}
                    placeholder="e.g. 50mm Prime"
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                      d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Lighting</label>
                  <input
                    type="text"
                    value={lighting}
                    onChange={(e) => setLighting(e.target.value)}
                    placeholder="e.g. Volumetric fog"
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                      d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                    }`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Color Grade</label>
                  <input
                    type="text"
                    value={colorGrade}
                    onChange={(e) => setColorGrade(e.target.value)}
                    placeholder="e.g. Vintage warm"
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                      d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-gray-500' : 'text-surface-550'}`}>Prompt Examples (One per line)</label>
                <textarea
                  value={promptExamplesText}
                  onChange={(e) => setPromptExamplesText(e.target.value)}
                  placeholder="e.g. A pilot inside a mecha cockpit looking out at a burning metropolis at night..."
                  rows={3}
                  className={`px-3 py-2 rounded-xl text-[11.5px] font-mono leading-relaxed border focus:outline-hidden transition-all ${
                    d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                  }`}
                />
              </div>

              <div className="flex gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-colors text-center ${
                    d ? 'border-neutral-250 text-gray-500 hover:bg-neutral-100' : 'border-white/10 hover:bg-white/5 text-neutral-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white cursor-pointer shadow-lg shadow-purple-600/15 transition-colors text-center disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Save Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
