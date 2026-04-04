import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { Skeleton, SectionHeader, ProgressBar } from '../components/ui/index'
import { Zap, Trophy, Target, Star, Crown, Flame } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const BADGE_ICONS = {
  milestone: '🧠', streak: '🔥', performance: '⚡', score: '🎯',
  completion: '✅', speed: '🚀', default: '🏅',
}

function XPCard({ dbUser }) {
  const xp     = dbUser?.xp    || 0
  const level  = dbUser?.level || 1
  const cap    = level * 100
  const pct    = Math.min(100, Math.round(((xp % 100) / 100) * 100))

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-accent/5 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
      <div className="relative flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-3xl font-display font-black text-white flex-shrink-0 shadow-lg shadow-accent/30">
          {level}
        </div>
        <div className="flex-1">
          <div className="text-[10px] tracking-widest uppercase text-muted mb-0.5">Current Level</div>
          <div className="font-display font-bold text-3xl leading-none mb-1">Level <span className="text-gradient">{level}</span></div>
          <div className="text-sm text-muted font-body">{xp} XP total</div>
          <div className="mt-3">
            <ProgressBar pct={pct} color="bg-gradient-to-r from-accent to-accent2" className="h-2" />
            <div className="text-[11px] text-muted mt-1 font-body">{100 - (xp % 100)} XP to Level {level + 1}</div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] tracking-widest uppercase text-muted mb-1">Total XP</div>
          <div className="font-display font-bold text-2xl text-amber-400">{xp}</div>
        </div>
      </div>
    </div>
  )
}

function BadgeCard({ badge, locked = false }) {
  return (
    <div className={clsx(
      'card p-5 text-center transition-all duration-200',
      locked ? 'opacity-30 grayscale cursor-not-allowed' : 'card-hover cursor-default'
    )}>
      <div className="text-4xl mb-3">{BADGE_ICONS[badge.badge_type] || BADGE_ICONS.default}</div>
      <div className="font-display font-semibold text-sm mb-0.5">{badge.badge_name}</div>
      <div className="text-[10px] text-muted font-body mb-2">{badge.description}</div>
      {!locked && (
        <div className="text-[10px] text-muted font-mono">
          {new Date(badge.earned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      )}
      <span className={`pill mt-2 ${
        badge.badge_type === 'streak' ? 'pill-amber'
        : badge.badge_type === 'performance' ? 'pill-purple'
        : badge.badge_type === 'score' ? 'pill-green'
        : 'pill-pink'
      }`}>{badge.badge_type}</span>
    </div>
  )
}

function WeakTopicList({ topics }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target size={15} className="text-accent2" />
        <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Weak Topics</div>
      </div>
      {topics.length === 0 ? (
        <p className="text-sm text-muted font-body">No weak areas identified yet. Keep learning!</p>
      ) : (
        <div className="space-y-4">
          {topics.map(t => {
            const pct = Math.round(t.strength_score * 100)
            const color = pct < 40 ? '#f772c0' : pct < 65 ? '#f0c44e' : '#4ef0b8'
            return (
              <div key={t.concept}>
                <div className="flex justify-between text-xs mb-1.5 font-body">
                  <span className="font-medium text-[#A78BFA]">{t.concept}</span>
                  <span className="font-mono" style={{ color }}>{pct}%</span>
                </div>
                <ProgressBar pct={pct} className="h-1.5" color="" />
                <style>{`.prog-fill[data-key="${t.concept}"]{ background:${color}; }`}</style>
                <div className="h-1.5 rounded-full overflow-hidden bg-border mt-0">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-[10px] text-muted mt-0.5 font-body">{t.topic}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LeaderboardCard({ leaderboard, dbUser }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Crown size={15} className="text-amber-400" />
        <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Leaderboard</div>
        <span className="pill pill-amber ml-auto">This week</span>
      </div>
      {leaderboard.map((u, i) => {
        const isMe = u.is_me
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
        return (
          <div key={u.rank} className={clsx(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all',
            isMe ? 'bg-accent/10 border border-accent/25' : 'hover:bg-surface'
          )}>
            <span className="text-base w-6 text-center flex-shrink-0 font-mono">{medal}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold font-body truncate">
                {u.name}{isMe && ' (You)'}
              </div>
            </div>
            <span className="font-mono text-xs text-purple-300">{u.xp} XP</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AchievementsPage() {
  const { dbUser } = useAuth()
  const [badges, setBadges]           = useState([])
  const [weakTopics, setWeakTopics]   = useState([])
  const [challenge, setChallenge]     = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      api.getBadges().catch(() => []),
      api.getWeakTopics().catch(() => []),
      api.getDailyChallenge().catch(() => null),
      api.getLeaderboard().catch(() => []),
    ]).then(([b, w, c, l]) => {
      setBadges(b || [])
      setWeakTopics(w || [])
      setChallenge(c)
      setLeaderboard(l || [])
      setLoading(false)
    })
  }, [])

  const LOCKED_BADGES = [
    { badge_name: '7-Day Streak', badge_type: 'streak', description: 'Study 7 days in a row' },
    { badge_name: 'Master', badge_type: 'performance', description: 'Complete 10 sessions' },
    { badge_name: 'Perfect Week', badge_type: 'score', description: 'Score 100% 5 times' },
  ]

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <SectionHeader label="Rewards & progress" title="Achievements" />

      {loading ? <Skeleton className="h-36 mb-6" /> : <XPCard dbUser={dbUser} />}

      {/* Daily Challenge */}
      {challenge && (
        <div className="card p-5 mt-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Daily Challenge</div>
              <span className="pill pill-amber">+{challenge.bonus_xp} XP</span>
              {challenge.completed && <span className="pill pill-green">✓ Done</span>}
            </div>
            <p className="text-sm text-[#A78BFA] font-body">{challenge.task}</p>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="mt-8">
        <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
          <Star size={13} className="text-amber-400" />Badges Earned
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
            {LOCKED_BADGES.map(b => <BadgeCard key={b.badge_name} badge={b} locked />)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {loading ? (
          <><Skeleton className="h-48" /><Skeleton className="h-48" /></>
        ) : (
          <>
            <WeakTopicList topics={weakTopics} />
            {leaderboard.length > 0
              ? <LeaderboardCard leaderboard={leaderboard} dbUser={dbUser} />
              : (
                <div className="card p-5 flex flex-col items-center justify-center text-center gap-3">
                  <Trophy size={32} className="text-muted" strokeWidth={1.5} />
                  <div className="font-display font-semibold">Leaderboard</div>
                  <p className="text-sm text-muted font-body">Coming soon! Compete with other learners.</p>
                </div>
              )}
          </>
        )}
      </div>
    </div>
  )
}