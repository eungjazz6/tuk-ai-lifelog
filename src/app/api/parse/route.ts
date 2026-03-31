import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { parseInput, answerQuery } from '@/lib/claude'
import { addLog, updateLog, deleteLog, findLastLog, findLogByKeyword, readLogs } from '@/lib/storage'
import { Log } from '@/lib/types'

function resolveTimestamp(datetime?: string): string {
  if (!datetime || datetime === 'today') return new Date().toISOString()
  if (datetime === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString()
  }
  const d = new Date(`${datetime}T12:00:00`)
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function getCurrentCycleId(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { text: string; recentLogs: Log[] }
    const { text, recentLogs } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: '입력이 비어있어' }, { status: 400 })
    }

    const result = await parseInput(text, recentLogs)
    console.log('AI 결과:', JSON.stringify(result, null, 2))

    const inputId = uuidv4()
    let logs: Log[] = []
    let queryAnswer: string | undefined

    if (result.action === 'create') {
      const items = result.items ?? []
      for (const item of items) {
        const log: Log = {
          id: uuidv4(),
          timestamp: resolveTimestamp(item.parsedData.datetime),
          category: item.category,
          sourceText: text,
          parsedData: item.parsedData,
          isModified: false,
          cycleId: getCurrentCycleId(),
          inputId,
          ...(item.category === '소비' && {
            moneyType: result.moneyType,
            subCategory: result.subCategory,
            paymentMethod: result.moneyType === '지출' ? (result.paymentMethod ?? '카드') : undefined,
          }),
        }
        addLog(log)
        logs.push(log)
      }

    } else if (result.action === 'update') {
      const firstItem = result.items?.[0]
      let targetLog: Log | undefined

      if (result.target === 'last') {
        targetLog = findLastLog()
      } else if (result.target === 'search' && result.searchKeyword) {
        targetLog = findLogByKeyword(result.searchKeyword)
      }

      if (targetLog && firstItem) {
        const updated = updateLog(targetLog.id, {
          category: firstItem.category,
          parsedData: firstItem.parsedData,
          originalData: targetLog.parsedData,
        })
        if (updated) logs.push(updated)
      } else if (firstItem) {
        const log: Log = {
          id: uuidv4(),
          timestamp: resolveTimestamp(firstItem.parsedData.datetime),
          category: firstItem.category,
          sourceText: text,
          parsedData: firstItem.parsedData,
          isModified: false,
          cycleId: getCurrentCycleId(),
        }
        addLog(log)
        logs.push(log)
      }

    } else if (result.action === 'delete') {
      let targetLog: Log | undefined
      if (result.target === 'last') {
        targetLog = findLastLog()
      } else if (result.target === 'search' && result.searchKeyword) {
        targetLog = findLogByKeyword(result.searchKeyword)
      }
      if (targetLog) deleteLog(targetLog.id)

    } else if (result.action === 'query') {
      const allLogs = readLogs()
      queryAnswer = await answerQuery(text, allLogs)
    }

    return NextResponse.json({
      feedback: result.feedback,
      logs,
      log: logs[0],
      action: result.action,
      queryAnswer,
    })

  } catch (err) {
    console.error('Parse error:', err)
    return NextResponse.json(
      { error: '파싱 실패. 다시 해봐.', feedback: '뭔가 잘못됐어, 다시 해봐' },
      { status: 500 }
    )
  }
}