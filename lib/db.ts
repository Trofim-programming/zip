import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const DB_PATH = path.join(process.cwd(), 'codelab.db')

declare global {
  // eslint-disable-next-line no-var
  var _codelabDb: DatabaseSync | undefined
}

function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

export function getDb(): DatabaseSync {
  if (globalThis._codelabDb) {
    return globalThis._codelabDb
  }

  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA foreign_keys = ON;')

  initTables(db)
  seedInitialData(db)

  globalThis._codelabDb = db
  return db
}

function initTables(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      status TEXT NOT NULL DEFAULT 'active',
      xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 1,
      telegram_id TEXT UNIQUE,
      telegram_username TEXT,
      telegram_link_code TEXT UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      lessons INTEGER NOT NULL DEFAULT 0,
      hours INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 5.0,
      teacher TEXT NOT NULL,
      free INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL,
      hue TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_courses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      progress INTEGER NOT NULL DEFAULT 0,
      enrolled_at TEXT NOT NULL,
      UNIQUE(user_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS completed_lessons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      UNIQUE(user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS homeworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      deadline TEXT NOT NULL,
      xp INTEGER NOT NULL,
      teacher TEXT NOT NULL,
      attachments TEXT,
      starter TEXT,
      time_limit INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_homeworks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      homework_id TEXT NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'todo',
      submission_code TEXT,
      teacher_comment TEXT,
      submitted_at TEXT,
      updated_at TEXT,
      UNIQUE(user_id, homework_id)
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      day INTEGER NOT NULL,
      month TEXT NOT NULL DEFAULT 'oct',
      time TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      author TEXT NOT NULL,
      text TEXT NOT NULL,
      time TEXT NOT NULL,
      me INTEGER NOT NULL DEFAULT 0,
      reply_to TEXT,
      reactions TEXT,
      file TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      time TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 45,
      teacher_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'lecture',
      description TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      settings_json TEXT,
      whiteboard_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS whiteboard_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER NOT NULL DEFAULT 0,
      date TEXT,
      time TEXT,
      materials_json TEXT,
      homework_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  try { db.exec('ALTER TABLE user_homeworks ADD COLUMN grade INTEGER;') } catch {}
  try { db.exec('ALTER TABLE user_homeworks ADD COLUMN reviewed_at TEXT;') } catch {}
  try { db.exec('ALTER TABLE user_homeworks ADD COLUMN reviewed_by TEXT;') } catch {}
}

function seedInitialData(db: DatabaseSync) {
  // 1. Seed admin user: trofimzivilik14@gmail.com
  const adminEmail = 'trofimzivilik14@gmail.com'
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)
  if (!existingAdmin) {
    const adminSalt = crypto.randomBytes(16).toString('hex')
    const adminHash = hashPassword('Trofim2014', adminSalt)
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, first_name, last_name, username, role, status, xp, streak_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_admin', adminEmail, adminHash, adminSalt, 'Трофим', 'Администратор', 'trofim_admin', 'admin', 'active', 5000, 15, now, now)
  } else {
    // Ensure email trofimzivilik14@gmail.com is strictly admin
    db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(adminEmail)
  }

  // 2. Ensure no other user has 'admin' role
  db.prepare("UPDATE users SET role = 'student' WHERE email != ? AND role = 'admin'").run(adminEmail)

  // 3. Seed demo teacher user if not exists
  const teacherEmail = 'teacher@codelab.io'
  const existingTeacher = db.prepare('SELECT id FROM users WHERE email = ?').get(teacherEmail)
  if (!existingTeacher) {
    const tSalt = crypto.randomBytes(16).toString('hex')
    const tHash = hashPassword('Teacher2026', tSalt)
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, first_name, last_name, username, role, status, xp, streak_days, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('u_teacher', teacherEmail, tHash, tSalt, 'Алексей', 'Смирнов', 'teacher_alex', 'teacher', 'active', 3200, 12, now, now)
  }

  // 4. Seed sample live session if empty
  const sessionCount = (db.prepare('SELECT count(*) as count FROM live_sessions').get() as any)?.count || 0
  if (sessionCount === 0) {
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)
    db.prepare(`
      INSERT INTO live_sessions (id, title, date, time, duration, teacher_id, teacher_name, type, description, status, settings_json, whiteboard_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'room_algo_101',
      'Алгоритмы и структуры данных: Разбор бинарных деревьев',
      todayStr,
      '18:00',
      60,
      'u_admin',
      'Трофим Администратор',
      'lecture',
      'Изучим балансировку AVL-деревьев, поиск в глубину и применение в продакшене. Будет интерактивная доска.',
      'scheduled',
      JSON.stringify({ allowMic: true, allowCam: true, allowScreen: false, allowBoard: true }),
      0,
      now.toISOString()
    )
  }
}
