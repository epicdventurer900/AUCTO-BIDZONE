import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../api/types'
import { AuthContext } from './auth-context'

export interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password)
    localStorage.setItem('token', res.access_token)
    setToken(res.access_token)
    setUser(res.user)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password })
    localStorage.setItem('token', res.access_token)
    setToken(res.access_token)
    setUser(res.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

