'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Pencil,
  Square,
  Circle,
  Eraser,
  Trash2,
  Code2,
  Hand,
  UserCheck,
  X,
  Lock,
  Download,
  Users,
  Eye,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type WhiteboardStroke = {
  id: string
  peerId: string
  userName: string
  color: string
  width: number
  tool: 'pen' | 'eraser' | 'rect' | 'circle'
  points: { x: number; y: number }[]
}

interface SyncedBoardProps {
  roomId: string
  peerId: string
  userName: string
  userRole: 'organizer' | 'teacher' | 'student' | 'guest'
  canDraw: boolean
  isOrganizer: boolean
  strokes: WhiteboardStroke[]
  handQueue: string[]
  peers: Array<{ id: string; name: string; role: string; hand: boolean; canDraw: boolean }>
  onSendStroke: (stroke: WhiteboardStroke) => void
  onClearBoard: () => void
  onCloseBoard?: () => void
  onGrantDraw?: (targetPeerId: string) => void
  onRevokeDraw?: (targetPeerId: string) => void
  onCallToBoard?: (targetPeerId: string) => void
  onRaiseHand?: () => void
  hasHandRaised?: boolean
  className?: string
}

const COLORS = ['#ffffff', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4']
const WIDTHS = [2, 4, 8, 16]

export function SyncedBoard({
  roomId,
  peerId,
  userName,
  userRole,
  canDraw,
  isOrganizer,
  strokes,
  handQueue,
  peers,
  onSendStroke,
  onClearBoard,
  onCloseBoard,
  onGrantDraw,
  onRevokeDraw,
  onCallToBoard,
  onRaiseHand,
  hasHandRaised = false,
  className,
}: SyncedBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<'pen' | 'rect' | 'circle' | 'eraser'>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [lineWidth, setLineWidth] = useState(3)
  const [showCodeSnippet, setShowCodeSnippet] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)

  const isDrawing = useRef(false)
  const currentPoints = useRef<{ x: number; y: number }[]>([])
  const startPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Re-draw entire canvas whenever strokes change or window resizes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Render all synced strokes
    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue

      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#09090b'
        ctx.lineWidth = stroke.width || 20
      } else {
        ctx.strokeStyle = stroke.color || '#ffffff'
        ctx.lineWidth = stroke.width || 3
      }

      if (stroke.tool === 'rect') {
        const p1 = stroke.points[0]
        const p2 = stroke.points[stroke.points.length - 1]
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y)
      } else if (stroke.tool === 'circle') {
        const p1 = stroke.points[0]
        const p2 = stroke.points[stroke.points.length - 1]
        const rx = Math.abs(p2.x - p1.x) / 2
        const ry = Math.abs(p2.y - p1.y) / 2
        const cx = Math.min(p1.x, p2.x) + rx
        const cy = Math.min(p1.y, p2.y) + ry
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        // Pen / Eraser freehand path
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
        }
        ctx.stroke()
      }
      ctx.restore()
    }
  }, [strokes])

  // Canvas size sync
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const handleResize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      redrawCanvas()
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [redrawCanvas])

  useEffect(() => {
    redrawCanvas()
  }, [redrawCanvas])

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return
    const pt = getCanvasCoords(e)
    isDrawing.current = true
    startPoint.current = pt
    currentPoints.current = [pt]

    const canvas = canvasRef.current
    if (canvas) {
      canvas.setPointerCapture(e.pointerId)
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(pt.x, pt.y)
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !canDraw) return
    const pt = getCanvasCoords(e)
    currentPoints.current.push(pt)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'pen' || tool === 'eraser') {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (tool === 'eraser') {
        ctx.strokeStyle = '#09090b'
        ctx.lineWidth = 20
      } else {
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
      }
      const prev = currentPoints.current[currentPoints.current.length - 2]
      if (prev) {
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(pt.x, pt.y)
        ctx.stroke()
      }
      ctx.restore()
    } else {
      // Shape preview - clear and redraw history + current shape
      redrawCanvas()
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      if (tool === 'rect') {
        ctx.strokeRect(startPoint.current.x, startPoint.current.y, pt.x - startPoint.current.x, pt.y - startPoint.current.y)
      } else if (tool === 'circle') {
        const rx = Math.abs(pt.x - startPoint.current.x) / 2
        const ry = Math.abs(pt.y - startPoint.current.y) / 2
        const cx = Math.min(startPoint.current.x, pt.x) + rx
        const cy = Math.min(startPoint.current.y, pt.y) + ry
        ctx.beginPath()
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  const handlePointerUp = () => {
    if (!isDrawing.current || !canDraw) return
    isDrawing.current = false

    if (currentPoints.current.length === 0) return

    const newStroke: WhiteboardStroke = {
      id: `str_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      peerId,
      userName,
      color,
      width: tool === 'eraser' ? 24 : lineWidth,
      tool,
      points: currentPoints.current,
    }

    onSendStroke(newStroke)
    currentPoints.current = []
  }

  const handleExportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `codelab-board-${roomId}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Raised hands list
  const raisedHandPeers = peers.filter((p) => p.hand || handQueue.includes(p.id))

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#09090b]',
        className
      )}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-xl border border-white/[0.12] bg-[#121217]/90 px-2 py-1.5 shadow-2xl backdrop-blur-md">
        {canDraw ? (
          <>
            {/* Drawing Tools */}
            <button
              onClick={() => setTool('pen')}
              title="Карандаш"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                tool === 'pen' && 'bg-white text-black hover:bg-white/90 hover:text-black'
              )}
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => setTool('rect')}
              title="Прямоугольник"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                tool === 'rect' && 'bg-white text-black hover:bg-white/90 hover:text-black'
              )}
            >
              <Square className="size-4" />
            </button>
            <button
              onClick={() => setTool('circle')}
              title="Круг"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                tool === 'circle' && 'bg-white text-black hover:bg-white/90 hover:text-black'
              )}
            >
              <Circle className="size-4" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              title="Ластик"
              className={cn(
                'flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white',
                tool === 'eraser' && 'bg-white text-black hover:bg-white/90 hover:text-black'
              )}
            >
              <Eraser className="size-4" />
            </button>

            <span className="mx-1 h-5 w-px bg-white/10" />

            {/* Colors */}
            <div className="flex items-center gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c)
                    if (tool === 'eraser') setTool('pen')
                  }}
                  className={cn(
                    'size-5 rounded-full border border-black/40 transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-white ring-offset-2 ring-offset-[#121217]'
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>

            <span className="mx-1 h-5 w-px bg-white/10" />

            {/* Line Width */}
            <div className="flex items-center gap-1">
              {WIDTHS.map((w) => (
                <button
                  key={w}
                  onClick={() => setLineWidth(w)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md text-xs font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white',
                    lineWidth === w && 'bg-white/20 text-white'
                  )}
                  title={`Толщина: ${w}px`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{ width: `${w + 2}px`, height: `${w + 2}px` }}
                  />
                </button>
              ))}
            </div>

            <span className="mx-1 h-5 w-px bg-white/10" />

            {/* Clear Board */}
            <button
              onClick={onClearBoard}
              title="Очистить доску"
              className="flex size-8 items-center justify-center rounded-lg text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              <Trash2 className="size-4" />
            </button>
          </>
        ) : (
          /* Read-only notification */
          <div className="flex items-center gap-2 px-2 text-xs text-white/70">
            <Eye className="size-3.5 text-sky-400" />
            <span>Режим демонстрации</span>
            <span className="h-3 w-px bg-white/10" />
            <button
              onClick={onRaiseHand}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                hasHandRaised
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <Hand className="size-3.5" />
              <span>{hasHandRaised ? 'Рука поднята' : 'Попросить к доске'}</span>
            </button>
          </div>
        )}

        <span className="mx-1 h-5 w-px bg-white/10" />

        {/* Code Snippet Overlay Toggle */}
        <button
          onClick={() => setShowCodeSnippet(!showCodeSnippet)}
          title="Вставить блок кода"
          className={cn(
            'flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white',
            showCodeSnippet && 'bg-white/20 text-white'
          )}
        >
          <Code2 className="size-4" />
        </button>

        {/* Export PNG */}
        <button
          onClick={handleExportPng}
          title="Скачать снимок доски"
          className="flex size-8 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Download className="size-4" />
        </button>

        {/* Organizer Controls */}
        {isOrganizer && (
          <>
            <span className="mx-1 h-5 w-px bg-white/10" />
            <button
              onClick={() => setShowPermissionsModal(!showPermissionsModal)}
              title="Управление правами рисования и очередью"
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                raisedHandPeers.length > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                  : 'bg-white/10 text-white hover:bg-white/15'
              )}
            >
              <Users className="size-3.5" />
              <span>Права ({peers.filter((p) => p.canDraw).length})</span>
              {raisedHandPeers.length > 0 && (
                <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {raisedHandPeers.length}
                </span>
              )}
            </button>

            {onCloseBoard && (
              <button
                onClick={onCloseBoard}
                title="Закрыть доску для всех"
                className="flex size-8 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-rose-500/20 hover:text-rose-300"
              >
                <X className="size-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Code Snippet Overlay */}
      {showCodeSnippet && (
        <div className="absolute bottom-6 left-6 z-20 max-w-md rounded-xl border border-white/10 bg-[#121217]/95 p-4 shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-xs text-white/50">
            <span className="font-mono">main.py · Пример для разбора</span>
            <button
              onClick={() => setShowCodeSnippet(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <pre className="font-mono text-xs leading-relaxed text-emerald-400">
{`def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`}
          </pre>
        </div>
      )}

      {/* Organizer Permissions & Hand Queue Dropdown */}
      {showPermissionsModal && isOrganizer && (
        <div className="absolute right-4 top-14 z-40 w-80 rounded-xl border border-white/10 bg-[#121217]/95 p-4 shadow-2xl backdrop-blur-lg">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="text-xs font-semibold text-white">Права рисования на доске</div>
            <button
              onClick={() => setShowPermissionsModal(false)}
              className="text-white/40 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Raised Hands Queue */}
          {raisedHandPeers.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <Hand className="size-3.5" />
                <span>Подняли руку ({raisedHandPeers.length})</span>
              </div>
              <div className="space-y-1.5">
                {raisedHandPeers.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md bg-black/40 px-2.5 py-1.5 text-xs text-white"
                  >
                    <span>{p.name}</span>
                    <button
                      onClick={() => onCallToBoard?.(p.id)}
                      className="flex items-center gap-1 rounded bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-black transition-colors hover:bg-amber-400"
                    >
                      <UserCheck className="size-3" />
                      <span>К доске</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Participants Permissions */}
          <div className="max-h-60 space-y-1.5 overflow-y-auto">
            <div className="text-[11px] uppercase tracking-wider text-white/40">Все участники</div>
            {peers.length === 0 ? (
              <div className="py-2 text-center text-xs text-white/40">Нет других участников</div>
            ) : (
              peers.map((p) => {
                const isHost = p.role === 'organizer' || p.role === 'teacher'
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-xs text-white"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate max-w-[130px]">{p.name}</span>
                      {isHost && (
                        <span className="rounded bg-white/10 px-1 text-[9px] text-white/60">
                          хост
                        </span>
                      )}
                    </div>
                    {isHost ? (
                      <span className="text-[11px] text-emerald-400">Всегда</span>
                    ) : (
                      <button
                        onClick={() =>
                          p.canDraw ? onRevokeDraw?.(p.id) : onGrantDraw?.(p.id)
                        }
                        className={cn(
                          'flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition-colors',
                          p.canDraw
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-rose-500/20 hover:text-rose-300'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                        )}
                      >
                        {p.canDraw ? (
                          <>
                            <Check className="size-3" />
                            <span>Разрешено</span>
                          </>
                        ) : (
                          <>
                            <Lock className="size-3" />
                            <span>Запретить</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Grid Pattern Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Main Drawing Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={cn(
          'relative h-full w-full touch-none select-none',
          canDraw ? 'cursor-crosshair' : 'cursor-default'
        )}
      />
    </div>
  )
}
