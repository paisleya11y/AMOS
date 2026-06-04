import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { matchBenchmark } from '@/lib/tools/benchmarkMatcher'
import { buildBenchmarkPrompt } from '@/lib/prompts/benchmark'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { BenchmarkResult } from '@/types'
import { DateRange } from '@/lib/dateRange'

const benchmarkSkill = fs.readFileSync(
  path.join(process.cwd(), 'skills/skill-benchmark-analyst.md'),
  'utf-8'
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const merchantId = body.merchantId
    const focusNote: string | undefined =
      typeof body.focusNote === 'string' && body.focusNote.trim()
        ? body.focusNote.trim().slice(0, 500)
        : undefined
    const dateRange: DateRange | undefined =
      body.dateRange && typeof body.dateRange.start === 'string' && typeof body.dateRange.end === 'string'
        ? { start: body.dateRange.start, end: body.dateRange.end }
        : undefined
    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const matchResult = matchBenchmark(merchant)
    const prompt = await buildBenchmarkPrompt(merchant, matchResult.case, matchResult.gapAnalysis, focusNote, dateRange)
    const result = await callDeepSeekJSON<BenchmarkResult>([
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + benchmarkSkill },
      { role: 'user', content: prompt },
    ])

    // 把匹配维度和差距分析注入返回结果，方便前端展示对标分析细节
    return NextResponse.json({
      ...result,
      matchScore: matchResult.totalScore,
      matchDimensions: matchResult.dimensions,
      matchSummary: matchResult.matchSummary,
      gapAnalysis: {
        scaleAssessment: matchResult.gapAnalysis.scaleAssessment,
        isSelfMatch: matchResult.gapAnalysis.isSelfMatch,
        keyDifferences: matchResult.gapAnalysis.keyDifferences,
        adaptationNotes: matchResult.gapAnalysis.adaptationNotes,
      },
    })
  } catch (err) {
    console.error('[benchmark]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
