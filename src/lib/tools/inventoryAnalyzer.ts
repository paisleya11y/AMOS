// src/lib/tools/inventoryAnalyzer.ts
// 货盘分析工具：基于 SKU 数据做规则诊断，不依赖 LLM

import { SkuData, InventoryAnalysis, SkuSummary, TrendOpportunity } from '@/types'
import { getTrendsForMerchant } from '@/lib/mockData/categoryTrends'

function toSummary(sku: SkuData): SkuSummary {
  return {
    skuId: sku.id,
    name: sku.name,
    price: sku.price,
    marginRate: sku.marginRate,
    weeklySales: sku.weeklySales,
    weeklyGMV: sku.weeklyGMV,
    turnoverDays: sku.turnoverDays,
    salesTrend: sku.salesTrend,
  }
}

export function analyzeInventory(skuList: SkuData[]): InventoryAnalysis {
  if (skuList.length === 0) {
    return {
      totalSkus: 0, activeSkus: 0, starSkus: [], riskSkus: [],
      structureHealth: { evergreenRatio: 0, seasonalRatio: 0, testingRatio: 0, isHealthy: false, diagnosis: '无SKU数据' },
      marginHealth: { avgMarginRate: 0, lowMarginSkus: [], diagnosis: '无数据' },
      turnoverHealth: { avgTurnoverDays: 0, slowMovingSkus: [], diagnosis: '无数据' },
      fieldMixDiagnosis: '无数据',
    }
  }

  // 1. 星品 & 风险品
  const starSkus = skuList.filter((s) => s.isStar).map(toSummary)
  const riskSkus = skuList
    .filter((s) =>
      s.salesTrend === 'down' ||
      s.stockHealth === 'overstock' ||
      s.turnoverDays > 60 ||
      s.marginRate < 0.30
    )
    .map(toSummary)

  const activeSkus = skuList.filter((s) => s.salesTrend !== 'down' || s.weeklySales > 5).length

  // 2. 品类结构健康度
  const typeCount = { evergreen: 0, seasonal: 0, festival: 0, testing: 0 }
  skuList.forEach((s) => { typeCount[s.type]++ })
  const total = skuList.length
  const evergreenRatio = typeCount.evergreen / total
  const seasonalRatio = (typeCount.seasonal + typeCount.festival) / total
  const testingRatio = typeCount.testing / total

  // 健康阈值：常青60%±15%，季节30%±10%，测试10%±5%
  const evergreenOk = evergreenRatio >= 0.45 && evergreenRatio <= 0.75
  const seasonalOk = seasonalRatio >= 0.20 && seasonalRatio <= 0.40
  const testingOk = testingRatio >= 0.05 && testingRatio <= 0.15
  const isHealthy = evergreenOk && seasonalOk && testingOk

  let structureDiagnosis = ''
  if (isHealthy) {
    structureDiagnosis = `货盘结构健康：常青品${(evergreenRatio * 100).toFixed(0)}%（基础盘）、季节/节庆品${(seasonalRatio * 100).toFixed(0)}%（增量）、测试品${(testingRatio * 100).toFixed(0)}%（探索）`
  } else {
    const issues: string[] = []
    if (!evergreenOk) {
      issues.push(
        evergreenRatio > 0.75
          ? `常青品占比过高(${(evergreenRatio * 100).toFixed(0)}%)，缺乏季节品和测试品布局，抗风险能力弱`
          : `常青品占比偏低(${(evergreenRatio * 100).toFixed(0)}%)，基础盘不稳`
      )
    }
    if (!seasonalOk) {
      issues.push(
        seasonalRatio < 0.20
          ? `季节/节庆品不足(${(seasonalRatio * 100).toFixed(0)}%)，错失大促和节日增量机会`
          : `季节品占比偏高(${(seasonalRatio * 100).toFixed(0)}%)，波段品过多增加库存风险`
      )
    }
    if (!testingOk) {
      issues.push(
        testingRatio < 0.05
          ? '缺乏测试品，没有为下一个爆品留探索空间'
          : `测试品占比偏高(${(testingRatio * 100).toFixed(0)}%)，建议收敛测试范围`
      )
    }
    structureDiagnosis = issues.join('；')
  }

  // 3. 毛利健康度
  const avgMarginRate = skuList.reduce((s, sku) => s + sku.marginRate, 0) / total
  const lowMarginSkus = skuList
    .filter((s) => s.marginRate < 0.35)
    .map((s) => `${s.name}（毛利率${(s.marginRate * 100).toFixed(0)}%）`)
  const marginDiagnosis =
    avgMarginRate >= 0.45
      ? `平均毛利率${(avgMarginRate * 100).toFixed(0)}%，健康。${lowMarginSkus.length > 0 ? `低毛利品：${lowMarginSkus.join('、')}` : ''}`
      : `平均毛利率${(avgMarginRate * 100).toFixed(0)}%，偏低。低毛利品：${lowMarginSkus.join('、')}。建议优化成本结构或提价`

  // 4. 周转健康度
  const avgTurnoverDays = skuList.reduce((s, sku) => s + sku.turnoverDays, 0) / total
  const slowMovingSkus = skuList
    .filter((s) => s.turnoverDays > 45)
    .map((s) => `${s.name}（周转${s.turnoverDays}天，${s.stockHealth === 'overstock' ? '积压' : '偏慢'}）`)
  const turnoverDiagnosis =
    avgTurnoverDays <= 30
      ? `平均周转${avgTurnoverDays.toFixed(0)}天，健康。${slowMovingSkus.length > 0 ? `滞销品：${slowMovingSkus.join('、')}` : ''}`
      : `平均周转${avgTurnoverDays.toFixed(0)}天，偏慢。滞销品：${slowMovingSkus.join('、')}。建议促销清仓或收缩SKU`

  // 5. 场域结构诊断
  const avgCreatorRatio = skuList.reduce((s, sku) => s + sku.fieldMix.creatorContent, 0) / total
  const avgSellerRatio = skuList.reduce((s, sku) => s + sku.fieldMix.sellerContent, 0) / total
  const avgShopSearchRatio = skuList.reduce((s, sku) => s + sku.fieldMix.shopTab + sku.fieldMix.search, 0) / total

  let fieldMixDiagnosis = ''
  if (avgCreatorRatio > 60) {
    fieldMixDiagnosis = `达人内容场占比${avgCreatorRatio.toFixed(0)}%，依赖度过高。建议将部分高毛利品向商家自播和商城搜索倾斜，降低佣金成本`
  } else if (avgSellerRatio < 15) {
    fieldMixDiagnosis = `商家自制内容占比仅${avgSellerRatio.toFixed(0)}%，偏低。建议选2-3个高毛利品重点做自播，减少对达人的依赖`
  } else {
    fieldMixDiagnosis = `场域分布较均衡：达人${avgCreatorRatio.toFixed(0)}%、自制${avgSellerRatio.toFixed(0)}%、商城搜索${avgShopSearchRatio.toFixed(0)}%`
  }

  return {
    totalSkus: total,
    activeSkus,
    starSkus,
    riskSkus,
    structureHealth: {
      evergreenRatio,
      seasonalRatio,
      testingRatio,
      isHealthy,
      diagnosis: structureDiagnosis,
    },
    marginHealth: {
      avgMarginRate,
      lowMarginSkus,
      diagnosis: marginDiagnosis,
    },
    turnoverHealth: {
      avgTurnoverDays,
      slowMovingSkus,
      diagnosis: turnoverDiagnosis,
    },
    fieldMixDiagnosis,
  }
}

