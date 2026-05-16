import { BenchmarkCase, MerchantStage, CategoryType } from '../../types'

export interface BenchmarkCaseExtended extends BenchmarkCase {
  categoryType: CategoryType
  monthlyGMVRange: [number, number]
  fromStage: MerchantStage
  toStage: MerchantStage
  timelineWeeks: number
}

export const benchmarkCases: BenchmarkCaseExtended[] = [
  {
    name: 'JBL音响',
    category: '3C家电',
    subCategoryTags: ['音频设备', '音响', '耳机'],
    categoryType: 'small_standard',
    stage: 'growth',
    fromStage: 'cold_start',
    toStage: 'growth',
    monthlyGMVRange: [0, 1000000],
    timelineWeeks: 3,
    breakthrough: '入驻20天月销破百万美元',
    keyActions: [
      '入驻即大量铺达人短视频, 重点选垂类3C达人',
      '设置具有竞争力的联盟佣金吸引达人主动带货',
      '品牌官号同步发布开箱直拍型内容',
      '爆款素材立即用GMV Max加热放量',
    ],
    result: '入驻20天月销突破100万美元, 成为TikTok Shop头部品牌',
  },
  {
    name: 'F-Beauty',
    category: '3C家电',
    subCategoryTags: ['美发器具', '个护电器', '美容仪'],
    categoryType: 'non_standard',
    stage: 'mature',
    fromStage: 'growth',
    toStage: 'mature',
    monthlyGMVRange: [100000, 999999999],
    timelineWeeks: 12,
    breakthrough: '站内销售带动站外GMV外溢70%+',
    keyActions: [
      '深度经营商家内容场，官号高频发布专业美发电气内容',
      '达人内容场与商家内容场双轮驱动',
      '商城和搜索做好关键词优化承接看后搜流量',
      '每1美元站内销售撬动6.7倍站外增量',
    ],
    result: '站内交易规模显著提升, DTC渠道GMV外溢率高达70%以上',
  },
  {
    name: 'Magic K',
    category: '3C家电',
    subCategoryTags: ['智能穿戴', '手机配件', 'DTC品牌'],
    categoryType: 'non_standard',
    stage: 'growth',
    fromStage: 'cold_start',
    toStage: 'mature',
    monthlyGMVRange: [10000, 500000],
    timelineWeeks: 16,
    breakthrough: '68%增量订单外溢到Shopify, 客单价翻倍',
    keyActions: [
      'DTC品牌借助TikTok Shop扩大人群触达',
      '重点经营商家自播，建立品牌专属直播间',
      '年轻用户社群运营，沉淀高粘性粉丝',
      '内容种草与商城搜索协同，承接看后搜流量',
    ],
    result: '约68%增量订单发生在Shopify, 平均客单价实现约2倍增长',
  },
  {
    name: '标杆商家1',
    category: '3C家电',
    subCategoryTags: ['手机配件', '充电', '智能配件'],
    categoryType: 'small_standard',
    stage: 'mature',
    fromStage: 'growth',
    toStage: 'mature',
    monthlyGMVRange: [80000, 999999999],
    timelineWeeks: 24,
    breakthrough: '年销千万美金, 自制视频占比40%，扭亏为盈',
    keyActions: [
      '冷启期依赖达人内容快速起量',
      '发现自制内容机会窗口后快速转型',
      '建立5人自制视频团队, 用AIGC工具提升效率',
      '自制视频业绩占比从0提升至40%',
      '利润结构显著改善，整体转负为正',
    ],
    result: '年销售额超1000万美金, 自制视频业绩占比超40%，整体利润转正',
  },
  {
    name: '标杆商家2',
    category: '3C家电',
    subCategoryTags: ['生活电器', '家居电子', '小家电'],
    categoryType: 'small_standard',
    stage: 'growth',
    fromStage: 'cold_start',
    toStage: 'mature',
    monthlyGMVRange: [20000, 300000],
    timelineWeeks: 20,
    breakthrough: '从重达人到达人+自制均衡, 毛利提升至18%',
    keyActions: [
      '早期依托达人直播(占比超20%）快速进入市场',
      '8个月后补齐商家自播能力',
      '自播占比逐步提升至12%',
      '商城与搜索运营补充，形成多场域协同',
      '整体毛利从负提升至18%',
    ],
    result: '生意结构从重达人走向均衡发展, 毛利提升至18%，未来计划深入商城搜索',
  },
]