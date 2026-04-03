import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { Skeleton, LevelBadge, Spinner } from '../components/ui'
import QuizPanel from '../components/quiz/QuizPanel'
import FeynmanPanel from '../components/checkpoint/FeynmanPanel'
import GamePathStepper from '../components/checkpoint/GamePathStepper'  
import toast from 'react-hot-toast'
import clsx from 'clsx'
import {
  ChevronLeft, CheckCircle2, Clock, Zap,
  BookOpen, FlaskConical, BrainCircuit, FileText,
  ChevronRight, Trophy, RefreshCw
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function ContentSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/5" />
      <div className="h-4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

function TabBar({ tab, setTab, quizPassed }) {
  const tabs = [
    { id: 'learn',   icon: BookOpen,      label: 'Learn' },
    { id: 'quiz',    icon: FlaskConical,  label: 'Quiz' },
    { id: 'feynman', icon: BrainCircuit,  label: 'Re-teach' },
    { id: 'notes',   icon: FileText,      label: 'Notes' },
  ]
  return (
    <div className="flex gap-1 bg-surface/60 p-1 rounded-xl w-fit mb-6 border border-border">
      {tabs.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setTab(id)}
          className={clsx(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold font-body transition-all',
            tab === id
              ? 'bg-card text-text shadow-sm'
              : 'text-muted hover:text-text'
          )}
        >
          <Icon size={13} strokeWidth={1.8} />
          {label}
          {id === 'quiz' && quizPassed && (
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-accent3 inline-block" />
          )}
        </button>
      ))}
    </div>
  )
}

