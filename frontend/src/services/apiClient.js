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

// Project status & agents
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

// Generate (trigger the showrunner)
export async function generateStory(prompt, mode = 'fast') {
  const response = await apiClient.post('/api/generate', { prompt, mode })
  return response.data
}
