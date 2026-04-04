import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Skeleton, Spinner } from '../components/ui/index'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { ChevronLeft, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const NOTE_TYPES = [
  { id: 'comprehensive', label: '📒 Full Notes',    desc: 'Detailed study notes for every checkpoint' },
  { id: 'cheatsheet',    label: '⚡ Cheat Sheet',   desc: 'Compact key facts and formulas' },
  { id: 'practice',      label: '📝 Practice Qs',   desc: 'Test yourself with practice questions' },
]

export default function NotesPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession]     = useState(null)
  const [noteType, setNoteType]   = useState('comprehensive')
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [loadingSess, setLoadingSess] = useState(true)

  useEffect(() => {
    api.getSession(id)
      .then(setSession)
      .catch(() => toast.error('Session not found'))
      .finally(() => setLoadingSess(false))
  }, [id])

  const generate = async () => {
    setLoading(true)
    setNotes('')
    try {
      const res = await api.generateNotes(id, noteType)
      setNotes(res.content)
    } catch (err) {
      toast.error(err.message || 'Failed to generate notes')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(notes)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(`/session/${id}`)} className="text-muted hover:text-[#A78BFA] transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <div className="text-[10px] tracking-widest uppercase text-muted mb-1">Session Notes</div>
          {loadingSess
            ? <Skeleton className="h-7 w-48" />
            : <h1 className="font-display text-2xl font-bold">{session?.topic}</h1>
          }
        </div>
      </div>

      {/* Note type selector */}
      <div className="card p-5 mb-5">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-4">Note Style</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {NOTE_TYPES.map(({ id: tid, label, desc }) => (
            <button
              key={tid}
              onClick={() => setNoteType(tid)}
              className={clsx(
                'text-left p-3 rounded-xl border transition-all font-body',
                noteType === tid
                  ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]'
                  : 'border-border text-muted hover:border-[var(--border-hover)]'
              )}
            >
              <div className="text-sm font-semibold mb-0.5">{label}</div>
              <div className="text-[11px] opacity-70">{desc}</div>
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary gap-2">
          {loading ? <><Spinner size={14} /> Generating…</> : 'Generate Notes'}
        </button>
      </div>

      {/* Output */}
      {(loading || notes) && (
        <div className="card p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] tracking-widest uppercase text-muted">Generated Notes</div>
            {notes && (
              <button onClick={copy} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3">
                {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className={clsx('h-4', i % 3 === 0 ? 'w-1/2' : i % 2 === 0 ? 'w-full' : 'w-4/5')} />
              ))}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none font-body leading-relaxed text-dim overflow-auto max-h-[65vh]">
              <ReactMarkdown>{notes}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  )
}