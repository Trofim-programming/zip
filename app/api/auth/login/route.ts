import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { ADMIN_EMAIL, createSession, verifyPassword, type Role } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const identity = body.identity || body.email || body.username
    const password = body.password

    if (!identity || !password) {
      return NextResponse.json({ error: 'Введите email/username и пароль' }, { status: 400 })
    }

    const cleanIdentity = String(identity).trim().toLowerCase()
    const db = getDb()

    const user = db.prepare(`
      SELECT id, email, password_hash, salt, first_name, last_name, username, role, status, xp
      FROM users
      WHERE LOWER(email) = ? OR LOWER(username) = ?
    `).get(cleanIdentity, cleanIdentity) as any

    if (!user) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    if (user.status === 'blocked') {
      return NextResponse.json({ error: 'Ваш аккаунт заблокирован' }, { status: 403 })
    }

    const valid = verifyPassword(password, user.salt, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // Role enforcement
    let role: Role = user.role as Role
    if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      role = 'admin'
    } else if (role === 'admin') {
      role = 'student'
    }

    await createSession(user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        role,
        xp: user.xp,
      },
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Ошибка сервера при авторизации' }, { status: 500 })
  }
}
