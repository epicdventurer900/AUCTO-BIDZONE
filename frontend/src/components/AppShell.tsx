import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './AppShell.css'
import './AppShellOverrides.css'

const navigation = [
  { label: 'Home', to: '/' },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()

  const closeMobile = () => setMobileOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      {mobileOpen && <button className="shell-backdrop" aria-label="Close navigation" onClick={closeMobile} />}

      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="shell-brand">
          <div className="shell-logo">AB</div>
          <div>
            <strong>AUCTO</strong>
            <span>BIDZONE</span>
          </div>
        </div>

        <div className="shell-label">WORKSPACE</div>
        <nav className="shell-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} end onClick={closeMobile} className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-glyph">⌂</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell-sidebar-footer">
          <div className="shell-status"><span /> System operational</div>
          <button className="shell-logout" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation">☰</button>
          <div className="header-context">
            <span className="header-kicker">AUCTO-BIDZONE</span>
            <strong>Live auction workspace</strong>
          </div>
          <div className="header-actions">
            <span className="live-indicator"><i /> LIVE READY</span>
            <button className="header-icon" aria-label="Notifications">⌁</button>
            <button className="profile-button" onClick={() => navigate('/')} aria-label="Open profile">
              <span>PS</span>
            </button>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </section>
    </div>
  )
}
