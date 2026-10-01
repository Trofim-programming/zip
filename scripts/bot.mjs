import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

// Load .env
const envPath = path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      if (!process.env[key]) {
        process.env[key] = val
      }
    }
  }
}

const BOT_TOKEN = process.env.BOT_TOKEN || '8867579022:AAEwZ7LgPUD1bOfnKvzjaKHoUKEQyDJiouw'
const DB_PATH = path.join(process.cwd(), 'codelab.db')
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`

console.log('🤖 Starting Telegram Bot for CODELAB...')
console.log(`📁 Database: ${DB_PATH}`)

const db = new DatabaseSync(DB_PATH)

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
}

// Custom Telegram Emoji IDs specified in prompt
const EMOJI = {
  settings: '5870982283724328568',
  profile: '5870994129244131212',
  people: '5870772616305839506',
  personCheck: '5891207662678317861',
  personCross: '5893192487324880883',
  file: '5870528606328852614',
  smile: '5870764288364252592',
  chart: '5870930636742595124',
  stats: '5870921681735781843',
  home: '5873147866364514353',
  lockClosed: '6037249452824072506',
  lockOpen: '6037496202990194718',
  megaphone: '6039422865189638057',
  check: '5870633910337015697',
  cross: '5870657884844462243',
  pencil: '5870676941614354370',
  trash: '5870875489362513438',
  down: '5893057118545646106',
  paperclip: '6039451237743595514',
  link: '5769289093221454192',
  info: '6028435952299413210',
  bot: '6030400221232501136',
  eye: '6037397706505195857',
  hidden: '6037243349675544634',
  send: '5963103826075456248',
  download: '6039802767931871481',
  notification: '6039486778597970865',
  gift: '6032644646587338669',
  clock: '5983150113483134607',
  hooray: '6041731551845159060',
  font: '5870801517140775623',
  write: '5870753782874246579',
  media: '6035128606563241721',
  pin: '6042011682497106307',
  wallet: '5769126056262898415',
  box: '5884479287171485878',
  apps: '5778672437122045013',
  brush: '6050679691004612757',
  addText: '5771851822897566479',
  format: '5778479949572738874',
  money: '5904462880941545555',
  sendMoney: '5890848474563352982',
  receiveMoney: '5879814368572478751',
  code: '5940433880585605708',
  loading: '5345906554510012647',
}

function tgEmoji(id, fallback = '') {
  return `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>`
}

function inlineBtn(text, callback_data, emojiId) {
  const btn = { text, callback_data }
  if (emojiId) {
    btn.icon_custom_emoji_id = emojiId
  }
  return btn
}

// Back button strict rule: text is ALWAYS '◁' and nothing else
const backButton = { text: '◁', callback_data: 'back_main' }

async function tgApi(method, data = {}) {
  try {
    const res = await fetch(`${API_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return await res.json()
  } catch (err) {
    console.error(`Telegram API error on ${method}:`, err.message)
    return { ok: false, error: err.message }
  }
}

function getUserByTgId(tgId) {
  return db
    .prepare(`
      SELECT id, email, first_name, last_name, username, role, xp, streak_days
      FROM users
      WHERE telegram_id = ?
    `)
    .get(String(tgId))
}

function getUserByLinkCode(code) {
  return db
    .prepare(`
      SELECT id, email, first_name, last_name, username, role, xp, streak_days
      FROM users
      WHERE telegram_link_code = ?
    `)
    .get(String(code).trim())
}

function linkUserToTg(userId, tgId, tgUsername) {
  db.prepare(`
    UPDATE users
    SET telegram_id = ?, telegram_username = ?, telegram_link_code = NULL, updated_at = ?
    WHERE id = ?
  `).run(String(tgId), tgUsername || null, new Date().toISOString(), userId)
}

function unlinkTg(tgId) {
  db.prepare(`
    UPDATE users
    SET telegram_id = NULL, telegram_username = NULL, telegram_link_code = NULL
    WHERE telegram_id = ?
  `).run(String(tgId))
}

