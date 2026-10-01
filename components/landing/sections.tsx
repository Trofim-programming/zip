import Link from 'next/link'
import { Bot, Brain, Code2, MessageSquare, PenTool, Star, Trophy, Video } from 'lucide-react'
import { Avatar, Badge } from '@/components/kit'
import { courses } from '@/lib/data'

const steps = [
  { n: '01', title: 'Выбери курс', text: 'Пройди короткий тест — мы подберём трек под твой уровень и цели.' },
  { n: '02', title: 'Учись на практике', text: 'Каждый урок — теория, код в браузере и мгновенная проверка.' },
  { n: '03', title: 'Живые занятия', text: 'Еженедельные созвоны с преподавателем, доска и разборы ошибок.' },
  { n: '04', title: 'Собери портфолио', text: 'Проекты, достижения и публичный профиль разработчика.' },
]

const features = [
  { icon: Code2, title: 'Редактор кода в браузере', text: 'Запускай код и проверяй решения без установки.' },
  { icon: Video, title: 'Онлайн-занятия', text: 'Видео, демонстрация экрана и поднятие руки.' },
  { icon: PenTool, title: 'Виртуальная доска', text: 'Схемы и объяснения прямо во время урока.' },
  { icon: Bot, title: 'AI Tutor', text: 'Подсказки и объяснения без готовых ответов.' },
  { icon: MessageSquare, title: 'Чаты', text: 'Курс, урок, группа и личные сообщения.' },
  { icon: Trophy, title: 'XP и достижения', text: 'Уровни, серии дней и рейтинг учеников.' },
]

const teachers = [
  { name: 'Мария Волкова', role: 'Python, AI', exp: 'Senior ML Engineer, 9 лет' },
  { name: 'Дмитрий Орлов', role: 'JavaScript, Backend', exp: 'Tech Lead, 11 лет' },
  { name: 'Анна Ким', role: 'React, TypeScript', exp: 'Frontend Architect, 8 лет' },
  { name: 'Игорь Лебедев', role: 'C++, Алгоритмы', exp: 'Призёр ICPC, 10 лет' },
]

export function Sections() {
  return (
    <>
      <section id="courses" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
        <SectionTitle eyebrow="Курсы" title="Популярные направления" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {courses.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/courses/${c.id}`} className="group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40">
              <div className={`mb-4 h-24 rounded-xl bg-gradient-to-br ${c.hue} grid-bg`} />
              <Badge>{c.category}</Badge>
              <h3 className="mt-2 font-medium">{c.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3 fill-warning text-warning" /> {c.rating} · {c.lessons} уроков
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="border-y bg-card/40">
        <div className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
          <SectionTitle eyebrow="Процесс" title="Как проходит обучение" />
          <ol className="grid gap-6 md:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="relative">
                <span className="font-mono text-sm text-violet-400">{s.n}</span>
                <h3 className="mt-2 text-lg font-medium">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="teachers" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
        <SectionTitle eyebrow="Команда" title="Преподаватели-практики" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {teachers.map((t) => (
            <div key={t.name} className="rounded-2xl border bg-card p-6">
              <Avatar name={t.name} className="size-14 text-base" />
              <h3 className="mt-4 font-medium">{t.name}</h3>
              <p className="text-sm text-violet-300">{t.role}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t.exp}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-20 px-6 pb-24">
        <SectionTitle eyebrow="Платформа" title="Всё для обучения в одном месте" />
        <div className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="bg-card p-6 transition-colors hover:bg-secondary">
              <f.icon className="size-5 text-cyan" />
              <h3 className="mt-4 font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-gradient-to-r from-primary/15 to-cyan/5 p-6">
          <Brain className="size-6 shrink-0 text-violet-300" />
          <p className="text-sm">
            <span className="font-medium">{'«Объясни мне, но не решай за меня»'}</span>
            <span className="text-muted-foreground">{' — режим AI Tutor, который помогает понять тему, а не списать.'}</span>
          </p>
        </div>
      </section>
    </>
  )
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="text-sm font-medium text-cyan">{eyebrow}</p>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
    </div>
  )
}
