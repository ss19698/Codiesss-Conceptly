import React, { useEffect, useState } from 'react'
import { api } from '../services/api'
import { ScoreRing, Skeleton, SectionHeader, StatCard } from '../components/ui/index'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart
} from 'recharts'
import { TrendingUp, Flame, Target, Clock, BookOpen, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-xl">
      <div className="text-[11px] text-muted mb-0.5 font-body">{label}</div>
      <div className="text-sm font-display font-bold" style={{ color: payload[0]?.color }}>
        {payload[0]?.value}%
      </div>
    </div>
  )
}

function RingGrid({ analytics }) {
  const rings = [
    { label: 'Avg Score', pct: analytics?.avg_score ? analytics.avg_score * 100 : 0, color: '#7c6af7', sub: 'quiz accuracy' },
    { label: 'Completion', pct: analytics?.total_sessions ? (analytics.completed_sessions / analytics.total_sessions) * 100 : 0, color: '#4ef0b8', sub: 'sessions done' },
    { label: 'Checkpoints', pct: analytics?.total_checkpoints ? Math.min(100, analytics.total_checkpoints * 5) : 0, color: '#f772c0', sub: 'total done' },
  ]
  return (
    <div className="grid grid-cols-3 gap-4">
      {rings.map(r => (
        <div key={r.label} className="card p-5 flex flex-col items-center gap-3">
          <ScoreRing pct={r.pct} size={80} color={r.color} />
          <div className="text-center">
            <div className="text-sm font-display font-semibold">{r.label}</div>
            <div className="text-[11px] text-muted font-body">{r.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function StreakWidget({ analytics }) {
  const streak = analytics?.current_streak || 0
  const longest = analytics?.longest_streak || 0
  const days = Array(7).fill(0).map((_, i) => i < streak % 7)

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Flame size={16} className="text-amber-400" />
        <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Study Streak</div>
      </div>
      <div className="flex items-end gap-3 mb-4">
        <div className="font-display font-bold text-5xl text-amber-400 leading-none">{streak}</div>
        <div className="pb-1">
          <div className="text-sm font-body text-[#A78BFA]">days</div>
          <div className="text-[11px] text-muted">Best: {longest}d</div>
        </div>
      </div>
      <div className="flex gap-1.5">
        {days.map((active, i) => (
          <div key={i} className={`h-5 flex-1 rounded-sm transition-colors ${active ? 'bg-amber-400/60' : 'bg-border'}`} />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1 font-mono">
        <span>Mon</span><span>Sun</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null)
  const [progress, setProgress]   = useState(null)
  const [history, setHistory]     = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      api.getAnalytics().catch(() => null),
      api.getProgress().catch(() => null),
      api.getHistory().catch(() => []),
    ]).then(([a, p, h]) => {
      setAnalytics(a)
      setProgress(p)
      setHistory(h || [])
      setLoading(false)
    })
  }, [])

  const chartData = history.slice(0, 10).reverse().map((s, i) => ({
    name: `S${i + 1}`,
    score: s.xp_earned ? Math.min(100, s.xp_earned * 2) : 0,
    topic: s.topic?.split(' ').slice(0, 2).join(' '),
  }))

  const trendData = [
    { day: 'Mon', score: 72 }, { day: 'Tue', score: 65 },
    { day: 'Wed', score: 80 }, { day: 'Thu', score: 78 },
    { day: 'Fri', score: 88 }, { day: 'Sat', score: 74 },
    { day: 'Sun', score: 91 },
  ]

  const stats = [
    { label: 'Total Sessions', value: analytics?.total_sessions ?? '—', color: '#7c6af7', icon: BookOpen, delay: 0 },
    { label: 'Checkpoints Done', value: analytics?.total_checkpoints ?? '—', color: '#4ef0b8', icon: Target, delay: 60 },
    { label: 'Avg Score', value: analytics?.avg_score ? `${Math.round(analytics.avg_score * 100)}%` : '—', color: '#f772c0', icon: BarChart2, delay: 120 },
    { label: 'Streak', value: `${analytics?.current_streak ?? 0}d`, color: '#f0c44e', icon: Flame, delay: 180 },
  ]

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <SectionHeader label="Your progress" title="Analytics" />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Rings */}
      {loading ? <Skeleton className="h-40 mb-6" /> : <RingGrid analytics={analytics} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Weekly Score Trend */}
        <div className="card p-5 col-span-1 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={15} className="text-accent" />
            <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Weekly Score Trend</div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#252535" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#6060a0', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6060a0', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" stroke="#7c6af7" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#7c6af7', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Streak */}
        <div className="col-span-1">
          {loading ? <Skeleton className="h-full min-h-[180px]" /> : <StreakWidget analytics={analytics} />}
        </div>
      </div>

      {/* Session scores bar chart */}
      {chartData.length > 0 && (
        <div className="card p-5 mt-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={15} className="text-accent3" />
            <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted">Session XP History</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={20}>
              <CartesianGrid stroke="#252535" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6060a0', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6060a0', fontSize: 11, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" fill="#4ef0b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Topic breakdown */}
      {progress && (
        <div className="card p-5 mt-6">
          <div className="text-xs font-semibold font-body uppercase tracking-widest text-muted mb-4">Overall Progress</div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Sessions', val: progress.total_sessions },
              { label: 'Completed', val: progress.completed_sessions },
              { label: 'Checkpoints', val: `${progress.completed_checkpoints}/${progress.total_checkpoints}` },
              { label: 'Completion', val: `${Math.round(progress.completion_rate)}%` },
            ].map(item => (
              <div key={item.label} className="bg-surface rounded-xl p-3 border border-border">
                <div className="font-display font-bold text-xl text-accent">{item.val}</div>
                <div className="text-[11px] text-muted font-body mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}