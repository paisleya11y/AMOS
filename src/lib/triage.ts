import { MerchantData } from '@/types'

/**
 * 分诊台逻辑 · 守大盘 → 层内救火
 *
 * 设计原则（与产品 PM 对齐后的确定方案）：
 *  1. 主排序按 GMV 分层（大盘优先）：盘子大的永远先看。
 *  2. 层内按「救火分」降序：同一档里，又差又跌得猛的顶到前面。
 *  3. 红黄绿信号独立于排序，给 AM 一眼的急迫感。
 *
 * 健康分这一轮用**纯规则**快速算（不跑 LLM），只依赖 weeklyData，
 * 保证 11 家都能即时出分、分诊台一打开就有合理层次。
 */

export type Tier = 'big' | 'mid' | 'tail'
export type Signal = 'red' | 'yellow' | 'green'

/** GMV 分层阈值（月 GMV，绝对值，单位美元） */
export const TIER_THRESHOLDS = {
  big: 100000, // ≥ 10 万 = 头部
  mid: 30000, // 3 万 – 10 万 = 腰部；< 3 万 = 长尾
} as const

export const TIER_META: Record<Tier, { label: string; hint: string }> = {
  big: { label: '头部', hint: '月 GMV ≥ 10 万 · 守住基本盘' },
  mid: { label: '腰部', hint: '月 GMV 3 万 – 10 万' },
  tail: { label: '长尾', hint: '月 GMV < 3 万' },
}

export function getTier(monthlyGMV: number): Tier {
  if (monthlyGMV >= TIER_THRESHOLDS.big) return 'big'
  if (monthlyGMV >= TIER_THRESHOLDS.mid) return 'mid'
  return 'tail'
}

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v))

/**
 * 规则健康分（0-100）—— 确定性、可解释、不跑 LLM。
 * 四个可从 weeklyData 直接得到的维度加权：
 *   - ROI（投流效率）        权重 0.30，锚点 ROI 2.2 = 满分
 *   - 转化率                 权重 0.30，锚点 4.0% = 满分
 *   - 内容（达人占比 + 视频量）权重 0.25
 *   - 动能（周环比）          权重 0.15，0% → 50 基准，±25% 打满/清零
 */
export function quickHealthScore(m: MerchantData): number {
  const wd = m.weeklyData
  const roiDim = clamp((wd.adROI / 2.2) * 100)
  const cvrDim = clamp((wd.conversionRate / 4.0) * 100)
  const creatorRatio = wd.totalGMV > 0 ? wd.creatorContentGMV / wd.totalGMV : 0
  const contentDim = clamp(creatorRatio * 60 + Math.min(40, wd.videoCount * 4))
  const momentumDim = clamp(50 + wd.weekOverWeekChange * 2)

  return Math.round(
    0.3 * roiDim + 0.3 * cvrDim + 0.25 * contentDim + 0.15 * momentumDim,
  )
}

/**
 * 救火分：同一层内的排序键。又差（健康低）又跌得猛（环比负）的排前面。
 *   救火分 = (100 − 健康分) × 1.0 + max(0, −周环比) × 2.0
 */
export function rescueScore(m: MerchantData, health: number): number {
  const wow = m.weeklyData.weekOverWeekChange
  return (100 - health) * 1.0 + Math.max(0, -wow) * 2.0
}

/** 红黄绿信号：健康分低 或 跌幅大 → 越红 */
export function signalOf(m: MerchantData, health: number): Signal {
  const wow = m.weeklyData.weekOverWeekChange
  if (health < 60 || wow < -15) return 'red'
  if (health <= 75 || wow < -5) return 'yellow'
  return 'green'
}

export interface TriageItem {
  merchant: MerchantData
  tier: Tier
  health: number
  rescue: number
  signal: Signal
  wow: number
}

/**
 * 把一批商家算成分诊项，按「先分层、层内救火分降序」整体排序。
 * 返回的是一个扁平数组（已按最终展示顺序排好），tier 字段供 UI 分组。
 */
export function buildTriage(merchants: MerchantData[]): TriageItem[] {
  const items: TriageItem[] = merchants.map((m) => {
    const health = quickHealthScore(m)
    return {
      merchant: m,
      tier: getTier(m.monthlyGMV),
      health,
      rescue: rescueScore(m, health),
      signal: signalOf(m, health),
      wow: m.weeklyData.weekOverWeekChange,
    }
  })

  const tierRank: Record<Tier, number> = { big: 0, mid: 1, tail: 2 }
  return items.sort((a, b) => {
    if (tierRank[a.tier] !== tierRank[b.tier]) {
      return tierRank[a.tier] - tierRank[b.tier]
    }
    // 层内：救火分高的在前
    return b.rescue - a.rescue
  })
}

/** 按 tier 分组（保留组内已排好的顺序），方便 UI 分块渲染 */
export function groupByTier(items: TriageItem[]): Record<Tier, TriageItem[]> {
  const out: Record<Tier, TriageItem[]> = { big: [], mid: [], tail: [] }
  for (const it of items) out[it.tier].push(it)
  return out
}

export const SIGNAL_META: Record<
  Signal,
  { dot: string; text: string; label: string }
> = {
  red: { dot: 'bg-rose-500', text: 'text-rose-600', label: '需立即介入' },
  yellow: { dot: 'bg-amber-500', text: 'text-amber-600', label: '本周关注' },
  green: { dot: 'bg-emerald-500', text: 'text-emerald-600', label: '健康' },
}
