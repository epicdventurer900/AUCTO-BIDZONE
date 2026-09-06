import { useCallback, useEffect, useRef, useState } from 'react'
import { getWsUrl } from '../api/client'
import type { AuctionState, ChatMessage } from '../api/types'

interface WsEvent {
  event: string
  data: Record<string, unknown>
}

interface TimerUpdate {
  remaining: number
  phase: string
}

function isRoomRefreshEvent(event: string) {
  return ['auction_status', 'new_bid', 'player_update', 'user_status'].includes(event)
}

export function useRoomSocket(
  roomId: number,
  onSync: (state: AuctionState) => void,
  onTimerUpdate?: (update: TimerUpdate) => void,
  onError?: (message: string) => void,
) {
  const [connected, setConnected] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const send = useCallback((event: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }))
    }
  }, [])

  useEffect(() => {
    const ws = new WebSocket(getWsUrl(roomId))
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ event: 'request_sync', data: {} }))
    }
    ws.onclose = () => setConnected(false)
    ws.onmessage = (msg) => {
      const payload = JSON.parse(msg.data) as WsEvent
      if (payload.event === 'sync') {
        onSync(payload.data as unknown as AuctionState)
      } else if (payload.event === 'chat_message') {
        const d = payload.data
        setChatMessages((prev) => [
          ...prev,
          {
            id: d.id as number,
            room_id: roomId,
            user_id: d.user_id as number,
            message: d.message as string,
            created_at: d.created_at as string,
          },
        ])
      } else if (payload.event === 'timer_update') {
        onTimerUpdate?.({
          remaining: Number(payload.data.remaining ?? 0),
          phase: String(payload.data.phase ?? 'idle'),
        })
      } else if (payload.event === 'error') {
        onError?.(String(payload.data.message ?? 'WebSocket error'))
      } else if (isRoomRefreshEvent(payload.event) && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'request_sync', data: {} }))
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [roomId, onError, onSync, onTimerUpdate])

  return { connected, send, chatMessages, setChatMessages }
}
