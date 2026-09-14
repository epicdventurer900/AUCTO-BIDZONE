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
  return ['auction_status', 'new_bid', 'player_update'].includes(event)
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
  const onSyncRef = useRef(onSync)
  const onTimerUpdateRef = useRef(onTimerUpdate)
  const onErrorRef = useRef(onError)
  const syncScheduledRef = useRef(false)

  useEffect(() => {
    onSyncRef.current = onSync
  }, [onSync])

  useEffect(() => {
    onTimerUpdateRef.current = onTimerUpdate
  }, [onTimerUpdate])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const send = useCallback((event: string, data: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }))
    }
  }, [])

  useEffect(() => {
    const ws = new WebSocket(getWsUrl(roomId))
    wsRef.current = ws
    let disposed = false

    const requestSync = () => {
      if (disposed || syncScheduledRef.current || ws.readyState !== WebSocket.OPEN) return
      syncScheduledRef.current = true
      window.setTimeout(() => {
        syncScheduledRef.current = false
        if (!disposed && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: 'request_sync', data: {} }))
        }
      }, 50)
    }

    ws.onopen = () => {
      if (disposed) return
      setConnected(true)
      ws.send(JSON.stringify({ event: 'request_sync', data: {} }))
    }

    ws.onclose = () => {
      if (!disposed) setConnected(false)
    }

    ws.onerror = () => {
      if (!disposed) onErrorRef.current?.('WebSocket connection error')
    }

    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data) as WsEvent
        if (payload.event === 'sync') {
          onSyncRef.current(payload.data as unknown as AuctionState)
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
          onTimerUpdateRef.current?.({
            remaining: Number(payload.data.remaining ?? 0),
            phase: String(payload.data.phase ?? 'idle'),
          })
        } else if (payload.event === 'error') {
          onErrorRef.current?.(String(payload.data.message ?? 'WebSocket error'))
        } else if (isRoomRefreshEvent(payload.event)) {
          requestSync()
        }
      } catch {
        onErrorRef.current?.('Received an invalid WebSocket message')
      }
    }

    return () => {
      disposed = true
      syncScheduledRef.current = false
      if (wsRef.current === ws) wsRef.current = null
      ws.close()
    }
  }, [roomId])

  return { connected, send, chatMessages, setChatMessages }
}
