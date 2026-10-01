import { NextResponse } from 'next/server'
import { ADMIN_EMAIL, getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const sessionUser = await getSessionUser()

  if (!sessionUser || sessionUser.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Доступ запрещен.' }, { status: 403 })
  }

  const db = getDb()

  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
  const activeUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as any).count
  const totalCourses = (db.prepare('SELECT COUNT(*) as count FROM courses').get() as any).count
  const totalHomeworks = (db.prepare("SELECT COUNT(*) as count FROM user_homeworks WHERE status = 'done'").get() as any).count

  return NextResponse.json({
    success: true,
    stats: {
      totalUsers,
      activeUsers,
      totalCourses,
      totalHomeworks,
    },
  })
}