function getRoleMenuKeyboard(role) {
  if (role === 'admin') {
    return {
      keyboard: [
        [{ text: '👑 Админ-панель' }, { text: '🎓 Проверка ДЗ' }],
        [{ text: '📚 Домашка' }, { text: '📅 Расписание' }],
        [{ text: '👤 Мой профиль' }, { text: '❓ Помощь' }],
      ],
      resize_keyboard: true,
    }
  }

  if (role === 'teacher') {
    return {
      keyboard: [
        [{ text: '🎓 Проверка ДЗ' }, { text: '📅 Расписание' }],
        [{ text: '📚 Домашка' }, { text: '🎥 Онлайн-занятия' }],
        [{ text: '👤 Мой профиль' }, { text: '❓ Помощь' }],
      ],
      resize_keyboard: true,
    }
  }

  // Student (default)
  return {
    keyboard: [
      [{ text: '📚 Моя домашка' }, { text: '📅 Расписание' }],
      [{ text: '🔔 Напоминания' }, { text: '📖 Курсы' }],
      [{ text: '👤 Мой профиль' }, { text: '❓ Помощь' }],
    ],
    resize_keyboard: true,
  }
}

// Main greeting
async function handleStart(chatId, tgUser, payload) {
  if (payload) {
    const user = getUserByLinkCode(payload)
    if (user) {
      linkUserToTg(user.id, tgUser.id, tgUser.username)
      const roleTitle =
        user.role === 'admin' ? 'Администратор' : user.role === 'teacher' ? 'Преподаватель' : 'Ученик'

      const msg =
        `${tgEmoji(EMOJI.check, '✅')} <b>Аккаунт успешно подключен!</b>\n\n` +
        `Добро пожаловать в платформу CODELAB, <b>${user.first_name} ${user.last_name}</b>!\n` +
        `• ${tgEmoji(EMOJI.profile, '👤')} Логин: <code>@${user.username}</code>\n` +
        `• ${tgEmoji(EMOJI.lockOpen, '💼')} Роль: <b>${roleTitle}</b>\n` +
        `• ${tgEmoji(EMOJI.hooray, '🏆')} Баланс: <b>${user.xp} XP</b>\n\n` +
        `Используйте интерактивное меню ниже для быстрого доступа к материалам.`

      await tgApi('sendMessage', {
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: getRoleMenuKeyboard(user.role),
      })
      return
    } else {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `${tgEmoji(EMOJI.cross, '❌')} Код привязки <code>${payload}</code> не найден или устарел.\nПолучите новый код в личном кабинете на сайте.`,
        parse_mode: 'HTML',
      })
    }
  }

  const existing = getUserByTgId(tgUser.id)
  if (existing) {
    const roleTitle =
      existing.role === 'admin' ? 'Администратор' : existing.role === 'teacher' ? 'Преподаватель' : 'Ученик'

    const text =
      `${tgEmoji(EMOJI.bot, '🤖')} <b>CODELAB · Главное меню</b>\n\n` +
      `Рады видеть вас, <b>${existing.first_name}</b>!\n` +
      `• Статус: <b>${roleTitle}</b>\n` +
      `• Опыт: <b>${existing.xp} XP</b>\n\n` +
      `Выберите раздел в меню или воспользуйтесь быстрыми кнопками:`

    const inline_keyboard = []

    if (existing.role === 'admin') {
      inline_keyboard.push([
        inlineBtn('Админ-панель', 'admin_panel', EMOJI.settings),
        inlineBtn('Проверка ДЗ', 'teacher_queue', EMOJI.pencil),
      ])
      inline_keyboard.push([
        inlineBtn('Статистика платформы', 'admin_stats', EMOJI.stats),
        inlineBtn('Уведомление всем', 'admin_broadcast_info', EMOJI.megaphone),
      ])
    } else if (existing.role === 'teacher') {
      inline_keyboard.push([
        inlineBtn('Проверка ДЗ', 'teacher_queue', EMOJI.pencil),
        inlineBtn('Онлайн-занятия', 'view_live', EMOJI.media),
      ])
      inline_keyboard.push([
        inlineBtn('Мои ученики', 'teacher_students', EMOJI.people),
        inlineBtn('Расписание', 'view_schedule', EMOJI.clock),
      ])
    } else {
      inline_keyboard.push([
        inlineBtn('Моя домашка', 'view_homework', EMOJI.file),
        inlineBtn('Расписание', 'view_schedule', EMOJI.clock),
      ])
      inline_keyboard.push([
        inlineBtn('Напоминания', 'view_reminders', EMOJI.notification),
        inlineBtn('Мой профиль', 'view_profile', EMOJI.profile),
      ])
    }

    await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard },
    })
  } else {
    const text =
      `${tgEmoji(EMOJI.bot, '🤖')} <b>Добро пожаловать в онлайн-школу CODELAB!</b>\n\n` +
      `Бот предоставляет персонализированный доступ к учебному процессу:\n` +
      `• ${tgEmoji(EMOJI.file, '📚')} Домашние задания, сдача решений и оценки\n` +
      `• ${tgEmoji(EMOJI.clock, '📅')} Расписание занятий, дедлайны и напоминания\n` +
      `• ${tgEmoji(EMOJI.media, '🎥')} Подключение к интерактивным онлайн-урокам\n` +
      `• ${tgEmoji(EMOJI.stats, '⚡️')} Отслеживание XP и личного рейтинга\n\n` +
      `<b>Как авторизоваться:</b>\n` +
      `1. Откройте сайт CODELAB в браузере\n` +
      `2. В Настройках нажмите <i>«Подключить Telegram»</i>\n` +
      `3. Отправьте сюда команду: <code>/link КОД</code>\n` +
      `Или выполните вход: <code>/login email пароль</code>`

    await tgApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    })
  }
}

