// src/services/firebase.js
// ─────────────────────────────────────────────────────────────
// HOW TO CONNECT:
//  1. Go to https://console.firebase.google.com
//  2. Create project → Add App → Web app
//  3. Copy the firebaseConfig object values into your .env file
//     (see .env.example)
//  4. In Firebase Console → Authentication → Sign-in method:
//     Enable "Email/Password" and "Google"
// ─────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}
const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const signInEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const registerEmail = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  return cred
}

export const logOut = () => signOut(auth)

export { onAuthStateChanged }
