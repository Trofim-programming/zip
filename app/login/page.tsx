'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { AuthShell, Field, GoogleButton } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { useAppStore, ADMIN_EMAIL } from '@/lib/store'

export default function LoginPage() {
  const router = useRouter()
  const { login, refreshUser } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const form = new FormData(e.currentTarget)
    const identity = String(form.get('identity') || '').trim()
    const password = String(form.get('password') || '').trim()

    if (!identity || !password) {
      setError('Заполните email или username и пароль')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка входа')
        toast.error(data.error || 'Неверный логин или пароль')
        setLoading(false)
        return
      }

      login(data.user)
      await refreshUser()
      toast.success('С возвращением, ' + data.user.firstName + '!')

      if (data.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() || data.user.role === 'admin') {
        router.push('/admin')
      } else if (data.user.role === 'teacher') {
        router.push('/teacher')
      } else {
        router.push('/dashboard')
      }
    } catch {
      setError('Ошибка подключения к серверу')
      toast.error('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Вход в CODELAB" subtitle="Продолжите обучение с того места, где остановились">
      <form onSubmit={onSubmit} className="space-y-4">
        <GoogleButton onClick={() => toast.info('Для входа введите ваш email/username и пароль')} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> или <span className="h-px flex-1 bg-border" />
        </div>
        <Field id="identity" label="Email или username" placeholder="Введите ваш email или логин" required />
        <Field id="password" label="Пароль" type="password" placeholder="Введите пароль" required />

        {error && <p className="text-sm text-rose-400" role="alert">{error}</p>}

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" defaultChecked className="size-4 accent-primary" /> Запомнить меня
          </label>
          <button type="button" onClick={() => toast('Ссылка для сброса отправлена на почту')} className="text-violet-300 hover:underline">
            Забыли пароль?
          </button>
        </div>
        <Button type="submit" size="xl" className="w-full" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {'Нет аккаунта? '}
          <Link href="/register" className="text-violet-300 hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}
