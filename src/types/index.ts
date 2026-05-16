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
  type: 'evergreen' | 'seasonal' | 'festival' | 'testing'
  name: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
  basedOn: 'inventory_gap' | 'trend_signal' | 'calendar_event' | 'structure_optimization'
}

export interface ContentResult {
  recommendedFormats: ContentFormat[]
  creatorBrief: string
  liveStructure: string
  weeklyPlan: string
}

export interface ContentFormat {
  type: string
  reason: string
  exampleAngle: string
}

export interface EmpowermentResult {
  adStrategy: string
  recommendedTools: string[]
  campaignNode?: CampaignAlert
  weeklyBudgetSuggestion: string
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
