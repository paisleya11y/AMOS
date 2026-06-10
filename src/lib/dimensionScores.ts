import { MerchantData, InventoryAnalysis } from '@/types'

/**
 * 四维健康度评分（货盘 / 内容 / 投流 / 转化）—— 全产品统一口径。
 *
 * 设计要点：
 *  - 锚点对齐"优秀但非极限"的水平，而非"及格线"。例如 ROI 锚点设在 3.0、
 *    转化率锚点设在 6%，即便顶尖商家也只逼近而难以到顶。
 *  - 设软上限 SOFT_CAP（95）：任何维度都拿不到 100 分，始终保留优化空间，
 *    避免"满分=无需优化"的失真观感，也让"最弱维度→主攻方向"更可信。
 *  - 设软下限 FLOOR（12）：再差也不至于显示 0，符合"总有基础盘"的直觉。
 *
 * 之前 LarkPreview 与 DiagnoseHeader 各自抄了一份公式且锚点过松（ROI 2.0 即满分），
 * 现统一到此处，单一事实来源。
 */

export const SOFT_CAP = 95
const FLOOR = 12

const clampDim = (v: number) => Math.round(Math.min(SOFT_CAP, Math.max(FLOOR, v)))

export interface DimensionScore {
  key: 'assortment' | 'content' | 'empowerment' | 'conversion'
  label: string
  score: number
}

/**
 * 计算四维分。inv（货盘分析）可缺省——缺省时货盘维度退化为基于阶段的保守估计。
 */
export function computeDimensionScores(
  merchant: MerchantData,
  inv?: InventoryAnalysis | null,
): DimensionScore[] {
  const wd = merchant.weeklyData

  // —— 货盘：明星品占比 + 结构健康度。锚点：明星品占比 25% 视为很好 ——
  const totalSku = inv?.totalSkus ?? merchant.skuList?.length ?? 0
  const starCount = inv?.starSkus?.length ?? 0
  const starRatio = totalSku > 0 ? starCount / totalSku : 0
  const structureBonus = inv?.structureHealth?.isHealthy ? 15 : 0
  // 无 SKU 明细时给一个基于阶段的中性底分，避免一律顶满
  const assortmentBase = totalSku > 0 ? 38 + starRatio * 180 + structureBonus : 52
  const assortmentScore = clampDim(assortmentBase)

  // —— 内容：达人内容占比 + 视频产出量。锚点：达人占比 70% + 周更 ~15 条 ——
  const creatorRatio = wd.totalGMV > 0 ? wd.creatorContentGMV / wd.totalGMV : 0
  const videoBonus = Math.min(22, (wd.videoCount / 15) * 22)
  const contentScore = clampDim(30 + creatorRatio * 70 + videoBonus)

  // —— 投流：ROI。锚点 3.0 ≈ 满（行业里 3+ 已属优秀）——
  const roiScore = clampDim((wd.adROI / 3.0) * 90 + 5)

  // —— 转化：转化率。锚点 6% ≈ 满 ——
  const cvrScore = clampDim((wd.conversionRate / 6.0) * 90 + 5)

  return [
    { key: 'assortment', label: '货盘', score: assortmentScore },
    { key: 'content', label: '内容', score: contentScore },
    { key: 'empowerment', label: '投流', score: roiScore },
    { key: 'conversion', label: '转化', score: cvrScore },
  ]
}

/** 取最弱维度（分数最低的一项） */
export function weakestDimension(dims: DimensionScore[]): DimensionScore | null {
  if (dims.length === 0) return null
  return dims.reduce((a, b) => (a.score < b.score ? a : b))
}
