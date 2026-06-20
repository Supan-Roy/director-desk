import axios from 'axios'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function healthCheck() {
  const response = await apiClient.get('/api/health')
  return response.data
}

// Project status & agents (in-memory)
export async function getProjectStatus() {
  const response = await apiClient.get('/api/project/status')
  return response.data
}

export async function resetProject() {
  const response = await apiClient.post('/api/project/reset')
  return response.data
}

// Script
export async function getScript() {
  const response = await apiClient.get('/api/script')
  return response.data
}

// Storyboard
export async function getStoryboard() {
  const response = await apiClient.get('/api/storyboard')
  return response.data
}

// Production plan
export async function getProductionPlan() {
  const response = await apiClient.get('/api/planning')
  return response.data
}

// Scene breakdown
export async function getSceneBreakdown() {
  const response = await apiClient.get('/api/scene_breakdown')
  return response.data
}

// Generate (trigger the showrunner)
export async function generateStory(prompt, mode = 'fast') {
  const response = await apiClient.post('/api/generate', { prompt, mode })
  return response.data
}

// ─── Persisted Projects ────────────────────────────────────────────────────

/** Fetch all saved projects (sidebar list). */
export async function getProjects() {
  const response = await apiClient.get('/api/projects')
  return response.data
}

/** Fetch a single saved project by id (full detail). */
export async function getProjectById(id) {
  const response = await apiClient.get(`/api/projects/${id}`)
  return response.data
}

/** Delete a saved project by id. */
export async function deleteProject(id) {
  await apiClient.delete(`/api/projects/${id}`)
}

/** Update the script of a saved project. */
export async function updateProjectScript(id, script) {
  const response = await apiClient.patch(`/api/projects/${id}`, { script })
  return response.data
}

/** Update the approval status of a saved project. */
export async function updateProjectApproval(id, approved) {
  const response = await apiClient.patch(`/api/projects/${id}`, { approved })
  return response.data
}

/** Update generic fields of a saved project. */
export async function updateProject(id, payload) {
  const response = await apiClient.patch(`/api/projects/${id}`, payload)
  return response.data
}

/** Refine the script of a saved project using Editor Agent. */
export async function refineProjectScript(id) {
  const response = await apiClient.post(`/api/projects/${id}/refine`)
  return response.data
}

/** Refine a raw script dynamically using Editor Agent. */
export async function refineRawScript(script, criticReview) {
  const response = await apiClient.post('/api/projects/refine-raw', { script, critic_review: criticReview })
  return response.data
}
