'use client'

import { useState } from 'react'
import { Award, BellOff, ClipboardCheck, MessageSquare, Video } from 'lucide-react'
import { Card, PageHeader } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { notifications as initial } from '@/lib/data'
import { cn } from '@/lib/utils'

const icons = {
  homework: { icon: ClipboardCheck, cls: 'bg-warning/15 text-warning' },
  live: { icon: Video, cls: 'bg-cyan/15 text-cyan' },
  achievement: { icon: Award, cls: 'bg-primary/15 text-violet-300' },
  chat: { icon: MessageSquare, cls: 'bg-success/15 text-success' },
}

export default function NotificationsPage() {
  const [items, setItems] = useState(initial)
  const unread = items.filter((n) => !n.read).length
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Уведомления" description={unread ? `${unread} непрочитанных` : 'Всё прочитано'}>
        <Button variant="outline" onClick={() => setItems(items.map((n) => ({ ...n, read: true })))} disabled={!unread}>Прочитать все</Button>
      </PageHeader>
      {items.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground"><BellOff className="size-10" /><p className="mt-3">Уведомлений нет</p></div>
      ) : (
        <Card className="p-0">
          <ul className="divide-y">
            {items.map((n) => {
              const m = icons[n.type as keyof typeof icons]
              return (
                <li key={n.id}>
                  <button onClick={() => setItems(items.map((x) => (x.id === n.id ? { ...x, read: true } : x)))} className={cn('flex w-full items-start gap-4 p-4 text-left hover:bg-accent', !n.read && 'bg-primary/5')}>
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', m.cls)}><m.icon className="size-4" /></span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-sm text-muted-foreground">{n.detail}</span>
                      <span className="mt-1 block text-xs text-muted-foreground/70">{n.time}</span>
                    </span>
                    {!n.read && <span className="mt-2 size-2 rounded-full bg-primary" aria-label="Не прочитано" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
