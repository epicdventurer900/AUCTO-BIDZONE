export interface User {
  id: number
  name: string
  email: string
  is_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Room {
  id: number
  room_code: string
  name: string
  auction_type: 'sports' | 'items'
  status: 'draft' | 'setup' | 'live' | 'paused' | 'ended'
  visibility: 'public' | 'private'
  created_by_id: number
  timer_seconds: number
  bid_increment: number
  auto_extend_seconds: number
  confirmation_seconds: number
  purse_per_team: number
  max_auctioneers: number
  current_item_id: number | null
  description: string | null
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface Team {
  id: number
  room_id: number
  name: string
  purse_total: number
  purse_remaining: number
  color: string | null
  created_at: string
}

export interface AuctionItem {
  id: number
  room_id: number
  name: string
  description: string | null
  category: string | null
  base_price: number
  status: 'pending' | 'active' | 'sold' | 'unsold'
  sort_order: number
  sold_price: number | null
  sold_to_team_id: number | null
  extra_data: Record<string, unknown> | null
  created_at: string
}

export interface Bid {
  id: number
  room_id: number
  item_id: number
  team_id: number
  user_id: number
  amount: number
  is_valid: boolean
  created_at: string
}

export interface AuctionState {
  room: Room
  current_item: AuctionItem | null
  highest_bid: Bid | null
  timer_remaining: number
  phase: string
  teams: Team[]
}

export interface ChatMessage {
  id: number
  room_id: number
  user_id: number
  message: string
  created_at: string
}

export interface AuctionReport {
  room_id: number
  room_name: string
  total_items: number
  sold_count: number
  unsold_count: number
  total_spend: number
  teams: Team[]
  sold_items: AuctionItem[]
  unsold_items: AuctionItem[]
}

export interface RoomMember {
  id: number
  room_id: number
  user_id: number
  role: 'auctioneer' | 'bidder' | 'viewer'
  team_id: number | null
  display_name: string | null
  role_locked: boolean
  is_active: boolean
  joined_at: string
}
