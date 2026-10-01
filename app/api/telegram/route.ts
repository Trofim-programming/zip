import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const db = getDb()
  const row = db.prepare('SELECT telegram_id, telegram_username, telegram_link_code FROM users WHERE id = ?').get(user.id) as any

  return NextResponse.json({
    success: true,
    linked: Boolean(row?.telegram_id),
    telegramId: row?.telegram_id || null,
    telegramUsername: row?.telegram_username || null,
    linkCode: row?.telegram_link_code || null,
    botUsername: 'AdMatrixAppBot',
  })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  try {
    const { action } = await req.json()
    const db = getDb()

    if (action === 'generate_code') {
      // 6-digit code
      const code = String(Math.floor(100000 + Math.random() * 900000))
      db.prepare('UPDATE users SET telegram_link_code = ? WHERE id = ?').run(code, user.id)

      return NextResponse.json({
        success: true,
        linkCode: code,
        botUsername: 'AdMatrixAppBot',
        deepLink: `https://t.me/AdMatrixAppBot?start=${code}`,
      })
    }

    if (action === 'unlink') {
      db.prepare('UPDATE users SET telegram_id = NULL, telegram_username = NULL, telegram_link_code = NULL WHERE id = ?').run(user.id)
      return NextResponse.json({ success: true, message: 'Telegram отключён' })
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  } catch (err: any) {
    console.error('Telegram API error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
