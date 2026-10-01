import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId')
    const db = getDb()

    let lessons: any[] = []
    if (courseId) {
      lessons = db
        .prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY order_index ASC, created_at ASC')
        .all(courseId) as any[]
    } else {
      lessons = db.prepare('SELECT * FROM lessons ORDER BY order_index ASC, created_at ASC').all() as any[]
    }

    const formatted = lessons.map((l) => ({
      id: l.id,
      courseId: l.course_id,
      title: l.title,
      description: l.description,
      orderIndex: l.order_index,
      date: l.date,
      time: l.time,
      materials: l.materials_json ? JSON.parse(l.materials_json) : [],
      homeworkId: l.homework_id,
      createdBy: l.created_by,
      createdAt: l.created_at,
    }))

    return NextResponse.json({ success: true, lessons: formatted })
  } catch (err: any) {
    console.error('GET lessons error:', err)
    return NextResponse.json({ error: 'Ошибка загрузки уроков' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Недостаточно прав для добавления уроков' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { courseId, title, description = '', date = '', time = '', materials = [], homeworkId } = body

    if (!courseId || !title?.trim()) {
      return NextResponse.json({ error: 'Курс и название урока обязательны' }, { status: 400 })
    }

    const db = getDb()
    const id = `ls_${crypto.randomUUID()}`
    const now = new Date().toISOString()

    const maxOrder =
      (
        db.prepare('SELECT MAX(order_index) as max_ord FROM lessons WHERE course_id = ?').get(courseId) as any
      )?.max_ord || 0

    db.prepare(`
      INSERT INTO lessons (id, course_id, title, description, order_index, date, time, materials_json, homework_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      courseId,
      title.trim(),
      description.trim(),
      maxOrder + 1,
      date,
      time,
      JSON.stringify(materials),
      homeworkId || null,
      user.id,
      now,
      now
    )

    // Update lesson count on course
    db.prepare('UPDATE courses SET lessons = lessons + 1 WHERE id = ?').run(courseId)

    return NextResponse.json({ success: true, message: 'Урок успешно создан', id })
  } catch (err: any) {
    console.error('POST lesson error:', err)
    return NextResponse.json({ error: 'Ошибка создания урока' }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, title, description, date, time, materials, homeworkId } = body

    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })

    const db = getDb()
    const now = new Date().toISOString()

    db.prepare(`
      UPDATE lessons
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          date = COALESCE(?, date),
          time = COALESCE(?, time),
          materials_json = COALESCE(?, materials_json),
          homework_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      title?.trim() || null,
      description?.trim() || null,
      date || null,
      time || null,
      materials ? JSON.stringify(materials) : null,
      homeworkId || null,
      now,
      id
    )

    return NextResponse.json({ success: true, message: 'Урок обновлен' })
  } catch (err: any) {
    console.error('PUT lesson error:', err)
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })

    const db = getDb()
    const lesson = db.prepare('SELECT course_id FROM lessons WHERE id = ?').get(id) as any
    if (lesson) {
      db.prepare('DELETE FROM lessons WHERE id = ?').run(id)
      db.prepare('UPDATE courses SET lessons = MAX(0, lessons - 1) WHERE id = ?').run(lesson.course_id)
    }

    return NextResponse.json({ success: true, message: 'Урок удален' })
  } catch (err: any) {
    console.error('DELETE lesson error:', err)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
