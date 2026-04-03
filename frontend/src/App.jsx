import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/layout/AppLayout'

import AuthPage         from './pages/AuthPage'
import DashboardPage    from './pages/DashboardPage'
import LearnPage        from './pages/LearnPage'
import SessionPage      from './pages/SessionPage'
import AnalyticsPage    from './pages/AnalyticsPage'
import AchievementsPage from './pages/AchievementsPage'
import SettingsPage     from './pages/SettingsPage'
import NotFoundPage     from './pages/NotFoundPage'

function ProtectedRoute({ children }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/auth" replace />
  return children
}

function GuestRoute({ children }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <PageLoader />
  if (firebaseUser) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <span className="text-muted text-sm font-body">Loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="noise">
          <div className="blob w-96 h-96 -top-32 -left-32 animate-float" style={{ background: 'rgba(91,127,255,0.08)', animationDelay: '0s' }} />
          <div className="blob w-80 h-80 bottom-0 right-0 animate-float"  style={{ background: 'rgba(255,122,80,0.06)',  animationDelay: '3s' }} />
          <div className="blob w-64 h-64 top-1/2 left-1/2 animate-float" style={{ background: 'rgba(62,201,142,0.05)', animationDelay: '1.5s' }} />

          <Routes>
            <Route path="/auth"     element={<GuestRoute><AuthPage /></GuestRoute>} />
            <Route path="/login"    element={<Navigate to="/auth" replace />} />
            <Route path="/register" element={<Navigate to="/auth?tab=register" replace />} />

            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"    element={<DashboardPage />} />
              <Route path="learn"        element={<LearnPage />} />
              <Route path="learn/:id"    element={<SessionPage />} />
              <Route path="analytics"    element={<AnalyticsPage />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="settings"     element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}