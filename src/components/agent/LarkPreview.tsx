'use client'
import { FullReport } from '@/types'

interface Props {
  report: FullReport
  onSend: () => void
  sending: boolean
  sent: boolean
}

export default function LarkPreview({ report, onSend, sending, sent }: Props) {
  const score = report.diagnose?.healthScore ?? 0
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'
  const criticalAlerts = (report.diagnose?.alerts ?? []).filter(
    (a) => a.level === 'critical'
  )

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
                {{ cold_start: '冷启期', growth: '成长期', mature: '成熟期' }[
                  report.diagnose?.stage ?? 'cold_start'
                ]}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1">本周诊断</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {report.diagnose?.stageSummary || '暂无诊断摘要'}
            </p>
          </div>

          {criticalAlerts.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
              <p className="text-xs font-medium text-red-700 mb-1.5">
                ⚠️ 需关注
              </p>
              {criticalAlerts.map((a, i) => (
                <p key={i} className="text-xs text-red-600">
                  · {a.title}：{a.body.slice(0, 50)}...
                </p>
              ))}
            </div>
          )}

          <div>
            <p className="text-xs text-gray-500 mb-1">本周优先行动</p>
            {(report.assortment?.upcomingOpportunities ?? []).slice(0, 2).map(
              (o, i) => (
                <p key={i} className="text-xs text-gray-700">
                  · {o}
                </p>
              )
            )}
          </div>

          <p className="text-xs text-gray-400 border-t pt-2">
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