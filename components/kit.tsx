import Link from 'next/link'
import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 font-medium tracking-tight text-foreground transition-opacity hover:opacity-90', className)}>
      <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-zinc-900 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]">
        <Terminal className="size-3.5" />
      </span>
      <span className="text-sm font-semibold tracking-wide text-zinc-100">CODELAB</span>
    </Link>
  )
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.07] bg-[#101014] p-4 text-card-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:p-5',
        className,
      )}
      {...props}
    />
  )
}

const badgeTones = {
  default: 'bg-zinc-800/60 text-zinc-300 border-white/[0.06]',
  primary: 'bg-white/10 text-white border-white/15',
  cyan: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function Badge({
  tone = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none tracking-wide',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  )
}

export function Progress({
  value,
  className,
  tone = 'primary',
}: {
  value: number
  className?: string
  tone?: 'primary' | 'cyan' | 'success'
}) {
  const bar = {
    primary: 'bg-white',
    cyan: 'bg-cyan-400',
    success: 'bg-emerald-400',
  }[tone]

  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = (name || 'U')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-[11px] font-medium text-zinc-200 select-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]',
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">{title}</h1>
        {description && <p className="mt-0.5 text-xs text-zinc-400">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-white/20 bg-white/10 text-white shadow-sm'
          : 'border-white/[0.06] bg-zinc-900/60 text-zinc-400 hover:border-white/15 hover:bg-zinc-800/80 hover:text-zinc-200',
        className,
      )}
      {...props}
    />
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-800/60', className)} />
}
