'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Msg = { role: 'user' | 'ai'; text: string }

const quick = ['Объясни циклы', 'Найди ошибку в моём коде', 'Дай упражнение', 'Проверь, понял ли я тему']

// Mock tutor. To connect a real model, replace `reply` with a call to a server route using the AI SDK (streamText).
function reply(q: string, guided: boolean) {
  const t = q.toLowerCase()
  if (t.includes('реши') || t.includes('готов') || t.includes('ответ')) {
    return guided
      ? 'Я не дам готовое решение — так ты не научишься. Давай разобьём задачу: что должно быть на входе программы и что на выходе? Напиши первый шаг, и я подскажу, куда двигаться.'
      : 'Даже в обычном режиме я не решаю домашние задания целиком. Но могу показать похожий пример на другой задаче — хочешь?'
  }
  if (t.includes('цикл'))
    return 'Цикл повторяет блок кода. `for i in range(3)` выполнит тело 3 раза: i будет 0, 1, 2. Вопрос для проверки: сколько раз выполнится `range(2, 6)`?'
  if (t.includes('ошиб'))
    return 'Пришли фрагмент кода. Частые ошибки новичков: забытое двоеточие после `for`/`if`, неверный отступ и опечатки в именах переменных. Проверь сначала их.'
  if (t.includes('упражн'))
    return 'Упражнение: выведи все числа от 1 до 20, которые делятся на 3, но не делятся на 2. Подсказка: оператор `%` и `and`.'
  if (t.includes('понял') || t.includes('провер'))
    return 'Мини-тест: что выведет `print(len("code") * 2)`? Ответь, и я объясню, если что-то не так.'
  return guided
    ? 'Хороший вопрос! Давай подумаем вместе: что ты уже знаешь об этом? Опиши своими словами, а я дополню.'
    : 'Вот краткое объяснение: разбей задачу на маленькие шаги, проверяй каждый через print() и сравнивай результат с ожидаемым.'
}

export function AiTutor() {
  const [open, setOpen] = useState(false)
  const [guided, setGuided] = useState(true)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: 'Привет! Я AI Tutor. Объясню тему, подскажу и помогу найти ошибку — но решать за тебя не буду.' }])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, typing])

  const send = (text: string) => {
    if (!text.trim()) return
    setMsgs((m) => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: reply(text, guided) }])
      setTyping(false)
    }, 900)
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="glow fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-violet-500 px-4 py-3 text-sm font-medium text-white transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
        aria-expanded={open}
      >
        <Sparkles className="size-4" /> AI Tutor
      </button>
      {open && (
        <div className="glass fixed bottom-36 right-4 z-50 flex h-[520px] max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 lg:bottom-20 lg:right-6" role="dialog" aria-label="AI Tutor">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/20">
                <Bot className="size-4 text-violet-300" />
              </span>
              <div>
                <p className="text-sm font-medium">AI Tutor</p>
                <p className="text-xs text-success">онлайн</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Закрыть" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5 text-xs">
            <span>{'«Объясни мне, но не решай за меня»'}</span>
            <input type="checkbox" checked={guided} onChange={(e) => setGuided(e.target.checked)} className="peer sr-only" />
            <span className={cn('relative h-5 w-9 rounded-full transition-colors', guided ? 'bg-primary' : 'bg-accent')}>
              <span className={cn('absolute top-0.5 size-4 rounded-full bg-white transition-all', guided ? 'left-4.5' : 'left-0.5')} />
            </span>
          </label>
          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {msgs.map((m, i) => (
              <div key={i} className={cn('max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed', m.role === 'user' ? 'ml-auto bg-primary text-white' : 'bg-secondary')}>
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="flex w-14 gap-1 rounded-2xl bg-secondary px-3 py-3">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {quick.map((q) => (
              <button key={q} onClick={() => send(q)} className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                {q}
              </button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 border-t border-white/10 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Спроси про тему или код…"
              className="h-10 flex-1 rounded-xl bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Сообщение для AI Tutor"
            />
            <button type="submit" className="flex size-10 items-center justify-center rounded-xl bg-primary text-white" aria-label="Отправить">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
