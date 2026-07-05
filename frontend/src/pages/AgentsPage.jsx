import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiLoader, FiSend, FiMessageSquare, FiSliders, FiActivity,
  FiShield, FiCpu, FiPlay, FiSettings, FiCheckCircle, FiBookOpen, FiFileText,
  FiCamera, FiList, FiGrid, FiHelpCircle, FiCopy, FiRefreshCw, FiArrowRight, FiX
} from 'react-icons/fi'
import { PiRobotBold } from 'react-icons/pi'
import Sidebar from '../components/Sidebar'
import { useTheme } from '../context/ThemeContext'
import { apiBaseUrl } from '../services/apiClient'

export default function AgentsPage() {
  const navigate = useNavigate()
  const { isDayMode: d } = useTheme()

  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState(null) // active entered workspace agent
  const [showHandbook, setShowHandbook] = useState(false) // toggle general handbook

  // Specialized input panel states
  const [writerConcept, setWriterConcept] = useState('')
  const [writerProdType, setWriterProdType] = useState('Short Film')
  
  const [storyboardDesc, setStoryboardDesc] = useState('')
  const [storyboardMovement, setStoryboardMovement] = useState('pan')
  const [storyboardLens, setStoryboardLens] = useState('Anamorphic 50mm')

  const [criticScript, setCriticScript] = useState('')
  
  const [editorScript, setEditorScript] = useState('')
  const [editorCriticism, setEditorCriticism] = useState('')

  const [showrunnerPitch, setShowrunnerPitch] = useState('')
  const [plannerOverview, setPlannerOverview] = useState('')
  const [breakdownText, setBreakdownText] = useState('')

  // Workspace active tab ('actions' or 'chat')
  const [workspaceTab, setWorkspaceTab] = useState('actions')

  // Chat/Sandbox playground states
  const [message, setMessage] = useState('')
  const [chatHistories, setChatHistories] = useState({}) // { [agentId]: [{role, content}] }
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Execution results history
  const [runsHistory, setRunsHistory] = useState({}) // { [agentId]: [ {timestamp, input, output} ] }
  const [runLoading, setRunLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)

  // Fetch agents metadata from backend
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        const res = await fetch(`${apiBaseUrl}/api/agents`)
        if (!res.ok) throw new Error("Failed to load agents list")
        const data = await res.json()
        setAgents(data)
      } catch (err) {
        console.error("Error loading agents:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchAgents()
  }, [])

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistories, chatLoading])

  const activeHistory = selectedAgent ? (chatHistories[selectedAgent.id] || []) : []
  const activeRuns = selectedAgent ? (runsHistory[selectedAgent.id] || []) : []

  // Copy helper
  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  // Generic chat submit
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedAgent || chatLoading) return

    const userMsg = message.trim()
    setMessage('')
    setChatLoading(true)

    const updatedHistory = [...activeHistory, { role: 'user', content: userMsg }]
    setChatHistories(prev => ({
      ...prev,
      [selectedAgent.id]: updatedHistory
    }))

    try {
      const res = await fetch(`${apiBaseUrl}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: selectedAgent.id,
          message: userMsg,
          chat_history: activeHistory
        })
      })

      if (!res.ok) throw new Error("Failed to communicate with agent")
      const data = await res.json()

      setChatHistories(prev => ({
        ...prev,
        [selectedAgent.id]: [...updatedHistory, { role: 'agent', content: data.response }]
      }))
    } catch (err) {
      setChatHistories(prev => ({
        ...prev,
        [selectedAgent.id]: [...updatedHistory, { role: 'agent', content: `[Error]: Could not generate response. ${err.message}` }]
      }))
    } finally {
      setChatLoading(false)
    }
  }

  const handleClearChat = () => {
    if (!selectedAgent) return
    setChatHistories(prev => ({
      ...prev,
      [selectedAgent.id]: []
    }))
  }

  // Specialized task execution triggers
  const handleExecuteTask = async (agentId) => {
    if (runLoading) return
    setRunLoading(true)

    let promptText = ''
    let inputDescription = ''

    if (agentId === 'writer') {
      promptText = `Write a screenplay script for a ${writerProdType} based on this concept: ${writerConcept}`
      inputDescription = `Write Script (${writerProdType})`
    } else if (agentId === 'storyboard') {
      promptText = `Translate this scene description into a detailed AI prompting sequence: "${storyboardDesc}" (Camera: ${storyboardMovement}, Lens: ${storyboardLens})`
      inputDescription = `Compile Storyboard Prompt`
    } else if (agentId === 'critic') {
      promptText = `Analyze and critique this screenplay segment for pacing, characters, and staging: "${criticScript}"`
      inputDescription = `Analyze & Critique Script`
    } else if (agentId === 'editor') {
      promptText = `Refine this screenplay segment:\n${editorScript}\n\nApply adjustments to address these criticisms:\n${editorCriticism}`
      inputDescription = `Refine Screenplay Script`
    } else if (agentId === 'showrunner') {
      promptText = `Outline the comprehensive production plan, scheduling steps, and voice/audio requirements for: ${showrunnerPitch}`
      inputDescription = `Outline Production Plan`
    } else if (agentId === 'planner') {
      promptText = `Generate a pre-production task checklist, asset list, and workflow calendar for this pitch: ${plannerOverview}`
      inputDescription = `Generate Task Roadmap`
    } else if (agentId === 'scene_breakdown') {
      promptText = `Deconstruct the visual settings, lighting cues, character descriptions, and physical props for this scene text: ${breakdownText}`
      inputDescription = `Extract Visual Assets`
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/agents/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          message: promptText,
          chat_history: []
        })
      })

      if (!res.ok) throw new Error("Failed to execute agent task")
      const data = await res.json()

      const newRun = {
        timestamp: new Date().toLocaleTimeString(),
        input: inputDescription,
        output: data.response
      }

      setRunsHistory(prev => ({
        ...prev,
        [agentId]: [newRun, ...(prev[agentId] || [])]
      }))
    } catch (err) {
      const errorRun = {
        timestamp: new Date().toLocaleTimeString(),
        input: inputDescription,
        output: `Execution failed. ${err.message}`
      }
      setRunsHistory(prev => ({
        ...prev,
        [agentId]: [errorRun, ...(prev[agentId] || [])]
      }))
    } finally {
      setRunLoading(false)
    }
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
              onClick={() => {
                if (selectedAgent) {
                  setSelectedAgent(null)
                } else {
                  navigate('/')
                }
              }}
              className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg px-2.5 py-1.5 transition-all duration-250 cursor-pointer ${d ? 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}
            >
              <FiArrowLeft size={14} /> Back
            </button>
            <div className={`h-4 w-px ${d ? 'bg-neutral-200' : 'bg-neutral-800'}`} />
            <h1 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${d ? 'text-neutral-950' : 'text-white'}`}>
              <PiRobotBold className="text-purple-500" size={16} /> 
              {selectedAgent ? `${selectedAgent.name} Workspace` : "Production Agents"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHandbook(!showHandbook)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-all ${
                d
                  ? 'border-neutral-200 hover:bg-neutral-100 text-neutral-800 bg-white'
                  : 'border-neutral-800 hover:bg-neutral-900 text-neutral-200 bg-black'
              }`}
            >
              <FiBookOpen size={13} /> {showHandbook ? "Hide Manual" : "Show Manual"}
            </button>
          </div>
        </header>

        {/* Global Handbook manual panel */}
        {showHandbook && (
          <div className={`p-6 border-b shrink-0 transition-all ${
            d ? 'bg-neutral-50 border-neutral-200 text-neutral-800' : 'bg-[#0b0b0e] border-neutral-900 text-neutral-200'
          }`}>
            <div className="flex items-center justify-between border-b border-dashed border-neutral-800 pb-2 mb-3">
              <h2 className="text-[12px] font-bold uppercase tracking-widest flex items-center gap-2">
                <FiHelpCircle className="text-purple-400" /> Collaborative Agent Desk Handbook
              </h2>
              <button onClick={() => setShowHandbook(false)} className="text-neutral-500 hover:text-white"><FiX size={14} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-[11.5px] leading-relaxed">
              <div>
                <h4 className="font-bold text-purple-400 uppercase tracking-wide">1. Write & Breakdown</h4>
                <p className="mt-1 opacity-85">Use the **Writer** to draft narratives based on concepts. Then execute the **Scene Breakdown** agent to instantly extract cast sheets, visual descriptors, props, and ambient keywords.</p>
              </div>
              <div>
                <h4 className="font-bold text-emerald-400 uppercase tracking-wide">2. Storyboard & Voice Preset</h4>
                <p className="mt-1 opacity-85">Feed scene summaries to the **Storyboard** agent to synthesize volumetric AI camera/lens prompt structures. Create voice signatures to anchor character lines.</p>
              </div>
              <div>
                <h4 className="font-bold text-amber-400 uppercase tracking-wide">3. Review & Edit Compilation</h4>
                <p className="mt-1 opacity-85">Pass drafts through the **Critic** to analyze narrative pacing, and leverage the **Editor** to apply critiques or map scene sequences to precise render lengths.</p>
              </div>
            </div>
          </div>
        )}

        {/* Content Workspace */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <FiLoader className={`animate-spin ${d ? 'text-neutral-805' : 'text-purple-500'}`} size={32} />
            <span className={`text-[12px] font-semibold tracking-wider uppercase ${d ? 'text-neutral-500' : 'text-neutral-400'}`}>Loading Agents Registry...</span>
          </div>
        ) : !selectedAgent ? (
          
          /* Agent grid cards layout */
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h2 className={`text-[13px] font-bold uppercase tracking-widest ${d ? 'text-neutral-850' : 'text-neutral-200'}`}>Agent Directory</h2>
              <p className={`text-[11px] mt-1 ${d ? 'text-neutral-500' : 'text-neutral-450'}`}>Select a specialized workspace agent to trigger creative pipelines or run sandbox chat test beds.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agents.map((agent) => {
                return (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent)}
                    className={`rounded-xl border p-6 flex flex-col justify-between gap-5 transition-all duration-300 relative group cursor-pointer hover:shadow-lg ${
                      d
                        ? 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-neutral-350 hover:shadow-neutral-200'
                        : 'bg-[#0f0f15] border-neutral-900 text-neutral-300 hover:border-neutral-800 hover:shadow-black'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md ${
                          d ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-900 text-neutral-400'
                        }`}>
                          {agent.role}
                        </span>
                        <PiRobotBold className="text-purple-500 group-hover:scale-110 transition-transform duration-300" size={16} />
                      </div>

                      <h3 className={`text-[14px] font-bold tracking-wide mt-3 ${d ? 'text-neutral-900' : 'text-white'}`}>
                        {agent.name}
                      </h3>
                      <p className={`text-[11px] leading-relaxed mt-2.5 ${d ? 'text-neutral-600' : 'text-neutral-400'}`}>
                        {agent.description}
                      </p>
                    </div>

                    <div className={`flex items-center justify-between pt-4 border-t border-dashed ${d ? 'border-neutral-200' : 'border-neutral-900'}`}>
                      <span className={`text-[10px] font-mono font-semibold ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        Temp: {agent.temperature} | {agent.credits_per_run} credits
                      </span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500 group-hover:text-purple-450 flex items-center gap-1">
                        Enter Workspace <FiArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        ) : (
          
          /* Entered Agent Workspace View */
          <div className="flex-1 flex flex-row overflow-hidden min-h-0">
            
            {/* Left Side: Inputs & Controller Form */}
            <div className={`w-[365px] flex-none border-r overflow-y-auto flex flex-col justify-between p-6 ${
              d ? 'border-neutral-200 bg-white' : 'border-neutral-900 bg-black'
            }`}>
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className={`text-[12px] font-bold uppercase tracking-widest ${d ? 'text-neutral-850' : 'text-white'}`}>
                    Workspace controls
                  </h3>
                  <p className={`text-[11px] mt-1 ${d ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    Configure input parameters and run {selectedAgent.name}'s specialized task pipeline.
                  </p>
                </div>

                {/* Workspace tab navigation (Actions vs Direct Chat) */}
                <div className={`flex rounded-xl p-1 border ${d ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-neutral-800'}`}>
                  <button
                    onClick={() => setWorkspaceTab('actions')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      workspaceTab === 'actions'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : d ? 'text-neutral-600 hover:text-neutral-850' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Specialized Task
                  </button>
                  <button
                    onClick={() => setWorkspaceTab('chat')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      workspaceTab === 'chat'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : d ? 'text-neutral-600 hover:text-neutral-850' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Direct Chat Sandbox
                  </button>
                </div>

                {/* Tab 1: Custom Actions Forms */}
                {workspaceTab === 'actions' && (
                  <div className="flex flex-col gap-4">
                    {/* Writer Agent Form */}
                    {selectedAgent.id === 'writer' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Script Concept</label>
                          <textarea
                            value={writerConcept}
                            onChange={(e) => setWriterConcept(e.target.value)}
                            placeholder="e.g. A deep space scavenger discovers an ancient alien signal beacon on a frozen asteroid..."
                            rows={4}
                            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                              d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Production Type</label>
                          <select
                            value={writerProdType}
                            onChange={(e) => setWriterProdType(e.target.value)}
                            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                              d ? 'bg-white border-neutral-250 text-neutral-900' : 'bg-neutral-950 border-neutral-800 text-white'
                            }`}
                          >
                            <option value="Short Film">Short Film</option>
                            <option value="Feature Film">Feature Film</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Podcast">Podcast</option>
                            <option value="Audio Story">Audio Story</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* Storyboard Agent Form */}
                    {selectedAgent.id === 'storyboard' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Scene Description</label>
                          <textarea
                            value={storyboardDesc}
                            onChange={(e) => setStoryboardDesc(e.target.value)}
                            placeholder="e.g. A character enters a massive steam-filled engine room lit by crimson warning lights..."
                            rows={4}
                            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                              d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                            }`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Camera Move</label>
                            <select
                              value={storyboardMovement}
                              onChange={(e) => setStoryboardMovement(e.target.value)}
                              className={`px-3 py-2 rounded-xl text-[12px] font-semibold border ${d ? 'bg-white border-neutral-250 text-neutral-900' : 'bg-neutral-950 border-neutral-800 text-white'}`}
                            >
                              <option value="pan">Pan</option>
                              <option value="zoom">Zoom</option>
                              <option value="dolly">Dolly</option>
                              <option value="tilt">Tilt</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Lens Choice</label>
                            <select
                              value={storyboardLens}
                              onChange={(e) => setStoryboardLens(e.target.value)}
                              className={`px-3 py-2 rounded-xl text-[12px] font-semibold border ${d ? 'bg-white border-neutral-250 text-neutral-900' : 'bg-neutral-950 border-neutral-800 text-white'}`}
                            >
                              <option value="Anamorphic 50mm">Anamorphic 50mm</option>
                              <option value="Prime 35mm">Prime 35mm</option>
                              <option value="Wide 24mm">Wide Angle 24mm</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Critic Agent Form */}
                    {selectedAgent.id === 'critic' && (
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Screenplay Script Text</label>
                        <textarea
                          value={criticScript}
                          onChange={(e) => setCriticScript(e.target.value)}
                          placeholder="Paste script dialogue lines or outlines to critique here..."
                          rows={6}
                          className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                            d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Editor Agent Form */}
                    {selectedAgent.id === 'editor' && (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Original Script</label>
                          <textarea
                            value={editorScript}
                            onChange={(e) => setEditorScript(e.target.value)}
                            placeholder="Paste the current script here..."
                            rows={4}
                            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                              d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                            }`}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Criticisms / Refinements Required</label>
                          <textarea
                            value={editorCriticism}
                            onChange={(e) => setEditorCriticism(e.target.value)}
                            placeholder="e.g. Split scene 2 into smaller cuts, add voice narrator marker details..."
                            rows={3}
                            className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                              d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                            }`}
                          />
                        </div>
                      </>
                    )}

                    {/* Showrunner Agent Form */}
                    {selectedAgent.id === 'showrunner' && (
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Production Concept Pitch</label>
                        <textarea
                          value={showrunnerPitch}
                          onChange={(e) => setShowrunnerPitch(e.target.value)}
                          placeholder="e.g. A 2-minute stylized CGI trailer for a mystery series set inside a futuristic library..."
                          rows={6}
                          className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                            d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Planner Agent Form */}
                    {selectedAgent.id === 'planner' && (
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Film Overview / Project Pitch</label>
                        <textarea
                          value={plannerOverview}
                          onChange={(e) => setPlannerOverview(e.target.value)}
                          placeholder="Describe the production blueprint, timelines, or constraints to organize..."
                          rows={6}
                          className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                            d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                          }`}
                        />
                      </div>
                    )}

                    {/* Scene Breakdown Agent Form */}
                    {selectedAgent.id === 'scene_breakdown' && (
                      <div className="flex flex-col gap-1.5">
                        <label className={`text-[10px] font-bold uppercase tracking-wider ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>Dialogue / Script Passage</label>
                        <textarea
                          value={breakdownText}
                          onChange={(e) => setBreakdownText(e.target.value)}
                          placeholder="Paste a script page or scene text block to breakdown..."
                          rows={6}
                          className={`px-3 py-2 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                            d ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400' : 'bg-neutral-950 border-neutral-800 text-white focus:border-purple-500/50'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Chat Sandbox instructions */}
                {workspaceTab === 'chat' && (
                  <div className={`p-4 rounded-xl border leading-relaxed text-[11.5px] ${
                    d ? 'bg-neutral-50 border-neutral-200 text-neutral-700' : 'bg-[#08080c] border-neutral-850 text-neutral-400'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5 mb-2"><FiMessageSquare /> Generic chat mode</span>
                    Ask {selectedAgent.name} questions directly or refine custom settings. Chat history is saved locally during your session.
                  </div>
                )}
              </div>

              {workspaceTab === 'actions' && (
                <button
                  onClick={() => handleExecuteTask(selectedAgent.id)}
                  disabled={runLoading}
                  className="w-full mt-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-650 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg cursor-pointer text-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {runLoading ? <FiLoader className="animate-spin" /> : <FiPlay />}
                  {runLoading ? 'Running Pipeline...' : 'Run Agent Task'}
                </button>
              )}
            </div>

            {/* Right Side: Results Terminal / Sandbox Chat console */}
            <div className={`flex-1 flex flex-col overflow-hidden min-w-0 ${d ? 'bg-neutral-50/30' : 'bg-[#030305]'}`}>
              
              {workspaceTab === 'actions' ? (
                
                /* Run Results Terminal List */
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className={`px-6 py-4 border-b shrink-0 flex items-center justify-between ${
                    d ? 'bg-neutral-50 border-neutral-200' : 'bg-[#0c0c0f] border-neutral-900'
                  }`}>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${d ? 'text-neutral-600' : 'text-neutral-450'}`}>
                      Agent Output Terminal
                    </span>
                    {activeRuns.length > 0 && (
                      <button
                        onClick={() => setRunsHistory(prev => ({ ...prev, [selectedAgent.id]: [] }))}
                        className={`text-[10px] uppercase tracking-wider font-bold hover:text-red-500 transition-colors cursor-pointer ${d ? 'text-neutral-500' : 'text-neutral-450'}`}
                      >
                        Wipe logs
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {activeRuns.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                        <div className={`p-4 rounded-xl border mb-3 ${
                          d ? 'bg-neutral-150 border-neutral-200' : 'bg-neutral-900 border-neutral-850'
                        }`}>
                          <FiFileText className="text-purple-400" size={24} />
                        </div>
                        <h3 className={`text-[13px] font-bold uppercase tracking-wider ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>No outputs generated yet</h3>
                        <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-500' : 'text-neutral-450'}`}>
                          Fill in the workspace controls on the left and click **Run Agent Task** to start automated synthesis.
                        </p>
                      </div>
                    ) : (
                      activeRuns.map((run, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border p-5 flex flex-col gap-3 relative transition-all duration-300 ${
                            d
                              ? 'bg-white border-neutral-200 shadow-sm'
                              : 'bg-black border-neutral-900'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-dashed border-neutral-800 pb-2">
                            <span className="text-[10px] font-bold uppercase text-purple-500 flex items-center gap-1.5">
                              <FiCheckCircle /> {run.input}
                            </span>
                            <span className={`text-[9px] font-mono ${d ? 'text-neutral-450' : 'text-neutral-500'}`}>
                              Logged at {run.timestamp}
                            </span>
                          </div>

                          <div className={`font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap p-4 rounded-xl max-h-96 overflow-y-auto relative ${
                            d ? 'bg-neutral-50 border border-neutral-200 text-neutral-850' : 'bg-[#060608] border border-neutral-900 text-neutral-200'
                          }`}>
                            <button
                              onClick={() => handleCopyText(run.output, idx)}
                              className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-black text-white hover:bg-neutral-900 border border-neutral-800 transition-all cursor-pointer flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold"
                              title="Copy output"
                            >
                              {copiedIndex === idx ? <FiCheckCircle size={11} className="text-emerald-400" /> : <FiCopy size={11} />}
                              {copiedIndex === idx ? 'Copied' : 'Copy'}
                            </button>
                            {run.output}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              ) : (
                
                /* Chat console container */
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    {activeHistory.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
                        <div className={`p-4 rounded-xl border mb-3 ${
                          d ? 'bg-neutral-150 border-neutral-200' : 'bg-[#0f0f12] border-neutral-800'
                        }`}>
                          <FiMessageSquare className="text-purple-500" size={24} />
                        </div>
                        <h3 className={`text-[13px] font-bold uppercase tracking-wider ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>Playground chat session</h3>
                        <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-500' : 'text-neutral-450'}`}>
                          Ask {selectedAgent.name} questions directly to test boundaries and behavior.
                        </p>
                      </div>
                    ) : (
                      activeHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2.5`}
                        >
                          {msg.role !== 'user' && (
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 border ${
                              d ? 'bg-neutral-200 border-neutral-350 text-neutral-800' : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                            }`}>
                              {selectedAgent.name[0]}
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed border ${
                            msg.role === 'user'
                              ? 'bg-purple-700 border-purple-650 text-white shadow-md'
                              : d
                                ? 'bg-white border-neutral-250 text-neutral-900'
                                : 'bg-[#0c0c0e] border-neutral-850 text-neutral-200'
                          }`}>
                            <div className="font-mono text-[9px] font-black uppercase tracking-wider opacity-60 mb-1">
                              {msg.role === 'user' ? 'You' : selectedAgent.name}
                            </div>
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                          </div>
                          {msg.role === 'user' && (
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 border ${
                              d ? 'bg-neutral-205 border-neutral-350 text-neutral-800' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                            }`}>
                              U
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {chatLoading && (
                      <div className="flex justify-start items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0 border ${
                          d ? 'bg-neutral-200 border-neutral-350 text-neutral-850' : 'bg-neutral-900 border-neutral-800'
                        }`}>
                          {selectedAgent.name[0]}
                        </div>
                        <div className={`rounded-2xl px-4 py-3 text-[12px] flex items-center gap-2 border ${
                          d ? 'bg-white border-neutral-200' : 'bg-[#0c0c0e] border-neutral-850'
                        }`}>
                          <span className={`text-[10px] font-mono tracking-wider font-semibold ${d ? 'text-neutral-500' : 'text-neutral-500'}`}>
                            {selectedAgent.name} is thinking...
                          </span>
                          <FiLoader className="animate-spin text-purple-400" size={14} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input form - smaller textbox & nice deep button */}
                  <div className={`p-4 border-t shrink-0 flex justify-center ${d ? 'border-neutral-200 bg-white' : 'border-neutral-900 bg-black'}`}>
                    <form onSubmit={handleSendMessage} className="flex gap-2 max-w-2xl w-full">
                      {activeHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearChat}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-xl transition-all cursor-pointer ${
                            d
                              ? 'border-neutral-300 hover:bg-neutral-100 text-neutral-600'
                              : 'border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                          }`}
                        >
                          Clear
                        </button>
                      )}
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Ask ${selectedAgent.name}...`}
                        className={`flex-1 px-3 py-1.5 rounded-xl text-[11.5px] font-medium border focus:outline-hidden transition-all ${
                          d
                            ? 'bg-neutral-50 border-neutral-250 text-neutral-900 focus:border-neutral-400'
                            : 'bg-[#0a0a0c] border-neutral-850 text-white focus:border-purple-500/50'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !message.trim()}
                        className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-650 text-white text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-md"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </div>

              )}

            </div>

          </div>
        )}

      </div>
    </div>
  )
}
