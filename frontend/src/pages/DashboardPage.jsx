import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { StatCard, Skeleton, EmptyState, ScoreRing, SectionHeader } from '../components/ui/index'
import { BookOpen, BarChart2, Zap, Flame, Plus, ArrowRight, Target, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

function SessionCard({ session, onClick, delay = 0 }) {
  const statusColor = {
    completed: 'pill-green', in_progress: 'pill-amber', pending: 'pill-purple'
  }
  const statusLabel = { completed: 'Completed', in_progress: 'In Progress', pending: 'Pending' }
  return (
    <div
      className="card card-hover p-4 cursor-pointer animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent2/10 flex items-center justify-center flex-shrink-0 text-lg">
          {session.status === 'completed' ? '✅' : '📖'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-semibold text-sm truncate">{session.topic}</span>
            <span className={`pill ${statusColor[session.status]}`}>{statusLabel[session.status]}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Clock size={10} />{new Date(session.created_at).toLocaleDateString()}
            </span>
            <span className="text-[11px] text-purple-300 font-mono flex items-center gap-1">
              <Zap size={10} />+{session.xp_earned} XP
            </span>
          </div>
        </div>
        <ArrowRight size={14} className="text-muted flex-shrink-0 mt-1" />
      </div>
    </div>
  )
}

function WeakTopicRow({ topic }) {
  const pct = Math.round(topic.strength_score * 100)
  const color = pct < 40 ? '#f772c0' : pct < 65 ? '#f0c44e' : '#4ef0b8'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-[#A78BFA] truncate flex-1">{topic.concept}</span>
        <span className="font-mono ml-2 flex-shrink-0" style={{ color }}>{pct}%</span>
      </div>
      <div className="prog-track">
        <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-[10px] text-muted">{topic.topic}</div>
    </div>
  )
}

export default function DashboardPage() {
  const { firebaseUser, dbUser } = useAuth()
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [sessions, setSessions] = useState([])
  const [weakTopics, setWeakTopics] = useState([])
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [newTopic, setNewTopic] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getAnalytics().catch(() => null),
      api.getSessions().catch(() => []),
      api.getWeakTopics().catch(() => []),
      api.getDailyChallenge().catch(() => null),
    ]).then(([a, s, w, c]) => {
      setAnalytics(a)
      setSessions(s?.slice(0, 5) || [])
      setWeakTopics(w?.slice(0, 3) || [])
      setChallenge(c)
      setLoading(false)
    })
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTopic.trim()) return
    setCreating(true)
    try {
      const session = await api.createSession(newTopic.trim())
      toast.success('Session created!')
      navigate(`/session/${session.id}`)
    } catch (err) {
      toast.error(err.message)
      setCreating(false)
    }
  }

  const name = dbUser?.name || firebaseUser?.displayName || 'Learner'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const stats = [
    { label: 'Total Sessions', value: analytics?.total_sessions ?? '—', sub: 'all time', color: '#7c6af7', icon: BookOpen, delay: 0 },
    { label: 'Completed', value: analytics?.completed_sessions ?? '—', sub: 'sessions done', color: '#4ef0b8', icon: BarChart2, delay: 60 },
    { label: 'Avg Score', value: analytics?.avg_score ? `${Math.round(analytics.avg_score * 100)}%` : '—', sub: 'quiz accuracy', color: '#f772c0', icon: Target, delay: 120 },
    { label: 'Streak', value: `${analytics?.current_streak ?? 0} d`, sub: 'current streak', color: '#f0c44e', icon: Flame, delay: 180 },
  ]

  return (
    <div className="p-6 md:p-10 mx-auto">
      <div className="mb-8 animate-fade-up">
        <div className="text-xs text-muted tracking-widest uppercase mb-1">{greeting}</div>
        <h1 className="font-display font-extrabold text-3xl">
          {name} <span className="text-gradient">👋</span>
        </h1>
        <p className="text-muted text-sm mt-1">Ready to learn something new today?</p>
      </div>

      <form onSubmit={handleCreate} className="card p-5 mb-8 animate-fade-up" style={{ animationDelay: '60ms', animationFillMode: 'both' }}>
        <div className="text-xs text-muted mb-3 flex items-center gap-2">
          <Plus size={12} /><span className="tracking-widest uppercase">Start a new session</span>
        </div>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="What do you want to learn? e.g. Transformers & Attention Mechanism, K-Means Clustering…"
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
          />
          <button type="submit" disabled={creating || !newTopic.trim()} className="btn-primary flex-shrink-0 flex items-center gap-2">
            {creating ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Generate Path'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {['Neural Networks', 'Decision Trees', 'Gradient Descent', 'BERT & Transformers', 'K-Means Clustering', 'PCA'].map(t => (
            <button key={t} type="button" onClick={() => setNewTopic(t)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-border text-muted hover:border-accent/40 hover:text-[#A78BFA] transition-all">
              {t}
            </button>
          ))}
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />) :
          stats.map((s, i) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-5 col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Zap size={16} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-semibold">Daily Challenge</div>
              <div className="text-[10px] text-muted">Today's goal</div>
            </div>
          </div>
          {loading ? <Skeleton className="h-16" /> : challenge ? (
            <>
              <p className="text-sm text-muted mb-3">{challenge.task}</p>
              <div className="flex items-center justify-between">
                <span className="pill pill-amber">+{challenge.bonus_xp} bonus XP</span>
                {challenge.completed && <span className="pill pill-green">✓ Done</span>}
              </div>
            </>
          ) : <p className="text-sm text-muted">Complete a checkpoint today to stay on streak!</p>}
        </div>

        {/* Weak Topics */}
        <div className="card p-5 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent2/15 flex items-center justify-center">
                <Target size={16} className="text-accent2" />
              </div>
              <div>
                <div className="text-xs font-semibold">Focus Areas</div>
                <div className="text-[10px] text-muted">Needs more practice</div>
              </div>
            </div>
          </div>
          {loading ? <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            : weakTopics.length > 0 ? (
              <div className="space-y-4">{weakTopics.map(w => <WeakTopicRow key={w.concept} topic={w} />)}</div>
            ) : (
              <p className="text-sm text-muted">No weak areas identified yet. Start learning!</p>
            )}
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <SectionHeader
          label="Recent Activity"
          title="Sessions"
          action={<button className="btn-ghost text-xs" onClick={() => navigate('/learn/sessions')}>View all</button>}
        />
        {loading
          ? <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          : sessions.length > 0
            ? <div className="space-y-3">{sessions.map((s, i) => <SessionCard key={s.id} session={s} delay={i * 50} onClick={() => navigate(`/session/${s.id}`)} />)}</div>
            : <EmptyState icon="📚" title="No sessions yet" desc="Create your first learning session above!" />}
      </div>
    </div>
  )
}