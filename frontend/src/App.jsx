
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'

import LoginPage      from './pages/LoginPage'
import RegisterPage   from './pages/RegisterPage'
import DashboardPage  from './pages/DashboardPage'
import LearnPage      from './pages/LearnPage'
import SessionPage    from './pages/SessionPage'
import AnalyticsPage  from './pages/AnalyticsPage'
import AchievementsPage from './pages/AchievementsPage'
import SettingsPage   from './pages/SettingsPage'
import NotFoundPage   from './pages/NotFoundPage'

function ProtectedRoute({ children }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/login" replace />
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
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        <span className="text-muted text-sm font-body">Loading…</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div className="noise">
        {/* ambient blobs */}
        <div className="blob w-96 h-96 bg-accent/10 -top-32 -left-32 animate-float" style={{ animationDelay: '0s' }} />
        <div className="blob w-80 h-80 bg-accent2/8 bottom-0 right-0 animate-float" style={{ animationDelay: '3s' }} />
        <div className="blob w-64 h-64 bg-accent3/6 top-1/2 left-1/2 animate-float" style={{ animationDelay: '1.5s' }} />

        <Routes>
          {/* Auth */}
          <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

          {/* App */}
          {/* <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}> */}
          <Route path="/" element={<AppLayout />}>
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
  )
}