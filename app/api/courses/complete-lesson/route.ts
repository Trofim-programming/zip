import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 })
  }

  try {
    const { lessonId } = await req.json()
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId обязателен' }, { status: 400 })
    }

    const db = getDb()
    const now = new Date().toISOString()
    const id = `cl_${crypto.randomUUID()}`

    db.prepare(`
      INSERT OR IGNORE INTO completed_lessons (id, user_id, lesson_id, completed_at)
      VALUES (?, ?, ?, ?)
    `).run(id, user.id, lessonId, now)

    // Award +25 XP
    db.prepare('UPDATE users SET xp = xp + 25 WHERE id = ?').run(user.id)

    const updatedUser = db.prepare('SELECT xp FROM users WHERE id = ?').get(user.id) as any

    return NextResponse.json({
      success: true,
      lessonId,
      xp: updatedUser?.xp || user.xp + 25,
    })
  } catch (err: any) {
    console.error('Complete lesson error:', err)
    return NextResponse.json({ error: 'Ошибка сохранения урока' }, { status: 500 })
  }
}
