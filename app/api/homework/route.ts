import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  const db = getDb()

  const homeworkRows = db.prepare('SELECT * FROM homeworks').all() as any[]

  let userHwMap: Record<string, { status: string; comment?: string; code?: string; grade?: number }> = {}
  if (user) {
    const userHws = db
      .prepare('SELECT homework_id, status, teacher_comment, submission_code, grade FROM user_homeworks WHERE user_id = ?')
      .all(user.id) as any[]
    for (const uh of userHws) {
      userHwMap[uh.homework_id] = {
        status: uh.status,
        comment: uh.teacher_comment,
        code: uh.submission_code,
        grade: uh.grade,
      }
    }
  }

  const items = homeworkRows.map((h) => {
    let attachments: string[] = []
    try {
      attachments = JSON.parse(h.attachments || '[]')
    } catch {}

    const userStatus = userHwMap[h.id]?.status || 'todo'
    const comment = userHwMap[h.id]?.comment
    const code = userHwMap[h.id]?.code
    const grade = userHwMap[h.id]?.grade

    return {
      id: h.id,
      title: h.title,
      description: h.description,
      type: h.type,
      difficulty: h.difficulty,
      deadline: h.deadline,
      xp: h.xp,
      teacher: h.teacher,
      attachments,
      starter: code || h.starter || '',
      timeLimit: h.time_limit || undefined,
      status: userStatus,
      comment,
      grade,
    }
  })

  // If teacher or admin, fetch all submissions to review
  let submissions: any[] = []
  if (user && (user.role === 'admin' || user.role === 'teacher')) {
    submissions = db
      .prepare(`
        SELECT uh.id, uh.user_id, uh.homework_id, uh.status, uh.submission_code, uh.teacher_comment, uh.grade,
               uh.submitted_at, uh.updated_at, uh.reviewed_at,
               u.first_name, u.last_name, u.username, u.email,
               h.title as homework_title, h.xp as max_xp
        FROM user_homeworks uh
        JOIN users u ON u.id = uh.user_id
        JOIN homeworks h ON h.id = uh.homework_id
        ORDER BY uh.submitted_at DESC
      `)
      .all() as any[]
  }

  return NextResponse.json({
    success: true,
    homeworks: items,
    submissions: submissions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      homeworkId: s.homework_id,
      status: s.status,
      submissionCode: s.submission_code,
      comment: s.teacher_comment,
      grade: s.grade,
      submittedAt: s.submitted_at,
      updatedAt: s.updated_at,
      reviewedAt: s.reviewed_at,
      studentName: `${s.first_name} ${s.last_name}`,
      studentUsername: s.username,
      studentEmail: s.email,
      homeworkTitle: s.homework_title,
      maxExp: s.max_xp,
    })),
  })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'Необходимо авторизоваться' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action = 'submit' } = body
    const db = getDb()
    const now = new Date().toISOString()

    // 1. CREATE HOMEWORK (Admin / Teacher)
    if (action === 'create') {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return NextResponse.json({ error: 'Недостаточно прав для создания задания' }, { status: 403 })
      }

      const { title, description, type = 'practice', difficulty = 'medium', deadline, xp = 100, starter = '' } = body
      if (!title || !deadline) {
        return NextResponse.json({ error: 'Укажите название и дедлайн' }, { status: 400 })
      }

      const id = `hw_${crypto.randomUUID()}`
      db.prepare(`
        INSERT INTO homeworks (id, title, description, type, difficulty, deadline, xp, teacher, starter, attachments)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
      `).run(
        id,
        title.trim(),
        description || '',
        type,
        difficulty,
        deadline,
        Number(xp) || 100,
        `${user.firstName} ${user.lastName}`,
        starter
      )

      return NextResponse.json({ success: true, message: 'Задание успешно создано', id })
    }

    // 2. GRADE / REVIEW HOMEWORK (Admin / Teacher)
    if (action === 'grade') {
      if (user.role !== 'admin' && user.role !== 'teacher') {
        return NextResponse.json({ error: 'Недостаточно прав для проверки задания' }, { status: 403 })
      }

      const { submissionId, grade, comment, status = 'done' } = body
      if (!submissionId) {
        return NextResponse.json({ error: 'submissionId обязателен' }, { status: 400 })
      }

      const submission = db.prepare('SELECT * FROM user_homeworks WHERE id = ?').get(submissionId) as any
      if (!submission) {
        return NextResponse.json({ error: 'Работа не найдена' }, { status: 404 })
      }

      db.prepare(`
        UPDATE user_homeworks
        SET grade = ?, teacher_comment = ?, status = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).run(grade !== undefined ? Number(grade) : null, comment || '', status, now, user.id, submissionId)

      // Award XP to student if status is done
      if (status === 'done') {
        const hw = db.prepare('SELECT xp, title FROM homeworks WHERE id = ?').get(submission.homework_id) as any
        const awardXp = hw ? Number(hw.xp) : 50
        db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(awardXp, submission.user_id)

        // Notification for student
        const notifId = `notif_${crypto.randomUUID()}`
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, detail, time, is_read, created_at)
          VALUES (?, ?, 'grade', 'Ваша работа проверена!', ?, 'только что', 0, ?)
        `).run(
          notifId,
          submission.user_id,
          `${hw?.title || 'Задание'}: оценка ${grade || 'Зачёт'}. ${comment ? `Комментарий: ${comment}` : ''}`,
          now
        )
      } else if (status === 'todo') {
        // Returned for rework
        const hw = db.prepare('SELECT title FROM homeworks WHERE id = ?').get(submission.homework_id) as any
        const notifId = `notif_${crypto.randomUUID()}`
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, detail, time, is_read, created_at)
          VALUES (?, ?, 'homework', 'Задание возвращено на доработку', ?, 'только что', 0, ?)
        `).run(
          notifId,
          submission.user_id,
          `${hw?.title || 'Задание'}. ${comment ? `Комментарий преподавателя: ${comment}` : 'Пожалуйста, внесите исправления.'}`,
          now
        )
      }

      return NextResponse.json({ success: true, message: 'Оценка и комментарий сохранены' })
    }

    // 3. STUDENT SUBMIT
    const { homeworkId, code } = body
    if (!homeworkId) {
      return NextResponse.json({ error: 'homeworkId обязателен' }, { status: 400 })
    }

    const hw = db.prepare('SELECT id, title, xp FROM homeworks WHERE id = ?').get(homeworkId) as any
    if (!hw) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }

    const existing = db.prepare('SELECT id FROM user_homeworks WHERE user_id = ? AND homework_id = ?').get(user.id, homeworkId) as any

    if (existing) {
      db.prepare(`
        UPDATE user_homeworks
        SET status = 'progress', submission_code = ?, submitted_at = ?, updated_at = ?
        WHERE id = ?
      `).run(code || '', now, now, existing.id)
    } else {
      const id = `uh_${crypto.randomUUID()}`
      db.prepare(`
        INSERT INTO user_homeworks (id, user_id, homework_id, status, submission_code, submitted_at, updated_at)
        VALUES (?, ?, ?, 'progress', ?, ?, ?)
      `).run(id, user.id, homeworkId, code || '', now, now)
    }

    // Submission XP (+10)
    db.prepare('UPDATE users SET xp = xp + 10 WHERE id = ?').run(user.id)

    // Add notification
    const notifId = `notif_${crypto.randomUUID()}`
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, detail, time, is_read, created_at)
      VALUES (?, ?, 'homework', 'Работа отправлена на проверку', ?, 'только что', 0, ?)
    `).run(notifId, user.id, `${hw.title} · ожидает ответа преподавателя`, now)

    return NextResponse.json({
      success: true,
      message: 'Работа успешно отправлена на проверку',
      status: 'progress',
      addedXp: 10,
    })
  } catch (err: any) {
    console.error('Homework API error:', err)
    return NextResponse.json({ error: 'Ошибка сохранения задания' }, { status: 500 })
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
    db.prepare('DELETE FROM homeworks WHERE id = ?').run(id)
    db.prepare('DELETE FROM user_homeworks WHERE homework_id = ?').run(id)

    return NextResponse.json({ success: true, message: 'Задание удалено' })
  } catch (err: any) {
    console.error('DELETE homework error:', err)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
