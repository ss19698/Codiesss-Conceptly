import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Skeleton } from '../components/ui/index'
import NewSessionModal from '../components/ui/NewSessionModal'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Plus, Zap, BookOpen } from 'lucide-react'

function SessionCard({ session, onClick }) {
  const done  = session.checkpoints_completed ?? 0
  const total = session.checkpoints_total ?? 0
  const pct   = session.status === 'completed' ? 100 : (total ? Math.round((done / total) * 100) : 0)

  return (
    <div
      onClick={onClick}
      className="card card-hover p-5 cursor-pointer relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-widest uppercase text-muted mb-1">Session</div>
          <h3 className="font-display text-lg font-bold leading-tight truncate">{session.topic}</h3>
        </div>
        <span className={clsx(
          'pill flex-shrink-0',
          session.status === 'completed' ? 'pill-green' : 'pill-amber'
        )}>
          {session.status === 'completed' ? 'Completed' : 'In Progress'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="prog-track flex-1">
          <div className="prog-fill" style={{ width: `${pct}%` }} />
        </div>
        {total > 0 && <span className="text-[11px] text-muted font-mono">{done}/{total}</span>}
        <span className="text-[11px] text-muted font-mono flex items-center gap-1">
          <Zap size={9} className="text-amber-400" />{session.xp_earned} XP
        </span>
      </div>

      {session.rag_active && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold"
            style={{ color: 'var(--accent3)' }}>🔗 RAG</span>
        </div>
      )}
    </div>
  )
}

export default function SessionsListPage({ onXPUpdate }) {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.getSessions()
      .then(setSessions)
      .catch(() => toast.error('Failed to load sessions'))
      .finally(() => setLoading(false))
  }, [])
  const handleCreate = (session) => {
    setSessions(prev => [session, ...prev])
    navigate(`/session/${session.id}`)
  }
  console.log(sessions);

  return (
    <div className="p-6 md:p-10 max-w-8xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-1">Dashboard</div>
          <h1 className="font-display text-3xl font-bold text-gradient">My Learning Sessions</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <Plus size={15} /> New Session
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card p-16 text-center">
          <BookOpen size={40} className="text-muted mx-auto mb-4" />
          <div className="font-display text-xl font-bold mb-2">No sessions yet</div>
          <p className="text-muted text-sm font-body mb-6">
            Create your first learning session to get started.
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
            <Plus size={14} /> Create Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              onClick={() => navigate(`/session/${s.id}`)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewSessionModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}