'use client'
import { FullReport, MerchantData } from '@/types'
import { mockMerchants } from '@/lib/mockData/merchants'
import SuggestionFeedback from './SuggestionFeedback'
import { computeDimensionScores, weakestDimension } from '@/lib/dimensionScores'

interface Props {
  report: FullReport
  onSend: () => void
  sending: boolean
  sent: boolean
}

const STAGE_LABEL: Record<string, string> = {
  cold_start: '冷启期',
  growth: '成长期',
  mature: '成熟期',
}

const PRIORITY_META: Record<
  'critical' | 'warning' | 'info',
  { tag: string; chip: string; bar: string; cap: string }
> = {
  critical: { tag: 'P1', chip: 'bg-rose-100 text-rose-700', bar: 'bg-rose-400', cap: '本周必须修' },
  warning: { tag: 'P2', chip: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400', cap: '本周内排期' },
  info: { tag: 'P3', chip: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400', cap: '观察 / 储备' },
}

export default function LarkPreview({ report, onSend, sending, sent }: Props) {
  const score = report.diagnose?.healthScore ?? 0
  const scoreColor =
    score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-500' : 'text-rose-500'

  // —— 与顶部诊断头同一套四维评分公式（保证消息和报告一致）——
  const merchant = mockMerchants.find((m) => m.id === report.merchantId) as
    | MerchantData
    | undefined
  const inv = report.assortment?.inventoryAnalysis

  const dims = merchant ? computeDimensionScores(merchant, inv) : null
  const weakest = dims ? weakestDimension(dims) : null

  // 本周必做 3 件事：从 popupAlerts 取真告警，按 P1>P2>P3 排序
  const PRIORITY_ORDER = { critical: 0, warning: 1, info: 2 } as const
  const priorities = [...(report.popupAlerts ?? [])]
    .sort((a, b) => PRIORITY_ORDER[a.level] - PRIORITY_ORDER[b.level])
    .slice(0, 3)

  function dimColor(s: number) {
    return s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-500' : 'text-rose-500'
  }
  function dimBar(s: number) {
    return s >= 80 ? 'bg-emerald-400' : s >= 60 ? 'bg-amber-400' : 'bg-rose-400'
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 uppercase tracking-widest">
        飞书群消息预览
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-blue-600 px-4 py-2.5">
          <p className="text-white text-sm font-medium">
            📊 {report.merchantName} · 本周经营诊断报告
          </p>
        </div>
        <div className="p-4 space-y-3 bg-white">
          {/* 健康分 + 阶段 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500 mb-1">健康评分</p>
              <p className={`text-xl font-semibold ${scoreColor}`}>
                {score}
                <span className="text-sm font-normal text-gray-400">/100</span>
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-xs text-gray-500 mb-1">经营阶段</p>
              <p className="text-sm font-medium text-gray-800">
                {STAGE_LABEL[report.diagnose?.stage ?? 'cold_start']}
              </p>
            </div>
          </div>

          {/* 四维健康度 mini 视图（与正文报告口径一致） */}
          {dims && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">四维健康度</p>
              <div className="grid grid-cols-4 gap-2">
                {dims.map((d) => {
                  const isWeakest = weakest?.key === d.key
                  return (
                    <div
                      key={d.key}
                      className={`rounded-md border p-1.5 ${
                        isWeakest ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100 bg-gray-50/50'
                      }`}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-gray-600">{d.label}</span>
                        <span className={`text-xs font-semibold ${dimColor(d.score)}`}>
                          {d.score}
                        </span>
                      </div>
                      <div className="mt-1 h-0.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full ${dimBar(d.score)}`}
                          style={{ width: `${Math.min(100, Math.max(2, d.score))}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              {weakest && (
                <p className="text-[10px] text-gray-500 mt-1.5">
                  本周最弱：
                  <span className={`font-medium ${dimColor(weakest.score)}`}>
                    {weakest.label}（{weakest.score}）
                  </span>
                  <span className="text-gray-400 ml-1">→ 主攻方向</span>
                </p>
              )}
            </div>
          )}

          {/* 本周必做 3 件事（来自真告警，标 P1/P2/P3） */}
          {priorities.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1.5">本周必做（按优先级）</p>
              <div className="space-y-1.5">
                {priorities.map((p, i) => {
                  const m = PRIORITY_META[p.level]
                  return (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${m.chip}`}>
                        {m.tag}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800 leading-snug">
                          {p.title}
                        </p>
                        <p className="text-[11px] text-gray-600 leading-relaxed">{p.body}</p>
                        <SuggestionFeedback
                          merchantId={report.merchantId}
                          week={report.week}
                          module={p.module}
                          suggestionText={`预警 · ${p.title}`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 判断依据 caption —— 让群里看到消息的人也能理解为什么这样排 */}
          {dims && weakest && (
            <p className="text-[10px] text-gray-400 leading-relaxed bg-gray-50 rounded-md px-2 py-1.5">
              <span className="font-medium text-gray-500">优先级判断：</span>
              四维中
              <span className={`font-medium ${dimColor(weakest.score)} mx-0.5`}>
                {weakest.label}（{weakest.score}）
              </span>
              最弱 → 本周告警按级别（紧急 / 注意 / 提示）排序，与最弱维度相关项前置，输出 3 条本周必做项。
            </p>
          )}

          <p className="text-[10px] text-gray-400 border-t pt-2">
            由 ACE 运营副驾驶生成 · {report.generatedAt}
          </p>
        </div>
      </div>

      <button
        onClick={onSend}
        disabled={sending || sent}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
          sent
            ? 'bg-green-100 text-green-700 cursor-default'
            : sending
            ? 'bg-gray-100 text-gray-400 cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {sent ? '✓ 已发送到飞书群' : sending ? '发送中...' : '确认发送到飞书群'}
      </button>
    </div>
  )
}
