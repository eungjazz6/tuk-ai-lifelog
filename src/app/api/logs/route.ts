import { NextResponse } from 'next/server'
import { readLogs } from '@/lib/storage'

export async function GET() {
  try {
    const logs = readLogs()
    return NextResponse.json(logs)
  } catch {
    return NextResponse.json({ error: 'Failed to read logs' }, { status: 500 })
  }
}
