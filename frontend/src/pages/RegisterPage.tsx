import { useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import './AuthPage.css'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
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
            <div className="auth-kicker">BUILD • COMPETE • WIN</div>
            <h2>Your seat at the auction.</h2>
            <p>Create your account and join a platform built for fast, transparent, real-time bidding.</p>
          </div>
          <div className="auth-orb" aria-hidden="true" />
        </div>
        <div className="auth-form">
          <h1>Create account</h1>
          <p className="auth-subtitle">Set up your AUCTO identity in seconds.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Name
              <input type="text" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Your name" autoComplete="name" required />
            </label>
            <label>
              Email
              <input type="email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" minLength={6} required />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'CREATING…' : 'CREATE ACCOUNT →'}
            </button>
          </form>
          <p className="auth-link">Already registered? <Link to="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  )
}
