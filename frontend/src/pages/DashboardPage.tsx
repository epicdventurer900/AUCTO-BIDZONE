import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Room } from '../api/types'
import { useAuth } from '../context/useAuth'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user } = useAuth()
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
  const recentRooms = useMemo(() => rooms.slice(0, 6), [rooms])
  const firstLiveRoom = liveRooms[0]
  const firstName = user?.name?.split(' ')[0] || 'there'

  return (
    <div className="page dashboard-page">
      <section className="workspace-welcome">
        <div>
          <span className="eyebrow"><i className="status-pulse" /> AUCTION WORKSPACE</span>
          <h1>Welcome back, <span>{firstName}</span>.</h1>
          <p>Run auctions, join live rooms, and manage your bidding workspace from one place.</p>
        </div>
        <div className="welcome-actions">
          <button onClick={openCreate}>＋ Create auction</button>
          <button className="btn-secondary" onClick={openJoin}>Join with code</button>
        </div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <section className="dashboard-overview" aria-label="Auction overview">
        <div className="overview-main panel">
          <div className="section-heading compact-heading">
            <div><span className="eyebrow">LIVE NOW</span><h2>Active auctions</h2></div>
            <button className="mini-action" onClick={loadRooms}>↻ Refresh</button>
          </div>
          {loading ? (
            <div className="dashboard-loading"><span className="loading-dot" /> Loading live rooms…</div>
          ) : liveRooms.length === 0 ? (
            <div className="dashboard-empty">
              <div className="empty-symbol">◉</div>
              <div><strong>No live auctions right now</strong><p>Start a room or join one using its room code.</p></div>
              <button onClick={openCreate}>Start auction</button>
            </div>
          ) : (
            <div className="live-room-list">
              {liveRooms.slice(0, 3).map((room) => (
                <Link key={room.id} to={`/rooms/${room.id}`} className="live-room-row">
                  <span className="live-status"><i /> {room.status}</span>
                  <span className="live-room-name"><strong>{room.name}</strong><small>ROOM / {room.room_code}</small></span>
                  <span className="room-mode">{room.auction_type === 'sports' ? 'SPORTS' : 'ITEMS'}</span>
                  <b>Open →</b>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="overview-side">
          <div className="metric-card"><span>MY AUCTIONS</span><strong>{hostedRooms.length}</strong><small>Rooms you created</small></div>
          <div className="metric-card metric-live"><span>LIVE / PAUSED</span><strong>{liveRooms.length}</strong><small>{liveRooms.length ? 'Needs attention' : 'Workspace is clear'}</small></div>
          <div className="metric-card"><span>COMPLETED</span><strong>{endedRooms.length}</strong><small>Finished rooms</small></div>
          <div className="metric-card"><span>ALL ROOMS</span><strong>{rooms.length}</strong><small>Your available rooms</small></div>
        </aside>
      </section>

      <section className="quick-actions">
        <div className="section-heading compact-heading"><div><span className="eyebrow">QUICK ACTIONS</span><h2>What do you want to do?</h2></div></div>
        <div className="quick-grid">
          <button className="quick-card quick-primary" onClick={openCreate}><span>＋</span><div><strong>Create auction</strong><small>Host a new bidding room</small></div><b>→</b></button>
          <button className="quick-card" onClick={openJoin}><span>⌁</span><div><strong>Join auction</strong><small>Enter a room code</small></div><b>→</b></button>
          <button className="quick-card" onClick={() => firstLiveRoom ? navigate(`/rooms/${firstLiveRoom.id}`) : document.getElementById('recent-rooms')?.scrollIntoView({ behavior: 'smooth' })}><span>◉</span><div><strong>{firstLiveRoom ? 'Resume live room' : 'Browse rooms'}</strong><small>{firstLiveRoom ? firstLiveRoom.name : 'View your available rooms'}</small></div><b>→</b></button>
        </div>
      </section>

      <section className="rooms-section" id="recent-rooms">
        <div className="section-heading">
          <div><span className="eyebrow">YOUR ROOMS</span><h2>Recent auctions</h2></div>
          <span className="room-count">{rooms.length} rooms</span>
        </div>
        {loading ? null : rooms.length === 0 ? (
          <div className="panel dashboard-empty full-empty"><div className="empty-symbol">◇</div><div><strong>Your room list is empty</strong><p>Your first auction will appear here after you create it.</p></div><button onClick={openCreate}>Create first room</button></div>
        ) : (
          <div className="room-grid app-room-grid">
            {recentRooms.map((room) => (
              <Link key={room.id} to={`/rooms/${room.id}`} className="app-room-card">
                <div className="app-room-top"><span className={`badge badge-${room.status}`}>{room.status}</span><span>{room.auction_type === 'sports' ? 'Sports' : 'Items'}</span></div>
                <small className="app-room-code">ROOM / {room.room_code}</small>
                <h3>{room.name}</h3>
                <p>{room.visibility} visibility · {room.created_by_id === user?.id ? 'Hosted by you' : 'Available to you'}</p>
                <div className="app-room-footer"><span>Open room</span><b>→</b></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="platform-strip">
        <div><span className="eyebrow"><i className="status-pulse" /> BIDZONE PLATFORM</span><h2>A serious workspace for live auctions.</h2><p>Create rooms, manage lots, bid in real time, chat with participants, and keep the auction moving from one connected interface.</p></div>
        <div className="platform-points"><span>01 <strong>Live bidding</strong></span><span>02 <strong>Room controls</strong></span><span>03 <strong>Team purses</strong></span><span>04 <strong>Dynamic item details</strong></span></div>
      </section>

      {showCreate && <form className="panel action-panel" onSubmit={handleCreate}>
        <div className="panel-heading"><div><span className="eyebrow">HOST CONSOLE</span><h2>Create auction room</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowCreate(false)}>×</button></div>
        <label>Room name<input autoFocus value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. College Cricket Auction" required /></label>
        <label>Auction mode<select value={auctionType} onChange={(e) => setAuctionType(e.target.value as typeof auctionType)}><option value="items">General / Item Auction</option><option value="sports">Sports / Player Auction</option></select></label>
        <p className="form-hint">Choose the item-detail mode for this room. Both modes use the same live bidding engine.</p>
        <button type="submit">Create &amp; enter room →</button>
      </form>}

      {showJoin && <form className="panel action-panel" onSubmit={handleJoin}>
        <div className="panel-heading"><div><span className="eyebrow">ROOM ACCESS</span><h2>Join an auction</h2></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setShowJoin(false)}>×</button></div>
        <label>Room code<input autoFocus value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={12} required /></label>
        <label>Role<select value={joinRole} onChange={(e) => setJoinRole(e.target.value as typeof joinRole)}><option value="bidder">Bidder</option><option value="auctioneer">Auctioneer</option><option value="viewer">Viewer</option></select></label>
        {joinRole === 'bidder' && <label>Team name<input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Your team" required /></label>}
        <button type="submit">Enter auction room →</button>
      </form>}
    </div>
  )
}
