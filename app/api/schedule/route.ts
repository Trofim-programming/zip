import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const db = getDb()
  const events = db.prepare('SELECT * FROM events').all()
  return NextResponse.json({ success: true, events })
}
