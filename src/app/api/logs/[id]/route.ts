import { NextRequest, NextResponse } from 'next/server'
import { deleteLog, updateLog } from '@/lib/storage'
import { Log } from '@/lib/types'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deleted = deleteLog(id)
    if (!deleted) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete log' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json() as Partial<Log>
    const updated = updateLog(id, body)
    if (!updated) return NextResponse.json({ error: 'Log not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Failed to update log' }, { status: 500 })
  }
}
