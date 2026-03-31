import { NextRequest, NextResponse } from 'next/server'
import { readConfig, writeConfig, getGeminiApiKey } from '@/lib/storage'

export async function GET() {
  const key = getGeminiApiKey()
  // 키 앞 8자리만 노출 (보안)
  const masked = key ? key.slice(0, 8) + '••••••••••••••••••••' : ''
  return NextResponse.json({ hasKey: !!key, masked })
}

export async function POST(req: NextRequest) {
  const { geminiApiKey } = await req.json() as { geminiApiKey: string }
  const config = readConfig()
  config.geminiApiKey = geminiApiKey.trim()
  writeConfig(config)
  return NextResponse.json({ ok: true })
}
