'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/kit'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { href: '#courses', label: 'Курсы' },
  { href: '#how', label: 'Как проходит обучение' },
  { href: '#teachers', label: 'Преподаватели' },
  { href: '#features', label: 'Возможности' },
  { href: '#pricing', label: 'Тарифы' },
  { href: '#faq', label: 'FAQ' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-6 lg:flex" aria-label="Основная навигация">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
            Войти
          </Link>
          <Link href="/register" className={buttonVariants({ size: 'lg' })}>
            Начать обучение
          </Link>
        </div>
        <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Меню" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div className={cn('border-t px-6 py-4 lg:hidden', open ? 'block' : 'hidden')}>
        <nav className="flex flex-col gap-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-muted-foreground">
              {l.label}
            </a>
          ))}
          <div className="mt-2 flex gap-2">
            <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'xl' }), 'flex-1')}>
              Войти
            </Link>
            <Link href="/register" className={cn(buttonVariants({ size: 'xl' }), 'flex-1')}>
              Начать
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
