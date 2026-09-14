import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { AuctionItem, AuctionReport, AuctionState, ChatMessage } from '../api/types'
import { useRoomSocket } from '../hooks/useRoomSocket'
import './RoomPage.css'

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
    setState((prev) => (prev ? { ...prev, timer_remaining: remaining, phase } : prev))
  }, [])
  const handleSocketError = useCallback((message: string) => setError(message), [])
  const { connected, chatMessages, setChatMessages, send } = useRoomSocket(
    roomId, onSync, handleTimerUpdate, handleSocketError,
  )

  useEffect(() => {
    Promise.all([api.getAuctionState(roomId), api.listItems(roomId), api.getChat(roomId)])
      .then(([s, i, c]) => {
        setState(s); setItems(i); setChat(c); setChatMessages(c)
        if (s.current_item) {
          const min = s.highest_bid ? s.highest_bid.amount + s.room.bid_increment : s.current_item.base_price
          setBidAmount(min)
        }
        if (s.room.status === 'ended') api.getReport(roomId).then(setReport)
      })
      .catch((e) => setError(e.message))
  }, [roomId, setChatMessages])

  useEffect(() => {
    if (!state?.current_item) { setBidAmount(0); return }
    setBidAmount(state.highest_bid
      ? state.highest_bid.amount + state.room.bid_increment
      : state.current_item.base_price)
  }, [state?.current_item, state?.current_item?.base_price, state?.highest_bid, state?.highest_bid?.amount, state?.room.bid_increment])

  useEffect(() => {
    if (state?.room.status !== 'ended' || report) return
    api.getReport(roomId).then(setReport).catch((e) => setError(e.message))
  }, [report, roomId, state?.room.status])

  useEffect(() => { if (chatMessages.length) setChat(chatMessages) }, [chatMessages])

  const handleAddItem = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const item = await api.addItem(roomId, { name: itemName, base_price: itemPrice })
      setItems((prev) => [...prev, item]); setItemName('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed to add item') }
  }

  const auctionAction = async (action: () => Promise<AuctionState>) => {
    try {
      const s = await action(); setState(s)
      if (s.room.status === 'ended') setReport(await api.getReport(roomId))
    } catch (err) { setError(err instanceof Error ? err.message : 'Action failed') }
  }

  const handleBid = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await api.placeBid(roomId, bidAmount)
      setState(await api.getAuctionState(roomId))
    } catch (err) { setError(err instanceof Error ? err.message : 'Bid failed') }
  }

  const handleChat = async (e: FormEvent) => {
    e.preventDefault()
    if (!chatText.trim()) return
    send('send_chat', { message: chatText.trim() }); setChatText('')
  }

  const minimumBid = state?.current_item
    ? (state.highest_bid ? state.highest_bid.amount + state.room.bid_increment : state.current_item.base_price)
    : 0
  const bidStep = state?.room.bid_increment || 1
  const maxTimer = state ? state.room.timer_seconds + state.room.auto_extend_seconds : 1
  const timerPercent = state ? Math.max(0, Math.min(100, (state.timer_remaining / maxTimer) * 100)) : 0
  const activeTeams = state?.teams.filter((team) => team.purse_remaining > 0).length ?? 0
  const recentChat = useMemo(() => chat.slice(-6), [chat])

  if (!state) return <div className="page"><div className="room-loading panel"><span className="loading-dot" />{error || 'Loading live arena…'}<Link to="/">← Dashboard</Link></div></div>

  const { room, current_item, highest_bid, timer_remaining, phase, teams } = state
  const isSetup = room.status === 'setup' || room.status === 'draft'
  const isLive = room.status === 'live' || room.status === 'paused'

  return (
    <div className="page room-page">
      <header className="room-topbar topbar">
        <div>
          <Link to="/" className="back-link">← Dashboard</Link>
          <div className="room-title-row">
            <div className="room-orb">AB</div>
            <div>
              <h1>{room.name}</h1>
              <p>ROOM <strong>{room.room_code}</strong> · <span className={`badge badge-${room.status}`}>{room.status}</span>{connected && <span className="live-dot"> ● LIVE SYNC</span>}</p>
            </div>
          </div>
        </div>
        {isLive && <div className="arena-signal"><span />REAL-TIME ARENA</div>}
      </header>

      {error && <p className="error">{error}</p>}

      {isSetup && (
        <section className="panel setup-arena">
          <div className="section-heading"><div><span className="eyebrow">PRE-AUCTION</span><h2>Build your player pool</h2></div><span className="room-count">{items.length} items</span></div>
          <form onSubmit={handleAddItem} className="inline-form setup-form">
            <input placeholder="Player / item name" value={itemName} onChange={(e) => setItemName(e.target.value)} required />
            <input type="number" min={0} value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} aria-label="Base price" />
            <button type="submit">＋ Add item</button>
          </form>
          <div className="setup-list">{items.map((item, index) => <div className="setup-item" key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.name}</strong><small>{item.base_price} · {item.status}</small></div>)}</div>
          {items.length > 0 && <button className="launch-button" onClick={() => auctionAction(() => api.startAuction(roomId))}>Launch Auction Arena →</button>}
        </section>
      )}

      {isLive && (
        <>
          <section className="arena-stats">
            <div><span>ROOM STATUS</span><strong>{room.status.toUpperCase()}</strong></div>
            <div><span>ACTIVE TEAMS</span><strong>{activeTeams}<small> / {teams.length}</small></strong></div>
            <div><span>ITEMS QUEUED</span><strong>{items.length}</strong></div>
            <div><span>CONNECTION</span><strong className="connected-value">● {connected ? 'ONLINE' : 'OFFLINE'}</strong></div>
          </section>

          <div className="auction-layout arena-layout">
            <main className="panel auction-main arena-card">
              <div className="arena-header"><div><span className="eyebrow">{phase.replace('_', ' ').toUpperCase()}</span><h2>LIVE AUCTION</h2></div><div className="connection-pill"><span /> WebSocket</div></div>

              <div className="timer-block arena-timer">
                <div className="timer-ring" style={{ '--timer-progress': `${timerPercent}%` } as React.CSSProperties}><span>{timer_remaining}</span><small>SEC</small></div>
                <div><span className="phase">BIDDING WINDOW</span><p>{timer_remaining > 10 ? 'Bids are open' : timer_remaining > 0 ? 'Closing soon' : 'Waiting for sync'}</p></div>
              </div>

              {current_item ? (
                <div className="current-item-card">
                  <div className="item-spotlight"><span className="spotlight-label">LOT {String(current_item.id).padStart(3, '0')}</span><div className="item-avatar">{current_item.name.slice(0, 2).toUpperCase()}</div></div>
                  <div className="item-info"><span className="eyebrow">CURRENT LOT</span><h3>{current_item.name}</h3><p>Base price <strong>{current_item.base_price}</strong></p></div>
                  <div className="bid-display"><span>CURRENT BID</span><strong>{highest_bid ? highest_bid.amount : current_item.base_price}</strong>{highest_bid && <small>Team #{highest_bid.team_id}</small>}</div>
                </div>
              ) : <div className="waiting-card"><span>◈</span><h3>Waiting for next item…</h3><p>The auction engine is ready for the next lot.</p></div>}

              {current_item && <form onSubmit={handleBid} className="bid-console">
                <div className="bid-input-wrap"><label htmlFor="bid">YOUR BID</label><input id="bid" type="number" min={minimumBid} step={bidStep} value={bidAmount} onChange={(e) => setBidAmount(Number(e.target.value))} /></div>
                <button type="button" className="btn-secondary step-button" onClick={() => setBidAmount(Math.max(minimumBid, bidAmount - bidStep))}>−</button>
                <button type="button" className="btn-secondary step-button" onClick={() => setBidAmount(Math.max(minimumBid, bidAmount + bidStep))}>＋</button>
                <button type="submit" className="place-bid-button">PLACE BID <span>↗</span></button>
              </form>}

              <div className="auction-controls"><button className="btn-secondary" onClick={() => auctionAction(() => api.pauseAuction(roomId))}>Ⅱ Pause</button><button className="btn-secondary" onClick={() => auctionAction(() => api.resumeAuction(roomId))}>▶ Resume</button><button className="btn-secondary" onClick={() => auctionAction(() => api.nextItem(roomId))}>Next lot →</button><button className="btn-danger" onClick={() => auctionAction(() => api.endAuction(roomId))}>End auction</button></div>
            </main>

            <aside className="arena-sidebar">
              <section className="panel team-panel"><div className="section-heading"><div><span className="eyebrow">LEADERBOARD</span><h3>Teams & purse</h3></div><span className="room-count">{teams.length}</span></div><div className="team-list">{teams.map((team, index) => <div className="team-row" key={team.id}><span className="team-rank">{String(index + 1).padStart(2, '0')}</span><div className="team-meta"><strong>{team.name}</strong><div className="purse-bar"><i style={{ width: `${team.purse_total ? Math.max(0, Math.min(100, (team.purse_remaining / team.purse_total) * 100)) : 0}%` }} /></div></div><span className="team-purse">{team.purse_remaining}<small> / {team.purse_total}</small></span></div>)}</div></section>

              <section className="panel chat-panel"><div className="section-heading"><div><span className="eyebrow">LIVE FEED</span><h3>Room chat</h3></div><span className="connection-pill"><span /> Live</span></div><div className="chat-box arena-chat">{recentChat.length ? recentChat.map((message) => <div key={message.id} className="chat-msg"><span className="chat-user">#{message.user_id}</span><p>{message.message}</p></div>) : <div className="chat-empty">No messages yet. Start the room conversation.</div>}</div><form onSubmit={handleChat} className="chat-input"><input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Send a message…" aria-label="Room message" /><button type="submit">↗</button></form></section>
            </aside>
          </div>
        </>
      )}

      {room.status === 'ended' && report && <section className="panel report-panel"><div className="eyebrow">SESSION COMPLETE</div><h2>Auction Report</h2><div className="report-stats"><div><span>SOLD</span><strong>{report.sold_count}</strong></div><div><span>UNSOLD</span><strong>{report.unsold_count}</strong></div><div><span>TOTAL SPEND</span><strong>{report.total_spend}</strong></div></div><div className="report-grid"><div><h3>Sold</h3><ul>{report.sold_items.map((item) => <li key={item.id}>{item.name}<strong>{item.sold_price}</strong></li>)}</ul></div><div><h3>Unsold</h3><ul>{report.unsold_items.map((item) => <li key={item.id}>{item.name}</li>)}</ul></div></div></section>}
    </div>
  )
}
