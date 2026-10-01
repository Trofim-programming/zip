import Link from 'next/link'
import { ArrowRight, Award, CheckCircle2, Clock, Play, Sparkles, Zap } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/kit'

export function Hero() {
  return (
    <section className="relative">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-cyan" />
            {'Новое: AI Tutor, который объясняет, а не решает'}
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
            Программирование, которое{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan bg-clip-text text-transparent">хочется изучать.</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Практические курсы, интерактивные задания, живые занятия и персональный прогресс в одной платформе.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className={buttonVariants({ size: 'xl' })}>
              Начать обучение <ArrowRight />
            </Link>
            <Link href="/courses" className={buttonVariants({ size: 'xl', variant: 'outline' })}>
              Посмотреть курсы
            </Link>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {[
              ['48K+', 'учеников'],
              ['120+', 'курсов'],
              ['4.9', 'рейтинг'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="text-2xl font-semibold">{v}</dd>
                <dd className="text-sm text-muted-foreground">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Mockup />
      </div>
    </section>
  )
}

function Mockup() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
      <div className="glow overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-xs text-muted-foreground">codelab.dev/lesson/loops</span>
        </div>
        <div className="grid grid-cols-5">
          <div className="col-span-2 hidden space-y-2 border-r p-4 sm:block">
            <p className="text-xs text-muted-foreground">Модуль 2 — Условия</p>
            {['Операторы сравнения', 'Циклы и условия', 'Тест'].map((t, i) => (
              <div key={t} className={`rounded-lg px-2 py-1.5 text-xs ${i === 1 ? 'bg-primary/15 text-foreground' : 'text-muted-foreground'}`}>
                {t}
              </div>
            ))}
            <div className="pt-4">
              <p className="mb-2 text-xs text-muted-foreground">Прогресс курса</p>
              <Progress value={68} />
              <p className="mt-1 text-xs">68%</p>
            </div>
          </div>
          <div className="col-span-5 p-4 sm:col-span-3">
            <p className="text-sm font-medium">Циклы и условия</p>
            <pre className="mt-3 rounded-lg bg-background p-3 font-mono text-xs leading-relaxed">
              <span className="text-violet-400">for</span> i <span className="text-violet-400">in</span>{' '}
              <span className="text-cyan">range</span>(1, 6):{'\n'}
              {'    '}
              <span className="text-violet-400">if</span> i % 2 == 0:{'\n'}
              {'        '}
              <span className="text-cyan">print</span>(<span className="text-emerald-300">{'"чётное"'}</span>, i)
            </pre>
            <div className="mt-3 rounded-lg border bg-background/60 p-3 font-mono text-xs text-muted-foreground">
              <p className="text-success">{'> чётное 2'}</p>
              <p className="text-success">{'> чётное 4'}</p>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs text-white">
                <Play className="size-3" /> Запустить
              </span>
              <span className="rounded-md border px-2.5 py-1 text-xs">Проверить</span>
            </div>
          </div>
        </div>
      </div>
      <FloatCard className="-left-6 top-10 md:-left-14" icon={<Zap className="size-4 text-warning" />} title="Урок завершён" sub="+50 XP" />
      <FloatCard className="-right-4 top-1/3 [animation-delay:1s] md:-right-12" icon={<CheckCircle2 className="size-4 text-success" />} title="Домашнее задание" sub="проверено" />
      <FloatCard className="-left-4 bottom-16 [animation-delay:2s] md:-left-10" icon={<Award className="size-4 text-violet-400" />} title="Новое достижение" sub="7 дней подряд" />
      <FloatCard className="-bottom-6 right-6 [animation-delay:3s]" icon={<Clock className="size-4 text-cyan" />} title="Следующий урок" sub="через 5 минут" />
    </div>
  )
}

function FloatCard({ className, icon, title, sub }: { className: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className={`glass animate-float absolute flex items-center gap-3 rounded-xl px-3 py-2 shadow-2xl ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-white/5">{icon}</span>
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}
