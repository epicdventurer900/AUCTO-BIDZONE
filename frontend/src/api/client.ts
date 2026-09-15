import type {
  AuctionItem,
  AuctionReport,
  AuctionState,
  Bid,
  ChatMessage,
  Room,
  RoomMember,
  TokenResponse,
  User,
} from './types'

// Use Vite dev-server proxy when available (avoids Failed to fetch from wrong VITE_API_URL)
const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

function getToken(): string | null {
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail))
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  register: (data: { name: string; email: string; password: string }) =>
    request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(err.detail ?? 'Login failed')
    }
    return res.json() as Promise<TokenResponse>
  },

  me: () => request<User>('/auth/me'),

  listRooms: () => request<Room[]>('/rooms/'),

  createRoom: (data: {
    name: string
    auction_type?: 'sports' | 'items'
    description?: string
    timer_seconds?: number
    bid_increment?: number
    purse_per_team?: number
  }) => request<Room>('/rooms/', { method: 'POST', body: JSON.stringify(data) }),

  getRoom: (id: number) => request<Room>(`/rooms/${id}`),

  joinRoom: (data: {
    room_code: string
    role: 'auctioneer' | 'bidder' | 'viewer'
    team_name?: string
    display_name?: string
  }) => request<RoomMember>('/rooms/join', { method: 'POST', body: JSON.stringify(data) }),

  listItems: (roomId: number) => request<AuctionItem[]>(`/rooms/${roomId}/items`),

  addItem: (roomId: number, data: {
    name: string
    base_price: number
    category?: string
    description?: string
    extra_data?: Record<string, unknown>
  }) => request<AuctionItem>(`/rooms/${roomId}/items`, { method: 'POST', body: JSON.stringify(data) }),

  listTeams: (roomId: number) => request<import('./types').Team[]>(`/rooms/${roomId}/teams`),

  getAuctionState: (roomId: number) => request<AuctionState>(`/rooms/${roomId}/auction/state`),

  startAuction: (roomId: number) =>
    request<AuctionState>(`/rooms/${roomId}/auction/start`, { method: 'POST' }),

  pauseAuction: (roomId: number) =>
    request<AuctionState>(`/rooms/${roomId}/auction/pause`, { method: 'POST' }),

  resumeAuction: (roomId: number) =>
    request<AuctionState>(`/rooms/${roomId}/auction/resume`, { method: 'POST' }),

  nextItem: (roomId: number) =>
    request<AuctionState>(`/rooms/${roomId}/auction/next`, { method: 'POST' }),

  endAuction: (roomId: number) =>
    request<AuctionState>(`/rooms/${roomId}/auction/end`, { method: 'POST' }),

  placeBid: (roomId: number, amount: number) =>
    request<Bid>(`/rooms/${roomId}/bids`, { method: 'POST', body: JSON.stringify({ amount }) }),

  getChat: (roomId: number) => request<ChatMessage[]>(`/rooms/${roomId}/chat`),

  sendChat: (roomId: number, message: string) =>
    request<ChatMessage>(`/rooms/${roomId}/chat`, { method: 'POST', body: JSON.stringify({ message } ) }),

  getReport: (roomId: number) => request<AuctionReport>(`/rooms/${roomId}/report`),
}

export function getWsUrl(roomId: number): string {
  const token = getToken()
  const base = (import.meta.env.VITE_WS_URL ?? 'ws://localhost:8001').replace(/\/$/, '')
  return `${base}/api/v1/ws/rooms/${roomId}?token=${token}`
}
