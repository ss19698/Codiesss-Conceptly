import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { Spinner } from '../components/ui/index'
import toast from 'react-hot-toast'
import { Trophy, BookOpen, ArrowLeft, Zap, CheckCircle2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

/* ─── Confetti ──────────────────────────────────────── */
function Confetti() {
  const ref = useRef()
  useEffect(() => {
    const container = ref.current
    if (!container) return
    const colors = ['#5b7fff','#ff7a50','#3ec98e','#f5c842','#a87fff','#ff5bdb']
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div')
      el.className = 'confetti-piece'
      const size = 6 + Math.random() * 8
      el.style.cssText = `
        left:${Math.random() * 100}%;
        top:${-size}px;
        width:${size}px;
        height:${size}px;
        background:${colors[i % colors.length]};
        border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
        animation-duration:${1.8 + Math.random() * 2.2}s;
        animation-delay:${Math.random() * 0.9}s;
      `
      container.appendChild(el)
    }
    return () => { container.innerHTML = '' }
  }, [])
  return <div ref={ref} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />
}

/* ─── Stat card ─────────────────────────────────────── */
function Stat({ label, value, colour }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-[10px] tracking-widest uppercase text-muted mb-1">{label}</div>
      <div className="font-display text-3xl font-bold" style={{ color: colour }}>{value}</div>
    </div>
  )
}

export default function CompletionPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { id }    = useParams()

  // Data passed from SessionPage via router state
  const result      = location.state?.result
  const topic       = location.state?.topic || 'Session'
  const checkpoints = location.state?.checkpoints || []

  const [autoNotes, setAutoNotes]       = useState('')
  const [notesLoading, setNotesLoading] = useState(true)
  const [showNotes, setShowNotes]       = useState(false)

  // Auto-generate comprehensive notes on mount
  useEffect(() => {
    if (!id) return
    api.generateNotes(id, 'comprehensive')
      .then(res => setAutoNotes(res.content))
      .catch(() => toast.error('Could not auto-generate notes'))
      .finally(() => setNotesLoading(false))
  }, [id])

  const avgScore = checkpoints.length
    ? Math.round(checkpoints.reduce((s, c) => s + (c.understanding_score ?? 85), 0) / checkpoints.length)
    : 0

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Confetti />

      <div className="w-full max-w-xl text-center animate-fade-up">
        {/* Trophy icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
          style={{ background: 'linear-gradient(135deg,var(--accent3),#2adb9e)' }}>
          🏆
        </div>

        <h1 className="font-display text-3xl font-bold text-gradient mb-2">Session Complete!</h1>
        <p className="text-muted font-body mb-8">
          You've mastered all {checkpoints.length} checkpoints in <strong className="text-[#A78BFA]">{topic}</strong>.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8 text-left">
          <Stat label="XP Earned"   value={`+${result?.total_xp_earned ?? 0}`} colour="var(--amber)" />
          <Stat label="Checkpoints" value={checkpoints.length}                  colour="var(--accent3)" />
          <Stat label="Avg Score"   value={`${avgScore}%`}                      colour="var(--accent)" />
          <Stat label="Level"       value={result?.new_level ?? 1}              colour="var(--accent2)" />
        </div>

        {/* Level-up banner */}
        {result?.level_up && (
          <div className="card p-4 mb-6 flex items-center gap-3 text-left"
            style={{ borderColor: 'rgba(91,127,255,0.4)', background: 'var(--accent-bg)' }}>
            <Zap size={20} className="text-[var(--accent)] flex-shrink-0" />
            <div>
              <div className="font-semibold font-body text-sm">Level Up! 🎉</div>
              <div className="text-xs text-muted font-body">
                You're now Level {result.new_level}
              </div>
            </div>
          </div>
        )}

        {/* Auto-generated notes */}
        <div className="card p-5 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            {notesLoading
              ? <Spinner size={14} />
              : <CheckCircle2 size={14} className="text-[var(--accent3)]" />
            }
            <div className="text-[10px] tracking-widest uppercase"
              style={{ color: notesLoading ? 'var(--muted)' : 'var(--accent3)' }}>
              {notesLoading ? 'Generating Study Notes…' : 'Study Notes Ready'}
            </div>
          </div>

          {notesLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-3 rounded-lg" style={{ width: i % 2 === 0 ? '80%' : '60%' }} />
              ))}
            </div>
          ) : (
            <>
              <div className={`overflow-hidden transition-all duration-500 ${showNotes ? 'max-h-[400px]' : 'max-h-20'}`}>
                <div className="prose prose-invert prose-sm max-w-none font-body text-dim leading-relaxed overflow-auto max-h-[400px]">
                  <ReactMarkdown>{autoNotes}</ReactMarkdown>
                </div>
              </div>
              <button
                onClick={() => setShowNotes(v => !v)}
                className="text-xs text-[var(--accent)] font-semibold mt-2 hover:opacity-80 transition-opacity"
              >
                {showNotes ? '▲ Show less' : '▼ Show full notes'}
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button onClick={() => navigate(`/session/${id}/notes`)} className="btn-primary gap-2">
            <BookOpen size={14} /> View All Notes
          </button>
          <button onClick={() => navigate('/learn/sessions')} className="btn-ghost gap-2">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}