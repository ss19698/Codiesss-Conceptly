// src/services/api.js
// ─────────────────────────────────────────────────────────────
// All calls to your FastAPI backend at VITE_API_URL
// Auth: Firebase ID token sent as Bearer token
// The backend verifies it via jose/JWT using the Firebase public key
// ─────────────────────────────────────────────────────────────

import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken()
}

async function request(method, path, body = null) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

const get  = (path)        => request('GET',    path)
const post = (path, body)  => request('POST',   path, body)
const patch= (path, body)  => request('PATCH',  path, body)
const del  = (path)        => request('DELETE', path)

// ── Auth / User ───────────────────────────────────────────────
export const api = {
  // Register user in your DB after Firebase registration
  register: (data) => post('/auth/register', data),
  // Get own profile
  me: () => get('/auth/me'),
  // Update tutor mode
  updateTutorMode: (tutor_mode) => patch('/auth/me', { tutor_mode }),
  updateProfile: (data) => api.patch('/users/me', data),
  // ── Sessions ─────────────────────────────────────────────────
  getSessions: () => get('/sessions/'),
  getSession: (id) => get(`/sessions/${id}`),
  createSession: (topic, user_notes = '') => post('/sessions/', { topic, user_notes }),
  completeSession: (id) => post(`/sessions/${id}/complete`),
  canCompleteSession: (id) => get(`/sessions/${id}/can-complete`),

  // Generate checkpoint roadmap (AI via Groq + LangGraph)
  generateCheckpoints: (sessionId) => post(`/sessions/${sessionId}/checkpoints`),
  getCheckpoints: (sessionId) => get(`/sessions/${sessionId}/checkpoints`),

  // Load full AI-generated explanation + context for a checkpoint
  getCheckpointContent: (sessionId, cpId) =>
    get(`/sessions/${sessionId}/checkpoints/${cpId}/content`),

  // Load MCQ questions for a checkpoint
  getCheckpointQuestions: (sessionId, cpId) =>
    get(`/sessions/${sessionId}/checkpoints/${cpId}/questions`),

  // Generate fresh retry questions focused on weak areas
  getRetryQuestions: (sessionId, cpId, weakAreas) =>
    post(`/sessions/${sessionId}/checkpoints/${cpId}/questions/retry`, weakAreas),

  // Submit quiz answers → returns score, passed, weak_areas, xp_earned
  submitQuiz: (cpId, answers) => post(`/checkpoints/${cpId}/submit`, { answers }),

  // Get Feynman re-teaching for weak areas
  getFeynman: (cpId, attempt = 0) => get(`/checkpoints/${cpId}/feynman?attempt=${attempt}`),

  // ── Notes ────────────────────────────────────────────────────
  generateNotes: (sessionId, type = 'comprehensive') =>
    post(`/sessions/${sessionId}/notes/generate?notes_type=${type}`),

  // ── Analytics ────────────────────────────────────────────────
  getAnalytics: () => get('/analytics/'),
  getHistory: () => get('/analytics/history'),
  getProgress: () => get('/analytics/progress'),
  getSessionDetails: (id) => get(`/analytics/sessions/${id}/details`),

  // ── Gamification ─────────────────────────────────────────────
  getUserStats: () => get('/gamification/stats'),
  getBadges: () => get('/gamification/badges'),
  getWeakTopics: () => get('/gamification/weak-topics'),
  getDailyChallenge: () => get('/gamification/daily-challenge'),
  completeDailyChallenge: (id) => post(`/gamification/daily-challenge/${id}/complete`),
  getLeaderboard: () => get('/gamification/leaderboard'),
}