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
      const room = await api.createRoom({ name: roomName })
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
        room_code: joinCode,
        role: joinRole,
        team_name: joinRole === 'bidder' ? teamName : undefined,
      })
      navigate(`/rooms/${member.room_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <h1>Auction Platform</h1>
          <p>Welcome, {user?.name}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>
          Logout
        </button>
      </header>

      <div className="actions-row">
        <button onClick={() => { setShowCreate(true); setShowJoin(false) }}>Create Room</button>
        <button className="btn-secondary" onClick={() => { setShowJoin(true); setShowCreate(false) }}>
          Join Room
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {showCreate && (
        <form className="panel" onSubmit={handleCreate}>
          <h2>Create auction room</h2>
          <label>
            Room name
            <input value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
          </label>
          <button type="submit">Create</button>
        </form>
      )}

      {showJoin && (
        <form className="panel" onSubmit={handleJoin}>
          <h2>Join room</h2>
          <label>
            Room code
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required />
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
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            </label>
          )}
          <button type="submit">Join</button>
        </form>
      )}

      <section className="panel">
        <h2>My rooms</h2>
        {loading ? (
          <p>Loading…</p>
        ) : rooms.length === 0 ? (
          <p className="muted">No rooms yet. Create or join one to get started.</p>
        ) : (
          <div className="room-grid">
            {rooms.map((room) => (
              <Link key={room.id} to={`/rooms/${room.id}`} className="room-card">
                <h3>{room.name}</h3>
                <p>Code: <strong>{room.room_code}</strong></p>
                <span className={`badge badge-${room.status}`}>{room.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
