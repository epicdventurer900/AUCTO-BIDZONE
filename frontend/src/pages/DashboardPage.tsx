import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Room } from '../api/types'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'

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

  useEffect(() => { loadRooms() }, [])

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

  const openCreate = () => { setShowCreate(true); setShowJoin(false); setError('') }
  const openJoin = () => { setShowJoin(true); setShowCreate(false); setError('') }
  const liveRooms = rooms.filter((room) => room.status === 'live').length

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
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a href="#rooms">Rooms</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="user-actions">
          <span className="welcome">Hi, {user?.name}</span>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="dashboard-hero hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">THE NEXT GENERATION OF LIVE AUCTIONS</span>
          <h2>Bid. Compete. Win.<br /><span>Experience auctions in real time.</span></h2>
          <p>Create a private room, invite your teams, and run every bid from a cinematic auction control center.</p>
          <div className="hero-actions">
            <button onClick={openCreate}>ENTER AUCTION <span>↗</span></button>
            <button className="btn-secondary" onClick={openJoin}>EXPLORE ROOMS</button>
          </div>
          <div className="hero-metrics">
            <div><strong>{rooms.length}</strong><span>YOUR ROOMS</span></div>
            <div><strong>{liveRooms}</strong><span>LIVE NOW</span></div>
            <div><strong>24/7</strong><span>REAL-TIME SYNC</span></div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core"><span>AB</span><small>LIVE</small></div>
          <div className="floating-card card-bid"><span>CURRENT BID</span><strong>₹ 2.40L</strong><small>Team Alpha ↑</small></div>
          <div className="floating-card card-timer"><span>AUCTION</span><strong>00:12</strong><small>● BIDDING OPEN</small></div>
          <div className="floating-card card-team"><span>TOP TEAM</span><strong>ALPHA</strong><small>92% purse</small></div>
          <div className="scan-line" />
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {showCreate && (
        <form className="panel action-panel" onSubmit={handleCreate}>
          <div className="panel-heading"><div><span className="eyebrow">NEW AUCTION</span><h2>Create auction room</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowCreate(false)}>×</button></div>
          <label>Room name<input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. College Cricket Auction" required /></label>
          <button type="submit">Create &amp; Enter Room</button>
        </form>
      )}

      {showJoin && (
        <form className="panel action-panel" onSubmit={handleJoin}>
          <div className="panel-heading"><div><span className="eyebrow">JOIN AUCTION</span><h2>Enter a room</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowJoin(false)}>×</button></div>
          <label>Room code<input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={12} required /></label>
          <label>Role<select value={joinRole} onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}><option value="bidder">Bidder</option><option value="auctioneer">Auctioneer</option><option value="viewer">Viewer</option></select></label>
          {joinRole === 'bidder' && <label>Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Your team" required /></label>}
          <button type="submit">Join Auction</button>
        </form>
      )}

      <section className="rooms-section" id="rooms">
        <div className="section-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>My rooms</h2></div>{!loading && <span className="room-count">{rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}</span>}</div>
        {loading ? <div className="panel loading-state"><span className="loading-dot" /> Loading your rooms…</div> : rooms.length === 0 ? (
          <div className="panel empty-state"><div className="empty-icon">⌁</div><h3>No auction rooms yet</h3><p>Create your first room or join one using a room code.</p><button onClick={openCreate}>Create your first room</button></div>
        ) : (
          <div className="room-grid">{rooms.map((room) => <Link key={room.id} to={`/rooms/${room.id}`} className="room-card"><div className="room-card-top"><span className={`badge badge-${room.status}`}>{room.status}</span>{room.status === 'live' && <span className="live-dot">● Live</span>}</div><h3>{room.name}</h3><p className="room-code-label">ROOM CODE</p><div className="room-code">{room.room_code}</div><span className="open-room">Open room →</span></Link>)}</div>
        )}
      </section>

      <section className="how-section" id="how-it-works">
        <span className="eyebrow">CONTROLLED. CONNECTED. LIVE.</span>
        <h2>Everything your auction needs.</h2>
        <div className="feature-strip"><div><span>01</span><strong>Create</strong><p>Build a private auction room in seconds.</p></div><div><span>02</span><strong>Invite</strong><p>Share the room code with bidders and viewers.</p></div><div><span>03</span><strong>Compete</strong><p>Watch bids, purses, chat and the timer update live.</p></div></div>
      </section>
    </div>
  )
}
