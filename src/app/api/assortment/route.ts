import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { callDeepSeekJSON } from '@/lib/deepseek'
import { getMerchantById } from '@/lib/mockData/merchants'
import { buildAssortmentPrompt } from '@/lib/prompts/assortment'
import { SYSTEM_PROMPT } from '@/lib/prompts/system'
import { analyzeInventory, getTrendOpportunities } from '@/lib/tools/inventoryAnalyzer'
import { AssortmentResult, AssortmentLLMOutput } from '@/types'

const assortmentSkill = fs.readFileSync(
  path.join(process.cwd(), 'skills/skill-assortment-expert.md'),
  'utf-8'
)

function mergeAssortmentResult(
  llm: AssortmentLLMOutput,
  inventory: ReturnType<typeof analyzeInventory>,
  trends: ReturnType<typeof getTrendOpportunities>
): AssortmentResult {
  // 将 LLM 增强的诊断文本合并到规则化结果中
  const trendActionMap = new Map(llm.trendActions?.map(a => [a.keyword, a.suggestedAction]) ?? [])

  return {
    inventoryAnalysis: {
      ...inventory,
      structureHealth: {
        ...inventory.structureHealth,
        diagnosis: llm.structureDiagnosis || inventory.structureHealth.diagnosis,
      },
      marginHealth: {
        ...inventory.marginHealth,
        diagnosis: llm.marginDiagnosis || inventory.marginHealth.diagnosis,
      },
      turnoverHealth: {
        ...inventory.turnoverHealth,
        diagnosis: llm.turnoverDiagnosis || inventory.turnoverHealth.diagnosis,
      },
      fieldMixDiagnosis: llm.fieldMixDiagnosis || inventory.fieldMixDiagnosis,
    },
    trendOpportunities: trends.map(t => ({
      ...t,
      suggestedAction: trendActionMap.get(t.keyword) || t.suggestedAction,
    })),
    recommendedProducts: llm.recommendedProducts || [],
    inventoryWarnings: llm.inventoryWarnings || [],
    upcomingOpportunities: llm.upcomingOpportunities || [],
  }
}

function buildFallbackResult(
  inventory: ReturnType<typeof analyzeInventory>,
  trends: ReturnType<typeof getTrendOpportunities>
): AssortmentResult {
  return {
    inventoryAnalysis: inventory,
    trendOpportunities: trends,
    recommendedProducts: generateFallbackRecommendations(inventory, trends),
    inventoryWarnings: generateFallbackWarnings(inventory),
    upcomingOpportunities: trends
      .filter(t => t.urgency === 'high')
      .map(t => `${t.keyword}：${t.suggestedAction}`),
  }
}

function generateFallbackRecommendations(
  inventory: ReturnType<typeof analyzeInventory>,
  trends: ReturnType<typeof getTrendOpportunities>
) {
  const recs: AssortmentResult['recommendedProducts'] = []

  // 基于货盘缺口
  if (inventory.structureHealth.testingRatio < 0.05) {
    recs.push({
      type: 'testing',
      name: '测试品补充',
      reason: `测试品占比仅${(inventory.structureHealth.testingRatio * 100).toFixed(0)}%，建议引入1-2个新品类方向试水`,
      urgency: 'medium',
      basedOn: 'inventory_gap',
    })
  }
  if (inventory.marginHealth.avgMarginRate < 0.40) {
    recs.push({
      type: 'evergreen',
      name: '高毛利常青品引入',
      reason: `平均毛利率仅${(inventory.marginHealth.avgMarginRate * 100).toFixed(0)}%，建议补充高毛利基础款`,
      urgency: 'high',
      basedOn: 'structure_optimization',
    })
  }

  // 基于趋势
  const highTrend = trends.find(t => t.urgency === 'high' && t.merchantRelevance === 'high')
  if (highTrend) {
    recs.push({
      type: 'seasonal',
      name: highTrend.keyword,
      reason: highTrend.suggestedAction,
      urgency: highTrend.urgency,
      basedOn: 'trend_signal',
    })
  }

  return recs
}

function generateFallbackWarnings(inventory: ReturnType<typeof analyzeInventory>): string[] {
  const warnings: string[] = []
  if (inventory.riskSkus.length > 0) {
    warnings.push(`${inventory.riskSkus.length}个风险品需关注：${inventory.riskSkus.map(s => s.name).join('、')}`)
  }
  if (inventory.turnoverHealth.avgTurnoverDays > 30) {
    warnings.push(`平均周转${inventory.turnoverHealth.avgTurnoverDays.toFixed(0)}天，存在库存积压风险`)
  }
  return warnings
}

export async function POST(req: NextRequest) {
  try {
    const { merchantId } = await req.json()
    const merchant = getMerchantById(merchantId)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    // 1. 规则引擎：货盘诊断 + 趋势匹配（确定性计算，不依赖 LLM）
    const inventory = analyzeInventory(merchant.skuList)
    const trends = getTrendOpportunities(merchant.subCategoryTags)

    // 2. 构建 LLM 提示词
    const prompt = await buildAssortmentPrompt(merchant, inventory, trends)

    // 3. 调用 LLM 获取增强诊断文本
    let result: AssortmentResult
    try {
      const llmOutput = await callDeepSeekJSON<AssortmentLLMOutput>(
        [
          { role: 'system', content: SYSTEM_PROMPT + '\n\n' + assortmentSkill },
          { role: 'user', content: prompt },
        ],
        { maxTokens: 3000 }
      )
      result = mergeAssortmentResult(llmOutput, inventory, trends)
    } catch (llmErr) {
      console.warn('[assortment] LLM调用失败，使用规则化兜底结果', String(llmErr))
      result = buildFallbackResult(inventory, trends)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[assortment]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
