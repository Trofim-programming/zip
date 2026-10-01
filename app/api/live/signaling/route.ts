import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export type WhiteboardStroke = {
  id: string
  peerId: string
  userName: string
  color: string
  width: number
  tool: 'pen' | 'eraser' | 'line' | 'rect' | 'circle'
  points: { x: number; y: number }[]
  text?: string
}

export type Peer = {
  id: string
  userId?: string
  name: string
  role: 'organizer' | 'teacher' | 'student' | 'guest'
  mic: boolean
  cam: boolean
  screen: boolean
  hand: boolean
  canDraw: boolean
  isMutedByHost?: boolean
  lastSeen: number
}

export type SignalMessage = {
  id: string
  from: string
  to: string
  signal: any
  time: number
}

export type ChatMessage = {
  id: string
  author: string
  text: string
  time: string
  role?: string
}

export type RoomModeration = {
  organizerPeerId?: string
  allowMic: boolean
  allowCam: boolean
  allowScreen: boolean
  whiteboardOpen: boolean
  drawingAllowedPeerIds: string[]
  bannedPeerIds: string[]
}

export type RoomState = {
  peers: Map<string, Peer>
  signals: SignalMessage[]
  chat: ChatMessage[]
  moderation: RoomModeration
  whiteboardStrokes: WhiteboardStroke[]
  handQueue: string[] // peerIds in order
}

declare global {
  // eslint-disable-next-line no-var
  var _liveRooms: Map<string, RoomState> | undefined
}

if (!globalThis._liveRooms) {
  globalThis._liveRooms = new Map()
}

const rooms = globalThis._liveRooms

function getRoom(roomId: string): RoomState {
  let room = rooms.get(roomId)
  if (!room) {
    room = {
      peers: new Map(),
      signals: [],
      chat: [],
      moderation: {
        allowMic: true,
        allowCam: true,
        allowScreen: true,
        whiteboardOpen: false,
        drawingAllowedPeerIds: [],
        bannedPeerIds: [],
      },
      whiteboardStrokes: [],
      handQueue: [],
    }
    rooms.set(roomId, room)

    // Load initial strokes from DB if saved
    try {
      const db = getDb()
      const events = db
        .prepare('SELECT data_json FROM whiteboard_events WHERE session_id = ? ORDER BY created_at ASC')
        .all(roomId) as any[]
      for (const ev of events) {
        try {
          const parsed = JSON.parse(ev.data_json)
          room.whiteboardStrokes.push(parsed)
        } catch {}
      }
    } catch {}
  }
  return room
}