function LearnTab({ cp, content, loadingContent }) {
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-3">Learning Objectives</div>
        <div className="space-y-2">
          {cp.objectives?.map((obj, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="text-accent3 mt-0.5 flex-shrink-0">◆</span>
              <span className="text-sm text-text leading-relaxed font-body">{obj}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-3">Key Concepts</div>
        <div className="flex flex-wrap gap-2">
          {cp.key_concepts?.map(k => (
            <span key={k} className="pill pill-purple font-mono text-[11px]">{k}</span>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent3 animate-pulse" />
          <div className="text-[10px] tracking-widest uppercase text-accent3">AI-Generated Explanation</div>
        </div>
        {loadingContent ? <ContentSkeleton /> : (
          <div className="prose prose-invert prose-sm max-w-none font-body leading-relaxed text-muted">
            <ReactMarkdown>{content?.explanation || '*Generating explanation…*'}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function NotesTab({ sessionId, checkpoints }) {
  const [type, setType] = useState('comprehensive')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.generateNotes(sessionId, type)
      setNotes(res.content)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="text-[10px] tracking-widest uppercase text-muted mb-4">Generate Study Notes</div>
        <div className="flex gap-2 mb-4">
          {[['comprehensive','📒 Full Notes'], ['cheatsheet','⚡ Cheat Sheet'], ['practice','📝 Practice Qs']].map(([val, label]) => (
            <button key={val} onClick={() => setType(val)}
              className={clsx('text-xs px-3 py-2 rounded-lg border transition-all font-body',
                type === val ? 'border-accent bg-accent/10 text-purple-300' : 'border-border text-muted hover:border-accent/40')}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={generate} disabled={loading} className="btn-primary flex items-center gap-2">
          {loading ? <><Spinner size={14} />Generating…</> : 'Generate Notes'}
        </button>
      </div>

      {notes && (
        <div className="card p-5">
          <div className="prose prose-invert prose-sm max-w-none font-body leading-relaxed text-muted">
            <ReactMarkdown>{notes}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [session, setSession]               = useState(null)
  const [checkpoints, setCheckpoints]       = useState([])
  const [activeIdx, setActiveIdx]           = useState(0)
  const [tab, setTab]                       = useState('learn')
  const [content, setContent]               = useState(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [loadingContent, setLoadingContent] = useState(false)
  const [generatingCps, setGeneratingCps]   = useState(false)
  const [quizPassed, setQuizPassed]         = useState(false)
  const [completing, setCompleting]         = useState(false)
  const [canComplete, setCanComplete]       = useState(false)

  const [newlyDone, setNewlyDone] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [sess, cps] = await Promise.all([
          api.getSession(id),
          api.getCheckpoints(id),
        ])
        setSession(sess)
        if (cps.length === 0) {
          setGeneratingCps(true)
          await api.generateCheckpoints(id)
          const fresh = await api.getCheckpoints(id)
          setCheckpoints(fresh)
          setGeneratingCps(false)
        } else {
          setCheckpoints(cps)
          const firstIncomplete = cps.findIndex(c => c.status !== 'completed')
          setActiveIdx(firstIncomplete === -1 ? 0 : firstIncomplete)
        }
      } catch (err) {
        toast.error('Failed to load session')
        navigate('/learn')
      } finally {
        setLoadingSession(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!checkpoints[activeIdx]) return
    const cp = checkpoints[activeIdx]
    setContent(null)
    setLoadingContent(true)
    api.getCheckpointContent(id, cp.id)
      .then(setContent)
      .catch(() => toast.error('Failed to load content'))
      .finally(() => setLoadingContent(false))
  }, [activeIdx, checkpoints.length])

  useEffect(() => {
    if (!session || session.status === 'completed') return
    api.canCompleteSession(id)
      .then(r => setCanComplete(r.can_complete))
      .catch(() => {})
  }, [checkpoints])

  const handleQuizPass = useCallback(async () => {
    setQuizPassed(true)
    try {
      const fresh = await api.getCheckpoints(id)
      setNewlyDone(activeIdx)           
      setCheckpoints(fresh)
      const canC = await api.canCompleteSession(id)
      setCanComplete(canC.can_complete)
      setTimeout(() => setNewlyDone(null), 1200)
    } catch {}
  }, [id, activeIdx])

  const handleComplete = async () => {
    setCompleting(true)
    try {
      const result = await api.completeSession(id)
      toast.success(`🎉 Session complete! +${result.total_xp_earned} XP earned`)
      if (result.level_up) toast.success(`⬆️ Level up! You're now Level ${result.new_level}!`)
      navigate('/learn')
    } catch (err) {
      toast.error(err.message)
      setCompleting(false)
    }
  }

  const activeCp = checkpoints[activeIdx]

  if (loadingSession) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 mx-auto">
      <div className="flex items-start gap-4 mb-8">
        <button onClick={() => navigate('/learn')} className="mt-1 text-muted hover:text-text transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-widest uppercase text-muted mb-1">Learning Session</div>
          <h1 className="font-display text-2xl font-bold leading-tight">{session?.topic}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={clsx('pill', session?.status === 'completed' ? 'pill-green' : 'pill-amber')}>
              {session?.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
            <span className="text-[11px] text-muted font-mono flex items-center gap-1">
              <Zap size={10} className="text-amber-400" />{session?.xp_earned} XP earned
            </span>
          </div>
        </div>

        {canComplete && session?.status !== 'completed' && (
          <button
            onClick={handleComplete}
            disabled={completing}
            className="btn-primary flex items-center gap-2 flex-shrink-0"
          >
            {completing ? <Spinner size={14} /> : <Trophy size={14} />}
            Complete Session
          </button>
        )}
      </div>

      {generatingCps ? (
        <div className="card p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="font-display font-semibold text-lg">Building your learning path…</div>
            <p className="text-muted text-sm max-w-xs">
              AI is designing a structured checkpoint roadmap for <em>{session?.topic}</em>
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6">

          <div className="card p-5 h-fit lg:sticky lg:top-6">
            <div className="text-[10px] tracking-widest uppercase text-muted mb-4">Learning Path</div>
            <GamePathStepper
              checkpoints={checkpoints}
              activeIdx={activeIdx}
              newlyDone={newlyDone}
              onSelect={i => {
                setActiveIdx(i)
                setTab('learn')
                setQuizPassed(false)
              }}
            />
          </div>

          {activeCp && (
            <div>
              <div className="card p-5 mb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-xl font-bold mb-1">{activeCp.topic}</h2>
                    <div className="flex items-center gap-2">
                      <LevelBadge level={activeCp.level} />
                      <span className="text-[11px] text-muted font-mono">
                        Checkpoint {activeIdx + 1} / {checkpoints.length}
                      </span>
                      {activeCp.attempts > 0 && (
                        <span className="text-[11px] text-muted font-mono flex items-center gap-1">
                          <RefreshCw size={9} />{activeCp.attempts} attempt{activeCp.attempts > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeCp.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-accent3 flex-shrink-0">
                      <CheckCircle2 size={16} />
                      <span className="text-xs font-semibold font-body">Passed</span>
                    </div>
                  )}
                </div>
              </div>

              <TabBar tab={tab} setTab={setTab} quizPassed={quizPassed} />

              {tab === 'learn' && (
                <LearnTab cp={activeCp} content={content} loadingContent={loadingContent} />
              )}
              {tab === 'quiz' && (
                <QuizPanel
                  checkpoint={activeCp}
                  sessionId={id}
                  onPass={handleQuizPass}
                  onShowFeynman={() => setTab('feynman')}
                />
              )}
              {tab === 'feynman' && (
                <FeynmanPanel
                  checkpoint={activeCp}
                  onRetakeQuiz={() => setTab('quiz')}
                />
              )}
              {tab === 'notes' && (
                <NotesTab sessionId={id} checkpoints={checkpoints} />
              )}

              {tab === 'learn' && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setTab('quiz')}
                    className="btn-primary flex items-center gap-2"
                  >
                    Take Quiz <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}