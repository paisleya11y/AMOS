import { AgentModule } from '@/types'

/**
 * 按「错误成本」分级授权 —— AMOS 的核心产品原则。
 *
 * 第一性：四个域的建议，错了之后的代价完全不同。
 *   - 投放预算：商家照着调 → 真金白银烧掉，高且接近不可逆 → 必须强确认 + 确定性规则校验
 *   - 选品：押错品 → 机会成本，中 → 人工确认
 *   - 内容/标杆：拍了没人看的视频 → 可快速试错，低 → 可放开、趋向自动
 *
 * 因此人工介入强度、AI 自主度，本就应按模块分层，而非全局一刀切。
 * 本模块把这条原则编码成可被 UI 消费的"授权级别"。
 */

export type CostLevel = 'high' | 'medium' | 'low'

export interface AuthorityPolicy {
  /** 错误成本档位 */
  cost: CostLevel
  /** 一句话：错了会怎样 */
  consequence: string
  /** 人工介入强度文案 */
  gate: string
  /** 是否需要确定性规则校验（高成本域才需要） */
  ruleCheck: boolean
  /** UI 配色 */
  tone: { chip: string; bar: string; text: string }
  /** 给确认动作的标签 */
  ctaLabel: string
}

/**
 * 各 Agent 模块的授权策略。
 * 投放(empowerment)=高；选品(assortment)=中；内容(content)/标杆(benchmark)=低；
 * 诊断(diagnose)本身是只读结论，归入中（健康分驱动后续动作）。
 */
export const AUTHORITY: Record<AgentModule, AuthorityPolicy> = {
  empowerment: {
    cost: 'high',
    consequence: '直接影响商家预算投放，错误成本高且接近不可逆',
    gate: '强制 AM 二次确认',
    ruleCheck: true,
    tone: { chip: 'bg-rose-100 text-rose-700 border-rose-200', bar: 'bg-rose-500', text: 'text-rose-700' },
    ctaLabel: '需 AM 二次确认后执行',
  },
  assortment: {
    cost: 'medium',
    consequence: '押错品类产生机会成本，影响中等',
    gate: 'AM 确认',
    ruleCheck: false,
    tone: { chip: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' },
    ctaLabel: '建议 AM 确认',
  },
  content: {
    cost: 'low',
    consequence: '内容可快速试错，错误成本低',
    gate: '可放开 / 轻确认',
    ruleCheck: false,
    tone: { chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
    ctaLabel: '可直接采用',
  },
  benchmark: {
    cost: 'low',
    consequence: '对标学习为参考性建议，错误成本低',
    gate: '可放开 / 轻确认',
    ruleCheck: false,
    tone: { chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
    ctaLabel: '可直接参考',
  },
  diagnose: {
    cost: 'medium',
    consequence: '诊断结论驱动后续动作，需人工判断',
    gate: 'AM 确认',
    ruleCheck: false,
    tone: { chip: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-500', text: 'text-amber-700' },
    ctaLabel: '建议 AM 确认',
  },
}

const COST_LABEL: Record<CostLevel, string> = {
  high: '高错误成本',
  medium: '中错误成本',
  low: '低错误成本',
}

export function costLabel(level: CostLevel): string {
  return COST_LABEL[level]
}

export function authorityOf(module: AgentModule): AuthorityPolicy {
  return AUTHORITY[module] ?? AUTHORITY.diagnose
}
