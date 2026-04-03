// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, onAuthStateChanged, logOut } from '../services/firebase'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [dbUser, setDbUser] = useState(null)   // Your backend user record
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        try {
          const profile = await api.me()
          setDbUser(profile)
        } catch {
          // User exists in Firebase but not in DB yet (first Google login)
          setDbUser(null)
        }
      } else {
        setDbUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const refreshDbUser = async () => {
    try {
      const profile = await api.me()
      setDbUser(profile)
    } catch {}
  }

  const signOut = async () => {
    await logOut()
    setFirebaseUser(null)
    setDbUser(null)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, setDbUser, loading, signOut, refreshDbUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)