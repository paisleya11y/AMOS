'use client'
import { useEffect, useMemo, useState } from 'react'

/**
 * 双路径前置追问：
 *   A · 明确需求（direct）：AM 自己写一句话；提供按场景分组的「快速短语」chip 帮助起手。
 *   B · 引导诊断（guided）：4 步漏斗
 *     1. 选问题域（货盘 / 内容 / 投流 / 大盘）  —— 单选
 *     2. 该域下勾选具体症状（带数据示意）       —— 多选
 *     3. 期望产出深度（仅诊断 / 给行动 / 拿标杆复盘）—— 单选
 *     4. 可选补充
 *   合成 focusNote，并提示"系统将重点聚焦哪些 Agent"。
 */

type Mode = 'direct' | 'guided'

/** A 路径：按场景分组的快速短语 */
const DIRECT_GROUPS: { title: string; chips: string[] }[] = [
  {
    title: '节奏 / 节点',
    chips: ['黑五前 6 周备战', '618 备战', '新品冷启动期', '直播首场启动'],
  },
  {
    title: '货盘',
    chips: ['库存积压急清', '爆品需要补单', '彩色 / 大码积压', '新品想测潜力'],
  },
  {
    title: '内容',
    chips: ['达人寄样周期长', '视频跑量低', '内容同质化', '缺新素材角度'],
  },
  {
    title: '投流',
    chips: ['广告 ROI 不及格', '消耗跑不出去', 'GMV Max 新计划', '直播间起量难'],
  },
]

/** B 路径：问题域（第 1 步） */
type DomainKey = 'assortment' | 'content' | 'empowerment' | 'overall'
const DOMAINS: { key: DomainKey; label: string; emoji: string; tip: string }[] = [
  { key: 'overall', label: '大盘掉量', emoji: '📉', tip: 'GMV / ROI / 流量整体异常' },
  { key: 'assortment', label: '货盘问题', emoji: '📦', tip: '库存 / 结构 / 毛利' },
  { key: 'content', label: '内容跑不动', emoji: '🎬', tip: '视频 / 直播 / 达人' },
  { key: 'empowerment', label: '投流不好使', emoji: '💸', tip: 'GMV Max / Promote' },
]

/** B 路径：每个域下的具体症状（第 2 步），带数据示意 */
const SYMPTOMS: Record<DomainKey, { key: string; label: string; sample?: string }[]> = {
  overall: [
    { key: 'gmvDrop', label: 'GMV 明显下滑', sample: '周环比 ≤ -10%' },
    { key: 'aovLow', label: '客单价偏低', sample: '低于品类基线 20%+' },
    { key: 'cvrDrop', label: '转化率掉头', sample: 'CVR 周环比 -15%' },
    { key: 'trafficDrop', label: '流量来源单一塌陷', sample: '搜索 / 内容 / 商城任一暴跌' },
  ],
  assortment: [
    { key: 'overstock', label: '某些 SKU 严重压货', sample: '周转 > 60 天' },
    { key: 'noStar', label: '没有真正的爆品', sample: '没有 SKU 占整体 30%+' },
    { key: 'lowMargin', label: '整体毛利率偏低', sample: '< 35%' },
    { key: 'noTesting', label: '测试品太少', sample: '占比 < 5%' },
    { key: 'gapSeason', label: '缺季节款 / 节庆款补给', sample: '档期前 6 周仍空窗' },
  ],
  content: [
    { key: 'videoDry', label: '短视频跑量低', sample: '日均播放 < 1 万' },
    { key: 'creatorSlow', label: '达人寄样转化慢', sample: '寄样到出片 > 14 天' },
    { key: 'sameFormat', label: '内容形式同质化', sample: '只有一种分型' },
    { key: 'liveWeak', label: '直播间承接差', sample: 'GMV / 场 < 行业 30%' },
    { key: 'sellerVideoLow', label: '商家自制内容缺位', sample: '占内容场 < 20%' },
  ],
  empowerment: [
    { key: 'roiLow', label: 'ROI 不及格', sample: '< 1.5' },
    { key: 'spendStuck', label: '消耗放不出去', sample: '日预算花不到 60%' },
    { key: 'planChurn', label: '计划频繁调整', sample: '每天新建 / 关停 5+' },
    { key: 'liveAdMiss', label: '直播没投流支撑', sample: 'Live GMV Max 未开' },
    { key: 'campaignPrep', label: '档期备战不到位', sample: '提前 < 2 周' },
  ],
}

