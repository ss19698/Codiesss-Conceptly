import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { BookOpen, Sun, Moon, ArrowRight, Zap, Target, BarChart2, Trophy, Star, ChevronDown, Brain, Sparkles, TrendingUp, Heart } from 'lucide-react'

function useCountUp(target, duration = 1800, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let raf, startTime
    const step = (ts) => {
      if (!startTime) startTime = ts
      const p = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [start, target, duration])
  return val
}

/* ── Stat counter ── */
function StatCounter({ value, suffix = '', label, delay = 0, inView }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    if (inView) setTimeout(() => setActive(true), delay)
  }, [inView, delay])
  const num = useCountUp(value, 1800, active)
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="font-display font-extrabold text-4xl md:text-5xl text-gradient">
        {num.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  )
}

/* ── Feature card ── */
function FeatureCard({ icon: Icon, color, title, desc, delay }) {
  return (
    <div
      className="card p-6 animate-fade-up group hover:scale-[1.02] transition-all duration-300"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} strokeWidth={1.8} />
      </div>
      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <p className="text-muted text-sm leading-relaxed">{desc}</p>
    </div>
  )
}

/* ── Floating topic pill ── */
function FloatingPill({ text, style }) {
  return (
    <div className="pill pill-purple absolute pointer-events-none select-none animate-float text-[11px] whitespace-nowrap"
      style={{ backdropFilter: 'blur(8px)', ...style }}>
      <Zap size={9} className="text-accent" />
      {text}
    </div>
  )
}

/* ── Testimonial card ── */
function Testimonial({ name, role, text, avatar, delay }) {
  return (
    <div className="card p-5 animate-fade-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="flex items-center gap-1 mb-3">
        {Array(5).fill(0).map((_, i) => <Star key={i} size={12} fill="var(--amber)" style={{ color: 'var(--amber)' }} />)}
      </div>
      <p className="text-sm text-muted leading-relaxed mb-4">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white font-display flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,var(--accent),#7c5fff)' }}>
          {avatar}
        </div>
        <div>
          <div className="text-xs font-semibold">{name}</div>
          <div className="text-[10px] text-muted">{role}</div>
        </div>
      </div>
    </div>
  )
}

