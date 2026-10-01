'use client'

import { useState } from 'react'
import { ChevronLeft, FileText, Paperclip, Reply, Search, Send, SmilePlus, X } from 'lucide-react'
import { Avatar } from '@/components/kit'
import { chatMessages, chats, type ChatMessage } from '@/lib/data'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

const emojis = ['👍', '🔥', '❤️', '😂', '🎉']

export default function ChatPage() {
  const [active, setActive] = useState<string | null>(chats[0]?.id ?? null)
  const [q, setQ] = useState('')
  const [store, setStore] = useState<Record<string, ChatMessage[]>>(chatMessages)
  const [text, setText] = useState('')
  const [reply, setReply] = useState<ChatMessage | null>(null)
  const chat = chats.find((c) => c.id === active)
  const messages = (active && store[active]) || []

  const { user } = useAppStore()
  const send = () => {
    if (!text.trim() || !active) return
    const now = new Date()
    const authorName = user.firstName ? `${user.firstName} ${user.lastName}`.trim() : 'Я'
    const msg: ChatMessage = { id: crypto.randomUUID(), author: authorName, text, me: true, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`, replyTo: reply?.text }
    setStore((s) => ({ ...s, [active]: [...(s[active] ?? []), msg] }))
    setText('')
    setReply(null)
  }

  const react = (id: string, e: string) =>
    active && setStore((s) => ({ ...s, [active]: s[active].map((m) => (m.id === id ? { ...m, reactions: { ...m.reactions, [e]: (m.reactions?.[e] ?? 0) + 1 } } : m)) }))

  return (
    <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-2xl border bg-card lg:h-[calc(100vh-4rem)]">
      <aside className={cn('w-full shrink-0 flex-col border-r md:flex md:w-80', active ? 'hidden' : 'flex')}>
        <div className="p-4">
          <h1 className="mb-3 text-lg font-semibold">Сообщения</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" aria-label="Поиск чатов" className="h-9 w-full rounded-lg bg-secondary pl-9 pr-3 text-sm outline-none" />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto px-2">
          {chats.length === 0 && (
            <li className="py-8 text-center text-xs text-muted-foreground">
              Чаты пока не созданы
            </li>
          )}
          {chats.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).map((c) => (
            <li key={c.id}>
              <button onClick={() => setActive(c.id)} className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-accent', active === c.id && 'bg-primary/10')}>
                <Avatar name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{c.name}</span><span className="text-[10px] text-muted-foreground">{c.kind}</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{c.last}</span>
                </span>
                {c.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-white">{c.unread}</span>}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={cn('min-w-0 flex-1 flex-col', active ? 'flex' : 'hidden md:flex')}>
        {chat ? (
          <>
            <header className="flex items-center gap-3 border-b px-4 py-3">
              <button className="md:hidden" onClick={() => setActive(null)} aria-label="Назад"><ChevronLeft className="size-5" /></button>
              <Avatar name={chat.name} />
              <div><p className="text-sm font-medium">{chat.name}</p><p className="text-xs text-success">{chat.kind} · онлайн</p></div>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && <p className="pt-20 text-center text-sm text-muted-foreground">Сообщений пока нет — начните диалог</p>}
              {messages.map((m) => (
                <div key={m.id} className={cn('group flex gap-2', m.me && 'flex-row-reverse')}>
                  {!m.me && <Avatar name={m.author} className="size-8 text-[10px]" />}
                  <div className={cn('max-w-[75%]', m.me && 'items-end')}>
                    {!m.me && <p className="mb-1 text-xs text-muted-foreground">{m.author}</p>}
                    <div className={cn('rounded-2xl px-3.5 py-2 text-sm', m.me ? 'bg-primary text-white' : 'bg-secondary')}>
                      {m.replyTo && <p className="mb-1 border-l-2 border-white/40 pl-2 text-xs opacity-70">{m.replyTo}</p>}
                      {m.text}
                      {m.file && <span className="mt-2 flex items-center gap-2 rounded-lg bg-black/20 p-2 text-xs"><FileText className="size-4" /> {m.file}</span>}
                      <span className="ml-2 text-[10px] opacity-60">{m.time}</span>
                    </div>
                    <div className={cn('mt-1 flex items-center gap-1', m.me && 'justify-end')}>
                      {Object.entries(m.reactions ?? {}).map(([e, n]) => (
                        <button key={e} onClick={() => react(m.id, e)} className="rounded-full border bg-card px-1.5 text-xs">{e} {n}</button>
                      ))}
                      <span className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => setReply(m)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="Ответить"><Reply className="size-3.5" /></button>
                        {emojis.slice(0, 3).map((e) => <button key={e} onClick={() => react(m.id, e)} className="rounded p-0.5 text-xs hover:bg-accent" aria-label={`Реакция ${e}`}>{e}</button>)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {reply && (
              <div className="flex items-center justify-between border-t bg-secondary/50 px-4 py-2 text-xs">
                <span className="truncate">Ответ: <span className="text-muted-foreground">{reply.text}</span></span>
                <button onClick={() => setReply(null)} aria-label="Отменить ответ"><X className="size-3.5" /></button>
              </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-center gap-2 border-t p-3">
              <label className="cursor-pointer rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Прикрепить файл"><Paperclip className="size-4" /><input type="file" className="sr-only" /></label>
              <button type="button" onClick={() => setText((t) => t + '🙂')} className="rounded-lg p-2 text-muted-foreground hover:bg-accent" aria-label="Эмодзи"><SmilePlus className="size-4" /></button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Сообщение…" aria-label="Сообщение" className="h-10 flex-1 rounded-xl bg-secondary px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
              <button type="submit" className="flex size-10 items-center justify-center rounded-xl bg-primary text-white" aria-label="Отправить"><Send className="size-4" /></button>
            </form>
          </>
        ) : (
          <p className="m-auto text-sm text-muted-foreground">Выберите чат</p>
        )}
      </section>
    </div>
  )
}
