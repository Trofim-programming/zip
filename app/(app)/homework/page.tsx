'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Paperclip,
  Timer,
  Upload,
  X,
  Zap,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Badge, PageHeader } from '@/components/kit'
import { CodeEditor } from '@/components/code/code-editor'
import { homeworks as fallbackHomeworks, type Homework, type HomeworkStatus } from '@/lib/data'
import { useSchool } from '@/lib/store'
import { cn } from '@/lib/utils'

const statusMeta: Record<HomeworkStatus, { label: string; tone: 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' }> = {
  todo: { label: 'Не начато', tone: 'neutral' },
  progress: { label: 'На проверке', tone: 'amber' },
  done: { label: 'Проверено', tone: 'emerald' },
  rework: { label: 'На доработке', tone: 'rose' },
}

const diffTone = {
  'Лёгкое': 'emerald',
  'Среднее': 'amber',
  'Сложное': 'rose',
  'easy': 'emerald',
  'medium': 'amber',
  'hard': 'rose',
} as const

export default function HomeworkPage() {
  const { user, addXp } = useSchool()
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher'

  const [items, setItems] = useState<any[]>(fallbackHomeworks)
  const [filter, setFilter] = useState<HomeworkStatus | 'all'>('all')
  const [openModalHw, setOpenModalHw] = useState<any | null>(null)
  const [codeValue, setCodeValue] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadHomeworks = async () => {
    try {
      const res = await fetch('/api/homework')
      const data = await res.json()
      if (data.success && Array.isArray(data.homeworks)) {
        setItems(data.homeworks)
      }
    } catch (err) {
      console.error('Failed to load homeworks:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHomeworks()
  }, [])

  const list = items.filter((h) => {
    const st = h.status || 'todo'
    if (filter === 'all') return true
    return st === filter
  })

  const handleOpenModal = (hw: any) => {
    setOpenModalHw(hw)
    setCodeValue(hw.starter || '')
  }

  const submitHomework = async (hw: any) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeworkId: hw.id, code: codeValue }),
      })
      const data = await res.json()
      if (res.ok) {
        addXp(10)
        toast.success('Работа успешно отправлена на проверку!', {
          description: `${hw.title} (+10 XP за отправку)`,
        })
        setOpenModalHw(null)
        loadHomeworks()
      } else {
        toast.error(data.error || 'Ошибка отправки')
      }
    } catch {
      toast.error('Сетевая ошибка')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Домашние задания"
          description="Практические проекты, написание алгоритмов и код-ревью преподавателей"
        />

        {isTeacherOrAdmin && (
          <Link
            href="/teacher"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
          >
            <GraduationCap className="size-4 text-emerald-400" />
            <span>Панель проверки работ</span>
            <ArrowRight className="size-3.5 text-white/50" />
          </Link>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            filter === 'all'
              ? 'bg-white text-black'
              : 'border border-white/[0.08] bg-[#101014] text-white/60 hover:text-white'
          )}
        >
          Все ({items.length})
        </button>

        {(Object.keys(statusMeta) as HomeworkStatus[]).map((st) => {
          const count = items.filter((h) => (h.status || 'todo') === st).length
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                filter === st
                  ? 'bg-white text-black'
                  : 'border border-white/[0.08] bg-[#101014] text-white/60 hover:text-white'
              )}
            >
              <span>{statusMeta[st].label}</span>
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] py-16 text-center">
          <CalendarClock className="size-8 text-white/30" />
          <p className="mt-3 text-xs font-medium text-white/80">Нет заданий в этой категории</p>
          <p className="mt-1 text-xs text-white/40">
            Переключите фильтр или дождитесь публикации новых заданий преподавателем.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((h) => {
            const stKey: HomeworkStatus = (h.status as HomeworkStatus) || 'todo'
            const meta = statusMeta[stKey] || statusMeta.todo
            const difficultyLabel =
              h.difficulty === 'easy' ? 'Лёгкое' : h.difficulty === 'hard' ? 'Сложное' : 'Среднее'

            return (
              <div
                key={h.id}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#101014] p-5 transition-all hover:border-white/20 hover:bg-[#131318]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-white/60">
                      {h.type}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {h.grade && (
                        <Badge tone="emerald" size="sm">
                          Оценка: {h.grade}/5
                        </Badge>
                      )}
                      <Badge tone={meta.tone} size="sm">
                        {meta.label}
                      </Badge>
                    </div>
                  </div>

                  <h3 className="mt-3 font-semibold text-sm text-white group-hover:text-white">
                    {h.title}
                  </h3>
                  <p className="mt-1 text-xs text-white/50 line-clamp-2 leading-relaxed">
                    {h.description}
                  </p>

                  {/* Teacher Feedback Note if available */}
                  {h.comment && (
                    <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2.5 text-xs text-white/70">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-white/50">
                        <MessageSquare className="size-3 text-emerald-400" />
                        <span>Отзыв преподавателя:</span>
                      </div>
                      <p className="mt-0.5 text-xs text-white/90 italic">«{h.comment}»</p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="size-3.5" /> {h.deadline}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Zap className="size-3.5 fill-amber-400/20" /> +{h.xp} XP
                    </span>
                    <Badge tone={diffTone[difficultyLabel] || 'amber'} size="sm">
                      {difficultyLabel}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <Avatar name={h.teacher} className="size-6 text-[10px]" />
                    <span className="truncate max-w-[120px]">{h.teacher}</span>
                  </div>

                  <button
                    onClick={() => handleOpenModal(h)}
                    className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    {stKey === 'done' ? 'Смотреть' : stKey === 'progress' ? 'Редактировать' : 'Выполнить'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Slide-over Submission Modal */}
      {openModalHw && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={openModalHw.title}
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setOpenModalHw(null)}
          />
          <div className="relative flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-white/10 bg-[#0e0e12] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase font-semibold text-white/60">
                    {openModalHw.type}
                  </span>
                  <Badge
                    tone={
                      statusMeta[(openModalHw.status as HomeworkStatus) || 'todo']?.tone || 'neutral'
                    }
                    size="sm"
                  >
                    {statusMeta[(openModalHw.status as HomeworkStatus) || 'todo']?.label}
                  </Badge>
                  {openModalHw.grade && (
                    <Badge tone="emerald" size="sm">
                      Оценка: {openModalHw.grade}/5
                    </Badge>
                  )}
                </div>

                <h2 className="mt-2 text-lg font-bold text-white">{openModalHw.title}</h2>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">
                  {openModalHw.description}
                </p>
              </div>

              <button
                onClick={() => setOpenModalHw(null)}
                className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Teacher Feedback Banner if rework or done */}
            {openModalHw.comment && (
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <MessageSquare className="size-3.5" />
                  <span>Комментарий преподавателя ({openModalHw.teacher}):</span>
                </div>
                <p className="mt-1.5 text-xs text-white/80 leading-relaxed italic">
                  «{openModalHw.comment}»
                </p>
              </div>
            )}

            {/* Attachments */}
            {openModalHw.attachments && openModalHw.attachments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {openModalHw.attachments.map((a: string) => (
                  <span
                    key={a}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs text-white/70"
                  >
                    <Paperclip className="size-3.5" /> {a}
                  </span>
                ))}
              </div>
            )}

            {/* Code Editor */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Редактор кода решения</span>
                <span>Python 3.12</span>
              </div>
              <CodeEditor
                initialCode={codeValue}
                onChange={(val) => setCodeValue(val)}
                minHeight="min-h-72"
              />
            </div>

            {/* File dropzone / upload */}
            <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 p-5 text-xs text-white/50 transition-colors hover:border-white/30 hover:bg-white/[0.02]">
              <Upload className="size-4" />
              <span>Прикрепить файл решения или скриншот теста</span>
              <input
                type="file"
                multiple
                className="sr-only"
                onChange={(e) =>
                  e.target.files?.length && toast(`Прикреплено файлов: ${e.target.files.length}`)
                }
              />
            </label>

            {/* Bottom Actions */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => {
                  toast('Черновик сохранён локально')
                  setOpenModalHw(null)
                }}
                className="rounded-lg px-4 py-2 text-xs font-medium text-white/60 hover:text-white"
              >
                Сохранить черновик
              </button>
              <button
                type="button"
                onClick={() => submitHomework(openModalHw)}
                disabled={submitting}
                className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
              >
                {submitting ? 'Отправка...' : 'Отправить на проверку'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
