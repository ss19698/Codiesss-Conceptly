import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Skeleton, EmptyState, SectionHeader } from '../components/ui'
import { Plus, Clock, Zap, ChevronRight, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const STATUS_STYLE = {
  completed:   { pill: 'pill-green',  label: 'Completed' },
  in_progress: { pill: 'pill-amber',  label: 'In Progress' },
  pending:     { pill: 'pill-purple', label: 'Pending' },
}

function NewSessionModal({ onClose, onCreated }) {
  const [topic, setTopic] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const suggested = [
    'Neural Networks & Deep Learning',
    'Gradient Descent Optimization',
    'Decision Trees & Random Forests',
    'Transformers & Attention',
    'K-Means & Clustering',
    'PCA & Dimensionality Reduction',
    'Reinforcement Learning',
    'Convolutional Neural Networks',
    'LSTMs & Sequence Models',
    'SVM Classification',
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    try {
      const session = await api.createSession(topic.trim(), notes.trim())
      onCreated(session)
    } catch (err) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 card w-full max-w-lg p-6 animate-fade-up">
        <h2 className="font-display font-bold text-lg mb-1">New Learning Session</h2>
        <p className="text-muted text-sm mb-6">AI will generate a structured checkpoint roadmap for your topic</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Topic *</label>
            <input className="input" placeholder="e.g. Gradient Descent Optimization" value={topic}
              onChange={e => setTopic(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Your notes / context (optional)</label>
            <textarea className="input resize-none h-20" placeholder="Any prior knowledge, focus areas, or goals…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-muted mb-2">Quick suggestions</div>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map(s => (
                <button key={s} type="button" onClick={() => setTopic(s)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted hover:border-accent/40 hover:text-text transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading || !topic.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : '⬡ Generate Path'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LearnPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    api.getSessions()
      .then(setSessions)
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = sessions.filter(s => filter === 'all' || s.status === filter)

  const handleCreated = (session) => {
    setShowModal(false)
    navigate(`/learn/${session.id}`)
  }

  return (
    <div className="p-6 md:p-10 mx-auto">
      <SectionHeader
        label="Your learning"
        title="Sessions"
        action={
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={14} />New Session
          </button>
        }
      />

      <div className="flex gap-1.5 mb-6 bg-surface p-1 rounded-xl w-fit">
        {[['all','All'], ['in_progress','Active'], ['completed','Completed']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={clsx('text-xs px-4 py-2 rounded-lg transition-all font-medium', filter === val ? 'bg-card text-text' : 'text-muted hover:text-text')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📚"
          title={filter === 'all' ? 'No sessions yet' : `No ${filter.replace('_', ' ')} sessions`}
          desc="Create a session and the AI will build a personalized learning path."
          action={<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2"><Plus size={14} />Create Session</button>}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((session, i) => {
            const st = STATUS_STYLE[session.status] || STATUS_STYLE.pending
            return (
              <div key={session.id}
                className="card card-hover p-5 cursor-pointer animate-fade-up"
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                onClick={() => navigate(`/learn/${session.id}`)}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent2/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen size={20} className="text-accent/70" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-display font-semibold text-sm">{session.topic}</span>
                      <span className={`pill ${st.pill}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(session.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                      <span className="flex items-center gap-1 text-purple-300"><Zap size={10} />+{session.xp_earned} XP</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted flex-shrink-0" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <NewSessionModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
    </div>
  )
}