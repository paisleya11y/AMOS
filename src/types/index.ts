export type MerchantStage = 'cold_start' | 'growth' | 'mature'
export type CategoryType = 'small_standard' | 'large_standard' | 'non_standard'
export type AlertLevel = 'info' | 'warning' | 'critical'
export type AgentModule =
  | 'diagnose'
  | 'assortment'
  | 'content'
  | 'empowerment'
  | 'benchmark'

export interface MerchantData {
  id: string
  name: string
  category: string
  subCategoryTags: string[]
  categoryType: CategoryType
  stage: MerchantStage
  monthlyGMV: number
  weeklyData: WeeklyData
  spsScore: number
  amId: string
  skuList: SkuData[]
  trendSignals?: CategoryTrend[]
  /** 商家 hero 商品图，前端 public 路径，例 '/skus/bnker_hero.png' */
  heroImage?: string
  /** 商家在 TikTok Shop US 的代表性参考视频；按内容形式归类 */
  exampleVideos?: ExampleVideo[]
}

export interface ExampleVideo {
  /** TikTok 公开视频 URL，新 tab 打开 */
  url: string
  /** 缩略图 public 路径，例 '/video-thumbs/insta_video_1.png' */
  thumbnail?: string
  /**
   * 对应白皮书"商家好内容五大分型"之一：
   * 卖点讲解型 / 生活场景型 / 买家·卖家实测型 / 测评对比·情景演绎型 / 开箱直拍型
   */
  format: string
  /** 视频标题（短句概括视频内容） */
  title?: string
  /** 视频创意公式（如 "悬念提问 → 反差画面 → 教学引导"） */
  formula?: string
  /** 可借鉴点（这条视频最值得参考的具体动作） */
  takeaway?: string
  /** 旧字段，保留兼容；新数据请用 takeaway */
  note?: string
}

export interface SkuData {
  id: string
  name: string
  price: number
  cost: number
  weeklySales: number
  weeklyGMV: number
  stock: number
  stockHealth: 'overstock' | 'healthy' | 'low' | 'out'
  type: 'evergreen' | 'seasonal' | 'festival' | 'testing'
  salesTrend: 'up' | 'stable' | 'down'
  turnoverDays: number
  marginRate: number
  fieldMix: {
    creatorContent: number
    sellerContent: number
    shopTab: number
    search: number
  }
  isStar: boolean
}

export interface CategoryTrend {
  keyword: string
  searchGrowth: number
  videoGrowth: number
  competitionLevel: 'low' | 'medium' | 'high'
  merchantRelevance: 'high' | 'medium' | 'low'
  recommendedAction: string
  peakSeason: string
}

export interface WeeklyData {
  totalGMV: number
  creatorContentGMV: number
  sellerContentGMV: number
  shopTabGMV: number
  searchGMV: number
  adSpend: number
  adROI: number
  conversionRate: number
  newFollowers: number
  videoCount: number
  liveCount: number
  weekOverWeekChange: number
}

export interface MerchantProfile {
  merchantId: string
  weeklyHistory: WeeklySnapshot[]
  healthScoreHistory: number[]
  executedSuggestions: ExecutedSuggestion[]
  tags: string[]
  lastDiagnosed: string
}

export interface WeeklySnapshot {
  week: string
  healthScore: number
  keyMetrics: Partial<WeeklyData>
  topSuggestions: string[]
}

export interface ExecutedSuggestion {
  week: string
  suggestion: string
  executed: boolean
  resultNote?: string
}

export interface AMPreference {
  amId: string
  editHistory: EditRecord[]
  preferredTone: 'aggressive' | 'balanced' | 'conservative'
  focusAreas: string[]
  templateOverrides: Record<string, string>
}

export interface EditRecord {
  week: string
  merchantId: string
  original: string
  edited: string
  module: AgentModule
}

export interface AgentTraceStep {
  id: string
  module: AgentModule | 'router' | 'anomaly' | 'campaign' | 'validate'
  status: 'pending' | 'running' | 'done' | 'error'
  startTime: number
  endTime?: number
  input?: string
  output?: string
}

export interface DiagnoseResult {
  healthScore: number
  stage: MerchantStage
  weakestDimension: 'assortment' | 'content' | 'empowerment'
  stageSummary: string
  alerts: Alert[]
}

export interface AssortmentResult {
  // 一、现有货盘诊断
  inventoryAnalysis: InventoryAnalysis
  // 二、潜力趋势品推荐
  trendOpportunities: TrendOpportunity[]
  // 三、综合建议
  recommendedProducts: ProductRecommendation[]
  inventoryWarnings: string[]
  upcomingOpportunities: string[]
  /** 板块整体的依据来源（货盘诊断/趋势/营销日历等），渲染为统一"来源"标签 */
  evidence?: Evidence[]
}

// LLM 只输出轻量文本字段，避免 token 被数组数据耗尽
export interface AssortmentLLMOutput {
  structureDiagnosis: string
  marginDiagnosis: string
  turnoverDiagnosis: string
  fieldMixDiagnosis: string
  trendActions: { keyword: string; suggestedAction: string }[]
  recommendedProducts: ProductRecommendation[]
  inventoryWarnings: string[]
  upcomingOpportunities: string[]
  evidence?: Evidence[]
}

