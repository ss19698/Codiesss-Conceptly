import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 text-center p-6">
      <div className="font-display font-black text-8xl text-border">404</div>
      <div className="font-display font-bold text-xl">Page not found</div>
      <p className="text-muted text-sm font-body max-w-xs">This page doesn't exist yet. Maybe you took a wrong turn on your learning path.</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2 mt-2">
        <ChevronLeft size={14} />Back to Dashboard
      </button>
    </div>
  )
}