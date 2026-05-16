import { MerchantData } from '@/types'
import { getSkusByMerchantId } from './skuData'

export const mockMerchants: MerchantData[] = [
  {
    id: 'merchant_001',
    name: 'Insta 365',
    category: '3C家电',
    subCategoryTags: ['影像设备', '运动相机', '配件'],
    categoryType: 'small_standard',
    stage: 'growth',
    monthlyGMV: 85000,
    spsScore: 78,
    amId: 'am_001',
    skuList: [],
    weeklyData: {
      totalGMV: 21000,
      creatorContentGMV: 12600,
      sellerContentGMV: 4200,
      shopTabGMV: 2940,
      searchGMV: 1260,
      adSpend: 2100,
      adROI: 1.8,
      conversionRate: 3.2,
      newFollowers: 1240,
      videoCount: 8,
      liveCount: 2,
      weekOverWeekChange: -12,
    },
  },
  {
    id: 'merchant_002',
    name: 'TechGadget Pro',
    category: '3C家电',
    subCategoryTags: ['智能配件', '手机配件', '充电'],
    categoryType: 'small_standard',
    stage: 'cold_start',
    monthlyGMV: 18000,
    spsScore: 62,
    amId: 'am_001',
    skuList: [],
    weeklyData: {
      totalGMV: 4500,
      creatorContentGMV: 3600,
      sellerContentGMV: 450,
      shopTabGMV: 360,
      searchGMV: 90,
      adSpend: 900,
      adROI: 1.4,
      conversionRate: 1.8,
      newFollowers: 320,
      videoCount: 3,
      liveCount: 0,
      weekOverWeekChange: -22,
    },
  },
  {
    id: 'merchant_003',
    name: 'Bnker',
    category: '3C家电',
    subCategoryTags: ['音频', '充电', '耳机', '充电宝'],
    categoryType: 'non_standard',
    stage: 'mature',
    monthlyGMV: 420000,
    spsScore: 91,
    amId: 'am_001',
    skuList: [],
    weeklyData: {
      totalGMV: 105000,
      creatorContentGMV: 42000,
      sellerContentGMV: 31500,
      shopTabGMV: 21000,
      searchGMV: 10500,
      adSpend: 12600,
      adROI: 3.2,
      conversionRate: 5.8,
      newFollowers: 8900,
      videoCount: 24,
      liveCount: 7,
      weekOverWeekChange: 18,
    },
  },
]

export const getMerchantById = (id: string): MerchantData | undefined => {
  const merchant = mockMerchants.find((m) => m.id === id)
  if (!merchant) return undefined
  // 动态注入 SKU 数据（避免 JSON 字面量过长）
  return { ...merchant, skuList: getSkusByMerchantId(id) }
}