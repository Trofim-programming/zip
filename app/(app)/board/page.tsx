'use client'

import React, { useState, useEffect } from 'react'
import { PageHeader, Badge } from '@/components/kit'
import { SyncedBoard, WhiteboardStroke } from '@/components/board/synced-board'
import { useSchool } from '@/lib/store'
import { Video, Users, Sparkles, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function BoardPage() {
  const { user } = useSchool()
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher'
  const [roomId, setRoomId] = useState('room_algo_101')
  const [peerId] = useState(() => `board_user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`)
  const userName = user ? `${user.firstName} ${user.lastName}` : 'Ученик'

  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([])
  const [peers, setPeers] = useState<any[]>([])
  const [handQueue, setHandQueue] = useState<string[]>([])
  const [canDraw, setCanDraw] = useState(true)

  // Polling loop to sync board strokes with anyone else in the room
  useEffect(() => {
    let active = true

    // Join
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        roomId,
        peerId,
        name: userName,
        role: user?.role || 'student',
        mic: false,
        cam: false,
        isOrganizer: isTeacherOrAdmin,
      }),
    }).catch(console.error)

    const poll = async () => {
      if (!active) return
      try {
        const res = await fetch(`/api/live/signaling?roomId=${roomId}&peerId=${peerId}`)
        const data = await res.json()
        if (data.success && active) {
          setStrokes(data.whiteboardStrokes || [])
          setPeers(data.peers || [])
          setHandQueue(data.handQueue || [])
          setCanDraw(
            isTeacherOrAdmin ||
            data.moderation?.drawingAllowedPeerIds?.includes(peerId) ||
            true
          )
        }
      } catch (err) {}
    }

    const interval = setInterval(poll, 1500)
    poll()

    return () => {
      active = false
      clearInterval(interval)
      fetch('/api/live/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', roomId, peerId }),
      }).catch(console.error)
    }
  }, [roomId, peerId, userName, user?.role, isTeacherOrAdmin])

  const handleSendStroke = (stroke: WhiteboardStroke) => {
    setStrokes((prev) => [...prev, stroke])
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'board_stroke', roomId, peerId, stroke }),
    }).catch(console.error)
  }

  const handleClearBoard = () => {
    setStrokes([])
    fetch('/api/live/signaling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'board_clear', roomId, peerId }),
    }).catch(console.error)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Совместная интерактивная доска"
          description="Рисуйте архитектурные диаграммы, пишите формулы и синхронизируйте идеи в реальном времени"
        />

        <div className="flex items-center gap-2">
          {/* Room Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#101014] px-3 py-1.5 text-xs text-white/80">
            <span className="text-white/40">Комната:</span>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-32 bg-transparent font-mono text-white outline-none"
            />
          </div>

          <Link
            href={`/live/${roomId}`}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90"
          >
            <Video className="size-3.5" />
            <span>Перейти к звонку</span>
          </Link>
        </div>
      </div>

      {/* Board Canvas Area */}
      <div className="h-[calc(100vh-14rem)] min-h-[500px] w-full">
        <SyncedBoard
          roomId={roomId}
          peerId={peerId}
          userName={userName}
          userRole={isTeacherOrAdmin ? 'organizer' : 'student'}
          canDraw={canDraw}
          isOrganizer={isTeacherOrAdmin}
          strokes={strokes}
          handQueue={handQueue}
          peers={peers}
          onSendStroke={handleSendStroke}
          onClearBoard={handleClearBoard}
          className="h-full w-full"
        />
      </div>
    </div>
  )
}
