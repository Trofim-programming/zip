import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ authed: false, user: null })
    }

    const db = getDb()

    // Get completed lessons for this user
    const completedRows = db.prepare('SELECT lesson_id FROM completed_lessons WHERE user_id = ?').all(user.id) as any[]
    const completedLessons = completedRows.map((r) => r.lesson_id)

    // Get user courses
    const userCourses = db.prepare(`
      SELECT c.*, COALESCE(uc.progress, 0) as progress
      FROM courses c
      LEFT JOIN user_courses uc ON uc.course_id = c.id AND uc.user_id = ?
    `).all(user.id) as any[]

    return NextResponse.json({
      authed: true,
      user,
      completedLessons,
      userCourses,
    })
  } catch (err: any) {
    console.error('Me error:', err)
    return NextResponse.json({ authed: false, user: null }, { status: 500 })
  }
}
