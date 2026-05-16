'use client'
import { FullReport } from '@/types'

interface Props {
  report: FullReport
}

const URGENCY_STYLES = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS = {
  evergreen: '常青品',
  seasonal: '季节品',
  festival: '节庆品',
}

export default function ReportCard({ report }: Props) {
  const score = report.diagnose?.healthScore ?? 0
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'

  const products = report.assortment?.recommendedProducts ?? []
  const opportunities = report.assortment?.upcomingOpportunities ?? []
  const inventoryWarnings = report.assortment?.inventoryWarnings ?? []
  const formats = report.content?.recommendedFormats ?? []
  const tools = report.empowerment?.recommendedTools ?? []
  const actionableSteps = report.benchmark?.actionableSteps ?? []
  const matchDimensions = report.benchmark?.matchDimensions ?? []
  const matchSummary = report.benchmark?.matchSummary

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {report.merchantName}
            </h2>
            <p className="text-sm text-gray-500">{report.week} 经营诊断报告</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${scoreColor}`}>{score}</p>
            <p className="text-xs text-gray-400">健康评分</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.diagnose?.stageSummary}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-teal-500 rounded-full" />
          Assortment · 选品货盘
        </h3>
        <div className="space-y-2">
          {products.filter(p => p && p.name).map((p, i) => {
            const urgency = p.urgency && ['high', 'medium', 'low'].includes(p.urgency)
              ? p.urgency as keyof typeof URGENCY_STYLES
              : 'low'
            const type = p.type && ['evergreen', 'seasonal', 'festival'].includes(p.type)
              ? p.type as keyof typeof TYPE_LABELS
              : 'evergreen'
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 whitespace-nowrap ${
                    URGENCY_STYLES[urgency] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {TYPE_LABELS[type] ?? type}
                </span>
                <div>
                  <span className="font-medium text-gray-800">{p.name}</span>
                  <span className="text-gray-500 ml-1">{p.reason || '暂无说明'}</span>
                </div>
              </div>
            )
          })}
        </div>
        {inventoryWarnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">库存预警</p>
            {inventoryWarnings.map((w, i) => (
              <p key={i} className="text-xs text-red-600">· {w}</p>
            ))}
          </div>
        )}
        {opportunities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">即将到来的机会</p>
            {opportunities.map((o, i) => (
              <p key={i} className="text-xs text-gray-600">· {o}</p>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-blue-500 rounded-full" />
          Content · 内容策略
        </h3>
        <div className="space-y-2 mb-3">
          {formats.filter(f => f && f.type).map((f, i) => (
            <div key={i} className="bg-blue-50 rounded-lg p-2.5">
              <p className="text-sm font-medium text-blue-800">{f.type}</p>
              <p className="text-xs text-blue-600 mt-0.5">{f.exampleAngle || '暂无示例'}</p>
            </div>
          ))}
        </div>
        {report.content?.creatorBrief && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 font-medium">达人 Brief</p>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
              {report.content.creatorBrief}
            </p>
          </div>
        )}
        {report.content?.weeklyPlan && (
          <div className="bg-gray-50 rounded-lg p-3 mt-2">
            <p className="text-xs text-gray-500 mb-1 font-medium">本周发布计划</p>
            <p className="text-xs text-gray-700 leading-relaxed">
              {report.content.weeklyPlan}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
          Empowerment · 投流营销
        </h3>
        <p className="text-sm text-gray-700 mb-3">
          {report.empowerment?.adStrategy}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tools.filter(t => t).map((t, i) => (
            <span
              key={i}
              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"
            >
              {t}
            </span>
          ))}
        </div>
        {report.empowerment?.campaignNode && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-800 mb-1.5">
              🎯 {report.empowerment.campaignNode.campaignName} · 距今{' '}
              {report.empowerment.campaignNode.daysUntil} 天
            </p>
            {(report.empowerment.campaignNode.actions ?? []).map((a, i) => (
              <p key={i} className="text-xs text-amber-700">· {a}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-3">
          {report.empowerment?.weeklyBudgetSuggestion}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
          Benchmark · 标杆学习
        </h3>
        {report.benchmark?.matchedCase && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-purple-500 mb-0.5">匹配标杆</p>
            <p className="text-sm font-medium text-purple-900">
              {report.benchmark.matchedCase.name}
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              {report.benchmark.matchedCase.breakthrough}
            </p>
          </div>
        )}
        {/* 匹配维度可视化 */}
      {matchDimensions.length > 0 && (
        <div className="mb-3 space-y-1.5">
          <p className="text-xs text-gray-500 font-medium">对标依据（4维评分）</p>
          {matchDimensions.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-14 flex-shrink-0">{d.name}</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-400 rounded-full"
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 w-8 text-right">
                {d.score}
              </span>
            </div>
          ))}
          {matchSummary && (
            <p className="text-xs text-purple-600 mt-1">
              {matchSummary}
            </p>
          )}
        </div>
      )}
        <p className="text-xs text-gray-600 mb-3">
          {report.benchmark?.similarityReason}
        </p>
        <div className="space-y-1.5">
          {actionableSteps.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs bg-purple-100 text-purple-700 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                {i + 1}
              </span>
              <p className="text-xs text-gray-700">{s}</p>
            </div>
          ))}
        </div>
        {report.benchmark?.expectedOutcome && (
          <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
            预期效果：{report.benchmark.expectedOutcome}
          </p>
        )}
      </div>
    </div>
  )
}
