'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Check, ChevronLeft, Lightbulb, PlayCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Card, Progress } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { CodeEditor } from '@/components/code/code-editor'
import { ModuleList } from '@/components/course/module-list'
import { allLessons } from '@/lib/data'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const quiz = [
  { q: 'Что выведет `print(3 > 2 and 2 > 5)`?', options: ['True', 'False', 'Ошибка', 'None'], answer: 1 },
  { q: 'Сколько раз выполнится `for i in range(1, 4)`?', options: ['4', '3', '1', 'Бесконечно'], answer: 1 },
]

export function LessonView({ lessonId }: { lessonId: string }) {
  const router = useRouter()
  const { completeLesson, addXp, completedLessons } = useAppStore()
  const idx = allLessons.findIndex((l) => l.id === lessonId)
  const lesson = allLessons[idx]
  const next = allLessons[idx + 1]
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [codePassed, setCodePassed] = useState(completedLessons.includes(lessonId))
  const quizDone = Object.keys(answers).length === quiz.length
  const quizScore = quiz.filter((q, i) => answers[i] === q.answer).length
  const steps = [true, codePassed, quizDone]
  const stepProgress = (steps.filter(Boolean).length / steps.length) * 100

  const finish = () => {
    completeLesson(lessonId)
    addXp(50)
    toast.success('Урок завершён +50 XP', { description: lesson.title })
    if (next) router.push(`/lesson/${next.id}`)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr_260px]">
      <aside className="hidden xl:block">
        <Link href="/courses/python" className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" /> Python Developer
        </Link>
        <Card className="sticky top-8 max-h-[calc(100vh-6rem)] overflow-y-auto p-3">
          <ModuleList activeId={lessonId} />
        </Card>
      </aside>

      <article className="min-w-0 space-y-6">
        <div>
          <Badge tone="cyan">Урок {idx + 1} · {lesson.minutes} мин</Badge>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">{lesson.title}</h1>
        </div>

        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/25 via-card to-cyan/10">
          <div className="grid-bg absolute inset-0" />
          <button onClick={() => toast('Видео будет подключено через хранилище файлов')} className="relative flex flex-col items-center gap-2 text-sm" aria-label="Смотреть видео">
            <PlayCircle className="size-16 text-white/90 transition-transform hover:scale-110" strokeWidth={1.2} />
            Видео-объяснение · 6:24
          </button>
        </div>

        <div className="space-y-4 leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">Условия</span> позволяют программе принимать решения, а{' '}
            <span className="text-foreground">циклы</span> — повторять действия. Вместе они — основа любой логики.
          </p>
          <pre className="overflow-x-auto rounded-xl border bg-[#0b0c10] p-4 font-mono text-sm text-foreground">
            <span className="text-violet-400">for</span> i <span className="text-violet-400">in</span> <span className="text-cyan">range</span>(1, 6):{'\n'}
            {'    '}<span className="text-violet-400">if</span> i % 2 == 0:{'\n'}
            {'        '}<span className="text-cyan">print</span>(i, <span className="text-emerald-300">{'"— чётное"'}</span>){'\n'}
            {'    '}<span className="text-violet-400">else</span>:{'\n'}
            {'        '}<span className="text-cyan">print</span>(i, <span className="text-emerald-300">{'"— нечётное"'}</span>)
          </pre>
          <div className="flex gap-3 rounded-xl border border-cyan/30 bg-cyan/5 p-4 text-sm">
            <Lightbulb className="size-5 shrink-0 text-cyan" />
            <p>
              <span className="font-medium text-foreground">Совет: </span>
              отступ в 4 пробела — не просто стиль. В Python он определяет, какой код относится к циклу или условию.
            </p>
          </div>
        </div>

        <section aria-labelledby="task">
          <h2 id="task" className="mb-1 text-lg font-medium">Задание 1 — Поприветствуй пользователя</h2>
          <p className="mb-3 text-sm text-muted-foreground">Программа должна спросить имя и вывести приветствие со словом «Привет».</p>
          <CodeEditor
            initialCode={'name = input("Как тебя зовут? ")\nprint("Привет,", name)\n'}
            onCheck={(_, r) => {
              const ok = !r.error && r.output.some((l) => l.includes('Привет'))
              setCodePassed(ok)
              ok ? toast.success('Все тесты пройдены', { description: '3/3 проверки' }) : toast.error('Тест не пройден', { description: 'Вывод должен содержать «Привет»' })
            }}
            actions={
              <Button variant="ghost" size="lg" disabled={!codePassed} onClick={() => document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' })}>
                Следующее задание <ArrowRight />
              </Button>
            }
          />
        </section>

        <section id="quiz" aria-labelledby="quiz-title" className="scroll-mt-8">
          <h2 id="quiz-title" className="mb-3 text-lg font-medium">Задание 2 — Мини-тест</h2>
          <div className="space-y-4">
            {quiz.map((item, qi) => (
              <Card key={qi}>
                <p className="mb-3 font-medium">{item.q.replace(/`/g, '')}</p>
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                  {item.options.map((o, oi) => {
                    const chosen = answers[qi] === oi
                    const answered = answers[qi] !== undefined
                    const correct = oi === item.answer
                    return (
                      <button
                        key={o}
                        role="radio"
                        aria-checked={chosen}
                        disabled={answered}
                        onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                        className={cn(
                          'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                          !answered && 'hover:border-primary/50 hover:bg-accent',
                          answered && correct && 'border-success/50 bg-success/10',
                          answered && chosen && !correct && 'border-destructive/50 bg-destructive/10',
                        )}
                      >
                        <span className="font-mono">{o}</span>
                        {answered && correct && <Check className="size-4 text-success" />}
                        {answered && chosen && !correct && <X className="size-4 text-destructive" />}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
          {quizDone && (
            <p className="mt-3 text-sm text-muted-foreground">
              Результат: <span className="text-foreground">{quizScore}/{quiz.length}</span>
            </p>
          )}
        </section>

        <div className="flex justify-end border-t pt-6">
          <Button size="xl" disabled={!codePassed || !quizDone} onClick={finish}>
            {next ? 'Завершить и перейти дальше' : 'Завершить урок'} <ArrowRight />
          </Button>
        </div>
      </article>

      <aside className="order-first xl:order-none">
        <Card className="xl:sticky xl:top-8">
          <p className="text-sm font-medium">Прогресс урока</p>
          <Progress value={stepProgress} className="mt-3" />
          <ul className="mt-4 space-y-3 text-sm">
            {['Теория', 'Задание с кодом', 'Мини-тест'].map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                <span className={cn('flex size-5 items-center justify-center rounded-full border', steps[i] && 'border-success bg-success/20 text-success')}>
                  {steps[i] && <Check className="size-3" />}
                </span>
                <span className={steps[i] ? '' : 'text-muted-foreground'}>{s}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl bg-warning/10 p-3 text-sm">
            <p className="font-medium text-warning">+50 XP</p>
            <p className="text-xs text-muted-foreground">за завершение урока</p>
          </div>
        </Card>
      </aside>
    </div>
  )
}
