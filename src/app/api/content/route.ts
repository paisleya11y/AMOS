import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { buildContentPrompt } from '@/lib/prompts/content'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { ContentResult, ContentGoal } from '@/types'
import { DateRange } from '@/lib/dateRange'

const VALID_GOALS: ContentGoal[] = ['awareness', 'conversion', 'followers', 'testing']

const contentSkill = fs.readFileSync(
  path.join(process.cwd(), 'skills/skill-content-expert.md'),
  'utf-8'
)

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let merchantId: string | null = null

  try {
    const body = await req.json()
    merchantId = body.merchantId
    const rawGoal = body.goal as string | undefined
    const goal: ContentGoal =
      rawGoal && VALID_GOALS.includes(rawGoal as ContentGoal)
        ? (rawGoal as ContentGoal)
        : 'conversion'
    const focusNote =
      typeof body.focusNote === 'string' && body.focusNote.trim()
        ? body.focusNote.trim().slice(0, 500)
        : undefined
    const dateRange: DateRange | undefined =
      body.dateRange && typeof body.dateRange.start === 'string' && typeof body.dateRange.end === 'string'
        ? { start: body.dateRange.start, end: body.dateRange.end }
        : undefined

    if (!merchantId || typeof merchantId !== 'string') {
      console.error(`[content API] 无效的商家ID: ${merchantId}`)
      return NextResponse.json({ error: 'Invalid merchant ID' }, { status: 400 })
    }

    console.log(`[content API] 开始处理商家 ${merchantId}, 目标 ${goal}`)

    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      console.error(`[content API] 商家不存在: ${merchantId}`)
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    console.log(`[content API] 获取商家数据: ${merchant.name}, 品类: ${merchant.category}`)

    const prompt = await buildContentPrompt(merchant, goal, focusNote, dateRange)
    console.log(`[content API] 提示构建完成, 长度: ${prompt.length}`)

    const result = await callDeepSeekJSON<ContentResult>(
      [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contentSkill },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 8000 }
    )

    console.log(`[content API] DeepSeek调用成功, 返回结果:`, {
      formatsCount: result.recommendedFormats?.length || 0,
      hasCreatorBrief: !!result.creatorBrief,
      hasWeeklyPlan: !!result.weeklyPlan,
      processingTime: Date.now() - startTime
    })

    return NextResponse.json(result)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const processingTime = Date.now() - startTime

    console.error(`[content API] 处理失败`, {
      merchantId,
      error: errorMessage,
      processingTime,
      stack: err instanceof Error ? err.stack : undefined
    })

    // 返回更详细的错误信息，但避免暴露内部细节
    const fallbackData: ContentResult = {
      productDiagnosis: {
        lifecycle: 'potential',
        topSearchTerms: ['fast charging', 'GaN charger', 'tiktok shop finds'],
        audienceProfile: 'US 25-35 commuter / remote worker（fallback 数据，请重新生成）',
        realSellingPoints: ['快充', '便携', '高性价比'],
        riskKeywords: ['better than Apple', 'medical-grade'],
      },
      contentMatrix: {
        current: { creatorVideo: 60, sellerVideo: 20, creatorLive: 0, sellerLive: 0 },
        diagnosis: 'Fallback：当前过度依赖达人短视频，无直播渠道支撑高客单转化（请重新生成）',
        improved: { creatorVideo: 40, sellerVideo: 30, creatorLive: 20, sellerLive: 10 },
        rationale: 'Fallback：补齐直播渠道做高客单转化，商家自制视频补节奏（请重新生成）',
        actions: ['请重新生成内容策略以获取实际建议'],
      },
      recommendedFormats: [
        {
          type: 'Honest Review',
          reason: 'Fallback：默认推荐美区高转化形式，请基于真实数据重新生成',
          hookExamples: ['POV: TikTok Shop made me buy this'],
          videoStructure: '0-3s hook → 4-10s pain → 11-25s demo → 26-34s CTA',
          usCtaScript: 'Tap the yellow cart bottom-left, ships in 2-3 days',
          complianceNotes: '不能写 "best ever"、"better than Apple"',
        },
      ],
      topicAngles: [],
      publishCadence: {
        testPhase: 'W1-W2 每天 1-2 条 / 覆盖 3 个方向',
        stablePhase: 'W3-W4 聚焦 Top1 方向 / 每天 2-3 条',
        peakPhase: '节点前 5-7 天预热',
      },
      creatorBrief: '达人合作 Brief：请根据该商家品类特点创作内容',
      creatorBriefEN: 'Creator brief: please regenerate with live data.',
      weeklyPlan: '建议本周发布 3-5 条短视频，覆盖 2-3 种白皮书五大分型',
    }

    return NextResponse.json({
      error: '内容策略生成失败',
      message: errorMessage,
      fallback: fallbackData,
      // 也返回有效的响应结构，让前端可以继续处理
      ...fallbackData
    }, { status: 500 })
  }
}