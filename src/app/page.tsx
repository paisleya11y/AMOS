'use client'

import { useState } from 'react'
import { mockMerchants } from '@/lib/mockData/merchants'
import MerchantSelector from '@/components/agent/MerchantSelector'
import AgentTrace from '@/components/agent/AgentTrace'
import ReportCard from '@/components/agent/ReportCard'
import AlertPanel from '@/components/agent/AlertPanel'
import LarkPreview from '@/components/agent/LarkPreview'
import type {
  AgentTraceStep,
  FullReport,
  AssortmentResult,
  ContentResult,
  EmpowermentResult,
  BenchmarkResult,
  DiagnoseResult,
  ValidationResult,
} from '@/types'

function initSteps(): AgentTraceStep[] {
  const modules = [
    'router',
    'assortment',
    'content',
    'empowerment',
    'benchmark',
    'diagnose',
    'validate',
  ]
  return modules.map((m) => ({
    id: m,
    module: m as AgentTraceStep['module'],
    status: 'pending' as const,
    startTime: 0,
  }))
}

export default function Home() {
  const [selectedId, setSelectedId] = useState('merchant_001')
  const [steps, setSteps] = useState<AgentTraceStep[]>(initSteps())
  const [report, setReport] = useState<FullReport | null>(null)
  const [running, setRunning] = useState(false)
  const [healthScores, setHealthScores] = useState<Record<string, number>>({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function updateStep(module: string, patch: Partial<AgentTraceStep>) {
    setSteps((prev) =>
      prev.map((s) => (s.module === module ? { ...s, ...patch } : s))
    )
  }

  async function runAgents() {
    setRunning(true)
    setReport(null)
    setSent(false)
    setSteps(initSteps())

    const merchantId = selectedId
    const merchant = mockMerchants.find((m) => m.id === merchantId)!

    try {
      // Step 0: Router
      updateStep('router', { status: 'running', startTime: Date.now() })
      await new Promise((r) => setTimeout(r, 400))
      updateStep('router', {
        status: 'done',
        endTime: Date.now(),
        output: `识别商家：${merchant.name}，品类：${merchant.category}`,
      })

      // Step 1: Assortment (with retry + fallback)
      updateStep('assortment', { status: 'running', startTime: Date.now() })
      let assortment: AssortmentResult = {
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
      let assortmentSuccess = false

      for (let attempt = 0; attempt < 3 && !assortmentSuccess; attempt++) {
        try {
          if (attempt > 0) updateStep('assortment', { output: `重试中... (第${attempt + 1}次)` })
          const res = await fetch('/api/assortment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantId }),
          })
          if (!res.ok) throw new Error(`API ${res.status}`)
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          if (!data.inventoryAnalysis || !data.trendOpportunities) {
            throw new Error('响应缺少 inventoryAnalysis 或 trendOpportunities')
          }
          assortment = data
          assortmentSuccess = true
        } catch (err) {
          console.error(`[assortment attempt ${attempt + 1}]`, err)
          if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      updateStep('assortment', {
        status: assortmentSuccess ? 'done' : 'error',
        endTime: Date.now(),
        output: assortmentSuccess
          ? `推荐 ${assortment.recommendedProducts?.length ?? 0} 个商品方向`
          : '选品分析失败，已使用规则化兜底',
      })

      // Step 2: Content (with retry + fallback)
      updateStep('content', { status: 'running', startTime: Date.now() })
      let content: ContentResult = {
        recommendedFormats: [],
        creatorBrief: '',
        liveStructure: '',
        weeklyPlan: '',
      }
      let contentSuccess = false

      for (let attempt = 0; attempt < 3 && !contentSuccess; attempt++) {
        try {
          if (attempt > 0) updateStep('content', { output: `重试中... (第${attempt + 1}次)` })
          const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ merchantId }),
          })
          if (!res.ok) throw new Error(`API ${res.status}`)
          const data = await res.json()
          if (!data.recommendedFormats || !Array.isArray(data.recommendedFormats)) {
            throw new Error('响应缺少 recommendedFormats')
          }
          content = {
            recommendedFormats: data.recommendedFormats || [],
            creatorBrief: data.creatorBrief || '未能生成达人Brief',
            liveStructure: data.liveStructure || '未能生成直播结构',
            weeklyPlan: data.weeklyPlan || '未能生成发布计划',
          }
          contentSuccess = true
        } catch (err) {
          console.error(`[content attempt ${attempt + 1}]`, err)
          if (attempt === 2) {
            content = {
              recommendedFormats: [
                { type: '卖点讲解型', reason: '适用于3C配件类商品', exampleAngle: '展示产品核心功能' },
              ],
              creatorBrief: `达人合作Brief：聚焦${merchant.category}品类功能演示`,
              liveStructure: '引流品(30%)-主推品(50%)-利润品(20%)',
              weeklyPlan: '建议发布3-5条短视频，安排2场直播',
            }
            contentSuccess = true
          } else {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
          }
        }
      }
      updateStep('content', {
        status: contentSuccess ? 'done' : 'error',
        endTime: Date.now(),
        output: contentSuccess
          ? `推荐 ${content.recommendedFormats?.length ?? 0} 个内容分型`
          : '内容策略生成失败',
      })

      // Step 3: Empowerment
      updateStep('empowerment', { status: 'running', startTime: Date.now() })
      let empowerment: EmpowermentResult = {
        adStrategy: '',
        recommendedTools: [],
        weeklyBudgetSuggestion: '',
      }
      try {
        const res = await fetch('/api/empowerment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId }),
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

      // Step 4: Benchmark
      updateStep('benchmark', { status: 'running', startTime: Date.now() })
      let benchmark: BenchmarkResult = {
        matchedCase: { name: '', category: '', subCategoryTags: [], stage: 'cold_start', breakthrough: '', keyActions: [], result: '' },
        similarityReason: '',
        actionableSteps: [],
        expectedOutcome: '',
      }
      try {
        const res = await fetch('/api/benchmark', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId }),
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

      // Step 5: Diagnose
      updateStep('diagnose', { status: 'running', startTime: Date.now() })
      let diagnose: DiagnoseResult = {
        healthScore: 0,
        stage: 'cold_start',
        weakestDimension: 'assortment',
        stageSummary: '',
        alerts: [],
      }
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

      // Step 6: Validate
      updateStep('validate', { status: 'running', startTime: Date.now() })
      let validation: ValidationResult = {
        overallConfidence: 0,
        issues: [],
        suggestionScores: [],
        revisedSuggestions: [],
      }
      try {
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchantId }),
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

      // Update health score
      setHealthScores((prev) => ({ ...prev, [merchantId]: diagnose.healthScore }))

      // Assemble full report
      const now = new Date()
      const week = `${now.getFullYear()}-W${String(Math.ceil(now.getDate() / 7)).padStart(2, '0')}`

      const fullReport: FullReport = {
        merchantId,
        merchantName: merchant.name,
        generatedAt: now.toLocaleString('zh-CN'),
        week,
        traceSteps: steps,
        diagnose,
        assortment,
        content,
        empowerment,
        benchmark,
        larkMessage: `${merchant.name} 本周健康评分 ${diagnose.healthScore}`,
        popupAlerts: diagnose.alerts ?? [],
      }

      setReport(fullReport)
    } catch (err) {
      console.error('[runAgents error]', err)
    } finally {
      setRunning(false)
    }
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

  const merchant = mockMerchants.find((m) => m.id === selectedId)

  return (
    <div className="flex flex-1 min-h-0">
      {/* 左侧栏：商家列表 */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-200 bg-white p-4 overflow-auto">
        <MerchantSelector
          merchants={mockMerchants}
          selected={selectedId}
          healthScores={healthScores}
          onSelect={setSelectedId}
        />

        <div className="mt-6">
          <button
            onClick={runAgents}
            disabled={running}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              running
                ? 'bg-gray-100 text-gray-400 cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {running ? '分析中...' : '生成报告'}
          </button>
        </div>

        {/* Agent 执行轨迹 */}
        <div className="mt-6">
          <AgentTrace steps={steps} />
        </div>
      </aside>

      {/* 主区：报告 */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6">
        {report ? (
          <ReportCard report={report} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">选择商家，点击"生成报告"</p>
              <p className="text-sm">7 Agent 将依次运行：选品 → 内容 → 投放 → 对标 → 诊断 → 验证</p>
            </div>
          </div>
        )}
      </main>

      {/* 右侧栏：告警 + 飞书 */}
      <aside className="w-64 flex-shrink-0 border-l border-gray-200 bg-white p-4 overflow-auto space-y-6">
        {report ? (
          <>
            <AlertPanel alerts={report.popupAlerts} />
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
      </aside>
    </div>
  )
}
