
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { signInEmail, signInWithGoogle, registerEmail } from '../services/firebase'
import { api } from '../services/api'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, BookOpen, Sun, Moon, CheckCircle2, Sparkles } from 'lucide-react'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

const pwChecks = [
  { label: '8+ characters', fn: pw => pw.length >= 8 },
  { label: 'Uppercase letter', fn: pw => /[A-Z]/.test(pw) },
  { label: 'Number', fn: pw => /[0-9]/.test(pw) },
]

const FEATURES = [
  { icon: '📖', title: 'Structured learning paths', desc: 'AI builds personalised checkpoint roadmaps for any topic you choose.' },
  { icon: '🧠', title: 'Feynman re-teaching', desc: 'When you struggle, the AI explains concepts from a fresh angle until it clicks.' },
  { icon: '🎯', title: 'Adaptive quiz engine', desc: 'Quizzes adapt to your weak spots so revision time is never wasted.' },
  { icon: '⚡', title: 'XP, streaks & badges', desc: 'Gamified progress keeps you coming back every single day.' },
]

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toggle, isDark } = useTheme()

  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '' })

  const pwScore = pwChecks.filter(c => c.fn(regForm.password)).length
  const pwBarColors = ['#ef4444', '#f5c842', '#3ec98e']

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signInEmail(loginForm.email, loginForm.password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message.includes('invalid') ? 'Invalid email or password' : err.message)
    } finally { setLoading(false) }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (pwScore < 2) { toast.error('Password is too weak'); return }
    setLoading(true)
    try {
      await registerEmail(regForm.email, regForm.password, regForm.name)
      await api.register({ email: regForm.email, password: regForm.password, name: regForm.name })
      toast.success('Account created! Welcome 🎉')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message.includes('email-already') ? 'Email already in use' : err.message)
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const cred = await signInWithGoogle()
      try { await api.me() } catch {
        await api.register({ email: cred.user.email, name: cred.user.displayName || 'Learner', password: cred.user.uid })
      }
      toast.success('Welcome to Conceptly!')
      navigate('/dashboard')
    } catch (err) {
      if (!err.message?.includes('popup-closed')) toast.error(err.message)
    } finally { setGoogleLoading(false) }
  }

  const isLogin = tab === 'login'

  const leftBg   = isDark ? '#12141a' : '#f0edea'
  const rightBg  = isDark ? '#0d0f14' : '#f5f4ef'  
  const cardBg   = isDark ? '#1e2130' : '#ffffff'    
  const surfBg   = isDark ? '#181b24' : '#ffffff'    
  const border   = isDark ? '#2a2d3e' : '#ddd9d0'
  const textMain = isDark ? '#e8e9f0' : '#1a1a24'
  const textMute = isDark ? '#6b7080' : '#7a7570'
  const accent   = isDark ? '#5b7fff' : '#3a5cdf'
  const accent3  = isDark ? '#3ec98e' : '#2aab76'
  const inputBg  = isDark ? '#181b24' : '#faf9f6'

  return (
    <div style={{ minHeight:'100vh', display:'flex', fontFamily:"'Plus Jakarta Sans', sans-serif", background: rightBg, transition:'background 0.3s' }}>

      {/* LEFT PANEL*/}
      <div style={{
        display:'none', flexDirection:'column', justifyContent:'space-between',
        width:560, flexShrink:0, position:'relative', overflow:'hidden',
        background: leftBg, borderRight:`1px solid ${border}`, transition:'background 0.3s,border-color 0.3s',
      }}
        className="lg:!flex"
      >
        {/* Top bar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'32px 40px 0' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:'linear-gradient(135deg,var(--accent),#7c5fff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={18} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:20, color:textMain }}>Conceptly</span>
          </div>
          <ThemeToggle toggle={toggle} isDark={isDark} border={border} surfBg={surfBg} textMute={textMute} />
        </div>

        {/* Hero text */}
        <div style={{ padding:'0 40px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:99, background: isDark ? 'rgba(91,127,255,0.10)' : 'rgba(58,92,223,0.08)', border:`1px solid ${accent}40`, marginBottom:20 }}>
            <Sparkles size={12} color={accent} />
            <span style={{ fontSize:11, fontWeight:600, color:accent, letterSpacing:'0.05em' }}>AI-POWERED LEARNING</span>
          </div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:42, fontWeight:800, lineHeight:1.12, color:textMain, margin:'0 0 16px' }}>
            Learn anything.<br />
            <em style={{ color:accent, fontStyle:'italic' }}>Actually</em> understand it.
          </h1>
          <p style={{ fontSize:14.5, color:textMute, lineHeight:1.75, maxWidth:380 }}>
            Conceptly turns any topic into an adaptive learning path — checkpoints, quizzes, and Feynman re-teaching — until the concept is truly yours.
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ padding:'0 40px 40px', display:'flex', flexDirection:'column', gap:10 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display:'flex', alignItems:'flex-start', gap:14, padding:'13px 16px', borderRadius:14, background:cardBg, border:`1px solid ${border}`, transition:'background 0.3s,border-color 0.3s' }}>
              <span style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:textMain, marginBottom:2 }}>{f.title}</div>
                <div style={{ fontSize:12, color:textMute, lineHeight:1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative study grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
          backgroundImage: isDark
            ? 'linear-gradient(rgba(91,127,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(91,127,255,0.04) 1px,transparent 1px)'
            : 'linear-gradient(rgba(58,92,223,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(58,92,223,0.05) 1px,transparent 1px)',
          backgroundSize:'40px 40px',
        }} />
      </div>

      {/* RIGHT PANEL*/}
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, background: rightBg, transition:'background 0.3s', position:'relative' }}>

        {/* Mobile header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', maxWidth:440, marginBottom:32 }}
          className="lg:hidden">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:10, background:'linear-gradient(135deg,var(--accent),#7c5fff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BookOpen size={15} color="#fff" strokeWidth={2} />
            </div>
            <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:17, color:textMain }}>Conceptly</span>
          </div>
          <div className="block md:hidden">
            <ThemeToggle toggle={toggle} isDark={isDark} border={border} surfBg={surfBg} textMute={textMute} />
            </div>
        </div>

        <div className="animate-fade-up" style={{ width:'100%', maxWidth:440 }}>

          <div style={{ display:'flex', background:surfBg, border:`1px solid ${border}`, borderRadius:14, padding:4, marginBottom:28, position:'relative', transition:'background 0.3s,border-color 0.3s' }}>
            <div style={{
              position:'absolute', top:4, bottom:4,
              left: isLogin ? 4 : 'calc(50% + 2px)',
              width:'calc(50% - 6px)',
              borderRadius:10,
              background: cardBg,
              border:`1px solid ${border}`,
              boxShadow: isDark ? '0 1px 6px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.10)',
              transition:'left 0.25s cubic-bezier(0.4,0,0.2,1), background 0.3s',
              pointerEvents:'none',
            }} />
            {[['login','Sign In'],['register','Create Account']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setShowPw(false) }} style={{
                flex:1, padding:'9px 0', fontSize:13,
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? textMain : textMute,
                background:'transparent', border:'none', cursor:'pointer',
                borderRadius:10, position:'relative', zIndex:1,
                transition:'color 0.2s', fontFamily:"'Plus Jakarta Sans',sans-serif",
              }}>
                {label}
              </button>
            ))}
          </div>

          <h2 style={{ fontFamily:"'Playfair Display',serif", fontWeight:800, fontSize:26, color:textMain, marginBottom:4, transition:'color 0.3s' }}>
            {isLogin ? 'Welcome back' : 'Start learning today'}
          </h2>
          <p style={{ fontSize:13, color:textMute, marginBottom:24, transition:'color 0.3s' }}>
            {isLogin ? 'Continue your learning journey' : 'Free forever. No credit card needed.'}
          </p>

          <button onClick={handleGoogle} disabled={googleLoading} style={{
            width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:12,
            padding:'11px 0', borderRadius:12, border:`1px solid ${border}`,
            background: surfBg, color:textMain, fontSize:13.5, fontWeight:500,
            cursor:'pointer', marginBottom:20, fontFamily:"'Plus Jakarta Sans',sans-serif",
            transition:'border-color 0.15s, background 0.15s, color 0.3s',
            opacity: googleLoading ? 0.6 : 1,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = isDark ? '#3d415a' : '#b8b2a5'; e.currentTarget.style.background = cardBg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = surfBg }}>
            {googleLoading
              ? <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${border}`, borderTopColor:accent, animation:'spin 1s linear infinite' }} />
              : <GoogleIcon />}
            Continue with Google
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ flex:1, height:1, background:border, transition:'background 0.3s' }} />
            <span style={{ fontSize:11, color:textMute, whiteSpace:'nowrap' }}>or with email</span>
            <div style={{ flex:1, height:1, background:border, transition:'background 0.3s' }} />
          </div>

          {isLogin && (
            <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Field label="EMAIL">
                <input className="input" type="email" placeholder="you@example.com"
                  value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email:e.target.value }))} required />
              </Field>
              <Field label="PASSWORD">
                <PwInput value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password:e.target.value }))}
                  showPw={showPw} setShowPw={setShowPw} textMute={textMute} />
              </Field>
              <SubmitBtn loading={loading} label="Sign in" />
            </form>
          )}

          {/* REGISTER FORM */}
          {!isLogin && (
            <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Field label="FULL NAME">
                <input className="input" placeholder="Your name"
                  value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name:e.target.value }))} required />
              </Field>
              <Field label="EMAIL">
                <input className="input" type="email" placeholder="you@example.com"
                  value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email:e.target.value }))} required />
              </Field>
              <Field label="PASSWORD">
                <PwInput value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password:e.target.value }))}
                  showPw={showPw} setShowPw={setShowPw} textMute={textMute} />
                {regForm.password && (
                  <div style={{ display:'flex', gap:4, marginTop:8 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ height:3, flex:1, borderRadius:3, transition:'background 0.3s', background: i < pwScore ? pwBarColors[pwScore - 1] : border }} />
                    ))}
                  </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:10 }}>
                  {pwChecks.map(c => (
                    <div key={c.label} style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <CheckCircle2 size={12} style={{ color: c.fn(regForm.password) ? accent3 : border, flexShrink:0, transition:'color 0.2s' }} />
                      <span style={{ fontSize:11, color: c.fn(regForm.password) ? accent3 : textMute, transition:'color 0.2s' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </Field>
              <SubmitBtn loading={loading} label="Create account" />
            </form>
          )}

          <p style={{ textAlign:'center', fontSize:12, color:textMute, marginTop:20 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setTab(isLogin ? 'register' : 'login'); setShowPw(false) }} style={{
              background:'none', border:'none', cursor:'pointer', color:accent,
              fontWeight:600, fontSize:12, padding:0, fontFamily:"'Plus Jakarta Sans',sans-serif",
            }}>
              {isLogin ? 'Create one free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function ThemeToggle({ toggle, isDark, border, surfBg, textMute }) {
  return (
    <button onClick={toggle} style={{
      padding:'7px 8px', borderRadius:10, border:`1px solid ${border}`,
      background: surfBg, color:textMute, cursor:'pointer',
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background 0.3s,border-color 0.3s',
    }}>
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:'var(--text-muted)', marginBottom:6, letterSpacing:'0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function PwInput({ value, onChange, showPw, setShowPw, textMute }) {
  return (
    <div style={{ position:'relative' }}>
      <input className="input" type={showPw ? 'text' : 'password'}
        placeholder="••••••••" style={{ paddingRight:44 }}
        value={value} onChange={onChange} required />
      <button type="button" onClick={() => setShowPw(v => !v)} style={{
        position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
        background:'none', border:'none', cursor:'pointer', color:textMute,
        display:'flex', alignItems:'center',
      }}>
        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function SubmitBtn({ loading, label }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary" style={{ width:'100%', padding:'12px', marginTop:4 }}>
      {loading
        ? <div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 1s linear infinite' }} />
        : <><span>{label}</span><ArrowRight size={15} style={{ marginLeft:6 }} /></>}
    </button>
  )
}