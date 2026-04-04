import React, { useState, useRef } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import { Spinner } from './index'
import { api } from '../../services/api'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function NewSessionModal({ onClose, onCreate }) {
  const [topic, setTopic]           = useState('')
  const [notesText, setNotesText]   = useState('')
  const [file, setFile]             = useState(null)
  const [dragOver, setDragOver]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [ragActive, setRagActive]   = useState(false)
  const fileRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setRagActive(true)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleCreate = async () => {
    if (!topic.trim()) { toast.error('Please enter a topic'); return }
    setLoading(true)
    try {
      const session = await api.createSession(topic.trim(), notesText)
      if (file) {
        const form = new FormData()
        form.append('file', file)
        await api.uploadNotes(session.id, form)
        toast.success('📎 PDF uploaded & RAG initialised')
      } else if (notesText.trim()) {
        const form = new FormData()
        form.append('notes_text', notesText.trim())
        await api.uploadNotes(session.id, form)
        toast.success('📝 Notes uploaded & RAG initialised')
      }

      onCreate(session)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="card w-full max-w-lg p-7 relative animate-fade-up">
        <button onClick={onClose}
          className="absolute top-5 right-5 text-muted hover:text-[#A78BFA] transition-colors">
          <X size={18} />
        </button>

        <h2 className="font-display text-2xl font-bold mb-1">New Learning Session</h2>
        <p className="text-muted text-sm mb-6 font-body">
          Enter a topic and optionally upload your notes to enable RAG-powered personalisation.
        </p>

        {/* Topic */}
        <label className="block text-xs font-semibold text-dim uppercase tracking-widest mb-2">
          Topic *
        </label>
        <input
          className="input mb-5"
          placeholder="e.g. Quantum Computing, Photosynthesis, Calculus…"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        {/* Paste notes */}
        <label className="block text-xs font-semibold text-dim uppercase tracking-widest mb-2">
          Your Notes <span className="text-muted normal-case">(optional – paste or upload)</span>
        </label>
        <textarea
          className="input mb-3 resize-none"
          rows={3}
          placeholder="Paste your notes here to enable RAG-powered explanations…"
          value={notesText}
          onChange={e => { setNotesText(e.target.value); setRagActive(!!e.target.value.trim()) }}
        />

        {/* PDF upload zone */}
        <div
          className={clsx('upload-zone mb-3', dragOver && 'drag-over')}
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText size={22} className="text-[var(--accent3)]" />
              <div>
                <div className="font-semibold text-sm font-body text-[#A78BFA]">{file.name}</div>
                <div className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</div>
              </div>
            </div>
          ) : (
            <>
              <Upload size={24} className="text-muted mx-auto mb-2" />
              <div className="text-sm font-semibold font-body mb-1 text-[#A78BFA]">
                Drop PDF or click to upload
              </div>
              <div className="text-xs text-muted">
                PDF / TXT — will be extracted and embedded for personalised explanations
              </div>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />
        </div>

        {/* RAG badge */}
        {ragActive && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl text-xs font-semibold font-body"
            style={{ background:'var(--accent3-bg)', border:'1px solid rgba(62,201,142,0.3)', color:'var(--accent3)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent3)] animate-pulse" />
            RAG active — AI explanations will be personalised from your notes
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleCreate} disabled={loading} className="btn-primary gap-2">
            {loading ? <><Spinner size={14} /> Creating…</> : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  )
}