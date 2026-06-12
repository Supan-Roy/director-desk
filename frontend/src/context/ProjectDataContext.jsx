import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getProjectStatus,
  getScript,
  getStoryboard,
  getProductionPlan,
  generateStory,
  resetProject,
  apiBaseUrl,
  getProjects,
  getProjectById,
  deleteProject,
  updateProjectScript,
  apiClient,
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
  const [productionType, setProductionType] = useState('Auto Detect')

  // ── Saved projects (sidebar list) ──────────────────────────────────────
  const [savedProjects, setSavedProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(null)

  const fetchSavedProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const data = await getProjects()
      setSavedProjects(data)
    } catch (err) {
      console.error('Failed to fetch saved projects:', err)
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  // ── Load a saved project into the workspace ─────────────────────────────
  const loadProject = useCallback(async (id) => {
    setLoading(true)
    setError(null)
    try {
      const project = await getProjectById(id)
      setHasProject(true)
      setTitle(project.title)
      setScript(project.script || '')
      setStoryboard(project.storyboard || [])
      setProductionPlan(project.production_plan || null)
      setProductionType(project.production_type || 'Auto Detect')
      setActiveProjectId(id)
      // Show agents as all-completed since this is a restored session
      setAgents([
        { id: 'writer',     name: 'Writer Agent',       role: 'Script & Narrative',  icon: '✍️', status: 'completed', completedAt: 'saved' },
        { id: 'storyboard', name: 'Storyboard Agent',   role: 'Visual Planning',      icon: '🎨', status: 'completed', completedAt: 'saved' },
        { id: 'planner',    name: 'Production Planner', role: 'Execution Strategy',   icon: '📋', status: 'completed', completedAt: 'saved' },
        { id: 'critic',     name: 'Critic Agent',       role: 'Quality Review',       icon: '🔍', status: 'completed', completedAt: 'saved' },
      ])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Delete a saved project ──────────────────────────────────────────────
  const removeSavedProject = useCallback(async (id) => {
    try {
      await deleteProject(id)
      setSavedProjects((prev) => prev.filter((p) => p.id !== id))
      // If the deleted project is currently open, reset workspace
      if (activeProjectId === id) {
        setHasProject(false)
        setTitle(null)
        setScript('')
        setStoryboard([])
        setProductionPlan(null)
        setProductionType('Auto Detect')
        setAgents([])
        setActiveProjectId(null)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }, [activeProjectId])

  // ── In-memory project data fetchers (used after generate) ──────────────
  const fetchProjectStatus = useCallback(async () => {
    try {
      const data = await getProjectStatus()
      setHasProject(data.hasProject)
      setTitle(data.title)
      setAgents(data.agents)
      setProductionType(data.productionType || 'Auto Detect')
      if (data.id) {
        setActiveProjectId(data.id)
      }
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

  // ── Generation handler ──────────────────────────────────────────────────
  const handleGenerate = async (prompt, mode = 'fast', prodType = 'Auto Detect', files = []) => {
    setLoading(true)
    setError(null)
    setHasProject(true)
    setActiveProjectId(null)
    setTitle("Analyzing Creative Concept...")
    setScript("")
    setStoryboard([])
    setProductionPlan(null)
    setProductionType(prodType)
    setAgents([
      { id: "writer",     name: "Writer Agent",       role: "Script & Narrative", icon: "✍️", status: "active" },
      { id: "storyboard", name: "Storyboard Agent",   role: "Visual Planning",    icon: "🎨", status: "waiting" },
      { id: "planner",    name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "waiting" },
      { id: "critic",     name: "Critic Agent",       role: "Quality Review",     icon: "🔍", status: "waiting" }
    ])

    try {
      const response = await fetch(`${apiBaseUrl}/api/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, mode, production_type: prodType, files }),
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
        } else if (event.type === 'production_type') {
          setProductionType(event.data)
        } else if (event.type === 'script_chunk') {
          setScript((prev) => prev + event.data)
        } else if (event.type === 'storyboard') {
          setStoryboard(event.data)
          const isAudio = event.data.length === 0
          setAgents([
            { id: "writer",     name: "Writer Agent",       role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent",   role: "Visual Planning",    icon: "🎨", status: isAudio ? "completed" : "active", completedAt: isAudio ? "N/A" : null },
            { id: "planner",    name: "Production Planner", role: "Execution Strategy", icon: "📋", status: isAudio ? "active" : "waiting" },
            { id: "critic",     name: "Critic Agent",       role: "Quality Review",     icon: "🔍", status: "waiting" }
          ])
        } else if (event.type === 'production_plan') {
          setProductionPlan(event.data)
          setAgents([
            { id: "writer",     name: "Writer Agent",       role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent",   role: "Visual Planning",    icon: "🎨", status: "completed", completedAt: storyboard && storyboard.length === 0 ? "N/A" : "just now" },
            { id: "planner",    name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "completed", completedAt: "just now" },
            { id: "critic",     name: "Critic Agent",       role: "Quality Review",     icon: "🔍", status: "active" }
          ])
        } else if (event.type === 'complete') {
          setAgents([
            { id: "writer",     name: "Writer Agent",       role: "Script & Narrative", icon: "✍️", status: "completed", completedAt: "just now" },
            { id: "storyboard", name: "Storyboard Agent",   role: "Visual Planning",    icon: "🎨", status: "completed", completedAt: storyboard && storyboard.length === 0 ? "N/A" : "just now" },
            { id: "planner",    name: "Production Planner", role: "Execution Strategy", icon: "📋", status: "completed", completedAt: "just now" },
            { id: "critic",     name: "Critic Agent",       role: "Quality Review",     icon: "🔍", status: "completed", completedAt: "just now" }
          ])
          // Refresh sidebar list after auto-save completes (small delay for DB write)
          setTimeout(() => fetchSavedProjects(), 800)
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

  // ── Reset ───────────────────────────────────────────────────────────────
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
      setProductionType('Auto Detect')
      setAgents([])
      setActiveProjectId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Load a featured (demo) production ──────────────────────────────────
  const loadFeatured = useCallback((id) => {
    const prod = featuredProductions[id];
    if (prod) {
      setHasProject(true);
      setTitle(prod.title);
      setScript(prod.script);
      setStoryboard(prod.storyboard);
      setProductionPlan(prod.productionPlan);
      setAgents(prod.agents);
      setProductionType(prod.productionType || 'Short Film');
      setActiveProjectId(null);
    }
  }, []);

  // ── Update Script (Context-wide) ─────────────────────────────────────────
  const updateScript = useCallback(async (newScriptText) => {
    setScript(newScriptText);
    
    // Sync with backend's in-memory project_state
    try {
      await apiClient.put('/api/script', { script: newScriptText });
    } catch (err) {
      console.error('Failed to update in-memory script:', err);
    }

    // If activeProjectId is set, sync with SQLite DB
    if (activeProjectId) {
      try {
        await updateProjectScript(activeProjectId, newScriptText);
        fetchSavedProjects();
      } catch (err) {
        console.error('Failed to update project script in database:', err);
      }
    }
  }, [activeProjectId, fetchSavedProjects]);

  // ── Bootstrap ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAll()
    fetchSavedProjects()
  }, [fetchAll, fetchSavedProjects])

  const value = {
    hasProject,
    title,
    agents,
    script,
    storyboard,
    productionPlan,
    loading,
    error,
    productionType,
    // Saved projects
    savedProjects,
    projectsLoading,
    activeProjectId,
    // Actions
    generate: handleGenerate,
    reset: handleReset,
    refresh: fetchAll,
    loadFeatured,
    loadProject,
    removeSavedProject,
    fetchSavedProjects,
    updateScript,
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
