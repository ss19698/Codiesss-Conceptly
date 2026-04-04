import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { XPBadge } from '../ui/index'

export default function TopBar({ xp = 0, level = 1, onBack, showBack }) {
  const { isDark, toggle } = useTheme()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <span className="font-display text-xl font-bold text-gradient">Conceptly</span>
        {showBack && (
          <button onClick={onBack} className="btn-ghost flex items-center gap-1.5 text-xs py-1.5 px-3">
            ← Back
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <XPBadge xp={xp} />
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm text-white"
          style={{ background: 'linear-gradient(135deg,var(--accent),#7c5fff)' }}>
          {level}
        </div>
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-border card transition-colors hover:border-[var(--accent)]"
        >
          {isDark ? <Sun size={15} className="text-muted" /> : <Moon size={15} className="text-muted" />}
        </button>
      </div>
    </header>
  )
}