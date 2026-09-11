import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Room } from '../api/types'
import { useAuth } from '../context/useAuth'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [joinRole, setJoinRole] = useState<'auctioneer' | 'bidder' | 'viewer'>('bidder')
  const [teamName, setTeamName] = useState('')
  const [error, setError] = useState('')

  const loadRooms = () => {
    setLoading(true)
    api.listRooms()
      .then(setRooms)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRooms()
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const room = await api.createRoom({ name: roomName.trim() })
      navigate(`/rooms/${room.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    }
  }

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const member = await api.joinRoom({
        room_code: joinCode.trim().toUpperCase(),
        role: joinRole,
        team_name: joinRole === 'bidder' ? teamName.trim() : undefined,
      })
      navigate(`/rooms/${member.room_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    }
  }

  const openCreate = () => {
    setShowCreate(true)
    setShowJoin(false)
    setError('')
  }

  const openJoin = () => {
    setShowJoin(true)
    setShowCreate(false)
    setError('')
  }

  return (
    <div className="page dashboard-page">
      <header className="topbar dashboard-topbar">
        <div className="brand-block">
          <div className="brand-mark">AB</div>
          <div>
            <h1>AUCTO-BIDZONE</h1>
            <p>Live auctions. Real-time bidding. One room.</p>
          </div>
        </div>
        <div className="user-actions">
          <span className="welcome">Hi, {user?.name}</span>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <span className="eyebrow">AUCTION CONTROL CENTER</span>
          <h2>Run your next auction from one place.</h2>
          <p>Create a private room or enter a room code to join an active auction.</p>
        </div>
        <div className="hero-actions">
          <button onClick={openCreate}>＋ Create Room</button>
          <button className="btn-secondary" onClick={openJoin}>Join with Code</button>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {showCreate && (
        <form className="panel action-panel" onSubmit={handleCreate}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEW AUCTION</span>
              <h2>Create auction room</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => setShowCreate(false)}>×</button>
          </div>
          <label>
            Room name
            <input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. College Cricket Auction" required />
          </label>
          <button type="submit">Create &amp; Enter Room</button>
        </form>
      )}

      {showJoin && (
        <form className="panel action-panel" onSubmit={handleJoin}>
          <div className="panel-heading">
            <div>
              <span className="eyebrow">JOIN AUCTION</span>
              <h2>Enter a room</h2>
            </div>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => setShowJoin(false)}>×</button>
          </div>
          <label>
            Room code
            <input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={12} required />
          </label>
          <label>
            Role
            <select value={joinRole} onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}>
              <option value="bidder">Bidder</option>
              <option value="auctioneer">Auctioneer</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          {joinRole === 'bidder' && (
            <label>
              Team name
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Your team" required />
            </label>
          )}
          <button type="submit">Join Auction</button>
        </form>
      )}

      <section className="rooms-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2>My rooms</h2>
          </div>
          {!loading && <span className="room-count">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span>}
        </div>

        {loading ? (
          <div className="panel loading-state"><span className="loading-dot" /> Loading your rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="panel empty-state">
            <div className="empty-icon">⌁</div>
            <h3>No auction rooms yet</h3>
            <p>Create your first room or join one using a room code.</p>
            <button onClick={openCreate}>Create your first room</button>
          </div>
        ) : (
          <div className="room-grid">
            {rooms.map((room) => (
              <Link key={room.id} to={`/rooms/${room.id}`} className="room-card">
                <div className="room-card-top">
                  <span className={`badge badge-${room.status}`}>{room.status}</span>
                  {room.status === 'live' && <span className="live-dot">● Live</span>}
                </div>
                <h3>{room.name}</h3>
                <p className="room-code-label">ROOM CODE</p>
                <div className="room-code">{room.room_code}</div>
                <span className="open-room">Open room →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
