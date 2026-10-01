'use client'

import { Brain, CalendarCheck, Code, Crown, Flame, Lock, Rocket, Trophy, Zap } from 'lucide-react'
import { Card, PageHeader, Progress } from '@/components/kit'
import { achievements } from '@/lib/data'
import { levels, levelFromXp, useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const icons = { Trophy, Flame, Code, Zap, Rocket, Crown, Brain, CalendarCheck }

export default function AchievementsPage() {
  const { xp } = useAppStore()
  const lvl = levelFromXp(xp)
  return (
    <div className="space-y-6">
      <PageHeader title="Достижения" description="Уровни, награды и прогресс" />
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 size-60 rounded-full bg-primary/25 blur-[80px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan text-3xl font-bold text-white">{lvl.level}</div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Текущий уровень</p>
            <p className="text-2xl font-semibold">{lvl.name}</p>
            <Progress value={lvl.progress} className="mt-3 max-w-md" />
            <p className="mt-2 text-sm text-muted-foreground">{xp.toLocaleString('ru-RU')} XP {lvl.next && `· до «${lvl.next.name}» ${lvl.next.min - xp} XP`}</p>
          </div>
        </div>
        <ol className="relative mt-6 grid grid-cols-2 gap-2 md:grid-cols-5">
          {levels.map((l, i) => (
            <li key={l.name} className={cn('rounded-xl border p-3 text-sm', i + 1 <= lvl.level ? 'border-primary/40 bg-primary/10' : 'opacity-50')}>
              <p className="font-medium">{l.name}</p>
              <p className="text-xs text-muted-foreground">{l.min.toLocaleString('ru-RU')} XP</p>
            </li>
          ))}
        </ol>
      </Card>

      {achievements.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <Trophy className="mx-auto size-10 text-muted-foreground mb-3 opacity-60" />
          <p className="font-medium text-foreground">Достижения пока не открыты</p>
          <p className="text-xs text-muted-foreground mt-1">Проходите уроки и выполняйте задания для получения наград</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {achievements.map((a) => {
            const Icon = icons[a.icon as keyof typeof icons]
            return (
              <Card key={a.id} className={cn('text-center transition-transform hover:-translate-y-1', !a.unlocked && 'opacity-70')}>
                <div className={cn('mx-auto flex size-16 items-center justify-center rounded-2xl', a.unlocked ? 'bg-gradient-to-br from-warning/30 to-primary/30 glow' : 'bg-secondary')}>
                  {a.unlocked ? <Icon className="size-7 text-warning" /> : <Lock className="size-6 text-muted-foreground" />}
                </div>
                <p className="mt-4 font-medium">{a.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{a.description}</p>
                {!a.unlocked && <><Progress value={a.progress} className="mt-4" tone="cyan" /><p className="mt-1 text-xs text-muted-foreground">{a.progress}%</p></>}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
