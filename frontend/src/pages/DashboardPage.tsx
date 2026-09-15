import { useEffect, useMemo, useState } from 'react'
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
  const [auctionType, setAuctionType] = useState<'sports' | 'items'>('items')
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
      const room = await api.createRoom({ name: roomName.trim(), auction_type: auctionType })
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
  const liveRooms = rooms.filter((room) => room.status === 'live' || room.status === 'paused')
  const hostedRooms = rooms.filter((room) => room.created_by_id === user?.id)
  const endedRooms = rooms.filter((room) => room.status === 'ended')
  const firstLiveRoom = liveRooms[0]
  const recentRooms = useMemo(() => rooms.slice(0, 4), [rooms])

  return (
    <div className="page dashboard-page">
      <header className="topbar dashboard-topbar">
        <Link to="/" className="brand-block" aria-label="Aucto Bidzone dashboard">
          <div className="brand-mark">AB</div>
          <div><h1>AUCTO<span>-BIDZONE</span></h1><p>AUCTION COMMAND CENTER</p></div>
        </Link>
        <nav className="dashboard-nav" aria-label="Main navigation">
          <a href="#overview">Overview</a><a href="#rooms">Rooms</a><a href="#features">Features</a>
        </nav>
        <div className="user-actions">
          <div className="user-chip"><span className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() || 'U'}</span><span><strong>{user?.name}</strong><small>{user?.is_admin ? 'Administrator' : 'Member'}</small></span></div>
          <button className="btn-secondary" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="dashboard-hero hero-panel" id="overview">
        <div className="hero-copy">
          <span className="eyebrow"><i className="status-pulse" /> PRIVATE AUCTION WORKSPACE</span>
          <h2>Your auction.<br /><span>Your control room.</span></h2>
          <p>Host a professional live auction, bring teams into one room, and control every bid, timer and result from a single command center.</p>
          <div className="hero-actions">
            <button onClick={openCreate}>＋ CREATE AUCTION</button>
            <button className="btn-secondary" onClick={openJoin}>JOIN WITH CODE <span>↗</span></button>
          </div>
          <div className="hero-metrics">
            <div><strong>{hostedRooms.length}</strong><span>HOSTED</span></div>
            <div><strong>{liveRooms.length}</strong><span>LIVE ROOMS</span></div>
            <div><strong>{rooms.length}</strong><span>TOTAL ROOMS</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="visual-grid" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="visual-core"><span>AB</span><small>LIVE</small></div>
          <div className="floating-card card-bid"><span>CURRENT BID</span><strong>₹ 2.40L</strong><small>↑ LIVE ACTIVITY</small></div>
          <div className="floating-card card-timer"><span>AUCTION TIMER</span><strong>00:12</strong><small>● BIDDING OPEN</small></div>
          <div className="floating-card card-team"><span>CONTROL</span><strong>READY</strong><small>ROOM SYNC 100%</small></div>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="command-grid" aria-label="Quick actions">
        <button className="command-card command-primary" onClick={openCreate}><span className="command-icon">＋</span><span><small>HOST</small><strong>Create auction</strong><em>Set up a new live room</em></span><b>↗</b></button>
        <button className="command-card" onClick={openJoin}><span className="command-icon">⌁</span><span><small>PARTICIPATE</small><strong>Join auction</strong><em>Enter a room with its code</em></span><b>↗</b></button>
        <button className="command-card" onClick={() => firstLiveRoom ? navigate(`/rooms/${firstLiveRoom.id}`) : document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' })}><span className="command-icon">◉</span><span><small>LIVE</small><strong>{firstLiveRoom ? 'Open live room' : 'Find a room'}</strong><em>{firstLiveRoom ? firstLiveRoom.name : 'Browse your workspace'}</em></span><b>↗</b></button>
        <button className="command-card" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}><span className="command-icon">◇</span><span><small>PLATFORM</small><strong>Explore features</strong><em>See what Bidzone can do</em></span><b>↗</b></button>
      </section>

      <section className="workspace-section" id="rooms">
        <div className="section-heading workspace-heading"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>Rooms at a glance</h2></div><div className="workspace-actions"><span className="room-count">{rooms.length} rooms</span><button className="mini-action" onClick={loadRooms}>↻ Refresh</button></div></div>
        <div className="workspace-stats">
          <div><span>HOSTED ROOMS</span><strong>{hostedRooms.length}</strong><small>Your auctions</small></div>
          <div className={liveRooms.length ? 'stat-live' : ''}><span>LIVE / PAUSED</span><strong>{liveRooms.length}</strong><small>{liveRooms.length ? 'Action required' : 'Nothing live'}</small></div>
          <div><span>COMPLETED</span><strong>{endedRooms.length}</strong><small>Auction history</small></div>
          <div><span>PLATFORM</span><strong>ONLINE</strong><small>Real-time ready</small></div>
        </div>
        {loading ? <div className="panel loading-state"><span className="loading-dot" /> Loading your command center…</div> : rooms.length === 0 ? (
          <div className="panel empty-state premium-empty"><div className="empty-icon">◈</div><span className="eyebrow">WELCOME TO BIDZONE</span><h3>Your auction workspace is empty</h3><p>Create your first auction or enter a room code to get started.</p><div><button onClick={openCreate}>Create first auction</button><button className="btn-secondary" onClick={openJoin}>Join a room</button></div></div>
        ) : (
          <div className="room-grid premium-room-grid">{recentRooms.map((room) => (
            <Link key={room.id} to={`/rooms/${room.id}`} className="room-card premium-room-card">
              <div className="room-card-glow" /><div className="room-card-top"><span className={`badge badge-${room.status}`}>{room.status}</span>{room.status === 'live' && <span className="live-dot">● Live</span>}</div>
              <div className="room-card-id">ROOM / {room.room_code}</div><h3>{room.name}</h3><p>{room.auction_type === 'sports' ? 'Sports auction' : 'General item auction'} · {room.visibility}</p>
              <div className="room-card-footer"><span>MODE · {room.auction_type.toUpperCase()}</span><strong>Open command room →</strong></div>
            </Link>
          ))}</div>
        )}
      </section>

      <section className="live-banner" id="features">
        <div><span className="eyebrow"><i className="status-pulse" /> BUILT FOR LIVE AUCTIONS</span><h2>Everything stays in sync.</h2><p>Real-time bidding, live timers, team purses, chat, auction controls and reports — designed as one connected experience.</p></div>
        <div className="live-feature-list"><span>01 <strong>Live bidding</strong></span><span>02 <strong>Room chat</strong></span><span>03 <strong>Team purses</strong></span><span>04 <strong>Dynamic item details</strong></span></div>
      </section>

      {showCreate && <form className="panel action-panel" onSubmit={handleCreate}>
        <div className="panel-heading"><div><span className="eyebrow">HOST CONSOLE</span><h2>Create auction room</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowCreate(false)}>×</button></div>
        <label>Room name<input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. College Cricket Auction" required /></label>
        <label>Auction mode<select value={auctionType} onChange={(e) => setAuctionType(e.target.value as typeof auctionType)}><option value="items">General / Item Auction</option><option value="sports">Sports / Player Auction</option></select></label>
        <p className="form-hint">Choose a mode for the item details. The same live bidding engine works for both.</p>
        <button type="submit">Create &amp; Enter Command Room →</button>
      </form>}

      {showJoin && <form className="panel action-panel" onSubmit={handleJoin}>
        <div className="panel-heading"><div><span className="eyebrow">ROOM ACCESS</span><h2>Join an auction</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowJoin(false)}>×</button></div>
        <label>Room code<input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={12} required /></label>
        <label>Role<select value={joinRole} onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}><option value="bidder">Bidder</option><option value="auctioneer">Auctioneer</option><option value="viewer">Viewer</option></select></label>
        {joinRole === 'bidder' && <label>Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Your team" required /></label>}
        <button type="submit">Enter Auction Room →</button>
      </form>}
    </div>
  )
}
