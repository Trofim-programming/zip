'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Send, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Card, PageHeader } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

function Toggle({ label, desc, defaultOn = true }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn(!on)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', on ? 'bg-primary' : 'bg-accent')}
      >
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white transition-all', on ? 'left-5.5' : 'left-0.5')} />
      </button>
    </div>
  )
}

const input = 'mt-1.5 h-10 w-full rounded-xl border bg-secondary px-3 text-sm outline-none focus:border-primary'

export default function SettingsPage() {
  const { user, login, refreshUser } = useAppStore()
  const [form, setForm] = useState(user)
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  // Telegram integration state
  const [tgLinked, setTgLinked] = useState(false)
  const [tgUsername, setTgUsername] = useState<string | null>(null)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState(false)

  useEffect(() => {
    setForm(user)
  }, [user])

  useEffect(() => {
    fetch('/api/telegram')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTgLinked(data.linked)
          setTgUsername(data.telegramUsername)
          if (data.linkCode) setLinkCode(data.linkCode)
        }
      })
      .catch(() => {})
  }, [])

  const handleGenerateTgCode = async () => {
    setLoadingCode(true)
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_code' }),
      })
      const data = await res.json()
      if (res.ok && data.linkCode) {
        setLinkCode(data.linkCode)
        toast.success('Код для Telegram сгенерирован!')
      } else {
        toast.error(data.error || 'Ошибка генерации кода')
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setLoadingCode(false)
    }
  }

  const handleUnlinkTg = async () => {
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlink' }),
      })
      if (res.ok) {
        setTgLinked(false)
        setTgUsername(null)
        setLinkCode(null)
        toast.success('Telegram отключён от аккаунта')
      }
    } catch {
      toast.error('Ошибка сети')
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        login(data.user)
        await refreshUser()
        toast.success('Профиль успешно сохранён в базе данных')
      } else {
        toast.error(data.error || 'Не удалось сохранить профиль')
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPass(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          oldPassword: passwords.oldPassword,
          newPassword: passwords.newPassword,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Пароль успешно обновлён!')
        setPasswords({ oldPassword: '', newPassword: '' })
      } else {
        toast.error(data.error || 'Не удалось обновить пароль')
      }
    } catch {
      toast.error('Ошибка сети')
    } finally {
      setChangingPass(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Настройки" description="Профиль, безопасность, Telegram-бот и уведомления" />

      {/* Telegram Bot Card */}
      <Card className="border-sky-500/30 bg-sky-500/5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <Send className="size-5" />
            </div>
            <div>
              <h2 className="font-medium flex items-center gap-2">
                Telegram-бот @AdMatrixAppBot
                {tgLinked ? (
                  <Badge tone="success" className="text-[10px]">Подключен</Badge>
                ) : (
                  <Badge tone="default" className="text-[10px]">Не подключен</Badge>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Смотрите домашку, расписание уроков и получайте напоминания прямо в Telegram
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          {tgLinked ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="size-4" />
                <span>Привязан к Telegram{tgUsername ? `: @${tgUsername}` : ''}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleUnlinkTg}>
                Отключить Telegram
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Чтобы бот отправлял вам домашние задания и расписание, привяжите ваш аккаунт:
              </p>
              {linkCode ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 rounded-xl border bg-card p-4">
                  <div className="text-center sm:text-left flex-1">
                    <p className="text-xs text-muted-foreground">Ваш одноразовый код подключения:</p>
                    <p className="font-mono text-2xl font-bold tracking-widest text-primary">{linkCode}</p>
                    <p className="text-xs text-muted-foreground mt-1">Отправьте в бота команду: <code className="rounded bg-secondary px-1 py-0.5">/link {linkCode}</code></p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`/link ${linkCode}`)
                        toast.success('Команда скопирована в буфер')
                      }}
                    >
                      <Copy className="size-3.5 mr-1" /> Скопировать
                    </Button>
                    <a
                      href={`https://t.me/AdMatrixAppBot?start=${linkCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm">
                        <ExternalLink className="size-3.5 mr-1" /> Открыть бота
                      </Button>
                    </a>
                  </div>
                </div>
              ) : (
                <Button onClick={handleGenerateTgCode} disabled={loadingCode}>
                  <Send className="size-4 mr-1.5" />
                  {loadingCode ? 'Генерация…' : 'Подключить Telegram-бота'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Профиль</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSaveProfile}>
          <label className="text-sm">
            Имя
            <input
              className={input}
              value={form.firstName || ''}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Фамилия
            <input
              className={input}
              value={form.lastName || ''}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Username
            <input
              className={input}
              value={form.username || ''}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label className="text-sm">
            Email
            <input
              className={input}
              value={form.email || ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="lg" disabled={savingProfile}>
              {savingProfile ? 'Сохранение…' : 'Сохранить профиль'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 font-medium">Безопасность</h2>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleChangePassword}>
          <label className="text-sm">
            Текущий пароль
            <input
              type="password"
              className={input}
              autoComplete="current-password"
              value={passwords.oldPassword}
              onChange={(e) => setPasswords({ ...passwords, oldPassword: e.target.value })}
              required
            />
          </label>
          <label className="text-sm">
            Новый пароль
            <input
              type="password"
              className={input}
              autoComplete="new-password"
              minLength={8}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" variant="outline" size="lg" disabled={changingPass}>
              {changingPass ? 'Смена пароля…' : 'Сменить пароль'}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-2 font-medium">Уведомления</h2>
        <div className="divide-y">
          <Toggle label="Проверка домашних заданий" desc="Когда преподаватель оценил работу" />
          <Toggle label="Напоминания о занятиях" desc="За 30 минут до онлайн-урока" />
          <Toggle label="Сообщения в чатах" desc="Новые сообщения и упоминания" />
          <Toggle label="Email-дайджест" desc="Еженедельная сводка прогресса" defaultOn={false} />
        </div>
      </Card>
    </div>
  )
}
