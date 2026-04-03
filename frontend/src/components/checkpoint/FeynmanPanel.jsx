import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Spinner } from '../ui'
import toast from 'react-hot-toast'
import { BrainCircuit, RefreshCw, ChevronRight, AlertTriangle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const APPROACHES = [
  'Everyday Analogies',
  'Step-by-Step Breakdown',
  'Storytelling & Narrative',
  'Q&A Guided Reasoning',
  'Comparisons & Metaphors',
]

export default function FeynmanPanel({ checkpoint, onRetakeQuiz }) {
  const [explanation, setExplanation] = useState('')
  const [weakAreas, setWeakAreas]     = useState([])
  const [attempt, setAttempt]         = useState(0)
  const [loading, setLoading]         = useState(true)

  const load = async (attemptNum) => {
    setLoading(true)
    try {
      const res = await api.getFeynman(checkpoint.id, attemptNum)
      setExplanation(res.explanation)
      setWeakAreas(res.weak_areas || [])
    } catch (err) {
      toast.error('Failed to load re-teaching')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(0) }, [checkpoint.id])

  const handleNewApproach = () => {
    const next = attempt + 1
    setAttempt(next)
    load(next)
  }

  return (
    <div className="space-y-4">\
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <BrainCircuit size={20} className="text-accent" strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-display font-bold text-base">Feynman Re-Teaching</div>
            <div className="text-[11px] text-muted font-body">
              Approach: <span className="text-purple-300">{APPROACHES[attempt % APPROACHES.length]}</span>
            </div>
          </div>
        </div>

        {weakAreas.length > 0 && (
          <div className="bg-surface rounded-xl p-3 border border-border">
            <div className="flex items-center gap-1.5 text-[10px] text-muted uppercase tracking-widest mb-2">
              <AlertTriangle size={10} className="text-accent2" />Weak Areas Detected
            </div>
            <div className="flex flex-wrap gap-1.5">
              {weakAreas.map(w => (
                <span key={w} className="pill pill-pink text-[11px]">{w}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] tracking-widest uppercase text-accent">AI Re-Explanation</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-3 bg-border rounded animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none font-body leading-relaxed text-muted">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleNewApproach}
          disabled={loading}
          className="btn-ghost flex items-center gap-2 flex-1 justify-center"
        >
          {loading ? <Spinner size={13} /> : <RefreshCw size={13} />}
          Different Approach
        </button>
        <button
          onClick={onRetakeQuiz}
          className="btn-primary flex items-center gap-2 flex-1 justify-center"
        >
          Retake Quiz <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}