export function getTrendOpportunities(subCategoryTags: string[]): TrendOpportunity[] {
  const trends = getTrendsForMerchant(subCategoryTags)
  return trends.map((t) => ({
    keyword: t.keyword,
    category: t.peakSeason,
    searchGrowth: t.searchGrowth,
    videoGrowth: t.videoGrowth,
    competitionLevel: t.competitionLevel,
    merchantRelevance: t.merchantRelevance,
    suggestedAction: t.recommendedAction,
    urgency: (t.searchGrowth >= 70 && t.competitionLevel === 'low') ? 'high' as const
      : (t.searchGrowth >= 40) ? 'medium' as const
      : 'low' as const,
    peakSeason: t.peakSeason,
  }))
}

export function formatInventoryForPrompt(analysis: InventoryAnalysis): string {
  if (analysis.totalSkus === 0) return '暂无SKU数据'

  const stars = analysis.starSkus
    .map((s) => `  ★ ${s.name}：周销${s.weeklySales}件/$${s.weeklyGMV.toLocaleString()}，毛利率${(s.marginRate * 100).toFixed(0)}%，周转${s.turnoverDays}天，趋势${s.salesTrend === 'up' ? '↑上升' : s.salesTrend === 'down' ? '↓下降' : '→平稳'}`)
    .join('\n')

  const risks = analysis.riskSkus.length > 0
    ? analysis.riskSkus
        .map((s) => `  ⚠ ${s.name}：周销${s.weeklySales}件，周转${s.turnoverDays}天，趋势↓下降`)
        .join('\n')
    : '  无风险品'

  return `
【现有货盘】
SKU总数：${analysis.totalSkus} | 活跃：${analysis.activeSkus} | 星品：${analysis.starSkus.length} | 风险品：${analysis.riskSkus.length}

星品（核心业绩贡献）：
${stars}

风险品（需关注）：
${risks}

【货盘结构诊断】
${analysis.structureHealth.diagnosis}
（常青品${(analysis.structureHealth.evergreenRatio * 100).toFixed(0)}% | 季节/节庆品${(analysis.structureHealth.seasonalRatio * 100).toFixed(0)}% | 测试品${(analysis.structureHealth.testingRatio * 100).toFixed(0)}%）

【毛利诊断】
${analysis.marginHealth.diagnosis}

【周转诊断】
${analysis.turnoverHealth.diagnosis}

【场域诊断】
${analysis.fieldMixDiagnosis}
`.trim()
}

export function formatTrendsForPrompt(opportunities: TrendOpportunity[]): string {
  if (opportunities.length === 0) return '暂无品类趋势数据'

  return opportunities
    .map(
      (t, i) =>
        `${i + 1}. ${t.keyword}：搜索增速${t.searchGrowth}% | 视频增速${t.videoGrowth}% | 竞争度${t.competitionLevel === 'low' ? '低（蓝海）' : t.competitionLevel === 'medium' ? '中' : '高'} | 关联度${t.merchantRelevance === 'high' ? '高' : t.merchantRelevance === 'medium' ? '中' : '低'} | 旺季：${t.peakSeason}
   建议：${t.suggestedAction}`
    )
    .join('\n\n')
}
