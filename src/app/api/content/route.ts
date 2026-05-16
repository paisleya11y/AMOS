import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { buildContentPrompt } from '@/lib/prompts/content'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { ContentResult } from '@/types'

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

    if (!merchantId || typeof merchantId !== 'string') {
      console.error(`[content API] 无效的商家ID: ${merchantId}`)
      return NextResponse.json({ error: 'Invalid merchant ID' }, { status: 400 })
    }

    console.log(`[content API] 开始处理商家 ${merchantId}`)

    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      console.error(`[content API] 商家不存在: ${merchantId}`)
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    console.log(`[content API] 获取商家数据: ${merchant.name}, 品类: ${merchant.category}`)

    const prompt = await buildContentPrompt(merchant)
    console.log(`[content API] 提示构建完成, 长度: ${prompt.length}`)

    const result = await callDeepSeekJSON<ContentResult>([
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contentSkill },
      { role: 'user', content: prompt },
    ])

    console.log(`[content API] DeepSeek调用成功, 返回结果:`, {
      formatsCount: result.recommendedFormats?.length || 0,
      hasCreatorBrief: !!result.creatorBrief,
      hasLiveStructure: !!result.liveStructure,
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
    const fallbackData = {
      recommendedFormats: [
        { type: '卖点讲解型', reason: '适用于功能清晰的3C配件类商品', exampleAngle: '展示产品核心功能和独特卖点' }
      ],
      creatorBrief: `达人合作Brief：请根据${merchantId || '该商家'}的品类特点创作内容`,
      liveStructure: '引流品-主推品-利润品标准结构',
      weeklyPlan: '建议发布3-5条短视频，安排1-2场直播'
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