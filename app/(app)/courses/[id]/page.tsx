import { notFound } from 'next/navigation'
import { courses, type Course } from '@/lib/data'
import { getDb } from '@/lib/db'
import { CourseView } from '@/components/course/course-view'

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let course = courses.find((c) => c.id === id)
  if (!course) {
    const db = getDb()
    const row = db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as any
    if (row) {
      course = {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        level: row.level,
        lessons: row.lessons || 0,
        hours: row.hours || 0,
        rating: row.rating || 5.0,
        progress: 0,
        teacher: row.teacher,
        free: Boolean(row.free),
        format: row.format,
        hue: row.hue || 'from-violet-500/40 to-cyan-400/20',
      } as Course
    }
  }
  if (!course) notFound()
  return <CourseView course={course} />
}
