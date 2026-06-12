import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getProjectStatus,
  getScript,
  getStoryboard,
  getProductionPlan,
  generateStory,
  resetProject,
  apiBaseUrl,
} from '../services/apiClient'
import { featuredProductions } from '../data/featuredProductions'

const ProjectDataContext = createContext(null)

export function ProjectDataProvider({ children }) {
  const [hasProject, setHasProject] = useState(false)
  const [title, setTitle] = useState(null)
  const [agents, setAgents] = useState([])
  const [script, setScript] = useState('')
  const [storyboard, setStoryboard] = useState([])
  const [productionPlan, setProductionPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchProjectStatus = useCallback(async () => {
    try {
      const data = await getProjectStatus()
      setHasProject(data.hasProject)
      setTitle(data.title)
      setAgents(data.agents)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchScript = useCallback(async () => {
    try {
      const data = await getScript()
      setScript(data.script)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchStoryboard = useCallback(async () => {
    try {
      const data = await getStoryboard()
      setStoryboard(data.storyboard)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchProductionPlan = useCallback(async () => {
    try {
      const data = await getProductionPlan()
      setHasProject(data.hasProject)
      setProductionPlan(data.plan)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchProjectStatus(),
        fetchScript(),
        fetchStoryboard(),
        fetchProductionPlan(),
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fetchProjectStatus, fetchScript, fetchStoryboard, fetchProductionPlan])

  const handleGenerate = async (prompt, mode = 'fast') => {
    setLoading(true)
    setError(null)
    setHasProject(true)
    setTitle("Analyzing Creative Concept...")
    setScript("")
    setStoryboard([])
    setProductionPlan(null)
    setAgents([
      { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "active" },
      { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "waiting" },
      { id: "planner", name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "waiting" },
      { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "waiting" }
    ])

    try {
      const response = await fetch(`${apiBaseUrl}/api/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode }),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || 'Failed to start stream')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      const processEvent = (event) => {
        if (event.type === 'title') {
          setTitle(event.data)
        } else if (event.type === 'script_chunk') {
          setScript((prev) => prev + event.data)
        } else if (event.type === 'storyboard') {
          setStoryboard(event.data)
          setAgents([
            { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "active" },
            { id: "planner", name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "waiting" },
            { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "waiting" }
          ])
        } else if (event.type === 'production_plan') {
          setProductionPlan(event.data)
          setAgents([
            { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "just now" },
            { id: "planner", name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "completed", completedAt: "just now" },
            { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "active" }
          ])
        } else if (event.type === 'complete') {
          setAgents([
            { id: "writer", name: "Writer Agent", role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent", role: "Visual Planning", icon: "🎨", status: "completed", completedAt: "just now" },
            { id: "planner", name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "completed", completedAt: "just now" },
            { id: "critic", name: "Critic Agent", role: "Quality Review", icon: "🔍", status: "completed", completedAt: "just now" }
          ])
        } else if (event.type === 'error') {
          throw new Error(event.message || 'Stream error')
        }
      }

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.substring(6))
              processEvent(event)
            } catch (err) {
              console.error('Error parsing streaming event:', err)
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        try {
          const event = JSON.parse(buffer.trim().substring(6))
          processEvent(event)
        } catch (err) {
          console.error('Error parsing trailing streaming event:', err)
        }
      }

      await fetchAll()
    } catch (err) {
      console.error("Streaming generation failed:", err)
      const message = err.message || 'Generation failed'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    setLoading(true)
    setError(null)
    try {
      await resetProject()
      setHasProject(false)
      setTitle(null)
      setScript('')
      setStoryboard([])
      setProductionPlan(null)
      setAgents([])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadFeatured = useCallback((id) => {
    const prod = featuredProductions[id];
    if (prod) {
      setHasProject(true);
      setTitle(prod.title);
      setScript(prod.script);
      setStoryboard(prod.storyboard);
      setProductionPlan(prod.productionPlan);
      setAgents(prod.agents);
    }
  }, []);

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const value = {
    hasProject,
    title,
    agents,
    script,
    storyboard,
    productionPlan,
    loading,
    error,
    generate: handleGenerate,
    reset: handleReset,
    refresh: fetchAll,
    loadFeatured,
  }

  return (
    <ProjectDataContext.Provider value={value}>
      {children}
    </ProjectDataContext.Provider>
  )
}

export function useProjectData() {
  const ctx = useContext(ProjectDataContext)
  if (!ctx) {
    throw new Error('useProjectData must be used within ProjectDataProvider')
  }
  return ctx
}
