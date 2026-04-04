import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')
  return user.getIdToken(false)
}

async function request(method, path, body = null) {
  const token = await getToken()

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  })


  if (!res.ok) {
    let msg = `API ${method} ${path} failed (${res.status})`
    try {
      const data = await res.json()
      msg = data.detail || JSON.stringify(data) || msg
    } catch {
      msg = await res.text() || msg
    }
    console.error('[API Error]', msg)
    throw new Error(msg)
  }

  return res.json()
}

async function uploadForm(path, formData) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    let msg = `Upload ${path} failed (${res.status})`
    try { const d = await res.json(); msg = d.detail || JSON.stringify(d) || msg } catch { msg = await res.text() || msg }
    throw new Error(msg)
  }
  return res.json()
}

const get   = (path)       => request('GET',   path)
const post  = (path, body) => request('POST',  path, body)
const patch = (path, body) => request('PATCH', path, body)
const del   = (path)       => request('DELETE', path)

export const api = {

  register: (data) => post('/auth/register', data),

  me: () => get('/auth/me'),

  updateProfile: (data) => patch('/auth/me', data),

  getSessions:      ()                       => get('/sessions/'),
  getSession:       (id)                     => get(`/sessions/${id}`),
  createSession: (topic, user_notes = '')    => post(`/sessions/?topic=${encodeURIComponent(topic)}&user_notes=${encodeURIComponent(user_notes)}`),
  completeSession:  (id)                     => post(`/sessions/${id}/complete`),
  canCompleteSession: (id)                   => get(`/sessions/${id}/can-complete`),

  generateCheckpoints:   (sessionId)          => post(`/sessions/${sessionId}/checkpoints`),
  getCheckpoints:        (sessionId)          => get(`/sessions/${sessionId}/checkpoints`),
  getCheckpointContent:  (sessionId, cpId)    => get(`/sessions/${sessionId}/checkpoints/${cpId}/content`),
  getCheckpointQuestions:(sessionId, cpId)    => get(`/sessions/${sessionId}/checkpoints/${cpId}/questions`),
  getRetryQuestions:     (sessionId, cpId, weakAreas) => {
    const params = weakAreas && weakAreas.length
      ? '?' + weakAreas.map(w => `weak_areas=${encodeURIComponent(w)}`).join('&')
      : ''
    return post(`/sessions/${sessionId}/checkpoints/${cpId}/questions/retry${params}`)
  },
  updateCheckpoint:      (sessionId, cpId, data) =>
    request('PUT', `/sessions/${sessionId}/checkpoints/${cpId}`, data),

  submitQuiz:   (cpId, answers) => post(`/checkpoints/${cpId}/submit`, { answers }),
  getFeynman:   (cpId, attempt = 0) => get(`/checkpoints/${cpId}/feynman?attempt=${attempt}`),

  generateNotes: (sessionId, type = 'comprehensive') =>
    post(`/sessions/${sessionId}/notes/generate?notes_type=${type}`),
  uploadNotes:   (sessionId, formData) => uploadForm(`/sessions/${sessionId}/notes/upload`, formData),

  getAnalytics:       ()   => get('/analytics/'),
  getHistory:         ()   => get('/analytics/history'),
  getProgress:        ()   => get('/analytics/progress'),
  getSessionDetails:  (id) => get(`/analytics/sessions/${id}/details`),

  getUserStats:    ()   => get('/gamification/stats'),
  getBadges:       ()   => get('/gamification/badges'),
  getBadgeDefinitions: () => get('/gamification/badge-definitions'),
  checkBadges:     ()   => post('/gamification/badges/check'),
  getWeakTopics:   ()   => get('/gamification/weak-topics'),
  getDailyChallenge:()  => get('/gamification/daily-challenge'),
  completeDailyChallenge: (id) => post(`/gamification/daily-challenge/${id}/complete`),
  getLeaderboard:  ()   => get('/gamification/leaderboard'),

  updateTutorMode: (tutor_mode) => patch('/auth/me', { tutor_mode }),

  createNote:          (data)       => post('/gamification/notes', data),
  getNotes:            (sessionId)  => get(`/gamification/notes/${sessionId}`),
  generateSmartNotes:  (sessionId)  => post(`/gamification/notes/${sessionId}/generate`),
}