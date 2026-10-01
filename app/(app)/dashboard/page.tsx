'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BookCheck,
  CheckCircle2,
  Clock,
  Code,
  Flame,
  MessageSquare,
  Trophy,
  Video,
  Zap,
  Play,
  Calendar,
  Sparkles,
  GraduationCap,
} from 'lucide-react'
import { Badge, Progress } from '@/components/kit'
import { useSchool, levelFromXp } from '@/lib/store'
import { courses as fallbackCourses } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { user, xp, completedLessons } = useSchool()
  const lvl = levelFromXp(xp)
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher'

  const [activeSession, setActiveSession] = useState<any>(null)
  const [coursesList, setCoursesList] = useState<any[]>(fallbackCourses)

  useEffect(() => {
    // Fetch live session if active
    fetch('/api/live/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.sessions && d.sessions.length > 0) {
          setActiveSession(d.sessions[0])
        }
      })
      .catch(() => {})

    fetch('/api/courses')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.courses) setCoursesList(d.courses)
      })
      .catch(() => {})
  }, [])

  const stats = [
    { label: 'Пройдено уроков', value: completedLessons.length, icon: BookCheck, tone: 'text-white' },
    { label: 'Решено заданий', value: completedLessons.length, icon: CheckCircle2, tone: 'text-emerald-400' },
    { label: 'Часов практики', value: Math.round(completedLessons.length * 0.5), icon: Clock, tone: 'text-sky-400' },
    { label: 'Баланс опыта', value: `${xp.toLocaleString('ru-RU')} XP`, icon: Zap, tone: 'text-amber-400' },
    { label: 'Серия дней', value: `${user.email ? 1 : 0} дн.`, icon: Flame, tone: 'text-rose-400' },
  ]

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-medium tracking-wider text-white/40">
              Личный кабинет
            </span>
            <Badge tone="neutral" size="sm">
              {user.role === 'admin' ? 'Администратор' : user.role === 'teacher' ? 'Преподаватель' : 'Студент'}
            </Badge>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Привет, {user.firstName || 'друг'}!
          </h1>
        </div>

        {/* Level & XP Capsule */}
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#101014] px-4 py-2.5">
          <div className="text-xs">
            <span className="font-semibold text-white">Lvl {lvl.level}</span>
            <span className="text-white/40"> · {lvl.name}</span>
          </div>
          <div className="w-24">
            <Progress value={lvl.progress} tone="primary" />
          </div>
          <span className="font-mono text-[11px] text-white/50">
            {lvl.next ? `${lvl.next.min - xp} XP до следующего` : 'MAX'}
          </span>
        </div>
      </div>

      {/* Hero Interactive Live Session Card */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#101014] p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                {activeSession ? 'Интерактивная сессия' : 'Онлайн-школа CODELAB'}
              </span>
              <Badge tone="emerald" size="sm">
                WebRTC & Доска
              </Badge>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight sm:text-2xl">
              {activeSession ? activeSession.title : 'Алгоритмы, веб-разработка и практический код'}
            </h2>

            <p className="max-w-2xl text-xs text-white/60 leading-relaxed">
              {activeSession
                ? activeSession.description || 'Подключайтесь к видеоконференции с преподавателем, трансляцией экрана и синхронизированной интерактивной доской.'
                : 'Полноценные онлайн-занятия с предварительной настройкой оборудования, демонстрацией кода и проверкой заданий.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={activeSession ? `/live/${activeSession.id}` : '/live'}
              className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="size-3.5 fill-black" />
              <span>{activeSession ? 'Войти в онлайн-комнату' : 'Перейти в лобби занятий'}</span>
            </Link>

            <Link
              href="/homework"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <span>Домашние задания</span>
              <ArrowRight className="size-3.5 text-white/40" />
            </Link>

            {isTeacherOrAdmin && (
              <Link
                href="/teacher"
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <GraduationCap className="size-3.5 text-emerald-400" />
                <span>Панель учителя</span>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="lg:col-span-4 rounded-xl border border-white/[0.08] bg-[#101014] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
            Быстрые действия
          </div>
          <div className="space-y-1.5">
            {[
              {
                icon: Video,
                title: 'Онлайн-занятия',
                sub: 'Настройка оборудования и видеозвонки',
                href: '/live',
              },
              {
                icon: Code,
                title: 'Интерактивная доска',
                sub: 'Синхронизированный холст схем и кода',
                href: '/board',
              },
              {
                icon: CheckCircle2,
                title: 'Домашние задания',
                sub: 'Сдача решений и проверка преподавателем',
                href: '/homework',
              },
              {
                icon: MessageSquare,
                title: 'Чат платформы',
                sub: 'Обсуждение материалов с сокурсниками',
                href: '/chat',
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/70 group-hover:text-white">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-white">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-white/40">{item.sub}</div>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-white/30 group-hover:text-white/70 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/[0.08] bg-[#101014] p-4 transition-colors hover:border-white/15"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">{s.label}</span>
              <s.icon className={cn('size-4', s.tone)} />
            </div>
            <div className="mt-3 font-semibold text-lg text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Courses & Activity Section */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#101014] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Текущие курсы
            </h3>
            <Link href="/courses" className="text-xs text-white/50 hover:text-white">
              Каталог всех курсов →
            </Link>
          </div>

          <div className="space-y-2">
            {coursesList.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="group flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-all hover:border-white/15 hover:bg-white/[0.04]"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-white group-hover:text-white">
                    {c.title}
                  </div>
                  <div className="text-[11px] text-white/40">
                    {c.teacher} · {c.lessons} уроков
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">
                    {c.level}
                  </span>
                  <ArrowRight className="size-3.5 text-white/30 group-hover:text-white" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Achievements Card */}
        <div className="lg:col-span-4 rounded-xl border border-white/[0.08] bg-[#101014] p-5">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Достижения
            </h3>
            <Link href="/achievements" className="text-xs text-white/50 hover:text-white">
              Все →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Trophy, title: 'Первый код', desc: '100 XP' },
              { icon: Flame, title: 'Серия 7 дней', desc: 'В процессе' },
              { icon: Zap, title: 'Решено 5 ДЗ', desc: 'Активно' },
              { icon: Sparkles, title: 'Первый звонок', desc: 'Открыто' },
            ].map((ach) => (
              <div
                key={ach.title}
                className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center space-y-1"
              >
                <ach.icon className="mx-auto size-4 text-amber-400" />
                <div className="text-xs font-medium text-white">{ach.title}</div>
                <div className="text-[10px] text-white/40">{ach.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
