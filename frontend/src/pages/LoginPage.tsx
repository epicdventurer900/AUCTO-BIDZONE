import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './AuthPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-visual">
          <div className="auth-brand"><span>AUCTO</span> / BIDZONE</div>
          <div>
            <div className="auth-kicker">LIVE AUCTION NETWORK</div>
            <h2>Enter the arena.</h2>
            <p>Connect to real-time auctions, compete with teams, and experience every bid as it happens.</p>
          </div>
          <div className="auth-orb" aria-hidden="true" />
        </div>
        <div className="auth-form">
          <h1>Welcome back</h1>
          <p className="auth-subtitle">Sign in to your auction command center.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'CONNECTING…' : 'ENTER BIDZONE →'}
            </button>
          </form>
          <p className="auth-link">New to AUCTO? <Link to="/register">Create an account</Link></p>
        </div>
      </section>
    </main>
  )
}
