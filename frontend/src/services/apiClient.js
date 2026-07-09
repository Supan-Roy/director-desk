import axios from 'axios'
import { triggerQuotaOverlay } from '../components/QuotaOverlay'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Extract detailed backend error messages and detect quota exhaustion
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.data && error.response.data.detail) {
      error.message = error.response.data.detail;
    }

    // Detect Qwen API quota exhaustion from backend error messages
    const msg = (error.message || '').toLowerCase();
    const status = error.response?.status;
    if (
      status === 402 ||
      status === 429 ||
      msg.includes('quota') ||
      msg.includes('insufficient') ||
      msg.includes('credit') ||
      msg.includes('rate limit') ||
      msg.includes('too many requests')
    ) {
      triggerQuotaOverlay();
    }

    return Promise.reject(error);
  }
)

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

/** Fetch all featured productions (demo content) for dashboard. */
export async function getFeaturedProductions() {
  const response = await apiClient.get('/api/projects/featured')
  return response.data
}

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

/** Fetch all generated character assets for a project. */
export async function getProjectCharacters(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/characters`)
  return response.data
}

/** Set a specific character version as the preferred/active one. */
export async function selectCharacterVersion(projectId, characterName, preferredAssetId) {
  const response = await apiClient.post(`/api/projects/${projectId}/characters/select-version`, {
    character_name: characterName,
    preferred_asset_id: preferredAssetId
  })
  return response.data
}

/** Trigger character asset generation job. */
export async function generateCharacterAsset(projectId, characterName) {
  const response = await apiClient.post('/api/generate/character', {
    project_id: String(projectId),
    target_id: characterName
  })
  return response.data
}

/** Fetch all generated environment assets for a project. */
export async function getProjectEnvironments(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/environments`)
  return response.data
}

/** Set a specific environment version as the preferred/active one. */
export async function selectEnvironmentVersion(projectId, environmentName, preferredAssetId) {
  const response = await apiClient.post(`/api/projects/${projectId}/environments/select-version`, {
    environment_name: environmentName,
    preferred_asset_id: preferredAssetId
  })
  return response.data
}

/** Trigger environment asset generation job. */
export async function generateEnvironmentAsset(projectId, environmentName) {
  const response = await apiClient.post('/api/generate/environment', {
    project_id: String(projectId),
    target_id: environmentName
  })
  return response.data
}

/** Fetch all generated voice assets for a project. */
export async function getProjectVoices(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/voices`)
  return response.data
}

/** Set a specific voice version as the preferred/active one. */
export async function selectVoiceVersion(projectId, characterName, preferredAssetId) {
  const response = await apiClient.post(`/api/projects/${projectId}/voices/select-version`, {
    character_name: characterName,
    preferred_asset_id: preferredAssetId
  })
  return response.data
}

/** Trigger voice asset generation job. */
export async function generateVoiceAsset(projectId, characterName) {
  const response = await apiClient.post('/api/generate/voice', {
    project_id: String(projectId),
    target_id: characterName
  })
  return response.data
}

// Scene rendering endpoints
export async function getSceneVideos(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/scenes/videos`)
  return response.data
}

export async function getScenesStatus(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/scenes/status`)
  return response.data
}

export async function generateSceneVideo(projectId, sceneNumberStr) {
  const response = await apiClient.post('/api/generate/scene', {
    project_id: String(projectId),
    target_id: sceneNumberStr
  })
  return response.data
}

export async function approveSceneVideo(projectId, videoId) {
  const response = await apiClient.post(`/api/projects/${projectId}/scenes/videos/${videoId}/approve`)
  return response.data
}

export async function deleteSceneVideo(projectId, videoId) {
  const response = await apiClient.post(`/api/projects/${projectId}/scenes/videos/${videoId}/delete`)
  return response.data
}

// ─── Director Sync™ ──────────────────────────────────────────────────────────

/**
 * Get the production sync status for a project.
 * Returns per-category health (characters, voices, environments, scenes, poster, trailer).
 */
export async function getSyncStatus(projectId) {
  const response = await apiClient.get(`/api/projects/${projectId}/sync/status`)
  return response.data
}

/**
 * Analyze the downstream impact of changing an asset.
 * Returns affected nodes, total credits, and formatted time estimate.
 */
export async function analyzeImpact(projectId, assetType, assetName) {
  const response = await apiClient.post(`/api/projects/${projectId}/sync/analyze`, {
    asset_type: assetType,
    asset_name: assetName,
  })
  return response.data
}

/**
 * Mark an asset as stale (out-of-sync) after it is saved/updated.
 * Triggers a Redis stale key with 5-minute TTL.
 */
export async function markStale(projectId, assetType, assetName) {
  const response = await apiClient.post(`/api/projects/${projectId}/sync/mark-stale`, {
    asset_type: assetType,
    asset_name: assetName,
  })
  return response.data
}

/**
 * Trigger Director Sync™ propagation — clears stale state for a project.
 * Pass affectedNodeIds to limit scope, or omit to clear all stale nodes.
 */
export async function propagateSync(projectId, affectedNodeIds = null) {
  const response = await apiClient.post(`/api/projects/${projectId}/sync/propagate`, {
    affected_node_ids: affectedNodeIds,
  })
  return response.data
}