export interface InventoryAnalysis {
  totalSkus: number
  activeSkus: number
  starSkus: SkuSummary[]
  riskSkus: SkuSummary[]
  structureHealth: {
    evergreenRatio: number
    seasonalRatio: number
    testingRatio: number
    isHealthy: boolean
    diagnosis: string
  }
  marginHealth: {
    avgMarginRate: number
    lowMarginSkus: string[]
    diagnosis: string
  }
  turnoverHealth: {
    avgTurnoverDays: number
    slowMovingSkus: string[]
    diagnosis: string
  }
  fieldMixDiagnosis: string
}

export interface SkuSummary {
  skuId: string
  name: string
  price: number
  marginRate: number
  weeklySales: number
  weeklyGMV: number
  turnoverDays: number
  salesTrend: 'up' | 'stable' | 'down'
}

export interface TrendOpportunity {
  keyword: string
  category: string
  searchGrowth: number
  videoGrowth: number
  competitionLevel: 'low' | 'medium' | 'high'
  merchantRelevance: 'high' | 'medium' | 'low'
  suggestedAction: string
  urgency: 'high' | 'medium' | 'low'
  peakSeason: string
}

export interface ProductRecommendation {
  /**
   * 货品类型 — 颜色统一语义：
   *   evergreen → 绿（emerald）常青稳定基本盘
   *   seasonal  → 黄（amber） 季节时段性
   *   festival  → 黄（amber） 节庆作为季节子集，沿用 amber 与 seasonal 同色系
   *   testing   → 蓝（blue）  测试待验证
   *   declining → 红（rose）  风险/衰退要处理
   *   star      → 紫（purple）+ ⭐ 明星品（视觉最重）
   */
  type: 'evergreen' | 'seasonal' | 'festival' | 'testing' | 'declining' | 'star'
  name: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
  basedOn: 'inventory_gap' | 'trend_signal' | 'calendar_event' | 'structure_optimization'
}

/** 商家本次内容策略目标（影响矩阵配比和钩子方向） */
export type ContentGoal =
  | 'awareness'   // A. 让更多人知道（曝光/种草）
  | 'conversion'  // B. 直接卖出去（转化成交）
  | 'followers'   // C. 积累粉丝/私域
  | 'testing'     // D. 测试商品潜力

export interface ContentResult {
  /** 一、商品诊断（生命周期 + 卖点图谱） */
  productDiagnosis: ProductDiagnosis
  /** 二、内容矩阵（诊断当前结构 → 改进结构 + 理由） */
  contentMatrix: ContentMatrix
  /** 三、推荐内容形式（贴合 TikTok Shop US 调性） */
  recommendedFormats: ContentFormat[]
  /** 四、选题方向（按目标人群分组，每组 3-5 条） */
  topicAngles: TopicAngleGroup[]
  /** 五、发布节奏（测试期 / 稳定期 / 爆发期） */
  publishCadence: PublishCadence
  /** 六、达人 Brief（中文结构化 + 英文整段） */
  creatorBrief: CreatorBriefCN | string
  creatorBriefEN: string
  /** 七、本周发布计划 */
  weeklyPlan: string
  /** 板块整体的依据来源，渲染为统一"来源"标签（顶部）。原内层 evidence 仍保留。 */
  evidence?: Evidence[]
}

/** 中文版达人 Brief 的结构化字段（给国内 BD 用） */
export interface CreatorBriefCN {
  /** 商品核心卖点（3-5 条 bullet） */
  productHighlights: string[]
  /** 视频必须展示的要素 */
  mustShow: string[]
  /** 拍摄/口播要求（时长、节奏、调性、字幕等） */
  shootingNotes: string[]
  /** 合作条款（佣金区间、寄样周期、披露要求等） */
  collaborationTerms: string[]
}

export interface ProductDiagnosis {
  /** 生命周期阶段 */
  lifecycle: 'new' | 'potential' | 'hit' | 'declining'
  /** 美区 Top3 搜索需求词（英文，对应 TikTok Shop US 搜索习惯） */
  topSearchTerms: string[]
  /** 目标人群画像 */
  audienceProfile: string
  /** 用户真实卖点关键词（来自评论 / benchmark 案例 / 类目特征） */
  realSellingPoints: string[]
  /** 风险词预警：本品类美区禁用 / 高风险表述 */
  riskKeywords: string[]
}

/**
 * TikTok Shop 内容矩阵 = 4 个渠道的占比组合：
 *   短视频·达人 / 短视频·商家自制 / 直播·达人 / 直播·商家自制
 * 四项比例之和 = 100。
 */
export interface ChannelMix {
  creatorVideo: number   // 短视频 · 达人
  sellerVideo: number    // 短视频 · 商家自制
  creatorLive: number    // 直播 · 达人
  sellerLive: number     // 直播 · 商家自制
}

