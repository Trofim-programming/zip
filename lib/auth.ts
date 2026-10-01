import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getDb } from './db'

export const ADMIN_EMAIL = 'trofimzivilik14@gmail.com'

export type Role = 'student' | 'teacher' | 'admin'

export type UserSession = {
  id: string
  email: string
  firstName: string
  lastName: string
  username: string
  role: Role
  status: string
  xp: number
  telegramId?: string | null
  telegramUsername?: string | null
  telegramLinkCode?: string | null
}

export function hashPassword(password: string, providedSalt?: string) {
  const salt = providedSalt || crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return { salt, hash }
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const { hash } = hashPassword(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash))
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expiresAt, createdAt)

  const cookieStore = await cookies()
  cookieStore.set('school_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return token
}

export async function getSessionUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('school_session')?.value
    if (!token) return null

    const db = getDb()
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.email, u.first_name as firstName,
             u.last_name as lastName, u.username, u.role, u.status, u.xp,
             u.telegram_id as telegramId, u.telegram_username as telegramUsername,
             u.telegram_link_code as telegramLinkCode
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `).get(token) as any

    if (!session) return null

    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
      return null
    }

    if (session.status === 'blocked') {
      return null
    }

    // Strict rule: ONLY trofimzivilik14@gmail.com can be admin
    let role: Role = session.role as Role
    if (session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      role = 'admin'
    } else if (role === 'admin') {
      role = 'student'
    }

    return {
      id: session.id,
      email: session.email,
      firstName: session.firstName,
      lastName: session.lastName,
      username: session.username,
      role,
      status: session.status,
      xp: session.xp || 0,
      telegramId: session.telegramId,
      telegramUsername: session.telegramUsername,
      telegramLinkCode: session.telegramLinkCode,
    }
  } catch (err) {
    console.error('getSessionUser error:', err)
    return null
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('school_session')?.value
    if (token) {
      const db = getDb()
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    }
    cookieStore.delete('school_session')
  } catch (err) {
    console.error('destroySession error:', err)
  }
}
