'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Award, BookOpen, CalendarDays, ClipboardList, Code2, GraduationCap, Home, LayoutDashboard, LogOut,
  Menu, MessageSquare, Bell, PenTool, Settings, Shield, Video, X, Dumbbell, CreditCard,
} from 'lucide-react'
import { Avatar, Logo } from '@/components/kit'
import { useAppStore, levelFromXp, ADMIN_EMAIL, type Role } from '@/lib/store'
import { cn } from '@/lib/utils'

const studentNav = [
  { href: '/dashboard', label: 'Главная', icon: Home },
  { href: '/courses', label: 'Мои курсы', icon: BookOpen },
  { href: '/lesson/l5', label: 'Уроки', icon: Code2 },
  { href: '/homework', label: 'Домашние задания', icon: ClipboardList },
  { href: '/practice', label: 'Практика', icon: Dumbbell },
  { href: '/live', label: 'Онлайн-занятия', icon: Video },
  { href: '/chat', label: 'Чат', icon: MessageSquare },
  { href: '/board', label: 'Доска', icon: PenTool },
  { href: '/achievements', label: 'Достижения', icon: Award },
  { href: '/schedule', label: 'Расписание', icon: CalendarDays },
  { href: '/notifications', label: 'Уведомления', icon: Bell, badge: 3 },
  { href: '/pricing', label: 'Тарифы', icon: CreditCard },
  { href: '/settings', label: 'Настройки', icon: Settings },
]

const roleLabels: Record<Role, string> = { student: 'Ученик', teacher: 'Преподаватель', admin: 'Администратор' }

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { user } = useAppStore()

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const isTeacher = user.role === 'teacher' || isAdmin

  const extra: { href: string; label: string; icon: typeof Home }[] = []
  if (isAdmin) {
    extra.push({ href: '/admin', label: 'Админ-панель', icon: Shield })
  }
  if (isTeacher) {
    extra.push({ href: '/teacher', label: 'Панель преподавателя', icon: GraduationCap })
  }

  const renderItem = (item: (typeof studentNav)[number]) => {
    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href.split('/').slice(0, 2).join('/')))
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
            active
              ? 'bg-white/[0.08] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
              : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200',
          )}
        >
          {active && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-white" />}
          <item.icon className={cn('size-4', active ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300')} />
          <span className="flex-1">{item.label}</span>
          {item.badge ? (
            <span className="rounded-md border border-white/10 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-200">
              {item.badge}
            </span>
          ) : null}
        </Link>
      </li>
    )
  }
  return (
    <nav aria-label="Навигация кабинета" className="flex-1 overflow-y-auto px-3">
      {extra.length > 0 && (
        <>
          <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Управление</p>
          <ul className="mb-3 space-y-0.5">{extra.map((i) => renderItem(i as (typeof studentNav)[number]))}</ul>
        </>
      )}
      <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Обучение</p>
      <ul className="space-y-0.5">{studentNav.map(renderItem)}</ul>
    </nav>
  )
}

function UserFooter() {
  const { user, xp, logout } = useAppStore()
  const router = useRouter()
  const lvl = levelFromXp(xp)
  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="border-t border-white/[0.06] p-3">
      {isAdmin && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-[11px] text-zinc-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
          <span className="flex items-center gap-1.5 font-medium"><Shield className="size-3 text-zinc-300" /> Главный админ</span>
          <span className="text-[9px] uppercase tracking-wider text-zinc-400">Full Access</span>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-lg p-1">
        <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3">
          <span className="relative">
            <Avatar name={`${user.firstName} ${user.lastName}`} />
            <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-black bg-emerald-500" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-zinc-200">
              {user.firstName} {user.lastName}
            </span>
            <span className="block truncate text-[11px] text-zinc-400">
              {isAdmin ? 'Администратор' : roleLabels[user.role]} · Lvl {lvl.level}
            </span>
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-colors"
          aria-label="Выйти"
          title="Выйти"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b0e] lg:flex">
      <div className="px-5 py-4">
        <Logo />
      </div>
      <NavList />
      <UserFooter />
    </aside>
  )
}

const mobileTabs = [
  { href: '/dashboard', label: 'Главная', icon: LayoutDashboard },
  { href: '/courses', label: 'Курсы', icon: BookOpen },
  { href: '/homework', label: 'Задания', icon: ClipboardList },
  { href: '/chat', label: 'Чат', icon: MessageSquare },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  return (
    <>
      <header className="sticky top-0 z-40 flex h-13 items-center justify-between border-b border-white/[0.06] bg-[#09090b]/90 px-4 backdrop-blur-xl lg:hidden">
        <Logo />
        <Link href="/notifications" className="relative p-2 text-zinc-400 hover:text-white" aria-label="Уведомления">
          <Bell className="size-4" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-white" />
        </Link>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/[0.06] bg-[#0b0b0e]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Мобильная навигация">
        {mobileTabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn('flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors', pathname.startsWith(t.href) ? 'text-white' : 'text-zinc-500 hover:text-zinc-300')}
          >
            <t.icon className="size-4" />
            {t.label}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2 text-[10px] font-medium text-zinc-500 hover:text-zinc-300" aria-label="Открыть меню">
          <Menu className="size-4" /> Ещё
        </button>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <button className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Закрыть меню" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-white/[0.06] bg-[#0b0b0e] animate-in slide-in-from-left">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <Logo />
              <button onClick={() => setOpen(false)} aria-label="Закрыть" className="text-zinc-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <UserFooter />
          </div>
        </div>
      )}
    </>
  )
}
