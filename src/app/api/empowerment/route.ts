import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { detectAnomalies } from '@/lib/tools/anomalyDetector'
import { buildEmpowermentPrompt } from '@/lib/prompts/empowerment'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { EmpowermentResult } from '@/types'

const adsSkill = fs.readFileSync(
  path.join(process.cwd(), 'skills/skill-ads-expert.md'),
  'utf-8'
)

export async function POST(req: NextRequest) {
  try {
    const { merchantId } = await req.json()
    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const alerts = detectAnomalies(merchant)
    const prompt = await buildEmpowermentPrompt(merchant, alerts)
    const result = await callDeepSeekJSON<EmpowermentResult>([
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + adsSkill },
      { role: 'user', content: prompt },
    ])

    return NextResponse.json(result)
  } catch (err) {
    console.error('[empowerment]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}