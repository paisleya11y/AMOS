'use client'

import { useState, useCallback, useEffect } from 'react'
import { mockMerchants } from '@/lib/mockData/merchants'
import MerchantSelector from '@/components/agent/MerchantSelector'
import AgentTrace from '@/components/agent/AgentTrace'
import ReportCard from '@/components/agent/ReportCard'
import AlertPanel from '@/components/agent/AlertPanel'
import LarkPreview from '@/components/agent/LarkPreview'
import ResizableAside from '@/components/agent/ResizableAside'
import ReportTimeline from '@/components/agent/ReportTimeline'
import HealthScoreTrend from '@/components/agent/HealthScoreTrend'
import ReviseRequest, { type ReviseModule } from '@/components/agent/ReviseRequest'
import DateRangePicker from '@/components/agent/DateRangePicker'
import FocusBuilder from '@/components/agent/FocusBuilder'
import TriageBoard from '@/components/agent/TriageBoard'
import { saveReport, loadReport } from '@/lib/reportHistory'
import { ensureDemoSeed } from '@/lib/demoSeed'
import { deriveAmTone } from '@/lib/feedbackStore'
import { defaultDateRange, rangeWeekLabel, type DateRange } from '@/lib/dateRange'
import { sanitizeDeep } from '@/lib/textSanitize'
import type {
  AgentTraceStep,
  FullReport,
  AssortmentResult,
  ContentResult,
  ContentGoal,
  EmpowermentResult,
  BenchmarkResult,
  DiagnoseResult,
  ValidationResult,
} from '@/types'

/** 可单独触发的 Agent 模块 */
type RunModule = 'assortment' | 'content' | 'empowerment' | 'benchmark'

const MODULE_OPTIONS: { value: RunModule; label: string; subtitle: string }[] = [
  { value: 'assortment', label: '选品货盘', subtitle: '货盘诊断 + 趋势品' },
  { value: 'content', label: '内容策略', subtitle: '矩阵 + 形式 + 选题' },
  { value: 'empowerment', label: '投流营销', subtitle: '广告 + 大促备战' },
  { value: 'benchmark', label: '标杆学习', subtitle: '同类爆品复盘' },
]

const EMPTY_CONTENT: ContentResult = {
  productDiagnosis: {
    lifecycle: 'potential',
    topSearchTerms: [],
    audienceProfile: '',
    realSellingPoints: [],
    riskKeywords: [],
  },
  contentMatrix: {
    current: { creatorVideo: 0, sellerVideo: 0, creatorLive: 0, sellerLive: 0 },
    diagnosis: '',
    improved: { creatorVideo: 0, sellerVideo: 0, creatorLive: 0, sellerLive: 0 },
    rationale: '',
    actions: [],
  },
  recommendedFormats: [],
  topicAngles: [],
  publishCadence: { testPhase: '', stablePhase: '', peakPhase: '' },
  creatorBrief: '',
  creatorBriefEN: '',
  weeklyPlan: '',
}

const EMPTY_ASSORTMENT: AssortmentResult = {
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
}

const EMPTY_EMPOWERMENT: EmpowermentResult = {
  adStrategy: '',
  recommendedTools: [],
  weeklyBudgetSuggestion: '',
}

const EMPTY_BENCHMARK: BenchmarkResult = {
  matchedCase: { name: '', category: '', subCategoryTags: [], stage: 'cold_start', breakthrough: '', keyActions: [], result: '' },
  similarityReason: '',
  actionableSteps: [],
  expectedOutcome: '',
}

const EMPTY_DIAGNOSE: DiagnoseResult = {
  healthScore: 0,
  stage: 'cold_start',
  weakestDimension: 'assortment',
  stageSummary: '',
  alerts: [],
}

function initSteps(modules: AgentTraceStep['module'][]): AgentTraceStep[] {
  return modules.map((m) => ({
    id: m,
    module: m,
    status: 'pending' as const,
    startTime: 0,
  }))
}

/**
 * 把 AM 个性化语气（由历史反馈推断）并入本次 focusNote，注入各 agent prompt。
 * 复用既有 focusNote 通道，不改 API 路由签名。样本不足时 promptHint=null，不注入。
 */
function composeNote(focusNote: string, merchantId: string): string | undefined {
  const base = focusNote?.trim() || ''
  const insight = deriveAmTone(merchantId)
  const tone = insight.promptHint
    ? `【AM 风格自适应（据历史反馈：${insight.basis}）】${insight.promptHint}`
    : ''
  const merged = [base, tone].filter(Boolean).join('\n')
  return merged || undefined
}

