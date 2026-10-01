// Mock data layer. Each export mirrors a future API/DB entity, so swapping to PostgreSQL only changes this module.

export type Level = 'Начальный' | 'Средний' | 'Продвинутый'

export type Course = {
  id: string
  title: string
  description: string
  category: string
  level: Level
  lessons: number
  hours: number
  rating: number
  progress: number
  teacher: string
  free: boolean
  format: 'Самостоятельно' | 'С преподавателем'
  hue: string
}

export const categories = [
  'Python',
  'JavaScript',
  'Web Development',
  'React',
  'TypeScript',
  'C++',
  'AI',
  'Telegram Bots',
  'Backend',
  'Git',
  'Algorithms',
]

export const courses: Course[] = []

export type LessonStatus = 'done' | 'current' | 'locked' | 'open'
export type Lesson = { id: string; title: string; minutes: number; type: 'theory' | 'practice' | 'quiz' }
export type Module = { id: string; title: string; lessons: Lesson[] }

export const pythonModules: Module[] = []
export const allLessons: Lesson[] = []

export type HomeworkStatus = 'todo' | 'progress' | 'done' | 'rework'
export type Homework = {
  id: string
  title: string
  description: string
  type: 'Проект' | 'Исправь код' | 'Code Challenge' | 'Бот'
  difficulty: 'Лёгкое' | 'Среднее' | 'Сложное'
  deadline: string
  xp: number
  status: HomeworkStatus
  teacher: string
  attachments: string[]
  starter: string
  timeLimit?: number
}

export const homeworks: Homework[] = []

export const achievements: { id: string; title: string; description: string; icon: string; progress: number; unlocked: boolean }[] = []

export const practiceTasks: { id: string; title: string; category: string; difficulty: string; xp: number; solved: boolean; rate: number }[] = []

export const leaderboard = [
  { name: 'Трофим Администратор', xp: 0, me: true },
]

export type EventType = 'live' | 'deadline' | 'homework' | 'event' | 'extra'
export const events: { id: string; day: number; time: string; title: string; type: EventType }[] = []

export const notifications: { id: string; type: string; title: string; detail: string; time: string; read: boolean }[] = []

export type ChatMessage = {
  id: string
  author: string
  text: string
  time: string
  me?: boolean
  replyTo?: string
  reactions?: Record<string, number>
  file?: string
}

export const chats: { id: string; name: string; kind: string; unread: number; last: string }[] = []

export const chatMessages: Record<string, ChatMessage[]> = {}

export const participants: { name: string; role: string; mic: boolean; cam: boolean; hand: boolean }[] = []

export const adminUsers = [
  { id: 'u_admin', name: 'Трофим Администратор', email: 'trofimzivilik14@gmail.com', role: 'admin', status: 'active', courses: 0, joined: '01.09.2026' },
]

export const activitySeries = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
export const months = ['Окт', 'Ноя', 'Дек', 'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен']

export const plans = [
  { id: 'start', name: 'START', price: 990, description: 'Для начинающих', features: ['3 базовых курса', 'Практика: лёгкие задачи', 'Чат курса', 'Сертификат'], highlight: false },
  { id: 'pro', name: 'PRO', price: 2490, description: 'Полный доступ к курсам и практике', features: ['Все курсы', 'Вся практика и рейтинг', 'Домашние задания с проверкой', 'Автопроверка кода', 'Приоритетная поддержка'], highlight: true },
  { id: 'premium', name: 'PREMIUM', price: 4990, description: 'Максимум возможностей', features: ['Всё из PRO', 'AI Tutor без ограничений', 'Живые занятия', 'Доп. материалы', 'Код-ревью от ментора'], highlight: false },
]