/**
 * 内容矩阵：诊断当前结构 → 改进结构。
 * 不再是简单的"种草/转化/互动"三段比例，而是从渠道维度还原 TTS 内容生态。
 */
export interface ContentMatrix {
  /** 当前渠道结构（基于商家本周 GMV 占比反推 / 实际数据） */
  current: ChannelMix
  /** 当前结构诊断：存在什么问题（一段中文，要量化引用数据） */
  diagnosis: string
  /** 改进后的目标结构 */
  improved: ChannelMix
  /** 为什么这样改：核心理由（一段中文，要点出杠杆点） */
  rationale: string
  /** 落地行动 2-4 条：要做什么具体动作来落到改进结构 */
  actions: string[]
  /** 这条诊断的依据 */
  evidence?: Evidence[]
}

export interface ContentFormat {
  /** 美区主流内容形式（如 Honest Review、Dupe 对比、Problem→Solution、ASMR 拆箱） */
  type: string
  /** 为什么这个形式适合该商家 */
  reason: string
  /** 3 秒 hook 候选（英文原话，可直接照拍） */
  hookExamples: string[]
  /** 视频结构按秒拆解 */
  videoStructure: string
  /** TikTok Shop US 调性的 CTA 原话 */
  usCtaScript: string
  /** 本品类美区合规注意 */
  complianceNotes: string
  /** 这条建议的依据：来自哪些数据/SKU/案例/知识库（前端用 chip + hover 展示） */
  evidence?: Evidence[]
}

/** 一条建议的支撑证据。前端渲染为彩色小标签，hover 弹出 detail 全文。 */
export interface Evidence {
  /** 证据来源类型 */
  type: 'sku' | 'metric' | 'benchmark' | 'knowledge' | 'trend' | 'calendar'
  /** 短标签（≤10 字），用于 chip 显示 */
  label: string
  /** 完整说明（hover 显示），引用具体数值/案例名 */
  detail: string
}

export interface TopicAngleGroup {
  /** 目标人群 */
  audience: string
  /** 选题列表 */
  topics: TopicAngle[]
}

export interface TopicAngle {
  /** 使用场景 */
  scene: string
  /** 钩子方向类型：痛点型 / 悬念反转型 / 数字冲击型 / 场景代入型 / 价值承诺型 */
  hookType: '痛点型' | '悬念反转型' | '数字冲击型' | '场景代入型' | '价值承诺型'
  /** 一句话选题描述 */
  description: string
  /** 该选题对应的样例 hook（英文原话） */
  hookExample: string
  /** 选题的依据 */
  evidence?: Evidence[]
}

export interface PublishCadence {
  testPhase: string
  stablePhase: string
  peakPhase: string
}

export interface EmpowermentResult {
  adStrategy: string
  recommendedTools: string[]
  campaignNode?: CampaignAlert
  weeklyBudgetSuggestion: string
  /**
   * 4 个广告工具的本周预算分配（占比之和应 ≈ 100）。
   * 用于前端渲染"预算分配建议"条形图。
   */
  budgetBreakdown?: BudgetAllocation[]
  /** 板块整体的依据来源（数据/工具规则/营销节点等），渲染为统一"来源"标签 */
  evidence?: Evidence[]
}

export interface BudgetAllocation {
  /** 工具名：GMV Max / Promote / Spark Ads / Live GMV Max */
  tool: 'GMV Max' | 'Promote' | 'Spark Ads' | 'Live GMV Max'
  /** 本周该工具的日预算建议（USD/天） */
  dailyUsd: number
  /** 占总预算的比例（0-100） */
  share: number
  /** 该工具本周的核心目的（≤20 字） */
  purpose: string
  /** 期望 ROI（可选） */
  targetRoi?: number
}

export interface CampaignAlert {
  campaignName: string
  daysUntil: number
  actions: string[]
}

export interface BenchmarkResult {
  matchedCase: BenchmarkCase
  similarityReason: string
  actionableSteps: string[]
  expectedOutcome: string
  matchDimensions?: BenchmarkMatchDimension[]
  matchSummary?: string
  /** 板块整体的依据来源（标杆案例 + 匹配维度），渲染为统一"来源"标签 */
  evidence?: Evidence[]
}

export interface BenchmarkCase {
  name: string
  category: string
  subCategoryTags: string[]
  stage: MerchantStage
  breakthrough: string
  keyActions: string[]
  result: string
}

export interface BenchmarkMatchDimension {
  name: string
  score: number
}

export interface Alert {
  level: AlertLevel
  title: string
  body: string
  module: AgentModule
}

export interface FullReport {
  merchantId: string
  merchantName: string
  generatedAt: string
  week: string
  traceSteps: AgentTraceStep[]
  diagnose: DiagnoseResult
  assortment: AssortmentResult
  content: ContentResult
  empowerment: EmpowermentResult
  benchmark: BenchmarkResult
  larkMessage: string
  popupAlerts: Alert[]
}

export interface ValidationResult {
  overallConfidence: number
  issues: string[]
  suggestionScores: SuggestionScore[]
  revisedSuggestions: string[]
}

export interface SuggestionScore {
  suggestion: string
  score: number
  reason: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}
