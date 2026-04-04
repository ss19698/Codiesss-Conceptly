import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import {
  LayoutDashboard, BookOpen, BarChart2, Trophy, Settings,
  LogOut, Menu, X, ChevronRight, Zap, Sun, Moon,
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/learn/sessions',        icon: BookOpen,         label: 'Learn' },
  { to: '/analytics',   icon: BarChart2,        label: 'Analytics' },
  { to: '/achievements', icon: Trophy,           label: 'Achievements' },
  { to: '/settings',    icon: Settings,         label: 'Settings' },
]

function XPBar({ xp = 0, level = 1 }) {
  const pct = Math.min(100, Math.round(((xp % 100) / 100) * 100))
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
      <div style={{ display:'flex',justifyContent:'space-between',fontSize:11 }}>
        <span style={{ color:'var(--text-muted)' }}>Level {level}</span>
        <span style={{ color:'var(--accent)',fontFamily:'JetBrains Mono,monospace',fontWeight:600 }}>{xp} XP</span>
      </div>
      <div className="prog-track">
        <div className="prog-fill" style={{ width:`${pct}%` }} />
      </div>
      <div style={{ fontSize:10,color:'var(--text-muted)' }}>{100 - (xp % 100)} XP to next level</div>
    </div>
  )
}

const Logo = () => (
  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
    <div style={{ width:32,height:32,borderRadius:10,background:'linear-gradient(135deg,var(--accent),#7c5fff)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
      <BookOpen size={15} color="#fff" strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16,color:'var(--text)',lineHeight:1.1 }}>Conceptly</div>
      <div style={{ fontSize:9.5,color:'var(--text-muted)',letterSpacing:'0.06em',textTransform:'uppercase' }}>AI Learning</div>
    </div>
  </div>
)

export default function AppLayout() {
  const { firebaseUser, dbUser, signOut } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const user = dbUser || { name: firebaseUser?.displayName || 'You', xp: 0, level: 1 }
  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    await signOut()
  }

  const sidebarBg = 'var(--surface)'
  const sidebarBorder = '1px solid var(--border)'

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      display:'flex',flexDirection:'column',
      background:sidebarBg,borderRight:sidebarBorder,
      width: mobile ? 240 : collapsed ? 84 : 224,
      height:'100vh',
      position: mobile ? 'fixed' : 'relative',
      left:0,top:0,
      zIndex: mobile ? 20 : 'auto',
      boxShadow: mobile ? '4px 0 24px rgba(0,0,0,0.25)' : 'none',
      transition:'width 0.25s cubic-bezier(0.4,0,0.2,1)',
      flexShrink:0,
    }}>
      {/* Logo row */}
      <div style={{ display:'flex',alignItems:'center',justifyContent: collapsed&&!mobile ? 'center':'space-between',
        padding: collapsed&&!mobile ? '18px 16px':'18px 16px',borderBottom:'1px solid var(--border)' }}>
        {(!collapsed||mobile) && <Logo />}
        {collapsed&&!mobile && (
          <div style={{ width:30,height:24,borderRadius:10,background:'linear-gradient(135deg,var(--accent),#7c5fff)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <BookOpen size={13} color="#fff" strokeWidth={2} />
          </div>
        )}
        {!mobile && (
          <button onClick={()=>setCollapsed(c=>!c)}
            style={{ padding:4,borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text-muted)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:8 }}>
            <ChevronRight size={13} style={{ transform:collapsed?'rotate(0)':'rotate(180deg)',transition:'transform 0.25s' }} />
          </button>
        )}
        {mobile && (
          <button onClick={()=>setMobileOpen(false)}
            style={{ padding:6,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)' }}>
            <X size={18}/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:2,overflowY:'auto' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={()=>mobile&&setMobileOpen(false)}
            title={collapsed&&!mobile?label:undefined}
            className={({ isActive })=>clsx('nav-item',isActive&&'active')}
            style={{ justifyContent:collapsed&&!mobile?'center':'flex-start',padding:collapsed&&!mobile?'10px':'10px 12px' }}>
            <Icon size={18} strokeWidth={1.8} style={{ flexShrink:0 }} />
            {(!collapsed||mobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop:'1px solid var(--border)',padding:12,display:'flex',flexDirection:'column',gap:10 }}>
        {(!collapsed||mobile) && <XPBar xp={user.xp} level={user.level} />}

        {/* Theme toggle */}
        <button onClick={toggle}
          style={{ display:'flex',alignItems:'center',gap:collapsed&&!mobile?0:10,padding:'8px 10px',borderRadius:10,
            border:'1px solid var(--border)',background:'transparent',color:'var(--text-muted)',
            cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:"'Plus Jakarta Sans',sans-serif",
            transition:'all 0.15s',justifyContent:collapsed&&!mobile?'center':'flex-start',width:'100%' }}
          onMouseEnter={e=>{e.currentTarget.style.background='var(--accent-bg)';e.currentTarget.style.color='var(--text)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='var(--text-muted)'}}>
          {isDark ? <Sun size={14}/> : <Moon size={14}/>}
          {(!collapsed||mobile) && <span>{isDark?'Light mode':'Dark mode'}</span>}
        </button>

        {/* User row */}
        <div style={{ display:'flex',alignItems:'center',gap:8 }}>
          <div style={{ width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent),var(--accent2))',
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',flexShrink:0,fontFamily:"'Playfair Display',serif" }}>
            {initials}
          </div>
          {(!collapsed||mobile) && (
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:12,fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ fontSize:10,color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{firebaseUser?.email}</div>
            </div>
          )}
          <button onClick={handleSignOut} title="Sign out"
            style={{ padding:6,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',display:'flex',alignItems:'center',flexShrink:0 }}
            onMouseEnter={e=>e.currentTarget.style.color='#f87171'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text-muted)'}>
            <LogOut size={14}/>
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div style={{ display:'flex',height:'100vh',overflow:'hidden',background:'var(--bg)' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ flexShrink:0 }}>
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="md:hidden" style={{ position:'fixed',inset:0,zIndex:40 }}>
          <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)' }} onClick={()=>setMobileOpen(false)} />
          <Sidebar mobile />
        </div>
      )}

      {/* Main */}
      <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden' }}>
        {/* Mobile top bar */}
          <div
            className="flex md:hidden items-center gap-3 px-4 py-3 border-b"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Menu size={20} />
            </button>

            <span
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 700,
                fontSize: 16,
                color: 'var(--text)',
              }}
            >
              Conceptly
            </span>

            <div
              className="flex items-center gap-2 ml-auto"
            >
              <button
                onClick={toggle}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <Zap size={14} style={{ color: 'var(--amber)' }} />

              <span
                style={{
                  fontSize: 12,
                  fontFamily: 'JetBrains Mono,monospace',
                  color: 'var(--accent)',
                  fontWeight: 600,
                }}
              >
                {user.xp} XP
              </span>
            </div>
          </div>

        <main style={{ flex:1,overflowY:'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}