function LearningPathPreview() {
  const steps = [
    { label: 'Neural Networks Basics', status: 'done', xp: 120 },
    { label: 'Backpropagation Deep Dive', status: 'done', xp: 95 },
    { label: 'Attention Mechanisms', status: 'active', xp: 80 },
    { label: 'Transformer Architecture', status: 'pending', xp: 110 },
    { label: 'Fine-tuning & RLHF', status: 'pending', xp: 140 },
  ]
  return (
    <div className="card p-5 w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
          <Brain size={14} className="text-accent" />
        </div>
        <div>
          <div className="text-xs font-semibold">Your Learning Path</div>
          <div className="text-[10px] text-muted">AI & Deep Learning</div>
        </div>
        <div className="ml-auto pill pill-purple text-[10px]">Level 4</div>
      </div>
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                s.status === 'done' ? 'bg-accent3/20 text-accent3 border border-accent3/30' :
                s.status === 'active' ? 'bg-accent/20 text-accent border border-accent/50 animate-pulse' :
                'bg-border text-muted border border-border'
              }`}>
                {s.status === 'done' ? '✓' : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-px h-3 mt-0.5 ${s.status === 'done' ? 'bg-accent3/40' : 'bg-border'}`} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-medium truncate ${s.status === 'pending' ? 'text-muted' : 'text-[#A78BFA]'}`}>
                {s.label}
              </div>
            </div>
            <div className={`text-[10px] font-mono flex-shrink-0 ${s.status === 'pending' ? 'text-muted' : 'text-accent'}`}>
              +{s.xp} XP
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex justify-between text-[10px] text-muted mb-1.5">
          <span>Progress</span>
          <span className="text-accent font-mono">40%</span>
        </div>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Navbar ── */
function Navbar({ onGetStarted }) {
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'var(--surface)' : 'transparent',
        borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
      }}>
      <div className="max-w-8xl mx-auto px-6 h-16 flex items-center justify-between ">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,var(--accent),#7c5fff)' }}>
            <BookOpen size={20} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div className="font-display font-bold text-[25px] leading-none">Conceptly</div>
            <div className="text-[12px] text-muted tracking-widest uppercase">AI Learning</div>
          </div>
        </div>

        {/* Nav links — desktop */}
        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          {['Features', 'How it works','Feedback'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="hover:text-[#A78BFA] transition-colors cursor-pointer">{l}</a>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <button onClick={toggle}
            className="w-8 h-8 rounded-lg border flex items-center justify-center text-muted hover:text-[#A78BFA] hover:border-border-hover transition-all"
            style={{ borderColor: 'var(--border)' }}>
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => navigate('/auth')}
            className="hidden md:block text-xs py-2 px-4 btn-primary">
            Sign in
          </button>
        </div>
      </div>
    </nav>
  )
}

/* ══════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate()
  const statsRef = useRef(null)
  const [statsInView, setStatsInView] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsInView(true) }, { threshold: 0.3 })
    if (statsRef.current) obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [])

  const handleGetStarted = () => navigate('/auth?tab=register')

  const features = [
    { icon: Brain, color: '#5b7fff', title: 'AI-Generated Learning Paths', desc: 'Tell us what you want to learn. Our AI crafts a personalized, structured path with checkpoints tailored to your current level.', delay: 0 },
    { icon: Target, color: '#ff7a50', title: 'Adaptive Quizzes', desc: 'Every quiz adapts to your performance. Weak areas get more attention, strong areas advance faster. No wasted time.', delay: 80 },
    { icon: BarChart2, color: '#3ec98e', title: 'Deep Analytics', desc: 'Track your progress with detailed insights — mastery scores, concept maps, streaks, and comparative analytics over time.', delay: 160 },
    { icon: Zap, color: '#f5c842', title: 'XP & Streak System', desc: 'Earn XP for every session, quiz, and checkpoint. Level up, maintain streaks, and unlock achievements as you grow.', delay: 240 },
    { icon: Trophy, color: '#a87fff', title: 'Achievements & Milestones', desc: 'Celebrate real progress with meaningful badges. From first quiz to 100-day streak — every milestone deserves recognition.', delay: 320 },
    { icon: TrendingUp, color: '#f772c0', title: 'Weak Spot Detection', desc: 'Our AI constantly monitors your knowledge graph to surface concepts that need reinforcement before you fall behind.', delay: 400 },
  ]

  const testimonials = [
    { name: 'Arjun Mehta', role: 'ML Engineer at Swiggy', avatar: 'AM', text: 'Conceptly helped me go from knowing basic Python to understanding Transformers in 3 weeks. The learning paths are genuinely impressive.', delay: 0 },
    { name: 'Priya Nair', role: 'CS Student, IIT Bombay', avatar: 'PN', text: 'Every other platform throws a wall of video lectures at you. Conceptly actually checks if you understood before moving on. Game changer.', delay: 80 },
    { name: 'Rohan Desai', role: 'Data Scientist, Zepto', avatar: 'RD', text: "The weak spot detection is spooky accurate. It caught that I didn't really understand gradient descent even though I thought I did.", delay: 160 },
  ]

  const topics = ['Neural Networks', 'System Design', 'React Patterns', 'SQL Mastery', 'Calculus', 'BERT & Transformers', 'K-Means Clustering', 'Dynamic Programming']

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <Navbar onGetStarted={handleGetStarted} />

      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
        <FloatingPill text="Neural Networks" style={{ top: '20%', left: '6%', animationDelay: '0s', opacity: 0.7 }} />
        <FloatingPill text="Gradient Descent" style={{ top: '35%', right: '5%', animationDelay: '1.2s', opacity: 0.6 }} />
        <FloatingPill text="Transformers" style={{ bottom: '28%', left: '8%', animationDelay: '2s', opacity: 0.5 }} />
        <FloatingPill text="System Design" style={{ bottom: '32%', right: '7%', animationDelay: '0.8s', opacity: 0.65 }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
  
          <div className="inline-flex items-center gap-2 pill pill-purple mb-8 animate-fade-up text-[12px]">
            <Sparkles size={11} />
            Powered by Gemini AI · Built for deep learning
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-7xl leading-[1.05] tracking-tight mb-6 animate-fade-up"
            style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
            Learn anything.<br />
            <span className="text-gradient">Actually master it.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-10 animate-fade-up leading-relaxed"
            style={{ animationDelay: '160ms', animationFillMode: 'both' }}>
            Conceptly builds personalized AI-powered learning paths, tracks every concept you've studied, 
            and surfaces exactly what you need to revisit — so nothing falls through the cracks.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-up"
            style={{ animationDelay: '240ms', animationFillMode: 'both' }}>
            <button onClick={handleGetStarted}
              className="btn-primary text-[15px] py-3.5 px-8 flex items-center gap-2 w-full sm:w-auto">
              Start learning for free <ArrowRight size={16} />
            </button>
            <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-ghost text-[14px] py-3.5 px-8 w-full sm:w-auto">
              See how it works
            </button>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: '360ms', animationFillMode: 'both' }}>
            <div className="relative inline-block">
              <div className="absolute inset-0 blur-3xl rounded-3xl pointer-events-none"
                style={{ background: 'radial-gradient(ellipse,rgba(91,127,255,0.15) 0%,transparent 70%)' }} />
              <LearningPathPreview />
            </div>
          </div>

          <div className="mt-12 flex justify-center animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
            <div className="flex flex-col items-center gap-1 text-muted animate-bounce">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 px-6 border-t border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatCounter value={12400} suffix="+" label="Active learners" delay={0} inView={statsInView} />
          <StatCounter value={87000} suffix="+" label="Sessions completed" delay={150} inView={statsInView} />
          <StatCounter value={94} suffix="%" label="Learner satisfaction" delay={300} inView={statsInView} />
          <StatCounter value={4} suffix="x" label="Faster concept retention" delay={450} inView={statsInView} />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-[3px] uppercase text-muted mb-3">Why Conceptly</div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-4">
              Not another course platform.
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              We built the system we wished existed — one that treats your brain like an engine to optimize, not a bucket to fill.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6"
        style={{ background: 'var(--bg-alt)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-[3px] uppercase text-muted mb-3">How it works</div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-4">
              From zero to expert,<br /><span className="text-gradient">step by step.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '01', title: 'Tell us what you want to learn', desc: 'Type any topic — from "Gradient Descent" to "System Design for Scale." No rigid course catalog. Just your curiosity.', color: 'var(--accent)' },
              { num: '02', title: 'Follow your AI-crafted path', desc: 'Conceptly generates a structured learning journey with bite-sized checkpoints, adaptive quizzes, and XP rewards at every step.', color: 'var(--accent2)' },
              { num: '03', title: 'Master it. Track everything.', desc: 'Watch your knowledge graph grow. Our AI surfaces weak spots before they become problems, keeping you ahead of the curve.', color: 'var(--accent3)' },
            ].map((step, i) => (
              <div key={i} className="card p-6 animate-fade-up"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}>
                <div className="font-display font-extrabold text-5xl mb-4" style={{ color: step.color, opacity: 0.3 }}>
                  {step.num}
                </div>
                <h3 className="font-display font-bold text-xl mb-3">{step.title}</h3>
                <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Topic cloud */}
          <div className="mt-16 text-center">
            <div className="text-[11px] text-muted uppercase tracking-widest mb-6">Learn anything, like…</div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {topics.map((t, i) => (
                <button key={t} onClick={handleGetStarted}
                  className="text-xs px-4 py-2 rounded-xl border transition-all duration-200 hover:border-accent/50 hover:text-[#A78BFA] hover:bg-accent/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', animationDelay: `${i * 40}ms` }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id ="feedback" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-[3px] uppercase text-muted mb-3">What learners say</div>
            <h2 className="font-display font-extrabold text-4xl md:text-5xl">
              Real results,<br /><span className="text-gradient">real people.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map(t => <Testimonial key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-24 px-6"
        style={{ background: 'var(--bg-alt)' }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="card p-12 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at center,rgba(91,127,255,0.08) 0%,transparent 70%)' }} />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 pill pill-purple mb-6 text-[12px]">
                <Zap size={11} />
                Free to start · No credit card needed
              </div>
              <h2 className="font-display font-extrabold text-4xl md:text-5xl mb-5">
                Your next breakthrough<br />is one topic away.
              </h2>
              <p className="text-muted mb-10 text-lg max-w-lg mx-auto">
                Join thousands of learners who use Conceptly to close the gap between knowing and actually understanding.
              </p>
              <button onClick={handleGetStarted}
                className="btn-primary text-[15px] py-4 px-10 flex items-center gap-2 mx-auto">
                Start learning — it's free <ArrowRight size={16} />
              </button>
              <p className="text-muted text-xs mt-5">No credit card · Cancel anytime · Start in 30 seconds</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,var(--accent),#7c5fff)' }}>
              <BookOpen size={12} color="#fff" strokeWidth={2} />
            </div>
            <span className="font-display font-bold text-sm">Conceptly</span>
          </div>
          <div className="text-xs text-muted">© {new Date().getFullYear()} Conceptly. Built with AI, made for learners.</div>
          <div className="flex items-center gap-1 text-xs text-muted">
            Made with <Heart size ={16} color="red"/> by Codiesss
          </div>
        </div>
      </footer>
    </div>
  )
}