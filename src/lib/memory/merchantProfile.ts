import { MerchantProfile } from '@/types'

const mockProfiles: Record<string, MerchantProfile> = {
  merchant_001: {
    merchantId: 'merchant_001',
    weeklyHistory: [
      {
        week: '2025-W18',
        healthScore: 68,
        keyMetrics: { totalGMV: 19500, adROI: 1.6, weekOverWeekChange: -8 },
        topSuggestions: ['增加达人短视频合作', '优化广告ROI'],
      },
      {
        week: '2025-W19',
        healthScore: 72,
        keyMetrics: { totalGMV: 22000, adROI: 1.9, weekOverWeekChange: 12 },
        topSuggestions: ['冲刺夏促备货', '开启商家自播测试'],
      },
    ],
    healthScoreHistory: [65, 68, 72],
    executedSuggestions: [
      { week: '2025-W18', suggestion: '增加达人短视频合作', executed: true, resultNote: 'GMV回升12%' },
      { week: '2025-W18', suggestion: '优化广告ROI', executed: false },
    ],
    tags: ['宠物用品', '成长期', '达人内容依赖'],
    lastDiagnosed: '2025-W19',
  },
  merchant_002: {
    merchantId: 'merchant_002',
    weeklyHistory: [
      {
        week: '2025-W19',
        healthScore: 48,
        keyMetrics: { totalGMV: 5200, adROI: 1.3, weekOverWeekChange: -18 },
        topSuggestions: ['紧急提升广告ROI', '增加视频发布频次'],
      },
    ],
    healthScoreHistory: [52, 48],
    executedSuggestions: [],
    tags: ['3C家电', '冷启期', '高风险'],
    lastDiagnosed: '2025-W19',
  },
  merchant_003: {
    merchantId: 'merchant_003',
    weeklyHistory: [
      {
        week: '2025-W19',
        healthScore: 89,
        keyMetrics: { totalGMV: 98000, adROI: 3.0, weekOverWeekChange: 15 },
        topSuggestions: ['布局商城频道活动', '加大黑五备战'],
      },
    ],
    healthScoreHistory: [85, 87, 89],
    executedSuggestions: [
      { week: '2025-W19', suggestion: '布局商城频道活动', executed: true, resultNote: '商城GMV占比提升至20%' },
    ],
    tags: ['美妆个护', '成熟期', '多场域协同'],
    lastDiagnosed: '2025-W19',
  },
}

export function getMerchantProfile(merchantId: string): MerchantProfile | null {
  return mockProfiles[merchantId] ?? null
}

export function formatProfileContext(profile: MerchantProfile): string {
  const recent = profile.weeklyHistory.slice(-3)
  const trend = profile.healthScoreHistory
  const executed = profile.executedSuggestions.filter((s) => s.executed)

  return `
历史健康评分趋势：${trend.join(' → ')}
近期周报摘要：
${recent.map((w) => `  ${w.week}：健康分${w.healthScore}，GMV $${w.keyMetrics.totalGMV?.toLocaleString()}，建议：${w.topSuggestions.join('、')}`).join('\n')}
已执行建议及效果：
${executed.length > 0 ? executed.map((e) => `  ✓ ${e.suggestion}：${e.resultNote ?? '执行中'}`).join('\n') : '  暂无已执行记录'}
商家标签：${profile.tags.join('、')}
  `.trim()
}