// Student Homework View
async function handleHomework(chatId, tgUser) {
  const user = getUserByTgId(tgUser.id)
  if (!user) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.lockClosed, '🔒')} Сначала привяжите аккаунт через команду <code>/link КОД</code>`,
      parse_mode: 'HTML',
    })
    return
  }

  const allHw = db.prepare('SELECT * FROM homeworks').all()
  const userHws = db.prepare('SELECT homework_id, status, teacher_comment, grade FROM user_homeworks WHERE user_id = ?').all(user.id)
  const userHwMap = Object.fromEntries(userHws.map((uh) => [uh.homework_id, uh]))

  let text = `${tgEmoji(EMOJI.file, '📚')} <b>Домашние задания (${user.first_name}):</b>\n\n`
  const inline_keyboard = []

  for (const h of allHw) {
    const userHw = userHwMap[h.id]
    const status = userHw ? userHw.status : 'todo'
    const statusLabel =
      status === 'done'
        ? `✅ Проверено (оценка: ${userHw.grade || '5'})`
        : status === 'progress'
        ? '⏳ На проверке'
        : status === 'rework'
        ? '⚠️ На доработке'
        : '📋 Не начато'

    text += `<b>${h.title}</b> [${h.type}]\n`
    text += `• Статус: <b>${statusLabel}</b>\n`
    text += `• Дедлайн: <b>${h.deadline}</b> · Награда: +${h.xp} XP\n`
    if (userHw && userHw.teacher_comment) {
      text += `• Комментарий учителя: <i>«${userHw.teacher_comment}»</i>\n`
    }
    text += `──────────────────\n`

    inline_keyboard.push([
      inlineBtn(`Детали: ${h.title}`, `hw_${h.id}`, EMOJI.info),
    ])
  }

  inline_keyboard.push([backButton])

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard },
  })
}

// Teacher / Admin: Review queue
async function handleTeacherQueue(chatId, tgUser) {
  const user = getUserByTgId(tgUser.id)
  if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.lockClosed, '🔒')} У вас нет прав преподавателя.`,
      parse_mode: 'HTML',
    })
    return
  }

  const submissions = db
    .prepare(`
      SELECT uh.id, uh.user_id, uh.homework_id, uh.status, uh.submission_code, uh.submitted_at,
             u.first_name, u.last_name, u.email,
             h.title as hw_title, h.xp as hw_xp
      FROM user_homeworks uh
      JOIN users u ON u.id = uh.user_id
      JOIN homeworks h ON h.id = uh.homework_id
      WHERE uh.status = 'progress'
      ORDER BY uh.submitted_at DESC
      LIMIT 10
    `)
    .all()

  if (submissions.length === 0) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.check, '✅')} <b>Очередь проверки пуста!</b>\nВсе сданные работы проверены.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[backButton]],
      },
    })
    return
  }

  let text = `${tgEmoji(EMOJI.pencil, '✏️')} <b>Работы на проверке (${submissions.length}):</b>\n\n`
  const inline_keyboard = []

  for (const s of submissions) {
    text += `<b>${s.first_name} ${s.last_name}</b>\n`
    text += `• Задание: <i>${s.hw_title}</i>\n`
    text += `• Сдано: ${new Date(s.submitted_at).toLocaleDateString('ru-RU')}\n`
    text += `──────────────────\n`

    inline_keyboard.push([
      inlineBtn(`Проверить: ${s.first_name} (${s.hw_title.slice(0, 15)}...)`, `grade_${s.id}`, EMOJI.pencil),
    ])
  }

  inline_keyboard.push([backButton])

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard },
  })
}

