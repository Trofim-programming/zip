'use client'

import Link from 'next/link'
import { Check, Lock, Play } from 'lucide-react'
import { allLessons, pythonModules } from '@/lib/data'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ModuleList({ activeId }: { activeId?: string }) {
  const { completedLessons } = useAppStore()
  const currentIdx = allLessons.findIndex((l) => !completedLessons.includes(l.id))

  return (
    <div className="space-y-4">
      {pythonModules.length === 0 && (
        <p className="px-2 py-4 text-center text-xs text-muted-foreground">Уроки пока не добавлены</p>
      )}
      {pythonModules.map((m, mi) => (
        <div key={m.id}>
          <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Модуль {mi + 1} — {m.title}
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {m.lessons.map((l) => {
              const idx = allLessons.findIndex((x) => x.id === l.id)
              const done = completedLessons.includes(l.id)
              const current = idx === currentIdx
              const locked = !done && idx > currentIdx
              const content = (
                <>
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px]',
                      done && 'border-success/40 bg-success/15 text-success',
                      current && 'border-primary bg-primary text-white',
                      locked && 'text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="size-3" /> : current ? <Play className="size-3" /> : <Lock className="size-3" />}
                  </span>
                  <span className="flex-1 truncate">
                    Урок {idx + 1}. {l.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{l.minutes}м</span>
                </>
              )
              const cls = cn(
                'flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors',
                activeId === l.id ? 'bg-primary/15' : 'hover:bg-accent',
                locked && 'cursor-not-allowed opacity-50 hover:bg-transparent',
              )
              return (
                <li key={l.id}>
                  {locked ? (
                    <span className={cls} aria-disabled="true">{content}</span>
                  ) : (
                    <Link href={`/lesson/${l.id}`} className={cls}>{content}</Link>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
