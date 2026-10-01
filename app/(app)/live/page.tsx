'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  Settings,
  Calendar,
  Clock,
  Users,
  Shield,
  Monitor,
  Share2,
  Sparkles,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Volume2,
} from 'lucide-react'
import { useSchool } from '@/lib/store'
import { PageHeader, Badge } from '@/components/kit'
import { cn } from '@/lib/utils'

type LiveSession = {
  id: string
  title: string
  date: string
  time: string
  duration: number
  teacher_id: string
  teacher_name: string
  type: string
  description?: string
  status: 'scheduled' | 'live' | 'ended'
  settings?: {
    allowMic?: boolean
    allowCam?: boolean
    allowScreen?: boolean
    allowBoard?: boolean
  }
}

export default function LiveLobbyPage() {
  const router = useRouter()
  const { user } = useSchool()
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher'

  // Sessions list
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [customRoomId, setCustomRoomId] = useState('')

  // Create form state
  const [title, setTitle] = useState('Практика: Разбор задач и алгоритмов')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('18:00')
  const [duration, setDuration] = useState(45)
  const [type, setType] = useState('practice')
  const [description, setDescription] = useState('Интерактивный разбор задач, написание кода и работа на совместной доске.')
  const [allowMic, setAllowMic] = useState(true)
  const [allowCam, setAllowCam] = useState(true)
  const [allowScreen, setAllowScreen] = useState(false)
  const [allowBoard, setAllowBoard] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'sessions' | 'create'>('sessions')

  // Pre-call Hardware Preview
  const videoRef = useRef<HTMLVideoElement>(null)
  const [previewCamOn, setPreviewCamOn] = useState(true)
  const [previewMicOn, setPreviewMicOn] = useState(true)
  const [audioLevel, setAudioLevel] = useState(0)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedVideoId, setSelectedVideoId] = useState<string>('')
  const [selectedAudioId, setSelectedAudioId] = useState<string>('')
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [testSoundPlaying, setTestSoundPlaying] = useState(false)

  // Fetch sessions
  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/live/sessions')
        const data = await res.json()
        if (data.success && data.sessions) {
          setSessions(data.sessions)
        }
      } catch (err) {
        console.error('Failed to load live sessions:', err)
      } finally {
        setLoadingSessions(false)
      }
    }
    loadSessions()
  }, [])

  // Enumerate devices & start pre-call preview
  useEffect(() => {
    let activeStream: MediaStream | null = null
    let audioContext: AudioContext | null = null
    let analyser: AnalyserNode | null = null
    let animFrame: number | null = null

    async function initPreview() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vDevs = devices.filter((d) => d.kind === 'videoinput')
        const aDevs = devices.filter((d) => d.kind === 'audioinput')
        setVideoDevices(vDevs)
        setAudioDevices(aDevs)
        if (vDevs[0] && !selectedVideoId) setSelectedVideoId(vDevs[0].deviceId)
        if (aDevs[0] && !selectedAudioId) setSelectedAudioId(aDevs[0].deviceId)

        const constraints: MediaStreamConstraints = {
          video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
          audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        activeStream = stream
        setMediaStream(stream)

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Setup audio level meter
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx && stream.getAudioTracks().length > 0) {
          audioContext = new AudioCtx()
          const source = audioContext.createMediaStreamSource(stream)
          analyser = audioContext.createAnalyser()
          analyser.fftSize = 64
          source.connect(analyser)

          const dataArray = new Uint8Array(analyser.frequencyBinCount)
          const checkVolume = () => {
            if (!analyser) return
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i]
            }
            const avg = sum / dataArray.length
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
            animFrame = requestAnimationFrame(checkVolume)
          }
          checkVolume()
        }
      } catch (err) {
        console.warn('Media preview permission denied or unavailable:', err)
      }
    }

    initPreview()

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame)
      if (audioContext) audioContext.close()
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [selectedVideoId, selectedAudioId])

  // Toggle local cam in preview
  const toggleCam = () => {
    if (mediaStream) {
      const vTrack = mediaStream.getVideoTracks()[0]
      if (vTrack) {
        vTrack.enabled = !previewCamOn
        setPreviewCamOn(!previewCamOn)
      }
    }
  }

  // Toggle local mic in preview
  const toggleMic = () => {
    if (mediaStream) {
      const aTrack = mediaStream.getAudioTracks()[0]
      if (aTrack) {
        aTrack.enabled = !previewMicOn
        setPreviewMicOn(!previewMicOn)
      }
    }
  }

  // Play test sound
  const playTestSound = () => {
    setTestSoundPlaying(true)
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (AudioCtx) {
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime) // A4 tone
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
      setTimeout(() => {
        setTestSoundPlaying(false)
        ctx.close()
      }, 500)
    }
  }

  // Create session handler
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/live/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          date,
          time,
          duration,
          type,
          description,
          settings: {
            allowMic,
            allowCam,
            allowScreen,
            allowBoard,
          },
        }),
      })
      const data = await res.json()
      if (data.success && data.roomId) {
        router.push(`/live/${data.roomId}`)
      }
    } catch (err) {
      console.error('Failed to create session:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleJoinDirect = (roomId: string) => {
    if (!roomId.trim()) return
    router.push(`/live/${roomId.trim()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Онлайн-занятия"
          description="Интерактивные видеоконференции, совместная доска и разбор практических задач"
        />

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#101014] p-1">
          <button
            onClick={() => setActiveTab('sessions')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'sessions'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white'
            )}
          >
            <Calendar className="size-3.5" />
            <span>Сессии ({sessions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'create'
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white'
            )}
          >
            <Plus className="size-3.5" />
            <span>Настроить занятие</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Device Check & Preview (Sticky) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-white/50">
                <Settings className="size-3.5" />
                <span>Проверка оборудования</span>
              </div>
              <Badge tone="emerald" size="sm">Готово к эфиру</Badge>
            </div>

            {/* Video Preview Box */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#09090b]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  'h-full w-full object-cover -scale-x-100 transition-opacity duration-300',
                  !previewCamOn && 'opacity-0'
                )}
              />
              {!previewCamOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#09090b] text-white/40">
                  <div className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-white/40">
                    <VideoOff className="size-6" />
                  </div>
                  <span className="text-xs">Камера выключена</span>
                </div>
              )}

              {/* Floating Quick Action Overlay */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg transition-colors',
                    previewMicOn
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  )}
                  title={previewMicOn ? 'Выключить микрофон' : 'Включить микрофон'}
                >
                  {previewMicOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCam}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-lg transition-colors',
                    previewCamOn
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  )}
                  title={previewCamOn ? 'Выключить камеру' : 'Включить камеру'}
                >
                  {previewCamOn ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                </button>
              </div>
            </div>

            {/* Mic Level Meter */}
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <Mic className="size-3.5 text-emerald-400" />
                  Уровень микрофона
                </span>
                <span className="font-mono text-[11px] text-white/40">{audioLevel}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${previewMicOn ? audioLevel : 0}%` }}
                />
              </div>
            </div>

            {/* Device Selectors */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] text-white/50">Камера</label>
                <select
                  value={selectedVideoId}
                  onChange={(e) => setSelectedVideoId(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-1.5 text-xs text-white/90 outline-none focus:border-white/30"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Камера ${i + 1}`}
                    </option>
                  ))}
                  {videoDevices.length === 0 && <option value="">Камера не найдена</option>}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] text-white/50">Микрофон</label>
                <select
                  value={selectedAudioId}
                  onChange={(e) => setSelectedAudioId(e.target.value)}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-1.5 text-xs text-white/90 outline-none focus:border-white/30"
                >
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Микрофон ${i + 1}`}
                    </option>
                  ))}
                  {audioDevices.length === 0 && <option value="">Микрофон не найден</option>}
                </select>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={playTestSound}
                  disabled={testSoundPlaying}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  <Volume2 className={cn('size-3.5', testSoundPlaying && 'animate-pulse text-emerald-400')} />
                  <span>{testSoundPlaying ? 'Воспроизведение...' : 'Проверить звук в динамиках'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Join Card */}
          <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-5">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/50">
              Быстрое подключение
            </div>
            <p className="mb-3 text-xs text-white/60">
              Введите идентификатор комнаты или ссылку для прямого перехода
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customRoomId}
                onChange={(e) => setCustomRoomId(e.target.value)}
                placeholder="например: room_algo_101"
                className="flex-1 rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
              />
              <button
                type="button"
                onClick={() => handleJoinDirect(customRoomId)}
                className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-white/90"
              >
                Войти
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sessions list or Setup Form */}
        <div className="lg:col-span-7">
          {activeTab === 'sessions' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Список онлайн-занятий</h3>
                  <p className="text-xs text-white/50">
                    Выберите занятие для подключения к комнате видеозвонка
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Plus className="size-3.5" />
                  <span>Создать новое</span>
                </button>
              </div>

              {loadingSessions ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-xl border border-white/[0.08] bg-[#101014]"
                    />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] py-12 text-center">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-white/[0.05] text-white/40">
                    <Calendar className="size-5" />
                  </div>
                  <div className="text-xs font-medium text-white">Нет запланированных занятий</div>
                  <p className="mt-1 max-w-xs text-xs text-white/50">
                    Нажмите «Настроить занятие», чтобы создать первую интерактивную видеоконференцию.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-4 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-black hover:bg-white/90"
                  >
                    Создать занятие
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="group rounded-xl border border-white/[0.08] bg-[#101014] p-5 transition-all hover:border-white/20 hover:bg-[#141419]"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-white">{s.title}</span>
                            <Badge
                              tone={
                                s.status === 'live'
                                  ? 'emerald'
                                  : s.status === 'ended'
                                  ? 'neutral'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {s.status === 'live'
                                ? '● В эфире'
                                : s.status === 'ended'
                                ? 'Завершено'
                                : 'Запланировано'}
                            </Badge>
                            <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/60">
                              {s.type === 'lecture'
                                ? 'Лекция'
                                : s.type === 'practice'
                                ? 'Практикум'
                                : s.type === 'consultation'
                                ? 'Консультация'
                                : 'Аттестация'}
                            </span>
                          </div>

                          {s.description && (
                            <p className="text-xs text-white/60 line-clamp-2">{s.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 pt-1">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="size-3.5" />
                              {s.date}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="size-3.5" />
                              {s.time} ({s.duration} мин)
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Shield className="size-3.5 text-white/60" />
                              {s.teacher_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleJoinDirect(s.id)}
                            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Play className="size-3.5 fill-black" />
                            <span>Войти в комнату</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Setup & Create Form (User requirement: Setup Lobby) */
            <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-6">
              <div className="mb-5 border-b border-white/[0.08] pb-4">
                <h3 className="text-base font-semibold text-white">Параметры и создание занятия</h3>
                <p className="mt-1 text-xs text-white/50">
                  Сконфигурируйте свойства встречи, права доступа и инструменты доски перед запуском
                </p>
              </div>

              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/70">
                    Название занятия *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Например: Разбор бинарных деревьев и графов"
                    className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">Дата</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">Время</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">
                      Длительность
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    >
                      <option value={30}>30 минут</option>
                      <option value={45}>45 минут</option>
                      <option value={60}>60 минут</option>
                      <option value={90}>90 минут</option>
                      <option value={120}>120 минут</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">
                      Тип занятия
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    >
                      <option value="lecture">Лекция с демонстрацией</option>
                      <option value="practice">Практикум с кодом</option>
                      <option value="consultation">Консультация 1-на-1</option>
                      <option value="exam">Аттестация / Зачёт</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/70">
                      Преподаватель
                    </label>
                    <div className="rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white/60">
                      {user ? `${user.firstName} ${user.lastName}` : 'Вы (Организатор)'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/70">
                    Описание и материалы к занятию
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Краткий план занятия, ссылки или инструкции..."
                    className="w-full rounded-lg border border-white/[0.08] bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                  />
                </div>

                {/* Participant Permissions */}
                <div className="rounded-xl border border-white/[0.06] bg-black/30 p-4 space-y-3">
                  <div className="text-xs font-semibold text-white/80">
                    Права участников по умолчанию
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowMic}
                        onChange={(e) => setAllowMic(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-white"
                      />
                      <span>Разрешить микрофон участникам</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCam}
                        onChange={(e) => setAllowCam(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-white"
                      />
                      <span>Разрешить камеру участникам</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowScreen}
                        onChange={(e) => setAllowScreen(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-white"
                      />
                      <span>Демонстрация экрана участниками</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowBoard}
                        onChange={(e) => setAllowBoard(e.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-white"
                      />
                      <span>Включить совместную интерактивную доску</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('sessions')}
                    className="rounded-lg px-4 py-2 text-xs font-medium text-white/60 hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5 fill-black" />
                    <span>{isSubmitting ? 'Создание...' : 'Создать занятие и войти в комнату'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
