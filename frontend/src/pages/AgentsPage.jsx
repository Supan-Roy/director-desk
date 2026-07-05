import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FiArrowLeft, FiLoader, FiSend, FiMessageSquare, FiSliders, FiActivity,
  FiShield, FiCpu, FiPlay, FiSettings, FiCheckCircle
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
  const [selectedAgent, setSelectedAgent] = useState(null)
  
  // Chat playground states
  const [message, setMessage] = useState('')
  const [chatHistories, setChatHistories] = useState({}) // { [agentId]: [{role, content}] }
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Fetch agents metadata from backend
  useEffect(() => {
    async function fetchAgents() {
      try {
        setLoading(true)
        const res = await fetch(`${apiBaseUrl}/api/agents`)
        if (!res.ok) throw new Error("Failed to load agents list")
        const data = await res.json()
        setAgents(data)
        if (data.length > 0) {
          setSelectedAgent(data[0])
        }
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

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!message.trim() || !selectedAgent || chatLoading) return

    const userMsg = message.trim()
    setMessage('')
    setChatLoading(true)

    // Append user message immediately
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

  return (
    <div className={`flex h-screen overflow-hidden font-display transition-colors duration-500 relative ${d ? 'bg-white' : 'bg-[#06060b]'}`}>
      
      {/* Background ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-[#040409] via-[#06060b] to-[#080812]" />
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[20%] right-[15%] w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-[150px] pointer-events-none mix-blend-screen" />

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
              <PiRobotBold className="text-purple-500 animate-pulse" size={16} /> Production Agents
            </h1>
          </div>
        </header>

        {/* Content Workspace */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <FiLoader className={`animate-spin ${d ? 'text-neutral-800' : 'text-purple-500'}`} size={32} />
            <span className={`text-[12px] font-semibold tracking-wider uppercase ${d ? 'text-neutral-500' : 'text-surface-400'}`}>Loading Agents Registry...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            
            {/* Left Side: Agent List Grid */}
            <div className={`w-full lg:w-[380px] shrink-0 border-r overflow-y-auto flex flex-col gap-3.5 p-5 ${d ? 'border-neutral-200 bg-neutral-50/50' : 'border-white/[0.04] bg-black/10'}`}>
              <div>
                <h2 className={`text-[13px] font-bold uppercase tracking-widest ${d ? 'text-neutral-850' : 'text-neutral-200'}`}>Agent Directory</h2>
                <p className={`text-[11px] mt-1 ${d ? 'text-neutral-500' : 'text-surface-450'}`}>Select an autonomous agent to configure settings or run a sandbox chat playground.</p>
              </div>

              <div className="flex flex-col gap-2.5">
                {agents.map((agent) => {
                  const isSelected = selectedAgent?.id === agent.id
                  return (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-300 relative group cursor-pointer ${
                        isSelected
                          ? d
                            ? 'bg-neutral-100 border-neutral-350 shadow-xs'
                            : 'bg-white/[0.03] border-purple-500/50 shadow-lg shadow-purple-500/5'
                          : d
                            ? 'bg-white border-neutral-200 hover:border-neutral-300'
                            : 'bg-black/20 border-white/[0.04] hover:bg-white/[0.02] hover:border-white/[0.08]'
                      }`}
                    >
                      {/* Active indicator badge */}
                      <span className="relative flex h-2 w-2 mt-1 shrink-0">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          agent.status === "Idle" ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                          agent.status === "Idle" ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></span>
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`text-[12px] font-bold tracking-wide transition-colors ${
                            isSelected 
                              ? d ? 'text-neutral-900' : 'text-white' 
                              : d ? 'text-neutral-700' : 'text-neutral-300'
                          }`}>
                            {agent.name}
                          </h3>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                            d ? 'bg-black/5 text-black/60' : 'bg-white/5 text-white/50'
                          }`}>
                            {agent.role}
                          </span>
                        </div>
                        <p className={`text-[10.5px] leading-relaxed mt-1 line-clamp-2 ${
                          isSelected ? d ? 'text-gray-700' : 'text-surface-300' : d ? 'text-gray-500' : 'text-surface-450'
                        }`}>
                          {agent.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Right Side: Configuration & Sandbox Chat Playground */}
            {selectedAgent && (
              <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-transparent">
                
                {/* Agent Detail Header Panel */}
                <div className={`p-5 border-b shrink-0 ${d ? 'border-neutral-200 bg-white/40' : 'border-white/[0.04] bg-black/5'}`}>
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div>
                      <h2 className={`text-base font-bold tracking-tight uppercase ${d ? 'text-neutral-900' : 'text-white'}`}>
                        {selectedAgent.name}
                      </h2>
                      <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-600' : 'text-surface-400'}`}>
                        {selectedAgent.description}
                      </p>
                    </div>

                    {/* Agent parameters display tags */}
                    <div className="flex flex-wrap gap-2.5 self-start shrink-0">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold ${
                        d ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}>
                        <FiCpu className="text-purple-400" /> MODEL: {selectedAgent.model}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold ${
                        d ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}>
                        <FiSliders className="text-emerald-400" /> TEMP: {selectedAgent.temperature}
                      </div>
                      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono font-semibold ${
                        d ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-white/5 border-white/10 text-neutral-300'
                      }`}>
                        <FiActivity className="text-amber-400" /> COST: {selectedAgent.credits_per_run} CREDITS
                      </div>
                    </div>
                  </div>

                  {/* System Instruction display */}
                  <div className={`mt-3.5 p-3 rounded-lg border ${
                    d ? 'bg-neutral-100/50 border-neutral-200' : 'bg-black/25 border-white/[0.04]'
                  }`}>
                    <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${
                      d ? 'text-gray-500' : 'text-surface-500'
                    }`}>
                      <FiShield className="text-purple-400" /> System Prompt Guidelines
                    </span>
                    <p className={`text-[10.5px] font-mono leading-relaxed mt-1.5 ${
                      d ? 'text-neutral-700' : 'text-surface-300'
                    }`}>
                      "{selectedAgent.system_prompt}"
                    </p>
                  </div>
                </div>

                {/* Agent Chat Sandbox Playground */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
                  
                  {/* Chat Console Scroll area */}
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                    {activeHistory.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                        <div className={`p-4 rounded-full border mb-3 ${
                          d ? 'bg-neutral-150 border-neutral-200' : 'bg-white/5 border-white/10'
                        }`}>
                          <FiMessageSquare className="text-purple-400" size={24} />
                        </div>
                        <h3 className={`text-[13px] font-bold uppercase tracking-wider ${d ? 'text-neutral-800' : 'text-neutral-200'}`}>Agent Playground Sandbox</h3>
                        <p className={`text-[11.5px] leading-relaxed mt-1 ${d ? 'text-neutral-500' : 'text-surface-450'}`}>
                          Ask {selectedAgent.name} to write scene concepts, outline timelines, draft dialogues, or compile production presets.
                        </p>
                      </div>
                    ) : (
                      activeHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-[12px] leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/10'
                              : d
                                ? 'bg-neutral-100 border border-neutral-200 text-neutral-850'
                                : 'bg-white/5 border border-white/[0.04] text-neutral-200'
                          }`}>
                            <div className="font-mono text-[9px] font-black uppercase tracking-wider opacity-60 mb-1">
                              {msg.role === 'user' ? 'You' : selectedAgent.name}
                            </div>
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Agent typing loader */}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className={`rounded-2xl px-4 py-3 text-[12px] flex items-center gap-2 ${
                          d ? 'bg-neutral-100 border border-neutral-200' : 'bg-white/5 border border-white/[0.04]'
                        }`}>
                          <span className={`text-[10px] font-mono tracking-wider font-semibold ${d ? 'text-neutral-500' : 'text-surface-400'}`}>
                            {selectedAgent.name} is thinking...
                          </span>
                          <FiLoader className="animate-spin text-purple-400" size={14} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input form */}
                  <div className={`p-4 border-t shrink-0 ${d ? 'border-neutral-200 bg-white/60' : 'border-white/[0.04] bg-black/30'}`}>
                    <form onSubmit={handleSendMessage} className="flex gap-2.5">
                      {activeHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearChat}
                          className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider border rounded-xl transition-all cursor-pointer ${
                            d
                              ? 'border-neutral-200 hover:bg-neutral-100 text-gray-500'
                              : 'border-white/10 hover:bg-white/5 text-neutral-400'
                          }`}
                        >
                          Clear
                        </button>
                      )}
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Message ${selectedAgent.name}...`}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-[12px] font-semibold border focus:outline-hidden transition-all ${
                          d
                            ? 'bg-white border-neutral-250 text-neutral-900 focus:border-neutral-400'
                            : 'bg-black/30 border-white/10 text-white focus:border-purple-500/50'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={chatLoading || !message.trim()}
                        className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
                      >
                        <FiSend size={14} />
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
