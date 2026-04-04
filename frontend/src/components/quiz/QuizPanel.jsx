import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Spinner, ScoreRing } from '../ui/index'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { CheckCircle2, XCircle, ChevronRight, RefreshCw, BrainCircuit, Zap } from 'lucide-react'

function QuestionCard({ question, idx, selected, submitted, onSelect, disabled }) {
  const isCorrect = (optIdx) => question.options[optIdx] === question.correct_answer
  const isSelected = (optIdx) => optIdx === selected

  return (
    <div className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="text-[11px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5">
          Q{idx + 1}
        </span>
        <p className="text-sm font-semibold font-body leading-relaxed text-[#A78BFA]">{question.question}</p>
      </div>

      <div className="space-y-2">
        {question.options.map((opt, oi) => {
          let cls = 'quiz-opt font-body'
          if (disabled) cls += ' disabled'
          if (submitted) {
            if (isCorrect(oi)) cls += ' correct'
            else if (isSelected(oi) && !isCorrect(oi)) cls += ' wrong'
          } else if (isSelected(oi)) {
            cls += ' selected'
          }

          return (
            <div
              key={oi}
              onClick={() => !disabled && !submitted && onSelect(oi)}
              className={cls}
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] transition-all',
                  submitted && isCorrect(oi) ? 'border-accent3 bg-accent3/20'
                  : submitted && isSelected(oi) && !isCorrect(oi) ? 'border-accent2 bg-accent2/20'
                  : isSelected(oi) ? 'border-accent bg-accent/20'
                  : 'border-border'
                )}>
                  {submitted && isCorrect(oi) ? <CheckCircle2 size={10} className="text-accent3" />
                   : submitted && isSelected(oi) && !isCorrect(oi) ? <XCircle size={10} className="text-accent2" />
                   : isSelected(oi) ? <div className="w-2 h-2 rounded-full bg-accent" />
                   : null}
                </div>
                <span className="text-sm leading-snug">{opt}</span>
              </div>
            </div>
          )
        })}
      </div>

      {submitted && question.explanation && (
        <div className="mt-3 p-3 bg-surface rounded-xl border-l-2 border-accent3/50">
          <p className="text-xs text-muted font-body leading-relaxed">
            <span className="text-accent3 font-semibold">💡 </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

function ResultPanel({ score, passed, onRetry, onFeynman, onNext }) {
  const pct = Math.round(score * 100)
  return (
    <div className="card p-8 text-center">
      <ScoreRing pct={pct} size={100} color={passed ? '#4ef0b8' : '#f772c0'} />
      <div className="mt-4">
        <div className={clsx('font-display text-2xl font-bold', passed ? 'text-accent3' : 'text-accent2')}>
          {passed ? '✅ Passed!' : '❌ Not quite'}
        </div>
        <p className="text-muted text-sm mt-1 font-body">
          {passed
            ? `Great work! You scored ${pct}% and earned +2 XP`
            : `You scored ${pct}%. Need 70% to pass. Let's review the concepts.`}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center mt-6">
        <button onClick={onRetry} className="btn-ghost flex items-center gap-2">
          <RefreshCw size={13} />Try Again
        </button>
        {!passed && (
          <button onClick={onFeynman} className="btn-primary flex items-center gap-2">
            <BrainCircuit size={13} />Get Re-taught
          </button>
        )}
        {passed && (
          <button onClick={onNext} className="btn-primary flex items-center gap-2">
            Next Checkpoint <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function QuizPanel({ checkpoint, sessionId, onPass, onShowFeynman, onNextCheckpoint }) {
  const [questions, setQuestions] = useState([])
  const [selected, setSelected]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [lastWeakAreas, setLastWeakAreas] = useState([])

  const loadQuestions = async (isRetry = false, weakAreas = []) => {
    setLoading(true)
    setResult(null)
    setSelected([])
    try {
      let res
      if (isRetry && weakAreas.length > 0) {
        res = await api.getRetryQuestions(sessionId, checkpoint.id, weakAreas)
      } else {
        res = await api.getCheckpointQuestions(sessionId, checkpoint.id)
      }
      setQuestions(res.questions)
      setSelected(new Array(res.questions.length).fill(null))
    } catch (err) {
      toast.error('Failed to load quiz questions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setAttemptCount(0)
    setLastWeakAreas([])
    loadQuestions(false, [])
  }, [checkpoint.id])

  const handleSubmit = async () => {
    if (selected.some(s => s === null)) {
      toast.error('Please answer all questions')
      return
    }
    setSubmitting(true)
    try {
      const answers = questions.map((q, i) => q.options[selected[i]])
      const res = await api.submitQuiz(checkpoint.id, answers)
      setResult(res)
      setAttemptCount(c => c + 1)
      if (res.passed) {
        toast.success(`+${res.xp_earned} XP earned!`, { icon: '⚡' })
        onPass(res)
      } else {
        setLastWeakAreas(res.weak_areas || [])
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRetry = () => {
    loadQuestions(attemptCount > 0, lastWeakAreas)
  }

  if (loading) return (
    <div className="space-y-4">
      {Array(3).fill(0).map((_, i) => (
        <div key={i} className="card p-5 space-y-3">
          <div className="h-4 bg-border rounded animate-pulse" />
          {Array(4).fill(0).map((_, j) => <div key={j} className="h-10 bg-surface rounded-xl animate-pulse" />)}
        </div>
      ))}
    </div>
  )

  if (result) return (
    <ResultPanel
      score={result.score}
      passed={result.passed}
      onRetry={handleRetry}
      onFeynman={onShowFeynman}
      onNext={onNextCheckpoint}
    />
  )

  const allAnswered = selected.every(s => s !== null)

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <QuestionCard
          key={i}
          question={q}
          idx={i}
          selected={selected[i]}
          submitted={false}
          onSelect={oi => setSelected(prev => { const n = [...prev]; n[i] = oi; return n })}
        />
      ))}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted font-body">
          {selected.filter(s => s !== null).length} / {questions.length} answered
        </span>
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className="btn-primary flex items-center gap-2"
        >
          {submitting ? <Spinner size={14} /> : <Zap size={14} />}
          Submit Answers
        </button>
      </div>
    </div>
  )
}