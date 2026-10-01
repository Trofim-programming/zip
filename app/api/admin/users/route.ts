import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { ADMIN_EMAIL, getSessionUser, hashPassword } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const sessionUser = await getSessionUser()

  if (!sessionUser || sessionUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Доступ запрещен. Только администратор trofimzivilik14@gmail.com имеет доступ.' }, { status: 403 })
  }

  const db = getDb()
  const rows = db.prepare(`
    SELECT u.id, u.first_name || ' ' || u.last_name as name, u.email, u.role, u.status, u.created_at,
           (SELECT COUNT(*) FROM user_courses uc WHERE uc.user_id = u.id) as courses
    FROM users u
    ORDER BY u.created_at DESC
  `).all() as any[]

  const users = rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : (u.role === 'admin' ? 'student' : u.role),
    status: u.status,
    courses: u.courses || 0,
    joined: new Date(u.created_at).toLocaleDateString('ru-RU'),
  }))

  return NextResponse.json({ success: true, users })
}

export async function POST(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Доступ запрещен.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, email, password, role } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Имя и Email обязательны' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const db = getDb()

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail)
    if (existing) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
    }

    const [fn, ...lnArr] = name.trim().split(/\s+/)
    const ln = lnArr.join(' ') || fn
    const un = cleanEmail.split('@')[0] + Math.floor(Math.random() * 900 + 100)
    const { salt, hash } = hashPassword(password || 'password123')
    const id = `u_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const finalRole = cleanEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : (role === 'teacher' ? 'teacher' : 'student')

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, first_name, last_name, username, role, status, xp, streak_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 100, 1, ?, ?)
    `).run(id, cleanEmail, hash, salt, fn, ln, un, finalRole, now, now)

    return NextResponse.json({
      success: true,
      user: {
        id,
        name: `${fn} ${ln}`,
        email: cleanEmail,
        role: finalRole,
        status: 'active',
        courses: 0,
        joined: new Date(now).toLocaleDateString('ru-RU'),
      },
    })
  } catch (err: any) {
    console.error('Admin POST user error:', err)
    return NextResponse.json({ error: 'Ошибка создания пользователя' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const sessionUser = await getSessionUser()

  if (!sessionUser || sessionUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Доступ запрещен.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, role, status } = body

    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }

    const db = getDb()
    const targetUser = db.prepare('SELECT id, email, role, status FROM users WHERE id = ?').get(id) as any

    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Safety: Cannot demote or block the root admin
    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (role !== 'admin' || status === 'blocked')) {
      return NextResponse.json({ error: 'Нельзя изменить статус или роль главного администратора' }, { status: 400 })
    }

    // Safety: NO OTHER USER can be granted 'admin' role!
    let updatedRole = targetUser.role
    if (role) {
      if (role === 'admin' && targetUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        return NextResponse.json({ error: 'Администратором может быть только trofimzivilik14@gmail.com' }, { status: 403 })
      }
      if (role === 'student' || role === 'teacher') {
        updatedRole = role
      }
    }

    let updatedStatus = targetUser.status
    if (status && (status === 'active' || status === 'blocked')) {
      updatedStatus = status
    }

    db.prepare(`
      UPDATE users
      SET role = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedRole, updatedStatus, new Date().toISOString(), id)

    return NextResponse.json({
      success: true,
      user: {
        id,
        role: updatedRole,
        status: updatedStatus,
      },
    })
  } catch (err: any) {
    console.error('Admin PATCH user error:', err)
    return NextResponse.json({ error: 'Ошибка обновления пользователя' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Доступ запрещен.' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID пользователя обязателен' }, { status: 400 })
    }

    const db = getDb()
    const targetUser = db.prepare('SELECT email FROM users WHERE id = ?').get(id) as any

    if (!targetUser) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Нельзя удалить главного администратора' }, { status: 400 })
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id)

    return NextResponse.json({ success: true, message: 'Пользователь успешно удалён' })
  } catch (err: any) {
    console.error('Admin DELETE user error:', err)
    return NextResponse.json({ error: 'Ошибка удаления пользователя' }, { status: 500 })
  }
}