export default function Home() {
  // 视图：默认进分诊台（先看全 portfolio 该救谁），点某家才进单商家报告
  const [view, setView] = useState<'triage' | 'detail'>('triage')
  const [selectedId, setSelectedId] = useState('merchant_001')
  // 内容目标固定为转化（默认值），未来可由「引导诊断」路径自动推断
  const contentGoal: ContentGoal = 'conversion'
  // 模块化查询：选中的 Agent 集合（默认全跑，AM 也可只跑某一块）
  const [selectedModules, setSelectedModules] = useState<Set<RunModule>>(
    new Set<RunModule>(['assortment', 'content', 'empowerment', 'benchmark'])
  )
  // 前置追问：本周重点关注（自由文本，会注入到 prompt）
  const [focusNote, setFocusNote] = useState('')
  // 分析周期：默认本周一~本周日，会注入所有 Agent 的 prompt
  const [dateRange, setDateRange] = useState<DateRange>(() => defaultDateRange())

  const [steps, setSteps] = useState<AgentTraceStep[]>([])
  const [report, setReport] = useState<FullReport | null>(null)
  const [running, setRunning] = useState(false)
  const [runningModule, setRunningModule] = useState<RunModule | 'all' | null>(null)
  const [healthScores, setHealthScores] = useState<Record<string, number>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  // 历史报告 · 时间轴
  // activeKey === 'live' 表示当前展示的是刚跑出来的最新报告（尚未归档前的状态）
  // activeKey === string 表示在回看某份归档报告（只读）
  const [activeKey, setActiveKey] = useState<string | 'live' | null>(null)
  const [historyTick, setHistoryTick] = useState(0)

  // Demo 种子：首次加载若 Insta 365 无历史归档，自动注入"上周"数据，让回顾卡即开即演
  useEffect(() => {
    ensureDemoSeed()
    setHistoryTick((t) => t + 1)
  }, [])

  function updateStep(module: string, patch: Partial<AgentTraceStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.module === module ? { ...s, ...patch } : s))
    )
  }

  function toggleModule(m: RunModule) {
    if (running) return
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(m)) {
        if (next.size > 1) next.delete(m) // 至少留一个
      } else {
        next.add(m)
      }
      return next
    })
  }

  // ---- 单模块执行函数（每个 Agent 独立可调用）----

  const runAssortment = useCallback(async (merchantId: string): Promise<AssortmentResult> => {
    updateStep('assortment', { status: 'running', startTime: Date.now() })
    let assortment: AssortmentResult = EMPTY_ASSORTMENT
    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        if (attempt > 0) updateStep('assortment', { output: `重试中... (第${attempt + 1}次)` })
        const res = await fetch('/api/assortment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, focusNote: composeNote(focusNote, merchantId), dateRange }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        if (!data.inventoryAnalysis || !data.trendOpportunities) {
          throw new Error('响应缺少 inventoryAnalysis 或 trendOpportunities')
        }
        assortment = data
        success = true
      } catch (err) {
        console.error(`[assortment attempt ${attempt + 1}]`, err)
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    updateStep('assortment', {
      status: success ? 'done' : 'error',
      endTime: Date.now(),
      output: success
        ? `推荐 ${assortment.recommendedProducts?.length ?? 0} 个商品方向`
        : '选品分析失败，已使用规则化兜底',
    })
    return assortment
  }, [focusNote, dateRange])

  const runContent = useCallback(async (merchantId: string): Promise<ContentResult> => {
    updateStep('content', { status: 'running', startTime: Date.now() })
    const merchant = mockMerchants.find((m) => m.id === merchantId)!
    let content: ContentResult = { ...EMPTY_CONTENT }
    let success = false
    for (let attempt = 0; attempt < 3 && !success; attempt++) {
      try {
        if (attempt > 0) updateStep('content', { output: `重试中... (第${attempt + 1}次)` })
        const res = await fetch('/api/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId, goal: contentGoal, focusNote: composeNote(focusNote, merchantId), dateRange }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const data = await res.json()
        if (!data.recommendedFormats || !Array.isArray(data.recommendedFormats)) {
          throw new Error('响应缺少 recommendedFormats')
        }
        content = {
          productDiagnosis: data.productDiagnosis || EMPTY_CONTENT.productDiagnosis,
          contentMatrix: data.contentMatrix || EMPTY_CONTENT.contentMatrix,
          recommendedFormats: data.recommendedFormats || [],
          topicAngles: data.topicAngles || [],
          publishCadence: data.publishCadence || EMPTY_CONTENT.publishCadence,
          creatorBrief: data.creatorBrief || '未能生成达人 Brief',
          creatorBriefEN: data.creatorBriefEN || '',
          weeklyPlan: data.weeklyPlan || '未能生成发布计划',
        }
        success = true
      } catch (err) {
        console.error(`[content attempt ${attempt + 1}]`, err)
        if (attempt === 2) {
          content = {
            ...EMPTY_CONTENT,
            recommendedFormats: [
              {
                type: '卖点讲解型',
                reason: 'Fallback：默认推荐美区高转化形式',
                hookExamples: ['POV: TikTok Shop made me buy this'],
                videoStructure: '0-3s hook → 4-10s pain → 11-25s demo → 26-34s CTA',
                usCtaScript: 'Tap the yellow cart bottom-left, ships in 2-3 days',
                complianceNotes: '不能写 "best ever"、"better than Apple"',
              },
            ],
            creatorBrief: `达人合作 Brief：聚焦 ${merchant.category} 品类，展示真实使用场景`,
            creatorBriefEN: 'Creator brief: please regenerate with live data.',
            weeklyPlan: '建议本周发布 3-5 条短视频，覆盖 2-3 种白皮书五大分型',
          }
          success = true
        } else {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
    }
    updateStep('content', {
      status: success ? 'done' : 'error',
      endTime: Date.now(),
      output: success
        ? `推荐 ${content.recommendedFormats?.length ?? 0} 个内容分型`
        : '内容策略生成失败',
    })
    return content
  }, [contentGoal, focusNote, dateRange])

  const runEmpowerment = useCallback(async (merchantId: string): Promise<EmpowermentResult> => {
    updateStep('empowerment', { status: 'running', startTime: Date.now() })
    let empowerment: EmpowermentResult = EMPTY_EMPOWERMENT
    try {
      const res = await fetch('/api/empowerment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, focusNote: composeNote(focusNote, merchantId), dateRange }),
      })
      const data = await res.json()
      if (!data.error) empowerment = data
    } catch (err) {
      console.error('[empowerment]', err)
    }
    updateStep('empowerment', {
      status: 'done',
      endTime: Date.now(),
      output: empowerment.campaignNode
        ? `检测到大促：${empowerment.campaignNode.campaignName}`
        : '广告策略已生成',
    })
    return empowerment
  }, [focusNote, dateRange])

  const runBenchmark = useCallback(async (merchantId: string): Promise<BenchmarkResult> => {
    updateStep('benchmark', { status: 'running', startTime: Date.now() })
    let benchmark: BenchmarkResult = EMPTY_BENCHMARK
    try {
      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId, focusNote: composeNote(focusNote, merchantId), dateRange }),
      })
      const data = await res.json()
      if (!data.error) benchmark = data
    } catch (err) {
      console.error('[benchmark]', err)
    }
    updateStep('benchmark', {
      status: 'done',
      endTime: Date.now(),
      output: `标杆：${benchmark.matchedCase?.name ?? '未匹配'}`,
    })
    return benchmark
  }, [focusNote, dateRange])

  const runDiagnose = useCallback(async (merchantId: string): Promise<DiagnoseResult> => {
    updateStep('diagnose', { status: 'running', startTime: Date.now() })
    let diagnose: DiagnoseResult = EMPTY_DIAGNOSE
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      })
      const data = await res.json()
      if (!data.error) diagnose = data
    } catch (err) {
      console.error('[diagnose]', err)
    }
    updateStep('diagnose', {
      status: 'done',
      endTime: Date.now(),
      output: `健康评分：${diagnose.healthScore}，薄弱：${diagnose.weakestDimension}`,
    })
    return diagnose
  }, [])

  const runValidate = useCallback(
    async (
      merchantId: string,
      generatedReport: {
        assortment: AssortmentResult
        content: ContentResult
        empowerment: EmpowermentResult
        benchmark: BenchmarkResult
      },
      healthScore: number,
    ): Promise<ValidationResult> => {
      updateStep('validate', { status: 'running', startTime: Date.now() })
      let validation: ValidationResult = {
        overallConfidence: 0, issues: [], suggestionScores: [], revisedSuggestions: [],
      }
      try {
        // 注意：validate 路由需要 merchantData / generatedReport / healthScore，
        // 之前只发了 merchantId 导致一直走 catch（confidence 恒为 0）。
        const merchantData = mockMerchants.find((m) => m.id === merchantId)
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantData, generatedReport, healthScore }),
        })
        const data = await res.json()
        if (!data.error) validation = data
      } catch (err) {
        console.error('[validate]', err)
      }
      updateStep('validate', {
        status: 'done',
        endTime: Date.now(),
        output: `置信度：${validation.overallConfidence}分，${validation.issues?.length ?? 0}个问题`,
      })
      return validation
    },
    [],
  )

  // ---- 编排：跑选中的模块（可单 module，可多 module）----

  async function runAgents(modules: RunModule[]) {
    if (running) return
    setRunning(true)
    setSent(false)

    const merchantId = selectedId
    const merchant = mockMerchants.find((m) => m.id === merchantId)!
    const isFullRun = modules.length >= 4 && !report
    setRunningModule(modules.length === 1 ? modules[0] : 'all')

    // trace 包括 router + 选中的模块 + diagnose + validate
    const traceModules: AgentTraceStep['module'][] = [
      'router',
      ...modules,
      'diagnose',
      'validate',
    ]
    setSteps(initSteps(traceModules))

    try {
      // Router
      updateStep('router', { status: 'running', startTime: Date.now() })
      await new Promise((r) => setTimeout(r, 300))
      updateStep('router', {
        status: 'done',
        endTime: Date.now(),
        output: `识别商家：${merchant.name}${focusNote ? ` · 重点：${focusNote.slice(0, 30)}…` : ''}`,
      })

      // 单 module 时复用已有 report 的其他切片，full run 则重新组装
      const baseReport: Partial<FullReport> = report && !isFullRun
        ? { ...report }
        : {}

      const results: Partial<{
        assortment: AssortmentResult
        content: ContentResult
        empowerment: EmpowermentResult
        benchmark: BenchmarkResult
      }> = {}

      // 串行执行选中的模块（保证 trace 视觉一条条点亮）
      for (const m of modules) {
        if (m === 'assortment') results.assortment = await runAssortment(merchantId)
        if (m === 'content') results.content = await runContent(merchantId)
        if (m === 'empowerment') results.empowerment = await runEmpowerment(merchantId)
        if (m === 'benchmark') results.benchmark = await runBenchmark(merchantId)
      }

      // diagnose 总是跑（健康分跟整体相关）
      const diagnose = await runDiagnose(merchantId)

      setHealthScores((prev) => ({ ...prev, [merchantId]: diagnose.healthScore }))

      // 先把四块切片合并好（单 module 重跑时复用旧切片），validate 要拿完整报告做审核
      const mergedSlices = {
        assortment: results.assortment ?? baseReport.assortment ?? EMPTY_ASSORTMENT,
        content: results.content ?? baseReport.content ?? EMPTY_CONTENT,
        empowerment: results.empowerment ?? baseReport.empowerment ?? EMPTY_EMPOWERMENT,
        benchmark: results.benchmark ?? baseReport.benchmark ?? EMPTY_BENCHMARK,
      }

      // 自我校验：把整份建议交给 validate agent 打置信度 + 挑问题（结果接回报告，不再丢弃）
      const validation = await runValidate(merchantId, mergedSlices, diagnose.healthScore)

      const now = new Date()
      // 报告 week label：基于当前所选分析周期，渲染成「YYYY 年 M 月第 N 周」
      const week = rangeWeekLabel(dateRange)

      const fullReport: FullReport = {
        merchantId,
        merchantName: merchant.name,
        generatedAt: now.toLocaleString('zh-CN'),
        week,
        traceSteps: steps,
        diagnose,
        ...mergedSlices,
        larkMessage: `${merchant.name} 本周健康评分 ${diagnose.healthScore}`,
        popupAlerts: diagnose.alerts ?? [],
        validation,
      }

      // 在写入前剥掉 LLM 偶尔会带的"（来源：…）"等显式归因，归因走结构化 evidence 字段 + hover
      const cleanReport = sanitizeDeep(fullReport)
      setReport(cleanReport)
      // 归档：每次成功 run 后写入 localStorage（MVP），并把"活跃"切到 live
      saveReport(cleanReport, focusNote)
      setActiveKey('live')
      setHistoryTick((t) => t + 1)
    } catch (err) {
      console.error('[runAgents error]', err)
    } finally {
      setRunning(false)
      setRunningModule(null)
    }
  }

  /**
   * 「立即处理」一条告警：把告警转成 focusNote，重跑对应的 agent 模块。
   * - alert.module 为 'diagnose' 时无对应 RunModule，则跑全量
   * - 其它情况只跑对应单 module
   */
  function handleResolveAlert(alert: import('@/types').Alert) {
    if (running) return
    const note = `处理告警「${alert.title}」：${alert.body}`
    setFocusNote(note)
    const moduleMap: Record<string, RunModule | undefined> = {
      assortment: 'assortment',
      content: 'content',
      empowerment: 'empowerment',
      benchmark: 'benchmark',
    }
    const target = moduleMap[alert.module]
    const modules: RunModule[] = target
      ? [target]
      : (Array.from(selectedModules) as RunModule[])
    runAgents(modules)
  }

  /**
   * AM 微调请求：把右栏 textarea 内容写到 focusNote，重跑指定模块（或全跑）
   */
  function handleReviseRequest(note: string, modules: ReviseModule[]) {
    if (running) return
    setFocusNote(note)
    const targets: RunModule[] =
      modules.length > 0
        ? (modules as RunModule[])
        : (Array.from(selectedModules) as RunModule[])
    runAgents(targets)
  }

  /** 点击时间轴上的某份归档：加载并切换为只读回看 */
  function pickArchived(key: string) {
    const r = loadReport(key)
    if (!r) return
    setReport(sanitizeDeep(r))
    setActiveKey(key)
    setSteps([]) // 归档报告没有 trace 重放，避免误导
  }

  async function sendToLark() {
    if (!report) return
    setSending(true)
    try {
      const res = await fetch('/api/lark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      })
      if (res.ok) setSent(true)
    } catch (err) {
      console.error('[lark]', err)
    } finally {
      setSending(false)
    }
  }

  /** 从分诊台进入某商家：选中 + 切到 detail 视图 + 清掉上一家的状态 */
  function enterMerchant(id: string) {
    setSelectedId(id)
    setReport(null)
    setActiveKey(null)
    setSteps([])
    setSent(false)
    setView('detail')
  }

  // 分诊台视图：全屏展示全商家 portfolio
  if (view === 'triage') {
    return (
      <div className="flex-1 min-h-0 overflow-auto bg-gray-50 p-6">
        <TriageBoard
          merchants={mockMerchants}
          amName="am_001"
          onPick={enterMerchant}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* 左侧栏：商家列表 + 前置追问 + 模块勾选 + 启动 */}
      <ResizableAside
        storageKey="amos:aside:left:width"
        defaultWidth={280}
        minWidth={240}
        maxWidth={480}
        side="right"
        className="border-r border-gray-200 bg-white overflow-auto"
      >
        <div className="p-4">
        <MerchantSelector
          merchants={mockMerchants}
          selected={selectedId}
          healthScores={healthScores}
          onSelect={(id) => {
            if (id === selectedId) return
            setSelectedId(id)
            setReport(null)
            setActiveKey(null)
            setSteps([])
            setSent(false)
          }}
        />

        {/* 前置追问 0：分析周期 */}
        <div className="mt-6 px-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} disabled={running} />
        </div>

        {/* 前置追问：本周重点 · 双路径（明确需求 / 引导诊断） */}
        <div className="mt-6">
          <FocusBuilder
            value={focusNote}
            onChange={setFocusNote}
            disabled={running}
          />
          {/* AM 风格自适应：据历史反馈推断，注入下次生成 */}
          {(() => {
            const insight = deriveAmTone(selectedId)
            if (!insight.promptHint) return null
            const toneCn =
              insight.tone === 'aggressive' ? '偏进取' : insight.tone === 'conservative' ? '偏稳健' : '均衡'
            const toneStyle =
              insight.tone === 'aggressive'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : insight.tone === 'conservative'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            return (
              <div className="mt-2 px-2">
                <span
                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${toneStyle}`}
                  title={`据历史反馈：${insight.basis}。下次生成会按此风格自适应。`}
                >
                  AM 风格：{toneCn}
                </span>
                <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                  据你的历史反馈（{insight.basis}）自动调整建议口吻
                </p>
              </div>
            )
          })()}
        </div>

        {/* 前置追问 3：想看哪几块 */}
        <div className="mt-6">
          <div className="text-xs text-gray-500 uppercase tracking-widest px-2 mb-2">
            想跑哪些模块？
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {MODULE_OPTIONS.map((opt) => {
              const active = selectedModules.has(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => toggleModule(opt.value)}
                  disabled={running}
                  className={`text-left rounded-lg px-2.5 py-2 text-xs transition-colors border ${
                    active
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                  } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="font-medium flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    {opt.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{opt.subtitle}</div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => runAgents(Array.from(selectedModules))}
            disabled={running}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              running
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {running
              ? `分析中（${runningModule === 'all' ? '全部' : runningModule}）…`
              : `生成报告（${selectedModules.size} 个模块）`}
          </button>
          {report && !running && (
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {MODULE_OPTIONS.filter((o) => selectedModules.has(o.value)).map((o) => (
                <button
                  key={o.value}
                  onClick={() => runAgents([o.value])}
                  className="text-[11px] py-1.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-600"
                  title={`只重跑 ${o.label}`}
                >
                  ↻ 只跑 {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agent 执行轨迹 */}
        {steps.length > 0 && (
          <div className="mt-6">
            <AgentTrace steps={steps} />
          </div>
        )}
        </div>
      </ResizableAside>

      {/* 主区：报告 */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {/* 返回分诊台 */}
        <button
          onClick={() => setView('triage')}
          className="mb-4 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← 返回分诊台
        </button>

        {/* 时间轴：始终展示该商家的归档（即便当前未生成报告） */}
        <ReportTimeline
          merchantId={selectedId}
          activeKey={activeKey}
          liveScore={report?.diagnose?.healthScore}
          liveFocusNote={focusNote || undefined}
          liveAlertCounts={
            report
              ? {
                  critical: report.popupAlerts.filter((a) => a.level === 'critical').length,
                  warning: report.popupAlerts.filter((a) => a.level === 'warning').length,
                  info: report.popupAlerts.filter((a) => a.level === 'info').length,
                }
              : undefined
          }
          liveCriticalTitles={
            report
              ? report.popupAlerts.filter((a) => a.level === 'critical').map((a) => a.title)
              : undefined
          }
          onPick={pickArchived}
          onPickLive={() => {
            // 切回最新一次实时报告（如果还在内存里）
            if (report) setActiveKey('live')
          }}
          onActiveDeleted={() => {
            // 当前正在回看的归档被删 —— 优先回到 live（如果有），否则清空
            if (report) {
              setActiveKey('live')
            } else {
              setActiveKey(null)
              setReport(null)
            }
          }}
          refreshToken={historyTick}
        />

        {/* 回看模式提示条 */}
        {activeKey && activeKey !== 'live' && report && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
            <span>
              📂 当前正在回看 <span className="font-medium">{report.generatedAt}</span> 的归档报告（只读）
            </span>
            <button
              onClick={() => runAgents(Array.from(selectedModules))}
              disabled={running}
              className="text-amber-700 hover:text-amber-900 underline"
            >
              重新生成最新报告 →
            </button>
          </div>
        )}

        {report ? (
          <ReportCard report={report} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">选择商家，勾选模块，写下本周重点</p>
              <p className="text-sm">点&ldquo;生成报告&rdquo;后可单独重跑任一 Agent</p>
            </div>
          </div>
        )}
      </main>

      {/* 右侧栏：告警 + 飞书 */}
      <ResizableAside
        storageKey="amos:aside:right:width"
        defaultWidth={256}
        minWidth={220}
        maxWidth={480}
        side="left"
        className="border-l border-gray-200 bg-white overflow-auto"
      >
        <div className="p-4 space-y-6">
        {report ? (
          <>
            <HealthScoreTrend
              merchantId={report.merchantId}
              currentScore={report.diagnose?.healthScore}
              refreshToken={historyTick}
            />
            <AlertPanel
              alerts={report.popupAlerts}
              onResolve={handleResolveAlert}
              ctaDisabled={running}
              merchantId={report.merchantId}
              week={report.week}
            />
            <ReviseRequest onSubmit={handleReviseRequest} disabled={running} />
            <LarkPreview
              report={report}
              onSend={sendToLark}
              sending={sending}
              sent={sent}
            />
          </>
        ) : (
          <div className="text-center text-gray-400 text-sm pt-8">
            生成报告后查看告警与飞书预览
          </div>
        )}
        </div>
      </ResizableAside>
    </div>
  )
}
