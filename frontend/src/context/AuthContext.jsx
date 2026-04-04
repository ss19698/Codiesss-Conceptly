import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from '../services/firebase'
import { api } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [dbUser,setDbUser]       = useState(null)
  const [loading,setLoading]      = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(async (fbUser) => {
      setFirebaseUser(fbUser)

      if (fbUser) {
        try {
          const profile = await api.me()
          setDbUser(profile)
        } catch (err) {
          console.warn('[AuthContext] Could not load DB user:', err.message)
          setDbUser(null)
        }
      } else {
        setDbUser(null)
      }

      setLoading(false)
    })

    return unsub
  }, [])

  const signOut = async () => {
    const { logOut } = await import('../services/firebase')
    await logOut()
    setFirebaseUser(null)
    setDbUser(null)
  }

  return (
    <AuthContext.Provider value={{ firebaseUser, dbUser, setDbUser, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)