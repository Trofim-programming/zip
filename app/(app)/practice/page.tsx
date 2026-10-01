'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Crown, Zap } from 'lucide-react'
import { Avatar, Badge, Card, Chip, PageHeader } from '@/components/kit'
import { CodeEditor } from '@/components/code/code-editor'
import { leaderboard, practiceTasks } from '@/lib/data'
import { cn } from '@/lib/utils'

const cats = ['Python', 'JavaScript', 'React', 'SQL', 'Algorithms']
const diffTone = { 'Лёгкое': 'success', 'Среднее': 'warning', 'Сложное': 'danger' } as const

export default function PracticePage() {
  const [cat, setCat] = useState<string | null>(null)
  const [diff, setDiff] = useState<string | null>(null)
  const [active, setActive] = useState(practiceTasks[0])
  const list = practiceTasks.filter((t) => (!cat || t.category === cat) && (!diff || t.difficulty === diff))
  const solved = practiceTasks.filter((t) => t.solved).length

  return (
    <div>
      <PageHeader title="Практика" description="Задачи на алгоритмы и языки — зарабатывайте XP и поднимайтесь в рейтинге" />
      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={!cat} onClick={() => setCat(null)}>Все</Chip>
        {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{c}</Chip>)}
        <span className="mx-1 w-px bg-border" />
        {['Лёгкое', 'Среднее', 'Сложное'].map((d) => <Chip key={d} active={diff === d} onClick={() => setDiff(diff === d ? null : d)}>{d}</Chip>)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-0">
            {list.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Задачи практики пока не добавлены
              </div>
            ) : (
              <ul className="divide-y">
                {list.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setActive(t)} className={cn('flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-accent', active?.id === t.id && 'bg-primary/10')}>
                      {t.solved ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                      <span className="flex-1 font-medium">{t.title}</span>
                      <Badge className="hidden sm:inline-flex">{t.category}</Badge>
                      <Badge tone={diffTone[t.difficulty as keyof typeof diffTone]}>{t.difficulty}</Badge>
                      <span className="hidden w-16 text-right text-xs text-muted-foreground md:block">{t.rate}% решили</span>
                      <span className="flex w-14 items-center justify-end gap-1 text-sm text-warning"><Zap className="size-3.5" />{t.xp}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {active ? (
            <div>
              <h2 className="mb-3 text-lg font-medium">{active.title}</h2>
              <CodeEditor key={active.id} initialCode={`# ${active.title}\na = 12\nb = 30\nprint("Результат:", a + b)\n`} filename="solution.py" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Выберите задачу из списка выше для написания решения
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <p className="text-sm text-muted-foreground">Решено задач</p>
            <p className="mt-1 text-3xl font-semibold">{solved}<span className="text-lg text-muted-foreground">/{practiceTasks.length}</span></p>
          </Card>
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-medium"><Crown className="size-4 text-warning" /> Рейтинг недели</h2>
            <ol className="space-y-2">
              {leaderboard.map((u, i) => (
                <li key={u.name} className={cn('flex items-center gap-3 rounded-lg p-2', u.me && 'bg-primary/10 ring-1 ring-primary/30')}>
                  <span className={cn('w-5 text-center text-sm font-semibold', i === 0 ? 'text-warning' : 'text-muted-foreground')}>{i + 1}</span>
                  <Avatar name={u.name} className="size-8 text-[10px]" />
                  <span className="flex-1 truncate text-sm">{u.name}{u.me && ' (вы)'}</span>
                  <span className="text-sm text-muted-foreground">{u.xp.toLocaleString('ru-RU')}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
