import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getSessionUser()
  const db = getDb()

  const courses = db.prepare('SELECT * FROM courses').all() as any[]

  let progressMap: Record<string, number> = {}
  if (user) {
    const uc = db.prepare('SELECT course_id, progress FROM user_courses WHERE user_id = ?').all(user.id) as any[]
    for (const r of uc) {
      progressMap[r.course_id] = r.progress
    }
  }

  const items = courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    level: c.level,
    lessons: c.lessons,
    hours: c.hours,
    rating: c.rating,
    teacher: c.teacher,
    free: Boolean(c.free),
    format: c.format,
    hue: c.hue,
    progress: progressMap[c.id] ?? (c.id === 'python' ? 68 : c.id === 'js' ? 24 : c.id === 'web' ? 100 : c.id === 'tg' ? 40 : 0),
  }))

  return NextResponse.json({ success: true, courses: items })
}
