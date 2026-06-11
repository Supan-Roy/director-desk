import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  getProjectStatus,
  getScript,
  getStoryboard,
  getProductionPlan,
  generateStory,
  resetProject,
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

  const handleGenerate = async (prompt) => {
    setLoading(true)
    setError(null)
    try {
      await generateStory(prompt)
      // After generation, refetch ALL data from the single shared state
      await fetchAll()
    } catch (err) {
      const message = err.response?.data?.detail || err.message || 'Generation failed'
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
