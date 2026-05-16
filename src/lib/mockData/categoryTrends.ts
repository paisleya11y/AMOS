// src/lib/mockData/categoryTrends.ts
// TikTok Shop 品类趋势数据：模拟平台实时热搜和内容趋势
// 实际产品中应接入 TikTok Shop API 或第三方数据源

import { CategoryTrend } from '@/types'

export const allTrends: CategoryTrend[] = [
  // 音频/充电品类趋势（与 Bnker 相关）
  {
    keyword: '氮化镓充电器',
    searchGrowth: 45,
    videoGrowth: 120,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '速上65W/100W多口氮化镓产品，短视频展示"同时充Mac+iPhone"场景',
    peakSeason: '全年稳定+开学季小高峰',
  },
  {
    keyword: '透明外观耳机',
    searchGrowth: 80,
    videoGrowth: 150,
    competitionLevel: 'low',
    merchantRelevance: 'medium',
    recommendedAction: '小批量测试透明/半透明外壳TWS耳机，达人视频突出外观差异化',
    peakSeason: 'Q2-Q3',
  },
  {
    keyword: '磁吸充电宝',
    searchGrowth: 60,
    videoGrowth: 200,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '布局MagSafe兼容充电宝，生活场景型达人视频展示"边走边充"',
    peakSeason: '全年+出行季(5-9月)',
  },
  {
    keyword: '降噪耳机(百元档)',
    searchGrowth: 35,
    videoGrowth: 85,
    competitionLevel: 'medium',
    merchantRelevance: 'high',
    recommendedAction: '$50-80价位ANC耳机竞争加剧，当前TWS Pro价格$79面临挑战，建议测试$49入门ANC款',
    peakSeason: '全年',
  },
  {
    keyword: '桌面充电站',
    searchGrowth: 90,
    videoGrowth: 300,
    competitionLevel: 'medium',
    merchantRelevance: 'high',
    recommendedAction: '4-6口桌面充电站+手机支架二合一，开箱直拍型视频展示桌面整洁方案',
    peakSeason: '返校季(8月)+黑五(11月)',
  },
  {
    keyword: '三合一无线充',
    searchGrowth: 75,
    videoGrowth: 250,
    competitionLevel: 'low',
    merchantRelevance: 'medium',
    recommendedAction: 'iPhone+Watch+AirPods三合一无线充，卖点讲解型视频强调"一放即充"',
    peakSeason: '黑五礼盒季',
  },

  // 影像/运动相机品类趋势（与 Insta 365 相关）
  {
    keyword: '360全景相机',
    searchGrowth: 55,
    videoGrowth: 180,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '强化Insta360 X5在TikTok的"全景创意拍摄"内容，开箱直拍型+生活场景型组合',
    peakSeason: 'Q2出行季+Q4滑雪季',
  },
  {
    keyword: 'Vlog入门设备套装',
    searchGrowth: 70,
    videoGrowth: 250,
    competitionLevel: 'medium',
    merchantRelevance: 'high',
    recommendedAction: '打包相机+三脚架+TF卡为Vlog新手套装，达人选"零基础Vlog教程"角度',
    peakSeason: '全年+开学季',
  },
  {
    keyword: '运动相机绑带配件',
    searchGrowth: 40,
    videoGrowth: 95,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '增加头盔/胸前/手腕多种固定方式配件线，达人实测极限运动场景',
    peakSeason: 'Q2-Q3户外季',
  },
  {
    keyword: '水下拍摄设备',
    searchGrowth: 30,
    videoGrowth: 60,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '防水壳库存偏低（当前60件），夏季需求将上升，建议补充至150件',
    peakSeason: '5-9月',
  },

  // 智能配件品类趋势（与 TechGadget Pro 相关）
  {
    keyword: '三合一充电站',
    searchGrowth: 95,
    videoGrowth: 320,
    competitionLevel: 'low',
    merchantRelevance: 'high',
    recommendedAction: '冷启期首选差异化选品，三合一充电站搜索增速95%、竞争度低，作为爆品切入',
    peakSeason: '全年+节庆礼盒',
  },
  {
    keyword: '车载快充头(45W+)',
    searchGrowth: 30,
    videoGrowth: 60,
    competitionLevel: 'medium',
    merchantRelevance: 'high',
    recommendedAction: '当前仅有15W无线充（滞销），应果断切入45W+车载快充，与车充场景达人合作',
    peakSeason: '全年',
  },
  {
    keyword: '桌面数码收纳',
    searchGrowth: 50,
    videoGrowth: 120,
    competitionLevel: 'low',
    merchantRelevance: 'medium',
    recommendedAction: '桌面充电+收纳二合一，开箱直拍型展示桌面整理前后对比',
    peakSeason: '返校季+黑五',
  },
]

export function getTrendsForMerchant(subCategoryTags: string[]): CategoryTrend[] {
  // 按标签相关性筛选，至少一个标签匹配
  const filtered = allTrends.filter((t) =>
    subCategoryTags.some((tag) =>
      t.keyword.includes(tag) ||
      t.recommendedAction.includes(tag) ||
      // 模糊匹配：充电→充电器/充电宝/充电站；耳机→耳机
      (tag === '充电' && (t.keyword.includes('充电') || t.keyword.includes('快充'))) ||
      (tag === '音频' && (t.keyword.includes('耳机') || t.keyword.includes('降噪'))) ||
      (tag === '影像设备' && (t.keyword.includes('相机') || t.keyword.includes('Vlog') || t.keyword.includes('拍摄'))) ||
      (tag === '智能配件' && (t.keyword.includes('充电') || t.keyword.includes('收纳') || t.keyword.includes('车载')))
    )
  )

  // 按 merchantRelevance 排序：high > medium > low
  const order = { high: 0, medium: 1, low: 2 }
  filtered.sort((a, b) => order[a.merchantRelevance] - order[b.merchantRelevance])

  return filtered.slice(0, 6) // Top 6 trends
}

export function getTrendByKeyword(keyword: string): CategoryTrend | undefined {
  return allTrends.find((t) => t.keyword === keyword)
}