/** B 路径：期望产出深度（第 3 步） */
const DEPTHS: { key: string; label: string; hint: string; emoji: string }[] = [
  { key: 'why', label: '只要诊断', hint: 'Agent 优先归因，不用急着给动作', emoji: '🔍' },
  { key: 'do', label: '直接给动作', hint: '本周可执行的 next step', emoji: '⚡' },
  { key: 'bench', label: '标杆怎么打', hint: '复盘标杆 + 差异化复制路径', emoji: '🏆' },
]

/** 把 domain → 主聚焦 Agent 的映射（用于尾部提示） */
const DOMAIN_FOCUS_HINT: Record<DomainKey, string> = {
  overall: '4 个 Agent 协同诊断',
  assortment: '主聚焦：选品货盘 + 投流',
  content: '主聚焦：内容策略 + 标杆',
  empowerment: '主聚焦：投流营销 + 内容',
}

interface Props {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}

export default function FocusBuilder({ value, onChange, disabled }: Props) {
  const [mode, setMode] = useState<Mode>('direct')
  // B 路径状态
  const [domain, setDomain] = useState<DomainKey | null>(null)
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set())
  const [depth, setDepth] = useState<string>('')
  const [extra, setExtra] = useState<string>('')

  // B 路径：合成 focusNote
  const guidedNote = useMemo(() => {
    if (!domain) return ''
    const parts: string[] = []
    const domainLabel = DOMAINS.find((d) => d.key === domain)?.label
    if (domainLabel) parts.push(`聚焦：${domainLabel}`)
    if (symptoms.size > 0) {
      const list = SYMPTOMS[domain]
        .filter((s) => symptoms.has(s.key))
        .map((s) => (s.sample ? `${s.label}（${s.sample}）` : s.label))
      if (list.length) parts.push(`症状：${list.join('、')}`)
    }
    if (depth) {
      const d = DEPTHS.find((x) => x.key === depth)
      if (d) parts.push(`产出方式：${d.label}（${d.hint}）`)
    }
    if (extra.trim()) parts.push(`补充：${extra.trim()}`)
    return parts.join('；').slice(0, 300)
  }, [domain, symptoms, depth, extra])

  useEffect(() => {
    if (mode === 'guided') onChange(guidedNote)
  }, [mode, guidedNote, onChange])

  function toggleSymptom(k: string) {
    if (disabled) return
    setSymptoms((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function pickDomain(d: DomainKey) {
    if (disabled) return
    if (domain !== d) {
      // 切域时清空已选症状（症状跟域强绑定）
      setSymptoms(new Set())
    }
    setDomain(d)
  }

  return (
    <div>
      {/* 标题 + 模式切换 */}
      <div className="flex items-center justify-between px-2 mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-widest">
          本周重点 · 可选
        </span>
        <div className="flex bg-gray-100 rounded-md p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('direct')}
            disabled={disabled}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === 'direct'
                ? 'bg-white shadow text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            } disabled:opacity-50`}
          >
            明确需求
          </button>
          <button
            type="button"
            onClick={() => setMode('guided')}
            disabled={disabled}
            className={`px-2 py-0.5 rounded transition-colors ${
              mode === 'guided'
                ? 'bg-white shadow text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            } disabled:opacity-50`}
          >
            引导诊断
          </button>
        </div>
      </div>

      {mode === 'direct' ? (
        <DirectPanel value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <GuidedPanel
          domain={domain}
          symptoms={symptoms}
          depth={depth}
          extra={extra}
          onPickDomain={pickDomain}
          onToggleSymptom={toggleSymptom}
          onPickDepth={setDepth}
          onChangeExtra={setExtra}
          composed={guidedNote}
          disabled={disabled}
        />
      )}
    </div>
  )
}

/** A · 明确需求：textarea + 按场景分组的短语 chip */
function DirectPanel({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (s: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 300))}
        disabled={disabled}
        placeholder="例：库存压力大，重点处理积压的彩色款"
        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
        rows={3}
      />
      <p className="text-[10px] text-gray-400 mt-1.5 px-1">
        {value.length}/300 · 会注入到所有 Agent 的 prompt
      </p>

      <div className="mt-2 space-y-1">
        {DIRECT_GROUPS.map((g) => (
          <div key={g.title}>
            <p
              style={{ fontSize: '10px', lineHeight: 1.2 }}
              className="text-gray-400 px-1 mb-0.5"
            >
              {g.title}
            </p>
            <div className="flex flex-wrap gap-1">
              {g.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    const merged = value
                      ? `${value}${value.endsWith('；') ? '' : '；'}${chip}`
                      : chip
                    onChange(merged.slice(0, 300))
                  }}
                  style={{ fontSize: '10px', lineHeight: 1.3 }}
                  className="px-1.5 py-0.5 border border-dashed border-gray-300 text-gray-500 rounded hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** B · 引导诊断：4 步漏斗 */
function GuidedPanel({
  domain,
  symptoms,
  depth,
  extra,
  onPickDomain,
  onToggleSymptom,
  onPickDepth,
  onChangeExtra,
  composed,
  disabled,
}: {
  domain: DomainKey | null
  symptoms: Set<string>
  depth: string
  extra: string
  onPickDomain: (k: DomainKey) => void
  onToggleSymptom: (k: string) => void
  onPickDepth: (k: string) => void
  onChangeExtra: (s: string) => void
  composed: string
  disabled?: boolean
}) {
  const symptomList = domain ? SYMPTOMS[domain] : []

  return (
    <div className="space-y-3">
      {/* Step 1：问题域 */}
      <Step n={1} title="问题最像出在哪？" subtitle="单选 · 选了之后下一步会出现具体症状">
        <div className="grid grid-cols-2 gap-1.5">
          {DOMAINS.map((d) => {
            const active = domain === d.key
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onPickDomain(d.key)}
                disabled={disabled}
                className={`text-left rounded-lg px-2.5 py-2 border transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-blue-50 border-blue-300 text-blue-900'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/40 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[12px] font-medium">
                  <span>{d.emoji}</span>
                  <span>{d.label}</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">{d.tip}</div>
              </button>
            )
          })}
        </div>
      </Step>

      {/* Step 2：症状 */}
      {domain && (
        <Step
          n={2}
          title={`勾选具体症状`}
          subtitle="多选 · 数据括号里是判断阈值，仅做参考"
        >
          <div className="space-y-1">
            {symptomList.map((s) => {
              const active = symptoms.has(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onToggleSymptom(s.key)}
                  disabled={disabled}
                  className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-rose-50 border-rose-200'
                      : 'border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`mt-0.5 w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center text-[8px] ${
                      active
                        ? 'bg-rose-500 border-rose-500 text-white'
                        : 'border-gray-300 text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <div className="min-w-0">
                    <p className={`text-[12px] leading-tight ${active ? 'text-rose-700' : 'text-gray-700'}`}>
                      {s.label}
                    </p>
                    {s.sample && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.sample}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Step>
      )}

      {/* Step 3：期望产出深度 */}
      {domain && (
        <Step n={3} title="希望 Agent 怎么回答？" subtitle="单选 · 决定 Agent 重心">
          <div className="grid grid-cols-3 gap-1.5">
            {DEPTHS.map((d) => {
              const active = depth === d.key
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onPickDepth(d.key)}
                  disabled={disabled}
                  title={d.hint}
                  className={`text-left rounded-md px-2 py-1.5 border transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-800">
                    <span>{d.emoji}</span>
                    <span>{d.label}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                    {d.hint}
                  </div>
                </button>
              )
            })}
          </div>
        </Step>
      )}

      {/* Step 4：补充 */}
      {domain && (
        <Step n={4} title="还有想强调的？" subtitle="可选">
          <textarea
            value={extra}
            onChange={(e) => onChangeExtra(e.target.value.slice(0, 150))}
            disabled={disabled}
            placeholder="例：上周刚换了主图、本周刚和某达人续约……"
            className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-50"
            rows={2}
          />
          <p className="text-[10px] text-gray-400 mt-0.5 px-1">
            {extra.length}/150
          </p>
        </Step>
      )}

      {/* 合成预览 */}
      {composed && domain && (
        <div className="rounded-md bg-blue-50/70 border border-blue-100 px-2.5 py-2 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-blue-500 font-medium">注入到 Agent prompt</p>
            <p className="text-[10px] text-blue-500">{DOMAIN_FOCUS_HINT[domain]}</p>
          </div>
          <p className="text-[11px] text-blue-900 leading-snug">{composed}</p>
        </div>
      )}
    </div>
  )
}

function Step({
  n,
  title,
  subtitle,
  children,
}: {
  n: number
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-1.5 px-1 mb-1.5">
        <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[10px] flex items-center justify-center flex-shrink-0 self-center">
          {n}
        </span>
        <span className="text-[12px] font-medium text-gray-700">{title}</span>
        {subtitle && <span className="text-[10px] text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  )
}
