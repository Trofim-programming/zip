import { notFound } from 'next/navigation'
import { allLessons } from '@/lib/data'
import { LessonView } from '@/components/lesson/lesson-view'

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lesson = allLessons.find((l) => l.id === id)
  if (!lesson) notFound()
  return <LessonView lessonId={lesson.id} />
}
