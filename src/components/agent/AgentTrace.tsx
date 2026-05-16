'use client'
import { AgentTraceStep } from '@/types'

const MODULE_LABELS: Record<string, string> = {
  router: '路由 Agent · 解析商家数据',
  assortment: 'Assortment Agent · 选品货盘分析',
  content: 'Content Agent · 内容策略生成',
  empowerment: 'Empowerment Agent · 投流营销规划',
  benchmark: 'Benchmark Agent · 标杆案例匹配',
  diagnose: 'Diagnose Agent · 综合诊断汇总',
  validate: '验证 Agent · 建议质量审核',
  anomaly: '异动检测子 Agent',
  campaign: '大促备战子 Agent',
}

const STATUS_STYLES = {
  pending: 'text-gray-400',
  running: 'text-blue-500 animate-pulse',
  done: 'text-green-600',
  error: 'text-red-500',
}

const STATUS_ICONS = {
  pending: '○',
  running: '◉',
  done: '●',
  error: '✕',
}

interface Props {
  steps: AgentTraceStep[]
}

export default function AgentTrace({ steps }: Props) {
  return (
    <div className="bg-gray-950 rounded-xl p-4 font-mono text-sm">
      <div className="text-gray-500 text-xs mb-3 uppercase tracking-widest">
        Agent 执行轨迹
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-3">
            <span className={`mt-0.5 text-base ${STATUS_STYLES[step.status]}`}>
              {STATUS_ICONS[step.status]}
            </span>
            <div className="flex-1 min-w-0">
              <div className={`font-medium ${STATUS_STYLES[step.status]}`}>
                {MODULE_LABELS[step.module] ?? step.module}
              </div>
              {step.output && step.status === 'done' && (
                <div className="text-gray-500 text-xs mt-0.5 truncate">
                  {step.output}
                </div>
              )}
              {step.status === 'running' && (
                <div className="text-blue-400 text-xs mt-0.5">
                  处理中...
                </div>
              )}
              {step.endTime && step.startTime && step.status === 'done' && (
                <div className="text-gray-600 text-xs">
                  {((step.endTime - step.startTime) / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}