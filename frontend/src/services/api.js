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

export const api = {
  register: (data) => post('/auth/register', data),
  me: () => get('/auth/me'),
  updateTutorMode: (tutor_mode) => patch('/auth/me', { tutor_mode }),
  updateProfile: (data) => api.patch('/users/me', data),
  getSessions: () => get('/sessions/'),
  getSession: (id) => get(`/sessions/${id}`),
  createSession: (topic, user_notes = '') => post('/sessions/', { topic, user_notes }),
  completeSession: (id) => post(`/sessions/${id}/complete`),
  canCompleteSession: (id) => get(`/sessions/${id}/can-complete`),

  generateCheckpoints: (sessionId) => post(`/sessions/${sessionId}/checkpoints`),
  getCheckpoints: (sessionId) => get(`/sessions/${sessionId}/checkpoints`),

  getCheckpointContent: (sessionId, cpId) =>
    get(`/sessions/${sessionId}/checkpoints/${cpId}/content`),

  getCheckpointQuestions: (sessionId, cpId) =>
    get(`/sessions/${sessionId}/checkpoints/${cpId}/questions`),

  getRetryQuestions: (sessionId, cpId, weakAreas) =>
    post(`/sessions/${sessionId}/checkpoints/${cpId}/questions/retry`, weakAreas),

  submitQuiz: (cpId, answers) => post(`/checkpoints/${cpId}/submit`, { answers }),

  getFeynman: (cpId, attempt = 0) => get(`/checkpoints/${cpId}/feynman?attempt=${attempt}`),

  generateNotes: (sessionId, type = 'comprehensive') =>
    post(`/sessions/${sessionId}/notes/generate?notes_type=${type}`),

  getAnalytics: () => get('/analytics/'),
  getHistory: () => get('/analytics/history'),
  getProgress: () => get('/analytics/progress'),
  getSessionDetails: (id) => get(`/analytics/sessions/${id}/details`),

  getUserStats: () => get('/gamification/stats'),
  getBadges: () => get('/gamification/badges'),
  getWeakTopics: () => get('/gamification/weak-topics'),
  getDailyChallenge: () => get('/gamification/daily-challenge'),
  completeDailyChallenge: (id) => post(`/gamification/daily-challenge/${id}/complete`),
  getLeaderboard: () => get('/gamification/leaderboard'),
}