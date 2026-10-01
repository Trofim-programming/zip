'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Layers, Star, Zap } from 'lucide-react'
import { Avatar, Badge, Progress } from '@/components/kit'
import { ModuleList } from './module-list'
import { allLessons, pythonModules, type Course } from '@/lib/data'
import { useSchool } from '@/lib/store'
import { cn } from '@/lib/utils'

export function CourseView({ course }: { course: Course }) {
  const { completedLessons } = useSchool()
  const done = allLessons.filter((l) => completedLessons.includes(l.id)).length
  const progress = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0
  const next = allLessons.find((l) => !completedLessons.includes(l.id))

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      {/* Module Program Sidebar */}
      <div className="h-fit rounded-xl border border-white/[0.08] bg-[#101014] p-3 xl:sticky xl:top-8">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-white/50">
          Программа курса
        </p>
        <ModuleList />
      </div>

      <div className="space-y-6">
        {/* Course Hero Card */}
        <section className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#101014] p-6 md:p-8">
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-white/60">
                {course.category}
              </span>
              <Badge tone="neutral" size="sm">
                {course.level}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <Star className="size-3 fill-amber-400" /> {course.rating}
              </span>
            </div>

            <h1 className="text-balance text-2xl font-bold tracking-tight text-white md:text-3xl">
              {course.title}
            </h1>

            <p className="max-w-2xl text-xs text-white/60 leading-relaxed">
              {course.description}
            </p>

            <div className="mt-4 max-w-md space-y-1.5">
              <div className="flex justify-between text-xs text-white/60">
                <span>Прогресс прохождения</span>
                <span className="font-mono text-white">{progress}%</span>
              </div>
              <Progress value={progress} tone="primary" />
            </div>

            {next && (
              <div className="pt-2">
                <Link
                  href={`/lesson/${next.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span>Продолжить: {next.title}</span>
                  <ArrowRight className="size-3.5 fill-black" />
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Layers, label: 'Модулей', value: pythonModules.length },
            { icon: BookOpen, label: 'Уроков', value: allLessons.length },
            { icon: Zap, label: 'XP за курс', value: '2 400' },
            { icon: BookOpen, label: 'Пройдено', value: `${done}/${allLessons.length}` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-white/[0.08] bg-[#101014] p-4 transition-colors hover:border-white/15"
            >
              <s.icon className="size-4 text-white/50" />
              <p className="mt-2 text-lg font-bold text-white">{s.value}</p>
              <p className="text-[11px] text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* About & Teacher Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-5 md:col-span-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              О курсе
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Курс построен вокруг практики: каждый урок заканчивается решением задачи в интерактивном редакторе, а модуль — созданием законченного проекта. Вы научитесь писать чистый, поддерживаемый код и применять стандартные библиотеки.
            </p>
            <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2 text-white/60">
              {[
                'Синтаксис и базовые структуры',
                'Условия и алгоритмические циклы',
                'Функции и замыкания',
                'Файловые операции и JSON',
                'ООП и архитектура классов',
                'Финальный Telegram-бот',
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="size-1 rounded-full bg-white/40" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Преподаватель
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={course.teacher} className="size-10 text-xs" />
                <div>
                  <p className="text-xs font-semibold text-white">{course.teacher}</p>
                  <p className="text-[11px] text-white/40">Senior Python Engineer</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/50">
                Практикующий разработчик с 8-летним стажем. Ведёт живые онлайн-занятия и проверяет домашние задания.
              </p>
            </div>

            <Link
              href="/chat"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              Написать в чат
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