// Admin: System stats
async function handleAdminStats(chatId, tgUser) {
  const user = getUserByTgId(tgUser.id)
  if (!user || user.role !== 'admin') {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.lockClosed, '🔒')} Доступ разрешён только главному администратору.`,
      parse_mode: 'HTML',
    })
    return
  }

  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get())?.c || 0
  const hwCount = (db.prepare('SELECT COUNT(*) as c FROM homeworks').get())?.c || 0
  const subsCount = (db.prepare('SELECT COUNT(*) as c FROM user_homeworks').get())?.c || 0
  const liveCount = (db.prepare('SELECT COUNT(*) as c FROM live_sessions').get())?.c || 0

  const text =
    `${tgEmoji(EMOJI.stats, '📊')} <b>Статистика платформы CODELAB:</b>\n\n` +
    `• ${tgEmoji(EMOJI.people, '👥')} Всего пользователей: <b>${usersCount}</b>\n` +
    `• ${tgEmoji(EMOJI.file, '📚')} Домашних заданий в базе: <b>${hwCount}</b>\n` +
    `• ${tgEmoji(EMOJI.pencil, '✏️')} Сданных решений: <b>${subsCount}</b>\n` +
    `• ${tgEmoji(EMOJI.media, '🎥')} Онлайн-занятий: <b>${liveCount}</b>\n` +
    `• ${tgEmoji(EMOJI.shield, '🛡')} Режим безопасности: <b>Strict Role Verification</b>\n\n` +
    `База данных: SQLite (Active)`

  const inline_keyboard = [
    [inlineBtn('Управление пользователями', 'admin_users', EMOJI.people)],
    [backButton],
  ]

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard },
  })
}

// Schedule handler
async function handleSchedule(chatId, tgUser) {
  const events = db.prepare('SELECT * FROM events ORDER BY day ASC').all()
  const sessions = db.prepare('SELECT * FROM live_sessions ORDER BY date ASC LIMIT 5').all()

  let text = `${tgEmoji(EMOJI.clock, '📅')} <b>Расписание занятий и дедлайнов:</b>\n\n`

  if (sessions.length > 0) {
    text += `<b>🎥 Онлайн-конференции:</b>\n`
    for (const s of sessions) {
      text += `• <b>${s.date} ${s.time}</b> — ${s.title}\n`
      text += `  Преподаватель: ${s.teacher_name} (${s.duration} мин)\n`
    }
    text += `\n`
  }

  text += `<b>📌 Календарные события:</b>\n`
  for (const ev of events) {
    text += `• <b>${ev.day} ${ev.month}</b> ${ev.time} — ${ev.title}\n`
  }

  const inline_keyboard = [
    [inlineBtn('Онлайн-занятия', 'view_live', EMOJI.media)],
    [backButton],
  ]

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard },
  })
}

// Profile handler
async function handleProfile(chatId, tgUser) {
  const user = getUserByTgId(tgUser.id)
  if (!user) {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.lockClosed, '🔒')} Сначала привяжите свой аккаунт через команду <code>/link КОД</code>`,
      parse_mode: 'HTML',
    })
    return
  }

  const roleTitle =
    user.role === 'admin' ? 'Администратор' : user.role === 'teacher' ? 'Преподаватель' : 'Ученик'

  let level = 1
  let rank = 'Junior'
  if (user.xp >= 10000) { level = 5; rank = 'Architect' }
  else if (user.xp >= 5000) { level = 4; rank = 'Lead' }
  else if (user.xp >= 2500) { level = 3; rank = 'Middle' }
  else if (user.xp >= 1000) { level = 2; rank = 'Junior+' }

  const text =
    `${tgEmoji(EMOJI.profile, '👤')} <b>Профиль CODELAB</b>\n\n` +
    `• Имя: <b>${user.first_name} ${user.last_name}</b>\n` +
    `• Email: <code>${user.email}</code>\n` +
    `• Логин: @${user.username}\n` +
    `• Роль: <b>${roleTitle}</b>\n` +
    `• Уровень: <b>Lvl ${level} (${rank})</b>\n` +
    `• Опыт: <b>${user.xp} XP</b>\n` +
    `• Серия дней: <b>${user.streak_days || 1}</b> 🔥\n\n` +
    `Синхронизация Telegram активна.`

  const inline_keyboard = [[backButton]]

  await tgApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard },
  })
}

