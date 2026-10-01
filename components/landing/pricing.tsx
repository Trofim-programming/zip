'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { plans } from '@/lib/data'
import { cn } from '@/lib/utils'
import { SectionTitle } from './sections'

// Payment provider hook-in point: replace handleSelect with a server action creating a checkout session.
export function Pricing() {
  const [yearly, setYearly] = useState(false)

  const handleSelect = (name: string) => {
    toast.success(`Тариф ${name} выбран`, { description: 'Оплата будет подключена позже — это демо-режим.' })
  }

  return (
    <section id="pricing" className="border-t bg-card/40">
      <div className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionTitle eyebrow="Тарифы" title="Выберите свой темп" />
          <div className="mb-10 inline-flex rounded-full border p-1 text-sm" role="group" aria-label="Период оплаты">
            {[false, true].map((y) => (
              <button
                key={String(y)}
                onClick={() => setYearly(y)}
                aria-pressed={yearly === y}
                className={cn('rounded-full px-4 py-1.5 transition-colors', yearly === y ? 'bg-primary text-white' : 'text-muted-foreground')}
              >
                {y ? 'Год −20%' : 'Месяц'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={cn('relative flex flex-col rounded-2xl border bg-card p-8', p.highlight && 'glow border-primary/50')}>
              {p.highlight && (
                <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-white">Популярный</span>
              )}
              <h3 className="font-mono text-sm tracking-widest text-muted-foreground">{p.name}</h3>
              <p className="mt-4 text-4xl font-semibold">
                {Math.round(yearly ? p.price * 0.8 : p.price).toLocaleString('ru-RU')} ₽
                <span className="text-base font-normal text-muted-foreground"> / мес</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="size-4 text-cyan" /> {f}
                  </li>
                ))}
              </ul>
              <Button size="xl" variant={p.highlight ? 'default' : 'outline'} className="mt-8 w-full" onClick={() => handleSelect(p.name)}>
                Выбрать {p.name}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
