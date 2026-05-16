import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { getMerchantProfile } from '@/lib/memory/merchantProfile'
import { detectAnomalies } from '@/lib/tools/anomalyDetector'
import { buildDiagnosePrompt } from '@/lib/prompts/diagnose'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { DiagnoseResult } from '@/types'

const diagnoseSkill = fs.readFileSync(
  path.join(process.cwd(), 'skills/skill-diagnose-expert.md'),
  'utf-8'
)

export async function POST(req: NextRequest) {
  try {
    const { merchantId } = await req.json()
    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const profile = getMerchantProfile(merchantId)
    const anomalyAlerts = detectAnomalies(merchant)
    const prompt = await buildDiagnosePrompt(merchant, profile)

    const result = await callDeepSeekJSON<DiagnoseResult>([
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + diagnoseSkill },
      { role: 'user', content: prompt },
    ])

    result.alerts = [...(result.alerts ?? []), ...anomalyAlerts]

    return NextResponse.json(result)
  } catch (err) {
    console.error('[diagnose]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}