'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Award, BookOpen, Flame, Send, Zap } from 'lucide-react'
import { Avatar, Badge, Card, Progress } from '@/components/kit'
import { buttonVariants } from '@/components/ui/button'
import { courses } from '@/lib/data'
import { levelFromXp, useAppStore } from '@/lib/store'

export default function ProfilePage() {
  const { user, xp } = useAppStore()
  const lvl = levelFromXp(xp)
  const [tgLinked, setTgLinked] = useState(false)
  const [tgUsername, setTgUsername] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/telegram')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTgLinked(data.linked)
          setTgUsername(data.telegramUsername)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="relative overflow-hidden p-0">
        <div className="grid-bg h-32 bg-gradient-to-r from-primary/40 to-cyan/30" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <Avatar name={`${user.firstName} ${user.lastName}`} className="-mt-12 size-24 border-4 border-card text-2xl" />
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{user.firstName} {user.lastName}</h1>
            <p className="text-sm text-muted-foreground">@{user.username} · {user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              {tgLinked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-400">
                  <Send className="size-3" /> Telegram: @{tgUsername || 'подключен'}
                </span>
              ) : (
                <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Send className="size-3" /> Подключить Telegram-бота →
                </Link>
              )}
            </div>
          </div>
          <Badge tone="primary">Lvl {lvl.level} · {lvl.name}</Badge>
          <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>Редактировать</Link>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[{ i: Zap, l: 'XP', v: xp }, { i: Flame, l: 'Серия', v: '1 день' }, { i: BookOpen, l: 'Курсов', v: 0 }, { i: Award, l: 'Наград', v: 0 }].map((s) => (
          <Card key={s.l}><s.i className="size-4 text-cyan" /><p className="mt-3 text-xl font-semibold">{s.v}</p><p className="text-sm text-muted-foreground">{s.l}</p></Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-4 font-medium">Курсы</h2>
        {courses.filter((c) => c.progress > 0).length === 0 ? (
          <div className="rounded-xl border border-dashed py-8 text-center">
            <p className="text-sm text-muted-foreground">Вы пока не записаны на курсы</p>
            <Link href="/courses" className="mt-2 inline-block text-xs text-violet-300 hover:underline">
              Перейти в каталог курсов →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {courses.filter((c) => c.progress > 0).map((c) => (
              <div key={c.id}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{c.title}</span><span className="text-muted-foreground">{c.progress}%</span></div>
                <Progress value={c.progress} tone={c.progress === 100 ? 'success' : 'primary'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
