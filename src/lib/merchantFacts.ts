import { MerchantData } from '@/types'

/**
 * 统一「商家事实层」(single source of truth)。
 *
 * 背景：四个 agent（选品/内容/投流/标杆）此前各自从 merchant 里挑字段、各自描述
 * "这家是卖什么的、主推什么"，导致跨 agent 不一致（如货盘推配件、内容却讲主机；
 * 告警说开箱直拍、内容形式却推生活场景）。
 *
 * 方案：把"这家商家是谁、主推什么、各场域占比、明星/风险品、关键指标"在一处算清，
 * 渲染成一段标准事实文本块，注入所有 agent 的 prompt 顶部。各 agent 必须基于
 * 同一份事实生成，从根上消除不一致。
 */

export interface MerchantFacts {
  name: string
  category: string
  categoryType: string
  stage: string
  /** 主推/核心 SKU（isStar 或销量靠前），用于统一"主推什么" */
  coreSkus: { name: string; price: number; trend: string; weeklySales: number }[]
  /** 风险 SKU（滞销/低毛利/趋势向下） */
  riskSkus: { name: string; reason: string }[]
  subCategoryTags: string[]
  /** 场域 GMV 占比（%） */
  fieldMix: { creator: number; seller: number; shopSearch: number }
  metrics: {
    monthlyGMV: number
    weeklyGMV: number
    adROI: number
    conversionRate: number
    weekOverWeekChange: number
    videoCount: number
    liveCount: number
  }
}

const STAGE_CN: Record<string, string> = {
  cold_start: '冷启期',
  growth: '成长期',
  mature: '成熟期',
}

export function deriveMerchantFacts(merchant: MerchantData): MerchantFacts {
  const wd = merchant.weeklyData
  const total = wd.totalGMV || 1

  // 主推 SKU：优先 isStar，其次按周 GMV 取前几
  const skus = merchant.skuList ?? []
  const starList = skus.filter((s) => s.isStar)
  const ranked = [...skus].sort((a, b) => b.weeklyGMV - a.weeklyGMV)
  const core = (starList.length > 0 ? starList : ranked).slice(0, 3)

  const risk = skus
    .filter((s) => s.salesTrend === 'down' || s.stockHealth === 'overstock' || s.marginRate < 0.15)
    .slice(0, 3)
    .map((s) => ({
      name: s.name,
      reason:
        s.salesTrend === 'down'
          ? '销量下滑'
          : s.stockHealth === 'overstock'
          ? '库存积压'
          : '低毛利',
    }))

  return {
    name: merchant.name,
    category: merchant.category,
    categoryType: merchant.categoryType,
    stage: STAGE_CN[merchant.stage] ?? merchant.stage,
    coreSkus: core.map((s) => ({
      name: s.name,
      price: s.price,
      trend: s.salesTrend,
      weeklySales: s.weeklySales,
    })),
    riskSkus: risk,
    subCategoryTags: merchant.subCategoryTags ?? [],
    fieldMix: {
      creator: Math.round((wd.creatorContentGMV / total) * 100),
      seller: Math.round((wd.sellerContentGMV / total) * 100),
      shopSearch: Math.round(((wd.shopTabGMV + wd.searchGMV) / total) * 100),
    },
    metrics: {
      monthlyGMV: merchant.monthlyGMV,
      weeklyGMV: wd.totalGMV,
      adROI: wd.adROI,
      conversionRate: wd.conversionRate,
      weekOverWeekChange: wd.weekOverWeekChange,
      videoCount: wd.videoCount,
      liveCount: wd.liveCount,
    },
  }
}

/**
 * 把事实渲染成 prompt 用的标准文本块。所有 agent 注入同一段，确保口径一致。
 */
export function formatMerchantFacts(merchant: MerchantData): string {
  const f = deriveMerchantFacts(merchant)

  const coreLine =
    f.coreSkus.length > 0
      ? f.coreSkus
          .map((s) => `${s.name}（$${s.price}·周销${s.weeklySales}·${s.trend}）`)
          .join('、')
      : `（暂无 SKU 明细，按「${f.category} / ${f.subCategoryTags.join('、')}」核心品类理解，主推机型/主款须围绕该品类，不要臆造具体型号）`

  const riskLine =
    f.riskSkus.length > 0
      ? f.riskSkus.map((s) => `${s.name}（${s.reason}）`).join('、')
      : '无明显风险品'

  return `【商家事实层 · 全 Agent 统一口径（所有结论必须与此一致，不得自相矛盾）】
- 商家：${f.name} ｜ 核心品类：${f.category}（${f.categoryType}）｜ 阶段：${f.stage}
- 子品类标签：${f.subCategoryTags.join('、') || '—'}
- 主推/核心 SKU：${coreLine}
- 风险 SKU：${riskLine}
- 场域 GMV 占比：达人内容 ${f.fieldMix.creator}% / 商家内容 ${f.fieldMix.seller}% / 商城+搜索 ${f.fieldMix.shopSearch}%
- 关键指标：月GMV $${f.metrics.monthlyGMV.toLocaleString()} ｜ 周GMV $${f.metrics.weeklyGMV.toLocaleString()} ｜ ROI ${f.metrics.adROI} ｜ 转化率 ${f.metrics.conversionRate}% ｜ 周环比 ${f.metrics.weekOverWeekChange}% ｜ 本周视频 ${f.metrics.videoCount} 条 / 直播 ${f.metrics.liveCount} 场
- 一致性要求：货盘建议的"主推方向"、内容策略的"拍什么品/什么形式"、投流的"推什么"，都必须指向上面的核心品类与主推 SKU；禁止货盘只推配件而内容却讲主机、或彼此品类对不上。`
}
