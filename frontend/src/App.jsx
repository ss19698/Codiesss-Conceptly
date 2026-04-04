import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import AppLayout from './components/layout/AppLayout'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import SessionPage from './pages/SessionPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AchievementsPage from './pages/AchievementsPage'
import SettingsPage from './pages/SettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import SessionsListPage from './pages/SessionsListPage'
import NotesPage from './pages/NotesPage'
import CompletionPage from './pages/CompletionPage'

function ProtectedRoute({ children }) {
  const { firebaseUser, loading } = useAuth()

  if (loading) return <PageLoader />
  if (!firebaseUser) return <Navigate to="/" replace />

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
        <div
          className="w-10 h-10 rounded-full border-2 animate-spin"
          style={{
            borderColor: 'var(--accent)',
            borderTopColor: 'transparent',
          }}
        />
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

          <Routes>

            <Route
              path="/"
              element={
                <GuestRoute>
                  <LandingPage />
                </GuestRoute>
              }
            />

            <Route
              path="/auth"
              element={
                <GuestRoute>
                  <AuthPage />
                </GuestRoute>
              }
            />

            <Route path="/login" element={<Navigate to="/auth" replace />} />

            <Route
              path="/register"
              element={<Navigate to="/auth?tab=register" replace />}
            />

            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >

              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="/learn/sessions" element={<SessionsListPage />} />
              <Route path="/session/:id" element={<SessionPage />} />
              <Route path="/session/:id/notes" element={<NotesPage />} />
              <Route path="/session/:id/complete" element={<CompletionPage />} />

              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/settings" element={<SettingsPage />} />

            </Route>

            <Route path="*" element={<NotFoundPage />} />

          </Routes>

          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '13px',
              },
            }}
          />

        </div>

      </AuthProvider>
    </ThemeProvider>
  )
}