function cleanInactivePeers(room: RoomState) {
  const now = Date.now()
  const timeoutMs = 15000 // 15s without heartbeat = disconnect
  for (const [peerId, peer] of room.peers.entries()) {
    if (now - peer.lastSeen > timeoutMs) {
      room.peers.delete(peerId)
      room.signals = room.signals.filter((s) => s.from !== peerId && s.to !== peerId)
      room.handQueue = room.handQueue.filter((id) => id !== peerId)
      room.moderation.drawingAllowedPeerIds = room.moderation.drawingAllowedPeerIds.filter((id) => id !== peerId)
    }
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId') || 'codelab-room'
  const peerId = searchParams.get('peerId')

  if (!peerId) {
    return NextResponse.json({ error: 'peerId is required' }, { status: 400 })
  }

  const room = getRoom(roomId)
  cleanInactivePeers(room)

  if (room.moderation.bannedPeerIds.includes(peerId)) {
    return NextResponse.json({ error: 'Вы были исключены организатором из этого занятия', banned: true }, { status: 403 })
  }

  const currentPeer = room.peers.get(peerId)
  if (currentPeer) {
    currentPeer.lastSeen = Date.now()
  }

  // Pending WebRTC signals for this peer
  const pendingSignals = room.signals.filter((s) => s.to === peerId)
  room.signals = room.signals.filter((s) => s.to !== peerId)

  const activePeers = Array.from(room.peers.values()).map((p) => ({
    id: p.id,
    userId: p.userId,
    name: p.name,
    role: p.role,
    mic: p.mic,
    cam: p.cam,
    screen: p.screen,
    hand: p.hand,
    canDraw: p.canDraw || p.role === 'organizer' || p.role === 'teacher',
    isMutedByHost: p.isMutedByHost || false,
  }))

  return NextResponse.json({
    success: true,
    peers: activePeers,
    signals: pendingSignals,
    chat: room.chat.slice(-50),
    moderation: {
      organizerPeerId: room.moderation.organizerPeerId,
      allowMic: room.moderation.allowMic,
      allowCam: room.moderation.allowCam,
      allowScreen: room.moderation.allowScreen,
      whiteboardOpen: room.moderation.whiteboardOpen,
      drawingAllowedPeerIds: room.moderation.drawingAllowedPeerIds,
    },
    whiteboardStrokes: room.whiteboardStrokes,
    handQueue: room.handQueue,
    isMutedByHost: currentPeer?.isMutedByHost || false,
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, roomId = 'codelab-room', peerId } = body

    if (!peerId && action !== 'chat') {
      return NextResponse.json({ error: 'peerId is required' }, { status: 400 })
    }

    const room = getRoom(roomId)
    cleanInactivePeers(room)

    if (room.moderation.bannedPeerIds.includes(peerId)) {
      return NextResponse.json({ error: 'Доступ запрещён: вас исключили', banned: true }, { status: 403 })
    }

    // 1. JOIN
    if (action === 'join') {
      const {
        name = 'Участник',
        role = 'student',
        userId,
        mic = false,
        cam = false,
        isOrganizer = false,
      } = body

      const actualRole: 'organizer' | 'teacher' | 'student' | 'guest' =
        isOrganizer || role === 'admin' ? 'organizer' : role === 'teacher' ? 'teacher' : 'student'

      if (actualRole === 'organizer' || !room.moderation.organizerPeerId) {
        room.moderation.organizerPeerId = peerId
      }

      const canDraw = actualRole === 'organizer' || actualRole === 'teacher'
      if (canDraw && !room.moderation.drawingAllowedPeerIds.includes(peerId)) {
        room.moderation.drawingAllowedPeerIds.push(peerId)
      }

      room.peers.set(peerId, {
        id: peerId,
        userId,
        name,
        role: actualRole,
        mic: room.moderation.allowMic ? mic : false,
        cam: room.moderation.allowCam ? cam : false,
        screen: false,
        hand: false,
        canDraw,
        lastSeen: Date.now(),
      })

      const roleBadge = actualRole === 'organizer' ? ' (Организатор)' : actualRole === 'teacher' ? ' (Преподаватель)' : ''
      room.chat.push({
        id: crypto.randomUUID(),
        author: 'Система',
        text: `${name}${roleBadge} присоединился к звонку`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      })

      return NextResponse.json({ success: true, isOrganizer: actualRole === 'organizer' })
    }

    // 2. STATE UPDATE
    if (action === 'state') {
      const peer = room.peers.get(peerId)
      if (peer) {
        if (typeof body.mic === 'boolean') {
          // If muted by host and trying to unmute without host permission, reject
          if (peer.isMutedByHost && body.mic && !room.moderation.allowMic) {
            peer.mic = false
          } else {
            if (body.mic) peer.isMutedByHost = false
            peer.mic = body.mic
          }
        }
        if (typeof body.cam === 'boolean') peer.cam = room.moderation.allowCam ? body.cam : false
        if (typeof body.screen === 'boolean') peer.screen = room.moderation.allowScreen ? body.screen : false
        if (typeof body.hand === 'boolean') {
          peer.hand = body.hand
          if (body.hand) {
            if (!room.handQueue.includes(peerId)) {
              room.handQueue.push(peerId)
              room.chat.push({
                id: crypto.randomUUID(),
                author: 'Система',
                text: `✋ ${peer.name} поднял руку`,
                time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
              })
            }
          } else {
            room.handQueue = room.handQueue.filter((id) => id !== peerId)
          }
        }
        peer.lastSeen = Date.now()
      }
      return NextResponse.json({ success: true })
    }

    // 3. WEBRTC SIGNAL
    if (action === 'signal') {
      const { toPeerId, signal } = body
      if (!toPeerId || !signal) {
        return NextResponse.json({ error: 'toPeerId and signal required' }, { status: 400 })
      }
      room.signals.push({
        id: crypto.randomUUID(),
        from: peerId,
        to: toPeerId,
        signal,
        time: Date.now(),
      })
      return NextResponse.json({ success: true })
    }

    // 4. CHAT
    if (action === 'chat') {
      const { author = 'Пользователь', text = '', role } = body
      if (text.trim()) {
        room.chat.push({
          id: crypto.randomUUID(),
          author,
          text: text.trim(),
          role,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
        if (room.chat.length > 250) room.chat.shift()
      }
      return NextResponse.json({ success: true })
    }

    // 5. ORGANIZER / MODERATION ACTIONS
    const senderPeer = room.peers.get(peerId)
    const isSenderAuthorized =
      senderPeer?.role === 'organizer' || senderPeer?.role === 'teacher' || room.moderation.organizerPeerId === peerId

    if (action === 'mute_peer') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const targetPeer = room.peers.get(body.targetPeerId)
      if (targetPeer) {
        targetPeer.mic = false
        targetPeer.isMutedByHost = true
        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `🔇 Организатор отключил микрофон участнику ${targetPeer.name}`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'kick_peer') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const targetPeer = room.peers.get(body.targetPeerId)
      if (targetPeer) {
        room.moderation.bannedPeerIds.push(body.targetPeerId)
        room.peers.delete(body.targetPeerId)
        room.signals = room.signals.filter((s) => s.from !== body.targetPeerId && s.to !== body.targetPeerId)
        room.handQueue = room.handQueue.filter((id) => id !== body.targetPeerId)
        room.moderation.drawingAllowedPeerIds = room.moderation.drawingAllowedPeerIds.filter((id) => id !== body.targetPeerId)
        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `🚫 ${targetPeer.name} был удалён из звонка организатором`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'toggle_permission') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const { permission, value } = body
      if (permission === 'allowMic') {
        room.moderation.allowMic = !!value
        if (!value) {
          // Mute all students
          for (const p of room.peers.values()) {
            if (p.role === 'student' || p.role === 'guest') p.mic = false
          }
        }
      } else if (permission === 'allowCam') {
        room.moderation.allowCam = !!value
        if (!value) {
          for (const p of room.peers.values()) {
            if (p.role === 'student' || p.role === 'guest') p.cam = false
          }
        }
      } else if (permission === 'allowScreen') {
        room.moderation.allowScreen = !!value
      }
      return NextResponse.json({ success: true, moderation: room.moderation })
    }

    // WHITEBOARD MODERATION
    if (action === 'open_board') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      room.moderation.whiteboardOpen = true
      room.chat.push({
        id: crypto.randomUUID(),
        author: 'Система',
        text: `🎨 Организатор открыл интерактивную доску для занятия`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'close_board') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      room.moderation.whiteboardOpen = false
      room.chat.push({
        id: crypto.randomUUID(),
        author: 'Система',
        text: `⏹️ Интерактивная доска закрыта организатором`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'grant_draw') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const { targetPeerId } = body
      if (!room.moderation.drawingAllowedPeerIds.includes(targetPeerId)) {
        room.moderation.drawingAllowedPeerIds.push(targetPeerId)
      }
      const targetPeer = room.peers.get(targetPeerId)
      if (targetPeer) {
        targetPeer.canDraw = true
        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `✏️ Участнику ${targetPeer.name} предоставлено право рисовать на доске`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'revoke_draw') {
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const { targetPeerId } = body
      room.moderation.drawingAllowedPeerIds = room.moderation.drawingAllowedPeerIds.filter((id) => id !== targetPeerId)
      const targetPeer = room.peers.get(targetPeerId)
      if (targetPeer) {
        targetPeer.canDraw = false
        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `🔒 Право рисования для ${targetPeer.name} отозвано организатором`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'call_to_board') {
      // Call student to board (feature 4 from user prompt!)
      if (!isSenderAuthorized) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
      const { targetPeerId } = body
      const targetPeer = room.peers.get(targetPeerId)
      if (targetPeer) {
        // Open whiteboard if not open
        room.moderation.whiteboardOpen = true
        // Grant draw permission
        if (!room.moderation.drawingAllowedPeerIds.includes(targetPeerId)) {
          room.moderation.drawingAllowedPeerIds.push(targetPeerId)
        }
        targetPeer.canDraw = true
        // Lower their hand
        targetPeer.hand = false
        room.handQueue = room.handQueue.filter((id) => id !== targetPeerId)

        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `🎯 Организатор вызвал к доске: ${targetPeer.name}! Доска открыта для работы.`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true })
    }

    // 6. WHITEBOARD DRAWING STROKES
    if (action === 'board_stroke') {
      const peer = room.peers.get(peerId)
      const allowed =
        peer?.role === 'organizer' ||
        peer?.role === 'teacher' ||
        room.moderation.drawingAllowedPeerIds.includes(peerId)

      if (!allowed) {
        return NextResponse.json({ error: 'У вас нет разрешения рисовать на доске' }, { status: 403 })
      }

      const stroke = body.stroke as WhiteboardStroke
      if (stroke) {
        room.whiteboardStrokes.push(stroke)
        // Keep max 1500 strokes in memory
        if (room.whiteboardStrokes.length > 1500) room.whiteboardStrokes.shift()

        // Persist to DB asynchronously
        try {
          const db = getDb()
          const eventId = `wbe_${crypto.randomUUID()}`
          db.prepare(`
            INSERT INTO whiteboard_events (id, session_id, user_id, user_name, event_type, data_json, created_at)
            VALUES (?, ?, ?, ?, 'stroke', ?, ?)
          `).run(eventId, roomId, peerId, peer?.name || 'User', JSON.stringify(stroke), new Date().toISOString())
        } catch {}
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'board_clear') {
      const peer = room.peers.get(peerId)
      const allowed =
        peer?.role === 'organizer' ||
        peer?.role === 'teacher' ||
        room.moderation.drawingAllowedPeerIds.includes(peerId)

      if (!allowed) {
        return NextResponse.json({ error: 'У вас нет прав очищать доску' }, { status: 403 })
      }

      room.whiteboardStrokes = []
      try {
        const db = getDb()
        db.prepare('DELETE FROM whiteboard_events WHERE session_id = ?').run(roomId)
      } catch {}

      room.chat.push({
        id: crypto.randomUUID(),
        author: 'Система',
        text: `🧹 ${peer?.name || 'Пользователь'} очистил доску`,
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      })
      return NextResponse.json({ success: true })
    }

    // 7. LEAVE
    if (action === 'leave') {
      const peer = room.peers.get(peerId)
      if (peer) {
        room.peers.delete(peerId)
        room.signals = room.signals.filter((s) => s.from !== peerId && s.to !== peerId)
        room.handQueue = room.handQueue.filter((id) => id !== peerId)
        room.moderation.drawingAllowedPeerIds = room.moderation.drawingAllowedPeerIds.filter((id) => id !== peerId)
        room.chat.push({
          id: crypto.randomUUID(),
          author: 'Система',
          text: `${peer.name} покинул звонок`,
          time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        })
      }
      return NextResponse.json({ success: true, message: 'Left room' })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('Signaling error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
