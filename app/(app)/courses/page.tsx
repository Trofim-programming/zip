'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Clock, Search, SearchX, Star, ArrowRight } from 'lucide-react'
import { Avatar, Badge, PageHeader, Progress, Skeleton } from '@/components/kit'
import { categories, courses as fallbackCourses, type Course, type Level } from '@/lib/data'
import { cn } from '@/lib/utils'

const levels: Level[] = ['Начальный', 'Средний', 'Продвинутый']

export default function CoursesPage() {
  const [courseList, setCourseList] = useState<Course[]>(fallbackCourses)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [level, setLevel] = useState<Level | null>(null)
  const [price, setPrice] = useState<'all' | 'free' | 'paid'>('all')
  const [format, setFormat] = useState<string>('all')
  const [duration, setDuration] = useState<'all' | 'short' | 'long'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.courses)) {
          setCourseList(data.courses)
        }
      })
      .catch((err) => console.error('Failed to load courses from DB:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      courseList.filter(
        (c) =>
          (!q || c.title.toLowerCase().includes(q.toLowerCase())) &&
          (!cat || c.category === cat) &&
          (!level || c.level === level) &&
          (price === 'all' || (price === 'free' ? c.free : !c.free)) &&
          (format === 'all' || c.format === format) &&
          (duration === 'all' || (duration === 'short' ? c.hours < 25 : c.hours >= 25))
      ),
    [courseList, q, cat, level, price, format, duration]
  )

  const select =
    'h-9 rounded-lg border border-white/[0.08] bg-[#101014] px-3 text-xs text-white/80 outline-none focus:border-white/30'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Каталог курсов"
          description={`${courseList.length} курсов от практикующих разработчиков`}
        />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по курсам..."
            aria-label="Поиск курса"
            className="h-9 w-64 rounded-lg border border-white/[0.08] bg-[#101014] pl-9 pr-3 text-xs text-white placeholder-white/40 outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCat(null)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
            !cat
              ? 'bg-white text-black'
              : 'border border-white/[0.08] bg-[#101014] text-white/60 hover:text-white'
          )}
        >
          Все направления
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(cat === c ? null : c)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
              cat === c
                ? 'bg-white text-black'
                : 'border border-white/[0.08] bg-[#101014] text-white/60 hover:text-white'
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Secondary Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Уровень"
          className={select}
          value={level ?? ''}
          onChange={(e) => setLevel((e.target.value || null) as Level | null)}
        >
          <option value="">Любой уровень</option>
          {levels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>

        <select
          aria-label="Продолжительность"
          className={select}
          value={duration}
          onChange={(e) => setDuration(e.target.value as typeof duration)}
        >
          <option value="all">Любая длительность</option>
          <option value="short">До 25 часов</option>
          <option value="long">25+ часов</option>
        </select>

        <select
          aria-label="Формат"
          className={select}
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          <option value="all">Любой формат</option>
          <option value="Самостоятельно">Самостоятельно</option>
          <option value="С преподавателем">С преподавателем</option>
        </select>

        <select
          aria-label="Цена"
          className={select}
          value={price}
          onChange={(e) => setPrice(e.target.value as typeof price)}
        >
          <option value="all">Все (бесплатные и платные)</option>
          <option value="free">Бесплатные</option>
          <option value="paid">Платные</option>
        </select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-white/[0.08] bg-[#101014]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] py-20 text-center">
          <SearchX className="size-8 text-white/30" />
          <p className="mt-3 text-xs font-medium text-white/80">Курсы не найдены</p>
          <p className="mt-1 text-xs text-white/40">Попробуйте сбросить параметры фильтрации</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <article
              key={c.id}
              className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#101014] p-5 transition-all hover:border-white/20 hover:bg-[#131318]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                  <span className="font-mono text-xs font-semibold text-white/70">
                    {c.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {c.free && (
                      <Badge tone="emerald" size="sm">
                        Бесплатно
                      </Badge>
                    )}
                    <Badge tone="neutral" size="sm">
                      {c.level}
                    </Badge>
                  </div>
                </div>

                <h3 className="mt-3 font-semibold text-sm text-white group-hover:text-white">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs text-white/50 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3.5" /> {c.lessons} уроков
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {c.hours} ч
                  </span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="size-3 fill-amber-400" /> {c.rating}
                  </span>
                </div>

                {c.progress > 0 && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1">
                      <Progress value={c.progress} tone="primary" />
                    </div>
                    <span className="font-mono text-[11px] text-white/60">{c.progress}%</span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
                <span className="flex items-center gap-2 text-xs text-white/60">
                  <Avatar name={c.teacher} className="size-6 text-[10px]" />
                  <span className="truncate max-w-[130px]">{c.teacher}</span>
                </span>
                <Link
                  href={`/courses/${c.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"
                >
                  <span>Перейти</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
