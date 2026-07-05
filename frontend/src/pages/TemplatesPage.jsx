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
              <FiLayers className="text-purple-500" size={16} /> Production Templates
            </h1>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-purple-600/10 cursor-pointer transition-colors"
          >
            <FiPlus size={14} /> Create Custom Preset
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* Main Grid Gallery */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-5">
              <h2 className={`text-[13px] font-bold uppercase tracking-widest ${d ? 'text-neutral-850' : 'text-neutral-200'}`}>Visual presets library</h2>
              <p className={`text-[11px] mt-1 ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Clone visual configurations, lens specifications, and lighting setups to instantly spawn new studio projects.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allTemplates.map((tmpl) => {
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`rounded-2xl border transition-all duration-300 relative group overflow-hidden flex flex-col justify-between p-5 cursor-pointer hover:-translate-y-0.5 ${
                      d
                        ? 'bg-neutral-50/60 border-neutral-200 hover:border-neutral-350 hover:shadow-md'
                        : 'bg-white/[0.02] border-white/[0.04] hover:border-purple-500/30 hover:bg-white/[0.03] hover:shadow-lg hover:shadow-black/40'
                    }`}
                  >
                    <div>
                      {/* Badge / Type tag */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                          tmpl.isCustom 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {tmpl.isCustom ? 'Custom Preset' : 'Studio Preset'}
                        </span>
                        
                        {tmpl.isCustom && (
                          <button
                            onClick={(e) => handleDeleteTemplate(e, tmpl.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors p-1"
                            title="Delete custom preset"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>

                      <h3 className={`text-[14px] font-bold tracking-wide transition-colors ${d ? 'text-neutral-900 group-hover:text-black' : 'text-neutral-200 group-hover:text-white'}`}>
                        {tmpl.title}
                      </h3>
                      <p className={`text-[11px] leading-relaxed mt-1.5 line-clamp-2 ${d ? 'text-neutral-600' : 'text-surface-450'}`}>
                        {tmpl.description}
                      </p>
                    </div>

                    {/* Metadata tags */}
                    <div className="mt-4 pt-4 border-t border-dashed border-white/5 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-[9px] uppercase tracking-wider font-bold ${d ? 'text-gray-400' : 'text-surface-500'}`}>Production</span>
                        <span className={`text-[10px] font-bold ${d ? 'text-gray-700' : 'text-neutral-350'}`}>{tmpl.productionType}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-right">
                        <span className={`text-[9px] uppercase tracking-wider font-bold ${d ? 'text-gray-400' : 'text-surface-500'}`}>Aspect Ratio</span>
                        <span className={`text-[10px] font-mono font-bold ${d ? 'text-gray-700' : 'text-neutral-350'}`}>{tmpl.aspect}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Preview Drawer Panel */}
          {selectedTemplate && (
            <div className={`w-[360px] shrink-0 border-l overflow-y-auto p-6 flex flex-col justify-between transition-colors duration-500 ${
              d ? 'border-neutral-200 bg-neutral-50/50' : 'border-white/[0.04] bg-black/20'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] font-bold tracking-widest uppercase ${d ? 'text-neutral-600' : 'text-surface-400'}`}>Preset specs sheet</span>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className={`p-1.5 rounded-lg border transition-colors ${d ? 'border-neutral-200 hover:bg-neutral-100' : 'border-white/10 hover:bg-white/5'}`}
                  >
                    <FiX size={13} />
                  </button>
                </div>

                <h3 className={`text-base font-bold tracking-tight uppercase ${d ? 'text-neutral-900' : 'text-white'}`}>{selectedTemplate.title}</h3>
                <p className={`text-[11.5px] leading-relaxed mt-2 ${d ? 'text-neutral-600' : 'text-surface-450'}`}>{selectedTemplate.description}</p>

                {/* Spec parameters */}
                <div className="flex flex-col gap-3.5 mt-5">
                  <div className={`p-3 rounded-xl border ${d ? 'bg-white border-neutral-200' : 'bg-black/35 border-white/5'}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1"><FiSliders size={11} /> Lens Specification</span>
                    <p className={`text-[11px] font-semibold mt-1 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{selectedTemplate.specs?.lenses || 'Anamorphic 50mm'}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${d ? 'bg-white border-neutral-200' : 'bg-black/35 border-white/5'}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1"><FiInfo size={11} /> Lighting Setup</span>
                    <p className={`text-[11px] font-semibold mt-1 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{selectedTemplate.specs?.lighting || 'Three-point setup'}</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${d ? 'bg-white border-neutral-200' : 'bg-black/35 border-white/5'}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1"><FiCpu size={11} /> Color Grading profile</span>
                    <p className={`text-[11px] font-semibold mt-1 ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>{selectedTemplate.specs?.colorGrade || 'Warm cinematic curve'}</p>
                  </div>
                </div>

                {/* Example prompts */}
                {selectedTemplate.prompts && selectedTemplate.prompts.length > 0 && (
                  <div className="mt-5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-600' : 'text-surface-450'}`}>Sample prompt guidelines</span>
                    <div className="flex flex-col gap-2 mt-2">
                      {selectedTemplate.prompts.slice(0, 3).map((prompt, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-[10.5px] leading-relaxed font-mono ${
                            d ? 'bg-white border-neutral-200 text-neutral-700' : 'bg-black/20 border-white/[0.04] text-surface-300'
                          }`}
                        >
                          "{prompt}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleStartProject(selectedTemplate)}
                className="w-full mt-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-purple-600/10 cursor-pointer text-center transition-colors"
              >
                Instantiate Project Style
              </button>
            </div>
          )}

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
