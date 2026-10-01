'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { GraduationCap, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import { AuthShell, Field, GoogleButton } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { useAppStore, ADMIN_EMAIL, type Role } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const { login, refreshUser } = useAppStore()
  const [role, setRole] = useState<Role>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const f = new FormData(e.currentTarget)
    const firstName = String(f.get('firstName') || '').trim()
    const lastName = String(f.get('lastName') || '').trim()
    const email = String(f.get('email') || '').trim().toLowerCase()
    const username = String(f.get('username') || '').trim().toLowerCase()
    const password = String(f.get('password') || '')
    const confirm = String(f.get('confirm') || '')

    if (password !== confirm) return setError('Пароли не совпадают')
    if (password.length < 8) return setError('Пароль должен быть не короче 8 символов')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, username, password, role }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации')
        toast.error(data.error || 'Ошибка регистрации')
        setLoading(false)
        return
      }

      login(data.user)
      await refreshUser()
      toast.success('Аккаунт создан', { description: '+50 XP за регистрацию' })

      if (email === ADMIN_EMAIL.toLowerCase()) {
        router.push('/admin')
      } else if (data.user.role === 'teacher') {
        router.push('/teacher')
      } else {
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Ошибка подключения к серверу')
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Создать аккаунт" subtitle="Первый урок — бесплатно">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Роль">
          {(
            [
              ['student', 'Ученик', GraduationCap],
              ['teacher', 'Преподаватель', Presentation],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={role === value}
              onClick={() => setRole(value)}
              className={cn(
                'flex items-center gap-2 rounded-xl border p-3 text-sm transition-all',
                role === value ? 'border-primary bg-primary/10' : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="Имя" required placeholder="Алекс" />
          <Field id="lastName" label="Фамилия" required placeholder="Морозов" />
        </div>
        <Field id="email" label="Email" type="email" required placeholder="you@mail.com" />
        <Field id="username" label="Username" required placeholder="alexdev" pattern="[a-zA-Z0-9_]{3,20}" />
        <div className="grid grid-cols-2 gap-3">
          <Field id="password" label="Пароль" type="password" required placeholder="••••••••" />
          <Field id="confirm" label="Подтверждение" type="password" required placeholder="••••••••" />
        </div>
        {error && <p className="text-sm text-rose-300" role="alert">{error}</p>}
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" required className="mt-0.5 size-4 accent-primary" />
          Я принимаю условия использования и политику конфиденциальности
        </label>
        <Button type="submit" size="xl" className="w-full" disabled={loading}>
          {loading ? 'Создаём аккаунт…' : 'Создать аккаунт'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {'Уже есть аккаунт? '}
          <Link href="/login" className="text-violet-300 hover:underline">
            Войти
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
