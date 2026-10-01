import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import crypto from 'node:crypto'

const DB_PATH = path.join(process.cwd(), 'codelab.db')
const db = new DatabaseSync(DB_PATH)
db.exec('PRAGMA foreign_keys = ON;')

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

console.log('Initializing database tables...')

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
`)

// Admin seed
const adminEmail = 'trofimzivilik14@gmail.com'
const admin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail)
const now = new Date().toISOString()
if (!admin) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = hashPassword('Trofim2014', salt)
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, first_name, last_name, username, role, status, xp, streak_days, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('u_admin', adminEmail, hash, salt, 'Трофим', 'Администратор', 'trofim_admin', 'admin', 'active', 5000, 15, now, now)
  console.log(`✅ Admin created: ${adminEmail} (password: Trofim2014)`)
} else {
  db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run(adminEmail)
  console.log(`✅ Admin exists and ensured role: ${adminEmail}`)
}

console.log('🎉 Database tables initialized! Only admin trofimzivilik14@gmail.com is configured.')

