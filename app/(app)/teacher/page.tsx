'use client'

import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  FilePlus,
  GraduationCap,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Users,
  Video,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, Badge } from '@/components/kit'
import { useSchool } from '@/lib/store'
import { cn } from '@/lib/utils'

type Submission = {
  id: string
  userId: string
  homeworkId: string
  status: string
  submissionCode: string
  comment?: string
  grade?: number
  submittedAt: string
  studentName: string
  studentEmail: string
  homeworkTitle: string
  maxExp: number
}

type Lesson = {
  id: string
  courseId: string
  title: string
  description?: string
  orderIndex: number
  date?: string
  time?: string
  materials: string[]
  homeworkId?: string
}

type Course = {
  id: string
  title: string
  level: string
}

export default function TeacherPage() {
  const { user } = useSchool()
  const [activeTab, setActiveTab] = useState<'submissions' | 'lessons' | 'homework' | 'students'>('submissions')

  // Submissions state
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null)
  const [gradeInput, setGradeInput] = useState<string>('5')
  const [commentInput, setCommentInput] = useState<string>('')
  const [submittingGrade, setSubmittingGrade] = useState(false)

  // Lessons state
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false)
  const [lessonCourseId, setLessonCourseId] = useState('py_base')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDate, setLessonDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lessonTime, setLessonTime] = useState('18:00')
  const [lessonDesc, setLessonDesc] = useState('')
  const [lessonMaterials, setLessonMaterials] = useState('')
  const [creatingLesson, setCreatingLesson] = useState(false)

  // Homework create state
  const [hwTitle, setHwTitle] = useState('')
  const [hwDescription, setHwDescription] = useState('')
  const [hwType, setHwType] = useState('practice')
  const [hwDifficulty, setHwDifficulty] = useState('medium')
  const [hwDeadline, setHwDeadline] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [hwXp, setHwXp] = useState(100)
  const [hwStarter, setHwStarter] = useState('# Напишите ваше решение здесь\ndef solution():\n    pass\n')
  const [creatingHw, setCreatingHw] = useState(false)

  // Students list
  const [students, setStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Fetch Submissions
  const loadSubmissions = async () => {
    setLoadingSubmissions(true)
    try {
      const res = await fetch('/api/homework')
      const data = await res.json()
      if (data.success && data.submissions) {
        setSubmissions(data.submissions)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSubmissions(false)
    }
  }

  // Fetch Lessons & Courses
  const loadLessons = async () => {
    setLoadingLessons(true)
    try {
      const [resL, resC] = await Promise.all([fetch('/api/lessons'), fetch('/api/courses')])
      const dataL = await resL.json()
      const dataC = await resC.json()
      if (dataL.success && dataL.lessons) setLessons(dataL.lessons)
      if (dataC.courses) {
        setCourses(dataC.courses.map((c: any) => ({ id: c.id, title: c.title, level: c.level })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLessons(false)
    }
  }

  // Fetch Students
  const loadStudents = async () => {
    setLoadingStudents(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.success && data.users) {
        setStudents(data.users.filter((u: any) => u.role === 'student'))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStudents(false)
    }
  }

  useEffect(() => {
    loadSubmissions()
    loadLessons()
    loadStudents()
  }, [])

  // Grade submission handler
  const handleGradeSubmission = async (status: 'done' | 'todo') => {
    if (!inspectSubmission) return
    setSubmittingGrade(true)
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade',
          submissionId: inspectSubmission.id,
          grade: Number(gradeInput),
          comment: commentInput,
          status,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(status === 'done' ? 'Работа проверена и зачтена!' : 'Работа возвращена на доработку')
        setInspectSubmission(null)
        loadSubmissions()
      } else {
        toast.error(data.error || 'Ошибка проверки')
      }
    } catch (err) {
      toast.error('Сетевая ошибка')
    } finally {
      setSubmittingGrade(false)
    }
  }

  // Create lesson handler
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonTitle.trim()) return
    setCreatingLesson(true)
    try {
      const materialsArray = lessonMaterials
        .split('\n')
        .map((m) => m.trim())
        .filter(Boolean)

      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: lessonCourseId,
          title: lessonTitle.trim(),
          description: lessonDesc.trim(),
          date: lessonDate,
          time: lessonTime,
          materials: materialsArray,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Урок успешно добавлен в программу!')
        setShowCreateLessonModal(false)
        setLessonTitle('')
        setLessonDesc('')
        setLessonMaterials('')
        loadLessons()
      } else {
        toast.error(data.error || 'Ошибка добавления урока')
      }
    } catch (err) {
      toast.error('Сетевая ошибка')
    } finally {
      setCreatingLesson(false)
    }
  }

  // Delete lesson
  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Вы действительно хотите удалить этот урок?')) return
    try {
      const res = await fetch(`/api/lessons?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Урок удален')
        loadLessons()
      } else {
        toast.error(data.error || 'Ошибка удаления')
      }
    } catch (err) {
      toast.error('Сетевая ошибка')
    }
  }

  // Create Homework handler
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hwTitle.trim()) return
    setCreatingHw(true)
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: hwTitle.trim(),
          description: hwDescription.trim(),
          type: hwType,
          difficulty: hwDifficulty,
          deadline: hwDeadline,
          xp: Number(hwXp),
          starter: hwStarter,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Домашнее задание успешно создано и опубликовано!')
        setHwTitle('')
        setHwDescription('')
        loadSubmissions()
      } else {
        toast.error(data.error || 'Ошибка создания')
      }
    } catch (err) {
      toast.error('Сетевая ошибка')
    } finally {
      setCreatingHw(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Панель преподавателя"
          description="Управление уроками, создание заданий, проверка работ учащихся и аналитика"
        />

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/[0.08] bg-[#101014] p-1">
          <button
            onClick={() => setActiveTab('submissions')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'submissions' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
            )}
          >
            <GraduationCap className="size-3.5" />
            <span>Проверка работ ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lessons')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'lessons' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
            )}
          >
            <BookOpen className="size-3.5" />
            <span>Уроки ({lessons.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'homework' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
            )}
          >
            <Plus className="size-3.5" />
            <span>Создать ДЗ</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === 'students' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
            )}
          >
            <Users className="size-3.5" />
            <span>Ученики ({students.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMISSIONS REVIEW */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Отправленные на проверку работы</h3>
            <button
              onClick={loadSubmissions}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
            >
              <RefreshCw className={cn('size-3.5', loadingSubmissions && 'animate-spin')} />
              <span>Обновить</span>
            </button>
          </div>

          {loadingSubmissions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl border border-white/[0.08] bg-[#101014]" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] py-16 text-center">
              <GraduationCap className="size-8 text-white/30" />
              <p className="mt-3 text-xs font-medium text-white/80">Очередь проверки пуста</p>
              <p className="mt-1 text-xs text-white/40">
                Когда ученики отправят решения домашних заданий, они появятся в этом списке.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-white/[0.08] bg-[#101014] p-4 transition-all hover:border-white/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{sub.studentName}</span>
                        <span className="text-[11px] text-white/40">({sub.studentEmail})</span>
                        <Badge
                          tone={
                            sub.status === 'done'
                              ? 'emerald'
                              : sub.status === 'progress'
                              ? 'amber'
                              : 'rose'
                          }
                          size="sm"
                        >
                          {sub.status === 'done'
                            ? `Проверено (Оценка: ${sub.grade || 'Зачёт'})`
                            : sub.status === 'progress'
                            ? 'Ожидает проверки'
                            : 'На доработке'}
                        </Badge>
                      </div>

                      <div className="text-xs text-white/70">
                        Задание: <span className="font-medium text-white">{sub.homeworkTitle}</span>
                      </div>

                      {sub.comment && (
                        <p className="text-xs text-white/50 italic">
                          Комментарий учителя: «{sub.comment}»
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-white/40">
                        <span>Отправлено: {new Date(sub.submittedAt).toLocaleString('ru-RU')}</span>
                        <span>Награда: +{sub.maxExp} XP</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => {
                          setInspectSubmission(sub)
                          setGradeInput(sub.grade ? String(sub.grade) : '5')
                          setCommentInput(sub.comment || '')
                        }}
                        className="rounded-lg bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-white/90"
                      >
                        {sub.status === 'done' ? 'Перепроверить' : 'Проверить работу'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Inspection & Grading Modal */}
          {inspectSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#121216] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-white">
                      Проверка работы: {inspectSubmission.studentName}
                    </h3>
                    <p className="text-xs text-white/50">{inspectSubmission.homeworkTitle}</p>
                  </div>
                  <button
                    onClick={() => setInspectSubmission(null)}
                    className="rounded-lg p-1 text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Submitted Code Viewer */}
                <div className="mb-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="size-3.5 text-emerald-400" />
                      Решение ученика
                    </span>
                  </div>
                  <pre className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#09090b] p-3.5 font-mono text-xs text-emerald-400">
                    {inspectSubmission.submissionCode || '# Ученик отправил пустой ответ'}
                  </pre>
                </div>

                {/* Grading Controls */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">Оценка (1-5)</label>
                    <select
                      value={gradeInput}
                      onChange={(e) => setGradeInput(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    >
                      <option value="5">5 — Отлично (100%)</option>
                      <option value="4">4 — Хорошо (80%)</option>
                      <option value="3">3 — Удовлетворительно (60%)</option>
                      <option value="2">2 — Не зачтено</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      Комментарий и замечания для ученика
                    </label>
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Отличная логика! Обрати внимание на краевые случаи..."
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => handleGradeSubmission('todo')}
                    disabled={submittingGrade}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
                  >
                    <XCircle className="size-3.5" />
                    <span>На доработку</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGradeSubmission('done')}
                    disabled={submittingGrade}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    <CheckCircle2 className="size-3.5 fill-black" />
                    <span>Зачесть и начислить XP</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LESSONS MANAGEMENT */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Учебная программа и уроки</h3>
            <button
              onClick={() => setShowCreateLessonModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-black hover:bg-white/90"
            >
              <Plus className="size-3.5" />
              <span>Добавить урок</span>
            </button>
          </div>

          {loadingLessons ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-white/[0.08] bg-[#101014]" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] py-16 text-center">
              <BookOpen className="size-8 text-white/30" />
              <p className="mt-3 text-xs font-medium text-white/80">Уроки пока не добавлены</p>
              <button
                onClick={() => setShowCreateLessonModal(true)}
                className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black"
              >
                Создать первый урок
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#101014] p-4 transition-all hover:border-white/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{lesson.title}</span>
                      <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">
                        {courses.find((c) => c.id === lesson.courseId)?.title || lesson.courseId}
                      </span>
                    </div>

                    {lesson.description && (
                      <p className="text-xs text-white/50">{lesson.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-white/40">
                      {lesson.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" /> {lesson.date} {lesson.time}
                        </span>
                      )}
                      {lesson.materials && lesson.materials.length > 0 && (
                        <span>Материалов: {lesson.materials.length}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="rounded-lg p-1.5 text-white/40 hover:bg-rose-500/20 hover:text-rose-400"
                      title="Удалить урок"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Lesson Modal */}
          {showCreateLessonModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121216] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-semibold text-sm text-white">Добавить новый урок в курс</h3>
                  <button
                    onClick={() => setShowCreateLessonModal(false)}
                    className="rounded-lg p-1 text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateLesson} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">Курс *</label>
                    <select
                      value={lessonCourseId}
                      onChange={(e) => setLessonCourseId(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                      {courses.length === 0 && <option value="py_base">Основы Python</option>}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      Название урока *
                    </label>
                    <input
                      type="text"
                      required
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="Например: Функции высшего порядка и замыкания"
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-white/70">Дата</label>
                      <input
                        type="date"
                        value={lessonDate}
                        onChange={(e) => setLessonDate(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-white/70">Время</label>
                      <input
                        type="time"
                        value={lessonTime}
                        onChange={(e) => setLessonTime(e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      Описание и цели урока
                    </label>
                    <textarea
                      rows={2}
                      value={lessonDesc}
                      onChange={(e) => setLessonDesc(e.target.value)}
                      placeholder="Что узнает ученик в процессе прохождения..."
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-white/70">
                      Материалы и ссылки (по одной на строку)
                    </label>
                    <textarea
                      rows={2}
                      value={lessonMaterials}
                      onChange={(e) => setLessonMaterials(e.target.value)}
                      placeholder="https://docs.python.org/3/..."
                      className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateLessonModal(false)}
                      className="rounded-lg px-4 py-2 text-xs font-medium text-white/60 hover:text-white"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={creatingLesson}
                      className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-white/90"
                    >
                      {creatingLesson ? 'Сохранение...' : 'Добавить урок'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOMEWORK CREATOR */}
      {activeTab === 'homework' && (
        <div className="rounded-xl border border-white/[0.08] bg-[#101014] p-6 max-w-3xl">
          <div className="mb-5 border-b border-white/[0.08] pb-3">
            <h3 className="text-base font-semibold text-white">Создание домашнего задания</h3>
            <p className="mt-1 text-xs text-white/50">
              Задайте название, дедлайн, награду в XP и шаблон стартового кода
            </p>
          </div>

          <form onSubmit={handleCreateHomework} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-white/70">Название задания *</label>
              <input
                type="text"
                required
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="Например: Реализация кэша LRU на Python"
                className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/70">
                Подробное описание и требования к заданию
              </label>
              <textarea
                rows={3}
                value={hwDescription}
                onChange={(e) => setHwDescription(e.target.value)}
                placeholder="Опишите алгоритмическую сложность, ограничения по памяти и формат входных данных..."
                className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-white/30"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Тип задания</label>
                <select
                  value={hwType}
                  onChange={(e) => setHwType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                >
                  <option value="practice">Практика</option>
                  <option value="project">Проект</option>
                  <option value="challenge">Челлендж на время</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Сложность</label>
                <select
                  value={hwDifficulty}
                  onChange={(e) => setHwDifficulty(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                >
                  <option value="easy">Лёгкое</option>
                  <option value="medium">Среднее</option>
                  <option value="hard">Сложное</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">Награда XP</label>
                <input
                  type="number"
                  value={hwXp}
                  onChange={(e) => setHwXp(Number(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/70">Дедлайн сдачи *</label>
              <input
                type="date"
                required
                value={hwDeadline}
                onChange={(e) => setHwDeadline(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#09090b] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-white/70">
                Шаблон стартового кода
              </label>
              <textarea
                rows={5}
                value={hwStarter}
                onChange={(e) => setHwStarter(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#09090b] p-3 font-mono text-xs text-emerald-400 outline-none focus:border-white/30"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={creatingHw}
                className="rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
              >
                {creatingHw ? 'Публикация...' : 'Создать и выдать задание'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: STUDENTS LIST */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white">Список обучающихся</h3>

          {loadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl border border-white/[0.08] bg-[#101014]" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40">Обучающихся пока нет</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl border border-white/[0.08] bg-[#101014] p-4 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-xs font-semibold text-white">
                      {st.firstName[0]}
                      {st.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-white">
                        {st.firstName} {st.lastName}
                      </div>
                      <div className="truncate text-[11px] text-white/40">@{st.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-xs text-white/60">
                    <span>XP: {st.xp}</span>
                    <span>Серия: {st.streakDays} дн.</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
