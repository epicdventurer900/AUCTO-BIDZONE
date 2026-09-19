import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AuctionItem, AuctionReport, AuctionState, ChatMessage } from '../api/types'
import { useRoomSocket } from '../hooks/useRoomSocket'

export default function RoomPage() {
  const { id } = useParams<{ id: string }>()
  const roomId = Number(id)
  const [state, setState] = useState<AuctionState | null>(null)
  const [items, setItems] = useState<AuctionItem[]>([])
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [report, setReport] = useState<AuctionReport | null>(null)
  const [error, setError] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState(10)
  const [bidAmount, setBidAmount] = useState(0)
  const [chatText, setChatText] = useState('')

  const onSync = useCallback((s: AuctionState) => setState(s), [])
  const handleTimerUpdate = useCallback(({ remaining, phase }: { remaining: number; phase: string }) => {
    setState((prev) => (
      prev
        ? {
            ...prev,
            timer_remaining: remaining,
            phase,
          }
        : prev
    ))
  }, [])
  const handleSocketError = useCallback((message: string) => setError(message), [])
  const { connected, chatMessages, setChatMessages, send } = useRoomSocket(
    roomId,
    onSync,
    handleTimerUpdate,
    handleSocketError,
  )


  useEffect(() => {
    Promise.all([
      api.getAuctionState(roomId),
      api.listItems(roomId),
      api.getChat(roomId),
    ])
      .then(([s, i, c]) => {
        setState(s)
        setItems(i)
        setChat(c)
        setChatMessages(c)
        if (s.current_item) {
          const min = s.highest_bid ? s.highest_bid.amount + s.room.bid_increment : s.current_item.base_price
          setBidAmount(min)
        }
        if (s.room.status === 'ended') {
          api.getReport(roomId).then(setReport)
        }
      })
      .catch((e) => setError(e.message))
  }, [roomId, setChatMessages])

  useEffect(() => {
    if (!state?.current_item) {
      setBidAmount(0)
      return
    }

    const minBid = state.highest_bid
      ? state.highest_bid.amount + state.room.bid_increment
      : state.current_item.base_price
    setBidAmount(minBid)
  }, [
    state?.current_item,
    state?.current_item?.base_price,
    state?.highest_bid,
    state?.highest_bid?.amount,
    state?.room.bid_increment,
  ])

  useEffect(() => {
    if (state?.room.status !== 'ended' || report) return

    api.getReport(roomId)
      .then(setReport)
      .catch((e) => setError(e.message))
  }, [report, roomId, state?.room.status])

  useEffect(() => {
    if (chatMessages.length) setChat(chatMessages)
  }, [chatMessages])

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const item = await api.addItem(roomId, { name: itemName, base_price: itemPrice })
      setItems((prev) => [...prev, item])
      setItemName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  const auctionAction = async (action: () => Promise<AuctionState>) => {
    try {
      const s = await action()
      setState(s)
      if (s.room.status === 'ended') {
        const r = await api.getReport(roomId)
        setReport(r)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    }
  }

  const handleBid = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api.placeBid(roomId, bidAmount)
      const s = await api.getAuctionState(roomId)
      setState(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid failed')
    }
  }

  const handleChat = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatText.trim()) return
    sendChatMessage(chatText)
    setChatText('')
  }

  const sendChatMessage = (message: string) => {
    send('send_chat', { message })
  }


  if (!state) {
    return (
      <div className="page">
        <p>{error || 'Loading room…'}</p>
        <Link to="/dashboard">← Back</Link>
      </div>
    )
  }

  const { room, current_item, highest_bid, timer_remaining, phase, teams } = state
  const isSetup = room.status === 'setup' || room.status === 'draft'
  const isLive = room.status === 'live' || room.status === 'paused'

  return (
    <div className="page room-page hud-shell">
      <header className="topbar hud-topbar">
        <div>
          <Link to="/dashboard" className="back-link">← Return to dashboard</Link>
          <div className="eyebrow">AUCTO // LIVE AUCTION CONTROL</div>
          <h1>{room.name}</h1>
          <p className="room-meta">
            ROOM <strong>{room.room_code}</strong>
            <span className={`status-chip status-${room.status}`}>{room.status}</span>
          </p>
        </div>
        <div className="connection-indicator">
          <span className={`connection-dot ${connected ? 'is-connected' : ''}`} />
          <span>{connected ? 'LIVE LINK' : 'OFFLINE LINK'}</span>
        </div>
      </header>

      {error && <p className="error hud-error">{error}</p>}

      {isSetup && (
        <section className="panel hud-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow">SYSTEM INITIALIZATION</div>
              <h2>Prepare auction inventory</h2>
            </div>
            <span className="metric-label">ITEMS QUEUED <strong>{items.length}</strong></span>
          </div>
          <form onSubmit={handleAddItem} className="inline-form">
            <input placeholder="Player name" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <input type="number" min={0} value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} />
            <button type="submit">Add item</button>
          </form>
          <ul className="item-list">
            {items.map((item) => (
              <li key={item.id}>
                {item.name} — base {item.base_price} ({item.status})
              </li>
            ))}
          </ul>
          {items.length > 0 && (
            <button onClick={() => auctionAction(() => api.startAuction(roomId))}>Start Auction</button>
          )}
        </section>
      )}

      {isLive && (
        <>
          <div className="hud-metrics">
            <div className="metric-card">
              <span className="metric-label">AUCTION STATUS</span>
              <strong className="metric-value">{room.status.toUpperCase()}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">CURRENT PHASE</span>
              <strong className="metric-value">{phase.replace('_', ' ').toUpperCase()}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">BID INCREMENT</span>
              <strong className="metric-value">{room.bid_increment}</strong>
            </div>
            <div className="metric-card">
              <span className="metric-label">ACTIVE TEAMS</span>
              <strong className="metric-value">{teams.length.toString().padStart(2, '0')}</strong>
            </div>
          </div>

          <div className="auction-layout">
          <section className="panel auction-main hud-panel">
            <div className="auction-console-header">
              <div>
                <div className="eyebrow">LIVE LOT // {current_item ? `#${current_item.id.toString().padStart(3, '0')}` : 'STANDBY'}</div>
                <span className="phase">{phase.replace('_', ' ')}</span>
              </div>
              <div className="timer-readout">
                <span className="metric-label">TIME REMAINING</span>
                <strong className="timer">{timer_remaining.toString().padStart(2, '0')}s</strong>
              </div>
            </div>
            {current_item ? (
              <>
                <div className="lot-display">
                  <span className="lot-kicker">CURRENT ASSET</span>
                  <h2>{current_item.name}</h2>
                  <p>BASE VALUATION <strong>{current_item.base_price}</strong></p>
                </div>
                {highest_bid ? (
                  <div className="current-bid hud-bid">
                    <span className="metric-label">HIGHEST ACTIVE BID // TEAM #{highest_bid.team_id}</span>
                    <strong>{highest_bid.amount}</strong>
                  </div>
                ) : (
                  <div className="current-bid hud-bid empty-bid">
                    <span className="metric-label">HIGHEST ACTIVE BID</span>
                    <strong>NO BIDS YET</strong>
                  </div>
                )}
                <form onSubmit={handleBid} className="inline-form bid-form">
                  <label htmlFor="bid-amount">ENTER BID</label>
                  <input
                    id="bid-amount"
                    type="number"
                    min={current_item.base_price}
                    value={bidAmount}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                  />
                  <button type="submit">Transmit bid</button>
                </form>
              </>
            ) : (
              <p className="empty-state">Waiting for next item…</p>
            )}

            <div className="auction-controls">
              <button className="btn-secondary hud-command" onClick={() => auctionAction(() => api.pauseAuction(roomId))}>
                Pause
              </button>
              <button className="btn-secondary hud-command" onClick={() => auctionAction(() => api.resumeAuction(roomId))}>
                Resume
              </button>
              <button className="btn-secondary hud-command" onClick={() => auctionAction(() => api.nextItem(roomId))}>
                Next item
              </button>
              <button className="btn-danger hud-command" onClick={() => auctionAction(() => api.endAuction(roomId))}>
                End auction
              </button>
            </div>
          </section>

          <aside className="panel sidebar hud-panel">
            <div className="section-heading compact-heading">
              <div>
                <div className="eyebrow">LIVE METRICS</div>
                <h3>Team telemetry</h3>
              </div>
              <span className="connection-dot is-connected" />
            </div>
            <ul className="team-list">
              {teams.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong>
                  <span>{t.purse_remaining} / {t.purse_total}</span>
                </li>
              ))}
            </ul>

            <div className="chat-heading">
              <div className="eyebrow">COMMS CHANNEL</div>
              <h3>Room chat</h3>
            </div>
            <div className="chat-box">
              {chat.map((m) => (
                <div key={m.id} className="chat-msg">
                  <span className="chat-user">#{m.user_id}</span> {m.message}
                </div>
              ))}
            </div>
            <form onSubmit={handleChat} className="inline-form">
              <input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message…" />
              <button type="submit">Send</button>
            </form>
          </aside>
        </div>
        </>
      )}

      {room.status === 'ended' && report && (
        <section className="panel">
          <h2>Auction Report</h2>
          <p>
            Sold: {report.sold_count} · Unsold: {report.unsold_count} · Total spend: {report.total_spend}
          </p>
          <div className="report-grid">
            <div>
              <h3>Sold</h3>
              <ul>
                {report.sold_items.map((i) => (
                  <li key={i.id}>{i.name} — {i.sold_price}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Unsold</h3>
              <ul>
                {report.unsold_items.map((i) => (
                  <li key={i.id}>{i.name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
