import { NextResponse } from 'next/server'
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { action, firstName, lastName, username, email, oldPassword, newPassword } = body
    const db = getDb()

    if (action === 'update_profile') {
      if (!firstName || !lastName || !username || !email) {
        return NextResponse.json({ error: 'Все поля обязательны для заполнения' }, { status: 400 })
      }

      // Check unique email/username
      const cleanEmail = String(email).trim().toLowerCase()
      const cleanUsername = String(username).trim().toLowerCase()

      const conflict = db.prepare('SELECT id, email, username FROM users WHERE (email = ? OR username = ?) AND id != ?').get(cleanEmail, cleanUsername, sessionUser.id) as any
      if (conflict) {
        return NextResponse.json({ error: 'Email или Username уже занят другим пользователем' }, { status: 400 })
      }

      db.prepare(`
        UPDATE users
        SET first_name = ?, last_name = ?, username = ?, email = ?, updated_at = ?
        WHERE id = ?
      `).run(firstName.trim(), lastName.trim(), cleanUsername, cleanEmail, new Date().toISOString(), sessionUser.id)

      return NextResponse.json({
        success: true,
        user: {
          id: sessionUser.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: cleanUsername,
          email: cleanEmail,
          role: sessionUser.role,
        },
      })
    }

    if (action === 'change_password') {
      if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Укажите текущий и новый пароль' }, { status: 400 })
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Новый пароль должен содержать от 8 символов' }, { status: 400 })
      }

      const dbUser = db.prepare('SELECT salt, password_hash FROM users WHERE id = ?').get(sessionUser.id) as any
      const valid = verifyPassword(oldPassword, dbUser.salt, dbUser.password_hash)
      if (!valid) {
        return NextResponse.json({ error: 'Текущий пароль неверен' }, { status: 400 })
      }

      const { salt, hash } = hashPassword(newPassword)
      db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, new Date().toISOString(), sessionUser.id)

      return NextResponse.json({ success: true, message: 'Пароль успешно изменён' })
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  } catch (err: any) {
    console.error('Profile API error:', err)
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
