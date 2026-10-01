'use client'

import { useEffect, useState } from 'react'
import { Card, PageHeader } from '@/components/kit'
import { events as fallbackEvents, type EventType } from '@/lib/data'
import { cn } from '@/lib/utils'

const meta: Record<EventType, { label: string; cls: string; dot: string }> = {
  live: { label: 'Онлайн-урок', cls: 'bg-primary/15 text-violet-300', dot: 'bg-primary' },
  deadline: { label: 'Дедлайн', cls: 'bg-destructive/15 text-rose-300', dot: 'bg-destructive' },
  homework: { label: 'Домашнее задание', cls: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  event: { label: 'Мероприятие', cls: 'bg-cyan/15 text-cyan', dot: 'bg-cyan' },
  extra: { label: 'Доп. занятие', cls: 'bg-success/15 text-success', dot: 'bg-success' },
}
const week = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function SchedulePage() {
  const [eventList, setEventList] = useState(fallbackEvents)
  const [selected, setSelected] = useState({ day: 30, month: 'sep' })

  useEffect(() => {
    fetch('/api/schedule')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events)) {
          setEventList(data.events)
        }
      })
      .catch((err) => console.error('Failed to load events:', err))
  }, [])

  // October 2026 starts on Thursday, so the grid opens with Mon 28 – Wed 30 Sep (today).
  const grid: { day: number; month: 'sep' | 'oct' }[] = [
    { day: 28, month: 'sep' }, { day: 29, month: 'sep' }, { day: 30, month: 'sep' },
    ...Array.from({ length: 31 }, (_, i) => ({ day: i + 1, month: 'oct' as const })),
  ]
  const eventsFor = (d: { day: number; month: string }) =>
    eventList.filter((e) => (d.month === 'sep' ? e.day === 30 && d.day === 30 : e.day === d.day && e.day !== 30))
  const selectedEvents = eventsFor(selected)

  return (
    <div>
      <PageHeader title="Расписание" description="Сентябрь — октябрь 2026">
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.values(meta).map((m) => <span key={m.label} className="flex items-center gap-1.5"><span className={cn('size-2 rounded-full', m.dot)} />{m.label}</span>)}
        </div>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card className="p-3 md:p-5">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {week.map((w) => <div key={w} className="pb-2 text-center text-xs text-muted-foreground">{w}</div>)}
            {grid.map((d, i) => {
              const evs = eventsFor(d)
              const isToday = d.month === 'sep' && d.day === 30
              return (
                <button
                  key={i}
                  onClick={() => setSelected(d)}
                  className={cn('flex min-h-16 flex-col rounded-lg border p-1.5 text-left transition-colors hover:border-primary/40 md:min-h-24', d.month === 'sep' && !isToday && 'opacity-40', selected.day === d.day && selected.month === d.month && 'border-primary bg-primary/5')}
                >
                  <span className={cn('flex size-6 items-center justify-center rounded-full text-xs', isToday && 'bg-primary text-white')}>{d.day}</span>
                  <span className="mt-1 hidden space-y-1 md:block">
                    {evs.slice(0, 2).map((e) => <span key={e.id} className={cn('block truncate rounded px-1.5 py-0.5 text-[10px]', meta[e.type as EventType]?.cls || 'bg-secondary')}>{e.title}</span>)}
                  </span>
                  <span className="mt-auto flex gap-0.5 md:hidden">{evs.map((e) => <span key={e.id} className={cn('size-1.5 rounded-full', meta[e.type as EventType]?.dot || 'bg-primary')} />)}</span>
                </button>
              )
            })}
          </div>
        </Card>
        <Card>
          <h2 className="font-medium">{selected.month === 'sep' ? `${selected.day} сентября${selected.day === 30 ? ' (сегодня)' : ''}` : `${selected.day} октября`}</h2>
          {selectedEvents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Событий нет</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedEvents.map((e) => (
                <li key={e.id} className="flex gap-3 rounded-xl border p-3">
                  <span className={cn('w-1 rounded-full', meta[e.type as EventType]?.dot || 'bg-primary')} />
                  <div><p className="text-sm font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{e.time} · {meta[e.type as EventType]?.label || e.type}</p></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
