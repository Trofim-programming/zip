import { ChevronDown } from 'lucide-react'
import { SectionTitle } from './sections'

const faqs = [
  ['Нужен ли опыт программирования?', 'Нет. Треки для начинающих стартуют с нуля, а тест подберёт подходящий уровень.'],
  ['Сколько времени нужно на обучение?', 'В среднем 5–7 часов в неделю. Вы учитесь в своём темпе, живые занятия — раз в неделю.'],
  ['Как проверяются домашние задания?', 'Сначала автопроверка кода, затем комментарии преподавателя и начисление XP.'],
  ['AI Tutor решит задачу за меня?', 'Нет. AI объясняет и подсказывает, но не выдаёт готовых решений домашних заданий.'],
  ['Можно ли отменить подписку?', 'Да, в любой момент в настройках аккаунта.'],
]

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 py-24">
      <SectionTitle eyebrow="FAQ" title="Частые вопросы" />
      <div className="divide-y rounded-2xl border bg-card">
        {faqs.map(([q, a]) => (
          <details key={q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
              {q}
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
