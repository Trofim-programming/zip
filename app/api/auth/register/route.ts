import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getDb } from '@/lib/db'
import { ADMIN_EMAIL, createSession, hashPassword, type Role } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { firstName, lastName, email, username, password, role: requestedRole } = body

    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Пароль должен содержать не менее 8 символов' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const cleanUsername = String(username).trim().toLowerCase()

    const db = getDb()

    // Check if email or username already taken
    const existing = db.prepare('SELECT id, email, username FROM users WHERE email = ? OR username = ?').get(cleanEmail, cleanUsername) as any
    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Пользователь с таким username уже существует' }, { status: 400 })
    }

    // Role safety: ONLY trofimzivilik14@gmail.com can be admin!
    let role: Role = 'student'
    if (cleanEmail === ADMIN_EMAIL.toLowerCase()) {
      role = 'admin'
    } else if (requestedRole === 'teacher') {
      role = 'teacher'
    }

    const { salt, hash } = hashPassword(password)
    const userId = `u_${crypto.randomUUID()}`
    const now = new Date().toISOString()
    const initialXp = 50 // bonus for registration

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, first_name, last_name, username, role, status, xp, streak_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanEmail, hash, salt, firstName.trim(), lastName.trim(), cleanUsername, role, 'active', initialXp, 1, now, now)

    await createSession(userId)

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: cleanUsername,
        role,
        xp: initialXp,
      },
    })
  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Ошибка сервера при регистрации' }, { status: 500 })
  }
}
