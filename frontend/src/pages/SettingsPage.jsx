import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { SectionHeader } from '../components/ui'
import { auth } from '../services/firebase'
import { updateProfile } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { User, Palette, LogOut, Check, Pencil, X, Loader2 } from 'lucide-react'

const TUTOR_MODES = [
  {
    id: 'supportive_buddy',
    emoji: '🤗',
    label: 'Supportive Buddy',
    desc: 'Warm, encouraging explanations. Builds confidence step by step.',
    color: '#4ef0b8',
  },
  {
    id: 'chill_friend',
    emoji: '😎',
    label: 'Chill Friend',
    desc: 'Casual, laid-back tone. Explains things over a virtual coffee.',
    color: '#7c6af7',
  },
  {
    id: 'strict_mentor',
    emoji: '🎓',
    label: 'Strict Mentor',
    desc: 'Formal and rigorous. Precise terminology, deep coverage.',
    color: '#f772c0',
  },
  {
    id: 'exam_mode',
    emoji: '⚡',
    label: 'Exam Mode',
    desc: 'Focused on exam prep. Concise, high-signal explanations.',
    color: '#f0c44e',
  },
]

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-6 mb-4">
      <div className="flex items-center gap-2 mb-5">
        <Icon size={16} className="text-accent" strokeWidth={1.8} />
        <h2 className="font-display font-bold text-base">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function EditProfileModal({ onClose, firebaseUser, dbUser, setDbUser }) {
  const [name, setName] = useState(dbUser?.name || firebaseUser?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) { setError('Name cannot be empty.'); return }
    if (trimmed.length > 40) { setError('Name must be 40 characters or fewer.'); return }

    setSaving(true)
    setError('')
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed })

      if (api.updateProfile) {
        await api.updateProfile({ name: trimmed })
      }

      setDbUser(prev => ({ ...prev, name: trimmed }))
      toast.success('Profile updated!')
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card w-full max-w-sm mx-4 p-6 relative animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <h3 className="font-display font-bold text-base mb-1">Edit Profile</h3>
        <p className="text-xs text-muted font-body mb-5">Update your display name shown across the app.</p>

        {/* Avatar preview */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-lg font-display font-bold shrink-0">
            {name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="text-sm font-display font-semibold truncate">
            {name || <span className="text-muted italic">Your name</span>}
          </div>
        </div>

        {/* Name input */}
        <label className="block text-xs font-display font-semibold mb-1.5 text-muted uppercase tracking-wider">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={handleKeyDown}
          maxLength={40}
          placeholder="Enter your name…"
          autoFocus
          className={clsx(
            'w-full rounded-lg border bg-surface px-3 py-2.5 text-sm font-body outline-none transition-colors',
            'focus:border-accent focus:ring-1 focus:ring-accent/30',
            error ? 'border-red-500/60' : 'border-border'
          )}
        />
        <div className="flex items-center justify-between mt-1 mb-4">
          {error
            ? <p className="text-xs text-red-400 font-body">{error}</p>
            : <span />
          }
          <span className="text-[10px] text-muted font-mono ml-auto">{name.length}/40</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="btn-ghost flex-1"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {saving
              ? <Loader2 size={14} className="animate-spin" />
              : <Check size={14} />
            }
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* Main Page  */
export default function SettingsPage() {
  const { firebaseUser, dbUser, setDbUser, signOut } = useAuth()
  const navigate = useNavigate()
  const [tutorMode, setTutorMode]   = useState(dbUser?.tutor_mode || 'supportive_buddy')
  const [saving, setSaving]         = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)

  const handleSaveTutor = async () => {
    setSaving(true)
    try {
      await api.updateTutorMode(tutorMode)
      setDbUser(prev => ({ ...prev, tutor_mode: tutorMode }))
      toast.success('Tutor mode updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const displayName = dbUser?.name || firebaseUser?.displayName || 'Learner'

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <SectionHeader label="Preferences" title="Settings" />

      <Section icon={User} title="Profile">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xl font-display font-bold shrink-0">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-base truncate">{displayName}</div>
            <div className="text-sm text-muted font-body truncate">{firebaseUser?.email}</div>
            <div className="text-xs text-muted font-mono mt-0.5">
              Level {dbUser?.level || 1} · {dbUser?.xp || 0} XP
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditingProfile(true)}
              className="btn-ghost flex items-center gap-1.5"
              aria-label="Edit profile"
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={handleSignOut}
              className="btn-danger flex items-center gap-1.5 justify-center"
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </Section>

      {/* Tutor Mode */}
      <Section icon={Palette} title="Tutor Personality">
        <p className="text-sm text-muted font-body mb-4">How should your AI tutor communicate with you?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {TUTOR_MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setTutorMode(m.id)}
              className={clsx(
                'card text-left p-4 transition-all duration-200 cursor-pointer',
                tutorMode === m.id
                  ? 'border-accent bg-accent/10'
                  : 'hover:border-border/80'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{m.emoji}</span>
                {tutorMode === m.id && <Check size={14} className="text-accent mt-0.5" />}
              </div>
              <div
                className="font-display font-semibold text-sm mb-0.5"
                style={{ color: tutorMode === m.id ? m.color : undefined }}
              >
                {m.label}
              </div>
              <div className="text-[11px] text-muted font-body leading-relaxed">{m.desc}</div>
            </button>
          ))}
        </div>
        <button onClick={handleSaveTutor} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving
            ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <Check size={14} />
          }
          Save Preference
        </button>
      </Section>

      {editingProfile && (
        <EditProfileModal
          onClose={() => setEditingProfile(false)}
          firebaseUser={firebaseUser}
          dbUser={dbUser}
          setDbUser={setDbUser}
        />
      )}
    </div>
  )
}