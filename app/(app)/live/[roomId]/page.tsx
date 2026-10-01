'use client'

import React, { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  Share2,
  Lock,
  Maximize2,
  Minimize2,
  Pencil,
  Volume2,
  VolumeX,
  UserX,
  UserCheck,
  Send,
  Sparkles,
  Shield,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useSchool } from '@/lib/store'
import { SyncedBoard, WhiteboardStroke } from '@/components/board/synced-board'
import { Badge } from '@/components/kit'
import { cn } from '@/lib/utils'

type Peer = {
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
}

type ChatMessage = {
  id: string
  author: string
  text: string
  time: string
  role?: string
}

type RoomModeration = {
  organizerPeerId?: string
  allowMic: boolean
  allowCam: boolean
  allowScreen: boolean
  whiteboardOpen: boolean
  drawingAllowedPeerIds: string[]
}

export default function ConferenceRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = use(params)
  const router = useRouter()
  const { user } = useSchool()

  // Local user identity
  const [peerId] = useState(() => `peer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`)
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Гость'
  const isOrganizerUser = user?.role === 'admin' || user?.role === 'teacher'

  // Room state from signaling
  const [peers, setPeers] = useState<Peer[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [moderation, setModeration] = useState<RoomModeration>({
    allowMic: true,
    allowCam: true,
    allowScreen: true,
    whiteboardOpen: false,
    drawingAllowedPeerIds: [],
  })
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([])
  const [handQueue, setHandQueue] = useState<string[]>([])
  const [isBanned, setIsBanned] = useState(false)
  const [isMutedByHost, setIsMutedByHost] = useState(false)

  // Local media state
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // UI Panels
  const [activeDrawer, setActiveDrawer] = useState<'participants' | 'chat' | null>(null)
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // 1. Initialize local media
  useEffect(() => {
    let stream: MediaStream | null = null
    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (err) {
        console.warn('getUserMedia error (running in fallback mode):', err)
      }
    }
    initMedia()

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // 2. Signaling loop (heartbeat, peers, chat, moderation, strokes)
  useEffect(() => {
    let isSubscribed = true

    // Join room
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        roomId,
        peerId,
        name: userName,
        role: user?.role || 'student',
        userId: user?.id,
        mic: micOn,
        cam: camOn,
        isOrganizer: isOrganizerUser,
      }),
    }).catch(console.error)

    const poll = async () => {
      if (!isSubscribed) return
      try {
        const res = await fetch(`/api/live/signaling?roomId=${roomId}&peerId=${peerId}`)
        if (res.status === 403) {
          setIsBanned(true)
          return
        }
        const data = await res.json()
        if (data.success && isSubscribed) {
          setPeers(data.peers || [])
          setModeration(data.moderation || {})
          setWhiteboardStrokes(data.whiteboardStrokes || [])
          setHandQueue(data.handQueue || [])

          if (data.isMutedByHost) {
            setIsMutedByHost(true)
            if (micOn) toggleMic(false)
          }

          if (data.chat) {
            setChatMessages((prev) => {
              if (prev.length < data.chat.length && activeDrawer !== 'chat') {
                setUnreadChatCount((c) => c + (data.chat.length - prev.length))
              }
              return data.chat
            })
          }
        }
      } catch (err) {
        // network retry
      }
    }

    const interval = setInterval(poll, 1500)
    poll()

    return () => {
      isSubscribed = false
      clearInterval(interval)
      // Leave room
      fetch('/api/live/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId, peerId }),
      }).catch(console.error)
    }
  }, [roomId, peerId, userName, user?.role, user?.id, isOrganizerUser])

  // Sync local mic/cam/hand state to server
  const sendLocalState = (newMic: boolean, newCam: boolean, newScreen: boolean, newHand: boolean) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'state',
        roomId,
        peerId,
        mic: newMic,
        cam: newCam,
        screen: newScreen,
        hand: newHand,
      }),
    }).catch(console.error)
  }

  // Toggle Mic
  const toggleMic = (forceState?: boolean) => {
    const nextState = forceState !== undefined ? forceState : !micOn
    if (nextState && !moderation.allowMic && !isOrganizerUser) {
      alert('Организатор отключил микрофоны для участников')
      return
    }
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = nextState))
    }
    setMicOn(nextState)
    sendLocalState(nextState, camOn, screenSharing, handRaised)
  }

  // Toggle Cam
  const toggleCam = () => {
    const nextState = !camOn
    if (nextState && !moderation.allowCam && !isOrganizerUser) {
      alert('Организатор отключил камеры для участников')
      return
    }
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = nextState))
    }
    setCamOn(nextState)
    sendLocalState(micOn, nextState, screenSharing, handRaised)
  }

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!moderation.allowScreen && !isOrganizerUser) {
      alert('Демонстрация экрана отключена организатором')
      return
    }

    if (screenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
      }
      setScreenSharing(false)
      sendLocalState(micOn, camOn, false, handRaised)
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        screenStreamRef.current = stream
        setScreenSharing(true)
        sendLocalState(micOn, camOn, true, handRaised)
        stream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false)
          sendLocalState(micOn, camOn, false, handRaised)
        }
      } catch (err) {
        console.warn('Screen share canceled or failed:', err)
      }
    }
  }

  // Toggle Raise Hand
  const toggleHand = () => {
    const nextHand = !handRaised
    setHandRaised(nextHand)
    sendLocalState(micOn, camOn, screenSharing, nextHand)
  }

  // Send Chat message
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim()) return

    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat',
        roomId,
        peerId,
        author: userName,
        role: isOrganizerUser ? 'Организатор' : 'Ученик',
        text: chatInput.trim(),
      }),
    }).catch(console.error)

    setChatInput('')
  }

  // Whiteboard Actions
  const handleOpenBoard = () => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'open_board', roomId, peerId }),
    }).catch(console.error)
  }

  const handleCloseBoard = () => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close_board', roomId, peerId }),
    }).catch(console.error)
  }

  const handleSendStroke = (stroke: WhiteboardStroke) => {
    setWhiteboardStrokes((prev) => [...prev, stroke])
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'board_stroke', roomId, peerId, stroke }),
    }).catch(console.error)
  }

  const handleClearBoard = () => {
    setWhiteboardStrokes([])
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'board_clear', roomId, peerId }),
    }).catch(console.error)
  }

  const handleGrantDraw = (targetPeerId: string) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'grant_draw', roomId, peerId, targetPeerId }),
    }).catch(console.error)
  }

  const handleRevokeDraw = (targetPeerId: string) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke_draw', roomId, peerId, targetPeerId }),
    }).catch(console.error)
  }

  const handleCallToBoard = (targetPeerId: string) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'call_to_board', roomId, peerId, targetPeerId }),
    }).catch(console.error)
  }

  // Organizer Moderation Actions
  const handleMutePeer = (targetPeerId: string) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mute_peer', roomId, peerId, targetPeerId }),
    }).catch(console.error)
  }

  const handleKickPeer = (targetPeerId: string) => {
    if (confirm('Вы уверены, что хотите удалить этого участника из звонка?')) {
      fetch('/api/live/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick_peer', roomId, peerId, targetPeerId }),
      }).catch(console.error)
    }
  }

  const handleToggleRoomPermission = (permission: string, value: boolean) => {
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_permission', roomId, peerId, permission, value }),
    }).catch(console.error)
  }

  const copyRoomLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleLeaveRoom = () => {
    router.push('/live')
  }

  // Determine drawing permission for current user
  const canLocalDraw =
    isOrganizerUser ||
    moderation.drawingAllowedPeerIds.includes(peerId)

  // Banned state overlay
  if (isBanned) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Доступ к занятию закрыт</h2>
        <p className="mt-1 max-w-sm text-xs text-white/50">
          Вы были удалены организатором из этого звонка.
        </p>
        <button
          onClick={() => router.push('/live')}
          className="mt-6 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/90"
        >
          Вернуться в лобби
        </button>
      </div>
    )
  }

  const remotePeers = peers.filter((p) => p.id !== peerId)

  return (
    <div className="relative flex h-[calc(100vh-5rem)] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070709]">
      {/* Top Header Bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#0c0c10]/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-white">
              {roomId === 'room_algo_101' ? 'Разбор алгоритмов и деревьев' : `Занятие: ${roomId}`}
            </span>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="font-mono text-xs text-white/50">{formatTimer(elapsedSeconds)}</span>
            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">
              {isOrganizerUser ? 'Вы — Организатор' : 'Участник'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy link button */}
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {copiedLink ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Скопировано' : 'Пригласить'}</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            title="Во весь экран"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>
        </div>
      </div>

      {/* Main Stage: Video Grid OR Shared Whiteboard */}
      <div className="relative flex flex-1 overflow-hidden">
        {moderation.whiteboardOpen ? (
          /* Collaborative Whiteboard Active */
          <div className="flex h-full w-full flex-col lg:flex-row">
            {/* Board Canvas */}
            <div className="flex-1 p-2 sm:p-3">
              <SyncedBoard
                roomId={roomId}
                peerId={peerId}
                userName={userName}
                userRole={isOrganizerUser ? 'organizer' : 'student'}
                canDraw={canLocalDraw}
                isOrganizer={isOrganizerUser}
                strokes={whiteboardStrokes}
                handQueue={handQueue}
                peers={peers}
                onSendStroke={handleSendStroke}
                onClearBoard={handleClearBoard}
                onCloseBoard={isOrganizerUser ? handleCloseBoard : undefined}
                onGrantDraw={handleGrantDraw}
                onRevokeDraw={handleRevokeDraw}
                onCallToBoard={handleCallToBoard}
                onRaiseHand={toggleHand}
                hasHandRaised={handRaised}
                className="h-full w-full"
              />
            </div>

            {/* Video strip beside board */}
            <div className="hidden w-56 shrink-0 flex-col gap-2 overflow-y-auto border-l border-white/[0.08] bg-[#0a0a0e] p-2.5 lg:flex">
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                Видеопотоки ({peers.length})
              </div>

              {/* Local Tile Mini */}
              <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#121217]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    'h-full w-full object-cover -scale-x-100',
                    !camOn && 'opacity-0'
                  )}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#101014] text-xs text-white/40 font-medium">
                    {userName[0]}
                  </div>
                )}
                <div className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
                  <span>Вы</span>
                  {!micOn && <MicOff className="size-2.5 text-rose-400" />}
                </div>
              </div>

              {/* Remote Tiles Mini */}
              {remotePeers.map((p) => (
                <div
                  key={p.id}
                  className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[#121217]"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-[#101014] text-xs font-semibold text-white/50">
                    {p.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="absolute bottom-1 left-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur">
                    <span className="truncate max-w-[80px]">{p.name}</span>
                    {!p.mic && <MicOff className="size-2.5 text-rose-400" />}
                    {p.hand && <span className="text-amber-400 text-[10px]">✋</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Normal Video Conference Grid */
          <div className="flex-1 overflow-y-auto p-4">
            <div
              className={cn(
                'grid h-full w-full gap-3 sm:gap-4',
                peers.length <= 1
                  ? 'grid-cols-1'
                  : peers.length <= 4
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-2 lg:grid-cols-3'
              )}
            >
              {/* Local Participant Card */}
              <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-[#101014] shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    'h-full w-full object-cover -scale-x-100 transition-opacity',
                    !camOn && 'opacity-0'
                  )}
                />
                {!camOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0d11]">
                    <div className="flex size-16 items-center justify-center rounded-full bg-white/[0.05] text-lg font-bold text-white/70">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-white/40">Камера отключена</span>
                  </div>
                )}

                {/* Hand Raised Banner */}
                {handRaised && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md animate-bounce">
                    <Hand className="size-3.5" />
                    <span>Вы подняли руку</span>
                  </div>
                )}

                {/* Status Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-md">
                    <span className="font-medium">Вы {isOrganizerUser ? '(Организатор)' : ''}</span>
                    {canLocalDraw && (
                      <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[10px] text-sky-300">
                        Доска
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!micOn && (
                      <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 backdrop-blur-md">
                        <MicOff className="size-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Remote Participant Cards */}
              {remotePeers.map((p) => (
                <div
                  key={p.id}
                  className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#101014] shadow-lg"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#0d0d11]">
                    <div className="flex size-16 items-center justify-center rounded-full bg-white/[0.05] text-lg font-bold text-white/70">
                      {p.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <span className="text-xs text-white/40">{p.name}</span>
                  </div>

                  {/* Remote Hand Raised */}
                  {p.hand && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 backdrop-blur-md">
                      <Hand className="size-3.5" />
                      <span>Поднял руку</span>
                    </div>
                  )}

                  {/* Bottom overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-md">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[10px] text-white/50">
                        {p.role === 'organizer' ? 'Организатор' : p.role === 'teacher' ? 'Учитель' : 'Ученик'}
                      </span>
                      {p.canDraw && (
                        <span className="rounded bg-sky-500/20 px-1 py-0.2 text-[10px] text-sky-300">
                          Доска
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!p.mic && (
                        <div className="flex size-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 backdrop-blur-md">
                          <MicOff className="size-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty slot placeholder if solo */}
              {remotePeers.length === 0 && (
                <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] p-6 text-center">
                  <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-white/40">
                    <Users className="size-6" />
                  </div>
                  <div className="text-xs font-medium text-white/80">Ожидание подключения участников</div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Отправьте ссылку на занятие, чтобы пригласить студентов или преподавателя
                  </p>
                  <button
                    onClick={copyRoomLink}
                    className="mt-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Share2 className="size-3.5" />
                    <span>{copiedLink ? 'Ссылка скопирована' : 'Скопировать приглашение'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Side Drawer: Participants or Chat */}
        {activeDrawer && (
          <div className="w-80 shrink-0 border-l border-white/[0.08] bg-[#0c0c10] flex flex-col">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2">
                {activeDrawer === 'participants' ? (
                  <>
                    <Users className="size-4 text-white" />
                    <span className="text-xs font-semibold text-white">
                      Участники ({peers.length})
                    </span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="size-4 text-white" />
                    <span className="text-xs font-semibold text-white">Чат занятия</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setActiveDrawer(null)}
                className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Drawer Body */}
            {activeDrawer === 'participants' ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Hand Queue for Organizer */}
                {isOrganizerUser && handQueue.length > 0 && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Hand className="size-3.5" />
                      <span>Поднятые руки ({handQueue.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {handQueue.map((hId) => {
                        const peer = peers.find((p) => p.id === hId)
                        if (!peer) return null
                        return (
                          <div
                            key={hId}
                            className="flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5 text-xs text-white"
                          >
                            <span className="truncate max-w-[110px]">{peer.name}</span>
                            <button
                              onClick={() => handleCallToBoard(hId)}
                              className="flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-black hover:bg-amber-400"
                            >
                              <UserCheck className="size-3" />
                              <span>К доске</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Organizer Global Controls */}
                {isOrganizerUser && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                      Управление доступом
                    </div>

                    <div className="space-y-1.5 text-xs text-white/80">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Разрешить микрофон</span>
                        <input
                          type="checkbox"
                          checked={moderation.allowMic}
                          onChange={(e) =>
                            handleToggleRoomPermission('allowMic', e.target.checked)
                          }
                          className="rounded border-white/20 bg-black/40 text-white"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Разрешить камеру</span>
                        <input
                          type="checkbox"
                          checked={moderation.allowCam}
                          onChange={(e) =>
                            handleToggleRoomPermission('allowCam', e.target.checked)
                          }
                          className="rounded border-white/20 bg-black/40 text-white"
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Демонстрация экрана</span>
                        <input
                          type="checkbox"
                          checked={moderation.allowScreen}
                          onChange={(e) =>
                            handleToggleRoomPermission('allowScreen', e.target.checked)
                          }
                          className="rounded border-white/20 bg-black/40 text-white"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Participants List */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                    В комнате
                  </div>

                  {peers.map((p) => {
                    const isSelf = p.id === peerId
                    return (
                      <div
                        key={p.id}
                        className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-xs text-white"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                            {p.name[0]}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className="font-medium truncate">{p.name}</span>
                              {isSelf && <span className="text-[10px] text-white/40">(Вы)</span>}
                            </div>
                            <div className="text-[10px] text-white/50">
                              {p.role === 'organizer'
                                ? 'Организатор'
                                : p.role === 'teacher'
                                ? 'Преподаватель'
                                : 'Ученик'}
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center gap-1">
                          {p.hand && <span className="text-amber-400">✋</span>}

                          {isOrganizerUser && !isSelf && (
                            <>
                              <button
                                onClick={() => handleMutePeer(p.id)}
                                title="Выключить микрофон"
                                className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-rose-400"
                              >
                                <VolumeX className="size-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  p.canDraw ? handleRevokeDraw(p.id) : handleGrantDraw(p.id)
                                }
                                title={p.canDraw ? 'Отозвать доску' : 'Дать право рисовать'}
                                className={cn(
                                  'rounded p-1 transition-colors',
                                  p.canDraw
                                    ? 'text-emerald-400 hover:text-emerald-300'
                                    : 'text-white/40 hover:text-white'
                                )}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                onClick={() => handleKickPeer(p.id)}
                                title="Удалить из звонка"
                                className="rounded p-1 text-white/40 hover:bg-rose-500/20 hover:text-rose-400"
                              >
                                <UserX className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* Chat Tab */
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {chatMessages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-white/40">
                      Сообщений пока нет. Начните общение в чате!
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="rounded-lg bg-white/[0.03] p-2.5 text-xs text-white/90">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-white/40">
                          <span className="font-semibold text-white/70">{msg.author}</span>
                          <span>{msg.time}</span>
                        </div>
                        <p className="text-white/90 break-words">{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="border-t border-white/[0.08] p-3 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Написать сообщение..."
                    className="flex-1 rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-white/90"
                  >
                    <Send className="size-3.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Floating Control Dock (Apple Liquid Dark Glass style) */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#0a0a0d]/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Left: Device Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mic */}
            <button
              onClick={() => toggleMic()}
              disabled={!moderation.allowMic && !isOrganizerUser}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                micOn
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30',
                !moderation.allowMic && !isOrganizerUser && 'opacity-40 cursor-not-allowed'
              )}
              title={micOn ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              <span className="hidden sm:inline">{micOn ? 'Микрофон' : 'Выкл'}</span>
            </button>

            {/* Video */}
            <button
              onClick={toggleCam}
              disabled={!moderation.allowCam && !isOrganizerUser}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                camOn
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30',
                !moderation.allowCam && !isOrganizerUser && 'opacity-40 cursor-not-allowed'
              )}
              title={camOn ? 'Выключить камеру' : 'Включить камеру'}
            >
              {camOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
              <span className="hidden sm:inline">{camOn ? 'Камера' : 'Выкл'}</span>
            </button>

            {/* Screen Share */}
            <button
              onClick={toggleScreenShare}
              disabled={!moderation.allowScreen && !isOrganizerUser}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                screenSharing
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20',
                !moderation.allowScreen && !isOrganizerUser && 'opacity-40 cursor-not-allowed'
              )}
              title="Демонстрация экрана"
            >
              <Monitor className="size-4" />
              <span className="hidden md:inline">Экран</span>
            </button>
          </div>

          {/* Center: Collaboration Tools (Board & Hand) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Whiteboard Toggle */}
            {isOrganizerUser ? (
              <button
                onClick={moderation.whiteboardOpen ? handleCloseBoard : handleOpenBoard}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150',
                  moderation.whiteboardOpen
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border border-white/15 bg-white/10 text-white hover:bg-white/20'
                )}
                title="Интерактивная совместная доска"
              >
                <Pencil className="size-4" />
                <span className="hidden sm:inline">
                  {moderation.whiteboardOpen ? 'Закрыть доску' : 'Открыть доску'}
                </span>
              </button>
            ) : (
              moderation.whiteboardOpen && (
                <div className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300">
                  <Pencil className="size-3.5" />
                  <span>Доска открыта</span>
                </div>
              )
            )}

            {/* Raise Hand Toggle */}
            <button
              onClick={toggleHand}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                handRaised
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
              title="Поднять / опустить руку"
            >
              <Hand className="size-4" />
              <span className="hidden sm:inline">{handRaised ? 'Опустить' : 'Поднять руку'}</span>
            </button>
          </div>

          {/* Right: Panels & End Call */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Participants Drawer Button */}
            <button
              onClick={() =>
                setActiveDrawer(activeDrawer === 'participants' ? null : 'participants')
              }
              className={cn(
                'relative flex size-9 items-center justify-center rounded-xl transition-colors',
                activeDrawer === 'participants'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
              title="Участники"
            >
              <Users className="size-4" />
              {handQueue.length > 0 && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {handQueue.length}
                </span>
              )}
            </button>

            {/* Chat Drawer Button */}
            <button
              onClick={() => {
                setActiveDrawer(activeDrawer === 'chat' ? null : 'chat')
                if (activeDrawer !== 'chat') setUnreadChatCount(0)
              }}
              className={cn(
                'relative flex size-9 items-center justify-center rounded-xl transition-colors',
                activeDrawer === 'chat'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
              title="Чат"
            >
              <MessageSquare className="size-4" />
              {unreadChatCount > 0 && activeDrawer !== 'chat' && (
                <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                  {unreadChatCount}
                </span>
              )}
            </button>

            {/* Leave Room Button */}
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition-transform hover:bg-rose-500 active:scale-95"
              title="Покинуть занятие"
            >
              <PhoneOff className="size-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
