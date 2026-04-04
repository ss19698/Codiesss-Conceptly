import React from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

export function Skeleton({ className }) {
  return <div className={clsx('skeleton animate-shimmer', className)} />
}

export function StatCard({ label, value, sub, color = '#7c6af7', icon: Icon, delay = 0 }) {
  return (
    <div
      className="card p-5 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-display font-bold" style={{ color }}>{value}</div>
          <div className="text-sm font-medium text-[#A78BFA] mt-0.5">{label}</div>
          {sub && <div className="text-[11px] text-muted mt-0.5">{sub}</div>}
        </div>
        {Icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: `${color}18` }}>
            <Icon size={18} style={{ color }} strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  )
}

export function ScoreRing({ pct = 0, size = 80, color = '#7c6af7', label, sublabel }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct / 100)
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#252535" strokeWidth={size * 0.075} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.075}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="score-label text-center" style={{ color }}>
        <div style={{ fontSize: size * 0.18, lineHeight: 1 }}>{Math.round(pct)}%</div>
        {sublabel && <div className="text-muted" style={{ fontSize: size * 0.1 }}>{sublabel}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="text-5xl mb-2">{icon}</div>
      <div className="font-display font-bold text-lg">{title}</div>
      {desc && <div className="text-muted text-sm max-w-xs">{desc}</div>}
      {action}
    </div>
  )
}

export function LevelBadge({ level }) {
  const colors = { beginner: 'pill-green', intermediate: 'pill-purple', advanced: 'pill-pink' }
  return <span className={`pill ${colors[level] || 'pill-purple'}`}>{level}</span>
}

export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-accent', className)} />
}

export function SectionHeader({ label, title, action }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <div className="text-[10px] tracking-[2px] uppercase text-muted mb-1">{label}</div>
        <h1 className="text-2xl font-display font-extrabold">{title}</h1>
      </div>
      {action}
    </div>
  )
}

export function ProgressBar({ pct = 0, color = 'bg-accent', className }) {
  return (
    <div className={clsx('prog-track', className)}>
      <div className={clsx('prog-fill', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 animate-fade-up">{children}</div>
    </div>
  )
}
export function XPBadge({ xp }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold font-body"
      style={{ background:'rgba(245,200,66,0.15)', color:'var(--amber)', border:'1px solid rgba(245,200,66,0.3)' }}>
      ⚡ {xp} XP
    </span>
  )
}