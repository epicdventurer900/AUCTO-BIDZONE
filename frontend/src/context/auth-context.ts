import { createContext } from 'react'
import type { AuthContextValue } from './AuthContext'

export const AuthContext = createContext<AuthContextValue | null>(null)