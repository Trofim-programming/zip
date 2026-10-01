'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BookOpen, CreditCard, Lock, Plus, Search, ShieldAlert,
  Trash2, TrendingUp, UserPlus, Users, X
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, Badge, Card, PageHeader } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { BarChart } from '@/components/admin/bar-chart'
import { activitySeries, months } from '@/lib/data'
import { useAppStore, ADMIN_EMAIL } from '@/lib/store'

const roleLabel = { student: 'Ученик', teacher: 'Преподаватель', admin: 'Админ' } as const

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
  courses: number
  joined: string
}

export default function AdminPage() {
  const { user } = useAppStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalCourses: 0, totalHomeworks: 0 })
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'blocked'>('all')

  // Create user modal
  const [createUserModal, setCreateUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'student' })
  const [creating, setCreating] = useState(false)

  const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  const loadData = async () => {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
      ])

      if (usersRes.ok) {
        const data = await usersRes.json()
        if (data.users) setUsers(data.users)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        if (data.stats) setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
      toast.error('Ошибка загрузки данных админ-панели')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false)
      return
    }
    loadData()
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card className="border-destructive/40 bg-destructive/5 text-center p-8">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mb-4">
            <Lock className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Доступ ограничен</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Панель управления доступна исключительно единственному администратору:
          </p>
          <div className="mt-3 inline-block rounded-lg border bg-card px-3 py-1.5 font-mono text-sm font-semibold text-primary">
            {ADMIN_EMAIL}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Ваш текущий аккаунт ({user.email || 'гость'}) не имеет прав администратора.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="outline">На главную</Button>
            </Link>
            <Link href="/login">
              <Button>Войти администратором</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
        toast.success('Роль пользователя успешно обновлена')
      } else {
        toast.error(data.error || 'Не удалось обновить роль')
      }
    } catch {
      toast.error('Ошибка сети')
    }
  }

  const handleStatusToggle = async (targetUser: AdminUser) => {
    const newStatus = targetUser.status === 'active' ? 'blocked' : 'active'
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, status: newStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, status: newStatus } : u)))
        toast.success(newStatus === 'active' ? 'Пользователь разблокирован' : 'Пользователь заблокирован')
      } else {
        toast.error(data.error || 'Не удалось изменить статус')
      }
    } catch {
      toast.error('Ошибка сети')
    }
  }

  const handleDeleteUser = async (targetUser: AdminUser) => {
    if (!confirm(`Удалить пользователя ${targetUser.name} (${targetUser.email})?`)) return
    try {
      const res = await fetch(`/api/admin/users?id=${targetUser.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
        toast.success('Пользователь удалён из базы данных')
      } else {
        toast.error(data.error || 'Ошибка удаления')
      }
    } catch {
      toast.error('Ошибка сети')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUsers((prev) => [data.user, ...prev])
        toast.success(`Пользователь ${data.user.name} успешно создан!`)
        setCreateUserModal(false)
        setNewUser({ name: '', email: '', password: '', role: 'student' })
      } else {
        toast.error(data.error || 'Ошибка создания')
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setCreating(false)
    }
  }

  const list = users.filter((u) => {
    const matchesSearch = (u.name + u.email).toLowerCase().includes(q.toLowerCase())
    if (!matchesSearch) return false
    if (roleFilter === 'student') return u.role === 'student' && u.status === 'active'
    if (roleFilter === 'teacher') return u.role === 'teacher' && u.status === 'active'
    if (roleFilter === 'blocked') return u.status === 'blocked'
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Админ-панель"
          description={`Управление платформой CODELAB · Главный администратор: ${ADMIN_EMAIL}`}
        />
        <Button onClick={() => setCreateUserModal(true)} className="bg-primary hover:bg-primary/90">
          <UserPlus className="size-4 mr-1.5" /> Добавить пользователя
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { i: Users, l: 'Всего пользователей в БД', v: users.length, d: 'Реальная БД' },
          { i: BookOpen, l: 'Курсов на платформе', v: stats.totalCourses || 11, d: 'Активны' },
          { i: CreditCard, l: 'Сдано ДЗ', v: stats.totalHomeworks || 1, d: 'В базе' },
          { i: TrendingUp, l: 'Активных аккаунтов', v: users.filter((u) => u.status === 'active').length, d: '100%' },
        ].map((s) => (
          <Card key={s.l}>
            <div className="flex items-center justify-between">
              <s.i className="size-4 text-cyan" />
              <span className="text-xs text-success">{s.d}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold">{s.v}</p>
            <p className="text-sm text-muted-foreground">{s.l}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 font-medium">Активность и регистрации</h2>
        <BarChart data={activitySeries} labels={months} />
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b">
          <div className="flex items-center gap-3">
            <h2 className="font-medium text-base">Все пользователи школы</h2>
            <span className="rounded-md bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
              {users.length} чел.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex rounded-lg border bg-secondary/50 p-0.5 text-xs">
              {(['all', 'student', 'teacher', 'blocked'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRoleFilter(f)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    roleFilter === f ? 'bg-primary text-white font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f === 'all' ? 'Все' : f === 'student' ? 'Ученики' : f === 'teacher' ? 'Преподаватели' : 'Заблокированные'}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по имени или email"
                aria-label="Поиск пользователей"
                className="h-9 w-60 rounded-lg border bg-secondary pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs text-muted-foreground border-b">
              <tr>
                <th className="px-5 py-3 font-medium">Пользователь</th>
                <th className="px-5 py-3 font-medium">Роль</th>
                <th className="px-5 py-3 font-medium">Курсов</th>
                <th className="px-5 py-3 font-medium">Статус</th>
                <th className="px-5 py-3 font-medium">Дата регистрации</th>
                <th className="px-5 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Загрузка пользователей из базы данных...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                list.map((u) => {
                  const isRootAdmin = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                  return (
                    <tr key={u.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} className="size-8 text-[10px]" />
                          <div>
                            <p className="font-medium flex items-center gap-1.5">
                              {u.name}
                              {isRootAdmin && (
                                <span className="rounded bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                                  ВЛАДЕЛЕЦ
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isRootAdmin ? (
                          <Badge tone="primary">Администратор</Badge>
                        ) : (
                          <select
                            aria-label={`Роль ${u.name}`}
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded-md border bg-secondary px-2.5 py-1 text-xs outline-none focus:border-primary"
                          >
                            <option value="student">Ученик</option>
                            <option value="teacher">Преподаватель</option>
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{u.courses}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status === 'active' ? 'Активен' : 'Заблокирован'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{u.joined}</td>
                      <td className="px-5 py-3.5 text-right">
                        {isRootAdmin ? (
                          <span className="text-xs text-muted-foreground italic">Главный админ</span>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleStatusToggle(u)}
                              className={`text-xs hover:underline ${
                                u.status === 'active' ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              {u.status === 'active' ? 'Заблокировать' : 'Разблокировать'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="text-muted-foreground hover:text-rose-400 p-1"
                              title="Удалить пользователя"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create User Modal */}
      {createUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <button
              onClick={() => setCreateUserModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Новый пользователь</h2>
                <p className="text-xs text-muted-foreground">Добавление ученика или преподавателя в базу</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Имя и фамилия</label>
                <input
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Иван Петров"
                  className="h-10 w-full rounded-xl border bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                <input
                  required
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="ivan@mail.com"
                  className="h-10 w-full rounded-xl border bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Пароль</label>
                <input
                  required
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  minLength={6}
                  className="h-10 w-full rounded-xl border bg-secondary px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Роль</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="h-10 w-full rounded-xl border bg-secondary px-3 text-sm outline-none focus:border-primary"
                >
                  <option value="student">Ученик</option>
                  <option value="teacher">Преподаватель</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setCreateUserModal(false)}>
                  Отмена
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Создание…' : 'Создать'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
