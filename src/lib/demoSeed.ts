'use client'

import type { FullReport } from '@/types'
import { defaultDateRange, rangeWeekLabel, type DateRange } from '@/lib/dateRange'
import { setFeedback, makeSuggestionId, listFeedback } from '@/lib/feedbackStore'

/**
 * Demo 种子数据（方案 A）：
 * 页面首次加载时，若 Insta 365（merchant_001）没有任何历史归档，
 * 就自动注入一条"上一周"的归档报告 + 当周的 AM 反馈，
 * 让「上周执行回顾」卡和「健康分走势」即开即演，无需现场切周期。
 *
 * 原则：只补缺、不覆盖。一旦检测到该商家已有任何归档（含用户真实跑的），就跳过。
 */

const SEED_MERCHANT = 'merchant_001'
const SEED_FLAG = 'amos:demoSeed:v1'

// 与 reportHistory 内部约定保持一致
const INDEX_KEY = 'amos:report:index'
const ITEM_PREFIX = 'amos:report:item:'

function isBrowser() {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** 取「上一周」的周期（本周一往前推 7 天） */
function lastWeekRange(): DateRange {
  const now = new Date()
  const lastWeek = new Date(now)
  lastWeek.setDate(lastWeek.getDate() - 7)
  return defaultDateRange(lastWeek)
}

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function hasArchiveFor(merchantId: string): boolean {
  return readIndex().some((k) => k.startsWith(`${ITEM_PREFIX}${merchantId}:`))
}

/**
 * 构造一份"上周"的精简归档报告。健康分设为 65（低于本周 72，制造 +7 的回升），
 * 告警里给出 2 条必做项，便于回顾卡显示"上周 N 条必做"。
 */
function buildLastWeekReport(week: string, ts: number): FullReport & {
  _ts: number
  _focusNote?: string
} {
  const seededAlerts = [
    {
      level: 'critical' as const,
      title: 'GMV 增速放缓',
      body: '上周 GMV 环比 +4%，低于品类中位。需排查达人内容更新频次是否下滑。',
      module: 'diagnose' as const,
    },
    {
      level: 'warning' as const,
      title: '转化率待提升',
      body: '转化率 2.1%，低于健康线。建议优化主推 SKU 详情页与达人脚本前 3 秒。',
      module: 'content' as const,
    },
  ]

  return {
    merchantId: SEED_MERCHANT,
    merchantName: 'Insta 365',
    generatedAt: new Date(ts).toLocaleString('zh-CN'),
    week,
    traceSteps: [],
    // 仅填回顾/走势卡会读到的关键字段，其余给空壳即可（回看时也只读这些）
    diagnose: {
      healthScore: 65,
      stage: 'growth',
      weakestDimension: 'content',
      stageSummary:
        '上周处于成长期，GMV 增速放缓、转化率偏低，已提示聚焦内容更新与详情页优化。',
      alerts: seededAlerts,
    },
    // 下面四块用最小空壳，避免类型缺字段；回顾/走势不依赖它们
    assortment: {
      inventoryAnalysis: {
        totalSkus: 0, activeSkus: 0, starSkus: [], riskSkus: [],
        structureHealth: { evergreenRatio: 0, seasonalRatio: 0, testingRatio: 0, isHealthy: false, diagnosis: '' },
        marginHealth: { avgMarginRate: 0, lowMarginSkus: [], diagnosis: '' },
        turnoverHealth: { avgTurnoverDays: 0, slowMovingSkus: [], diagnosis: '' },
        fieldMixDiagnosis: '',
      },
      trendOpportunities: [],
      recommendedProducts: [],
      inventoryWarnings: [],
      upcomingOpportunities: [],
    },
    content: {
      productDiagnosis: { lifecycle: 'potential', topSearchTerms: [], audienceProfile: '', realSellingPoints: [], riskKeywords: [] },
      contentMatrix: {
        current: { creatorVideo: 0, sellerVideo: 0, creatorLive: 0, sellerLive: 0 },
        diagnosis: '', improved: { creatorVideo: 0, sellerVideo: 0, creatorLive: 0, sellerLive: 0 }, rationale: '', actions: [],
      },
      recommendedFormats: [], topicAngles: [],
      publishCadence: { testPhase: '', stablePhase: '', peakPhase: '' },
      creatorBrief: '', creatorBriefEN: '', weeklyPlan: '',
    },
    empowerment: { adStrategy: '', recommendedTools: [], weeklyBudgetSuggestion: '' },
    benchmark: {
      matchedCase: { name: '', category: '', subCategoryTags: [], stage: 'cold_start', breakthrough: '', keyActions: [], result: '' },
      similarityReason: '', actionableSteps: [], expectedOutcome: '',
    },
    larkMessage: 'Insta 365 上周健康评分 65',
    popupAlerts: seededAlerts,
    _ts: ts,
    _focusNote: '上周重点：拉升转化率 + 稳住达人内容更新频次',
  }
}

/** 主入口：幂等。已注入过 或 已有真实归档则跳过。 */
export function ensureDemoSeed(): void {
  if (!isBrowser()) return
  try {
    if (localStorage.getItem(SEED_FLAG) === '1') return
    if (hasArchiveFor(SEED_MERCHANT)) {
      // 已有真实数据，不打扰；但标记一下避免反复检查
      localStorage.setItem(SEED_FLAG, '1')
      return
    }

    const week = rangeWeekLabel(lastWeekRange())
    // 上周时间戳：7 天前
    const ts = Date.now() - 7 * 86400_000
    const key = `${ITEM_PREFIX}${SEED_MERCHANT}:${ts}`
    const payload = buildLastWeekReport(week, ts)

    localStorage.setItem(key, JSON.stringify(payload))
    const idx = readIndex()
    idx.unshift(key)
    localStorage.setItem(INDEX_KEY, JSON.stringify(idx))

    // 为"上周"那两条必做注入 AM 反馈：1 条采纳、1 条改写（采纳率 100%，演示飞轮）
    // suggestionText 需与 AlertPanel/LarkPreview 的口径一致：`预警 · ${title}`
    if (listFeedback(SEED_MERCHANT, week).length === 0) {
      setFeedback({
        merchantId: SEED_MERCHANT,
        week,
        module: 'diagnose',
        suggestionId: makeSuggestionId('diagnose', `预警 · GMV 增速放缓`),
        suggestionText: '预警 · GMV 增速放缓',
        action: 'adopted',
      })
      setFeedback({
        merchantId: SEED_MERCHANT,
        week,
        module: 'content',
        suggestionId: makeSuggestionId('content', `预警 · 转化率待提升`),
        suggestionText: '预警 · 转化率待提升',
        action: 'revised',
        revisedText: '把达人脚本前 3 秒改成痛点开场，详情页首图换成实测对比',
      })
    }

    localStorage.setItem(SEED_FLAG, '1')
  } catch (err) {
    console.warn('[demoSeed] 注入失败', err)
  }
}