// Callback queries handler
async function handleCallbackQuery(query) {
  const { id, data, message, from } = query
  await tgApi('answerCallbackQuery', { callback_query_id: id })

  // Return to main menu
  if (data === 'back_main') {
    await handleStart(message.chat.id, from, '')
    return
  }

  // Admin panel
  if (data === 'admin_panel' || data === 'admin_stats') {
    await handleAdminStats(message.chat.id, from)
    return
  }

  // Teacher queue
  if (data === 'teacher_queue') {
    await handleTeacherQueue(message.chat.id, from)
    return
  }

  // Grade inspect
  if (data.startsWith('grade_')) {
    const subId = data.replace('grade_', '')
    const sub = db
      .prepare(`
        SELECT uh.*, u.first_name, u.last_name, h.title as hw_title
        FROM user_homeworks uh
        JOIN users u ON u.id = uh.user_id
        JOIN homeworks h ON h.id = uh.homework_id
        WHERE uh.id = ?
      `)
      .get(subId)

    if (!sub) return

    const text =
      `${tgEmoji(EMOJI.pencil, '✏️')} <b>Проверка решения:</b>\n` +
      `Ученик: <b>${sub.first_name} ${sub.last_name}</b>\n` +
      `Задание: <b>${sub.hw_title}</b>\n\n` +
      `<b>Код решения:</b>\n<pre><code class="language-python">${(sub.submission_code || 'Код не прикреплен').slice(0, 1000)}</code></pre>`

    const inline_keyboard = [
      [
        inlineBtn('Принять (5)', `accept_${sub.id}_5`, EMOJI.check),
        inlineBtn('Принять (4)', `accept_${sub.id}_4`, EMOJI.check),
      ],
      [
        inlineBtn('На доработку', `rework_${sub.id}`, EMOJI.pencil),
      ],
      [backButton],
    ]

    await tgApi('sendMessage', {
      chat_id: message.chat.id,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard },
    })
    return
  }

  // Grade action accept
  if (data.startsWith('accept_')) {
    const parts = data.split('_')
    const subId = parts[1]
    const grade = Number(parts[2]) || 5
    const now = new Date().toISOString()

    const sub = db.prepare('SELECT user_id, homework_id FROM user_homeworks WHERE id = ?').get(subId)
    if (sub) {
      db.prepare(`
        UPDATE user_homeworks
        SET status = 'done', grade = ?, teacher_comment = 'Отличная работа! Решение зачтено.', reviewed_at = ?
        WHERE id = ?
      `).run(grade, now, subId)

      db.prepare('UPDATE users SET xp = xp + 100 WHERE id = ?').run(sub.user_id)

      await tgApi('sendMessage', {
        chat_id: message.chat.id,
        text: `${tgEmoji(EMOJI.check, '✅')} <b>Работа зачтена с оценкой ${grade}!</b> Ученику начислено +100 XP.`,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: [[backButton]] },
      })
    }
    return
  }

  // Grade action rework
  if (data.startsWith('rework_')) {
    const subId = data.replace('rework_', '')
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE user_homeworks
      SET status = 'todo', teacher_comment = 'Пожалуйста, исправьте замечания и отправьте решение снова.', reviewed_at = ?
      WHERE id = ?
    `).run(now, subId)

    await tgApi('sendMessage', {
      chat_id: message.chat.id,
      text: `${tgEmoji(EMOJI.pencil, '✏️')} Работа возвращена на доработку. Ученик получил уведомление.`,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[backButton]] },
    })
    return
  }

  // View homework detail
  if (data.startsWith('hw_')) {
    const hwId = data.replace('hw_', '')
    const hw = db.prepare('SELECT * FROM homeworks WHERE id = ?').get(hwId)
    if (!hw) return

    const user = getUserByTgId(from.id)
    let userHw = null
    if (user) {
      userHw = db.prepare('SELECT * FROM user_homeworks WHERE user_id = ? AND homework_id = ?').get(user.id, hwId)
    }

    let text =
      `${tgEmoji(EMOJI.file, '📝')} <b>${hw.title}</b>\n\n` +
      `${hw.description}\n\n` +
      `• Дедлайн: <b>${hw.deadline}</b>\n` +
      `• Награда: <b>+${hw.xp} XP</b> · Сложность: ${hw.difficulty}\n` +
      `• Преподаватель: ${hw.teacher}\n`

    if (userHw && userHw.teacher_comment) {
      text += `\n💬 <b>Комментарий преподавателя:</b>\n<i>«${userHw.teacher_comment}»</i>\n`
    }

    if (hw.starter) {
      text += `\n💻 <b>Шаблон кода:</b>\n<pre><code class="language-python">${hw.starter.slice(0, 300)}</code></pre>`
    }

    const inline_keyboard = [[backButton]]

    await tgApi('sendMessage', {
      chat_id: message.chat.id,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard },
    })
    return
  }

  // Shortcuts
  if (data === 'view_homework') {
    await handleHomework(message.chat.id, from)
    return
  }
  if (data === 'view_schedule') {
    await handleSchedule(message.chat.id, from)
    return
  }
  if (data === 'view_profile') {
    await handleProfile(message.chat.id, from)
    return
  }
}

// Handle incoming messages
async function handleMessage(msg) {
  const chatId = msg.chat.id
  const tgUser = msg.from
  const text = (msg.text || '').trim()

  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/)
    const payload = parts[1] || ''
    await handleStart(chatId, tgUser, payload)
    return
  }

  if (text.startsWith('/link')) {
    const parts = text.split(/\s+/)
    const code = parts[1]
    if (!code) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `Укажите код привязки. Пример: <code>/link 123456</code>`,
        parse_mode: 'HTML',
      })
      return
    }

    const user = getUserByLinkCode(code)
    if (!user) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `${tgEmoji(EMOJI.cross, '❌')} Код <code>${code}</code> не найден или устарел.`,
        parse_mode: 'HTML',
      })
      return
    }

    linkUserToTg(user.id, tgUser.id, tgUser.username)
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.check, '✅')} <b>Аккаунт успешно привязан!</b> Добро пожаловать, ${user.first_name}!`,
      parse_mode: 'HTML',
      reply_markup: getRoleMenuKeyboard(user.role),
    })
    return
  }

  if (text.startsWith('/login')) {
    const parts = text.split(/\s+/)
    if (parts.length < 3) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `Формат входа: <code>/login email пароль</code>`,
        parse_mode: 'HTML',
      })
      return
    }

    const email = parts[1].toLowerCase()
    const pass = parts.slice(2).join(' ')
    const user = db
      .prepare('SELECT id, email, password_hash, salt, first_name, last_name, username, xp, role FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
      .get(email, email)

    if (!user) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `${tgEmoji(EMOJI.cross, '❌')} Пользователь с логином "${email}" не найден.`,
        parse_mode: 'HTML',
      })
      return
    }

    const hash = hashPassword(pass, user.salt)
    if (hash !== user.password_hash) {
      await tgApi('sendMessage', {
        chat_id: chatId,
        text: `${tgEmoji(EMOJI.cross, '❌')} Неверный пароль.`,
        parse_mode: 'HTML',
      })
      return
    }

    linkUserToTg(user.id, tgUser.id, tgUser.username)
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `${tgEmoji(EMOJI.check, '✅')} <b>Авторизация успешна!</b> Добро пожаловать, ${user.first_name} ${user.last_name}!`,
      parse_mode: 'HTML',
      reply_markup: getRoleMenuKeyboard(user.role),
    })
    return
  }

  if (text === '/unlink') {
    unlinkTg(tgUser.id)
    await tgApi('sendMessage', {
      chat_id: chatId,
      text: `👋 Аккаунт отвязан от Telegram. Чтобы привязать снова, отправьте <code>/link КОД</code>.`,
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    })
    return
  }

  // Reply Keyboard actions
  if (text === '📚 Моя домашка' || text === '📚 Домашка' || text === '/homework') {
    await handleHomework(chatId, tgUser)
    return
  }

  if (text === '🎓 Проверка ДЗ') {
    await handleTeacherQueue(chatId, tgUser)
    return
  }

  if (text === '👑 Админ-панель') {
    await handleAdminStats(chatId, tgUser)
    return
  }

  if (text === '📅 Расписание' || text === '/schedule') {
    await handleSchedule(chatId, tgUser)
    return
  }

  if (text === '👤 Мой профиль' || text === '/profile') {
    await handleProfile(chatId, tgUser)
    return
  }

  if (text === '❓ Помощь' || text === '/help') {
    await tgApi('sendMessage', {
      chat_id: chatId,
      text:
        `${tgEmoji(EMOJI.info, 'ℹ️')} <b>Команды бота CODELAB:</b>\n\n` +
        `• /start - Главное меню\n` +
        `• /link КОД - Привязать аккаунт сайта\n` +
        `• /login email пароль - Вход по логину\n` +
        `• /homework - Домашние задания и оценки\n` +
        `• /schedule - Расписание занятий\n` +
        `• /profile - Мой профиль и опыт XP\n` +
        `• /unlink - Отвязать Telegram`,
      parse_mode: 'HTML',
    })
    return
  }

  // Default fallback
  const user = getUserByTgId(tgUser.id)
  if (user) {
    await handleStart(chatId, tgUser, '')
  } else {
    await handleStart(chatId, tgUser, '')
  }
}

let offset = 0
let running = true

async function poll() {
  while (running) {
    try {
      const res = await tgApi('getUpdates', {
        offset,
        timeout: 25,
      })

      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1
          if (update.message) {
            await handleMessage(update.message)
          } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query)
          }
        }
      } else {
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (err) {
      console.error('Polling loop error:', err.message)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

tgApi('getMe').then((res) => {
  if (res.ok) {
    console.log(`✅ Telegram bot connected as @${res.result.username} (${res.result.first_name})`)
    poll()
  } else {
    console.error('❌ Failed to connect Telegram Bot:', res)
  }
})

process.on('SIGINT', () => {
  console.log('Shutting down bot...')
  running = false
  process.exit(0)
})

process.on('SIGTERM', () => {
  running = false
  process.exit(0)
})
