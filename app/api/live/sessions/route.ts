import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('id')
    const db = getDb()

    if (sessionId) {
      const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(sessionId) as any
      if (!session) {
        return NextResponse.json({ error: 'Сессия не найдена' }, { status: 404 })
      }
      return NextResponse.json({
        success: true,
        session: {
          ...session,
          settings: session.settings_json ? JSON.parse(session.settings_json) : {},
        },
      })
    }

    const sessions = db.prepare('SELECT * FROM live_sessions ORDER BY date DESC, time DESC').all() as any[]
    const formatted = sessions.map((s) => ({
      ...s,
      settings: s.settings_json ? JSON.parse(s.settings_json) : {},
    }))

    return NextResponse.json({ success: true, sessions: formatted })
  } catch (err: any) {
    console.error('GET live sessions error:', err)
    return NextResponse.json({ error: 'Ошибка получения сессий' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSessionUser()
    const db = getDb()

    const body = await req.json()
    const {
      title,
      date = new Date().toISOString().slice(0, 10),
      time = '18:00',
      duration = 45,
      type = 'lecture',
      description = '',
      settings = { allowMic: true, allowCam: true, allowScreen: false, allowBoard: true },
    } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Название занятия обязательно' }, { status: 400 })
    }

    const teacherId = user?.id || 'u_admin'
    const teacherName = user ? `${user.firstName} ${user.lastName}` : 'Преподаватель'

    const roomId = `room_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO live_sessions (id, title, date, time, duration, teacher_id, teacher_name, type, description, status, settings_json, whiteboard_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 0, ?)
    `).run(
      roomId,
      title.trim(),
      date,
      time,
      Number(duration) || 45,
      teacherId,
      teacherName,
      type,
      description.trim(),
      JSON.stringify(settings),
      now
    )

    return NextResponse.json({
      success: true,
      message: 'Занятие успешно создано',
      roomId,
      session: {
        id: roomId,
        title: title.trim(),
        date,
        time,
        duration,
        teacherId,
        teacherName,
        type,
        status: 'scheduled',
      },
    })
  } catch (err: any) {
    console.error('POST live session error:', err)
    return NextResponse.json({ error: 'Ошибка создания занятия' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, status, whiteboard_active } = body
    if (!id) {
      return NextResponse.json({ error: 'id обязателен' }, { status: 400 })
    }

    const db = getDb()
    if (status) {
      db.prepare('UPDATE live_sessions SET status = ? WHERE id = ?').run(status, id)
    }
    if (typeof whiteboard_active === 'number') {
      db.prepare('UPDATE live_sessions SET whiteboard_active = ? WHERE id = ?').run(whiteboard_active, id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('PATCH live session error:', err)
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}
