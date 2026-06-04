'use client'
import { useState } from 'react'
import { FullReport, MerchantData } from '@/types'
import { mockMerchants } from '@/lib/mockData/merchants'
import EvidenceChips from './EvidenceChips'
import Collapsible from './Collapsible'
import Tooltip from './Tooltip'

interface Props {
  report: FullReport
}

const LIFECYCLE_LABELS: Record<string, { label: string; style: string }> = {
  new: { label: '新品 ✨', style: 'bg-blue-50 text-blue-700' },
  potential: { label: '潜力品 ↗', style: 'bg-emerald-50 text-emerald-700' },
  hit: { label: '爆品 🔥', style: 'bg-orange-50 text-orange-700' },
  declining: { label: '衰退品 ↘', style: 'bg-gray-100 text-gray-600' },
}

const HOOK_TYPE_STYLE: Record<string, string> = {
  痛点型: 'bg-rose-50 text-rose-700',
  悬念反转型: 'bg-purple-50 text-purple-700',
  数字冲击型: 'bg-sky-50 text-sky-700',
  场景代入型: 'bg-emerald-50 text-emerald-700',
  价值承诺型: 'bg-amber-50 text-amber-700',
}

/** 白皮书"商家好内容五大分型"——所有 type 必须落到这 5 类 */
export const FORMAT_TYPES = [
  '卖点讲解型',
  '生活场景型',
  '买家·卖家实测型',
  '测评对比·情景演绎型',
  '开箱直拍型',
] as const

const FORMAT_STYLE: Record<string, { chip: string; dot: string }> = {
  卖点讲解型: { chip: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  生活场景型: { chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
  '买家·卖家实测型': { chip: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-400' },
  '测评对比·情景演绎型': { chip: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  开箱直拍型: { chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' },
}

/** 把 LLM 可能输出的英文/旧风格 type 归一到白皮书五大分型 */
export function normalizeFormatType(t?: string): string {
  if (!t) return '卖点讲解型'
  // 已经是五大分型之一
  if ((FORMAT_TYPES as readonly string[]).includes(t)) return t
  const s = t.toLowerCase()
  if (/honest review|review|实测/.test(s) || s.includes('买家') || s.includes('卖家'))
    return '买家·卖家实测型'
  if (/dupe|spec|vs |对比|测评|演绎|情景/.test(s)) return '测评对比·情景演绎型'
  if (/unbox|开箱|asmr/.test(s)) return '开箱直拍型'
  if (/vlog|travel|场景|生活|lifestyle/.test(s)) return '生活场景型'
  if (/problem|solution|讲解|卖点|功能/.test(s)) return '卖点讲解型'
  return '卖点讲解型'
}

/**
 * 选品货品颜色规则（统一语义，5 类）：
 *   🟢 evergreen  常青品 → emerald（绿，稳定基本盘）
 *   🟡 seasonal   季节品 → amber  （黄，时段性）
 *   🟡 festival   节庆品 → amber  （归并到 seasonal 同色系，避免与 risk 抢红色）
 *   🔵 testing    测试品 → blue   （蓝，待验证）
 *   🔴 declining  风险品 → rose   （红，要处理）
 *   ⭐ star       明星品 → purple + ⭐（视觉最重，单独成型）
 *
 * urgency 用左侧小圆点表示，不再争抢主色。
 */
type ProductTypeKey = 'evergreen' | 'seasonal' | 'festival' | 'testing' | 'declining' | 'star'

const PRODUCT_TYPE_META: Record<
  ProductTypeKey,
  { label: string; chip: string; icon?: string }
> = {
  evergreen: { label: '常青品', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  seasonal: { label: '季节品', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  festival: { label: '节庆品', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  testing: { label: '测试品', chip: 'bg-blue-50 text-blue-700 border-blue-200' },
  declining: { label: '风险品', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
  star: { label: '明星品', chip: 'bg-purple-50 text-purple-700 border-purple-200', icon: '⭐' },
}

const VALID_PRODUCT_TYPES: ProductTypeKey[] = [
  'evergreen',
  'seasonal',
  'festival',
  'testing',
  'declining',
  'star',
]

const URGENCY_DOT: Record<'high' | 'medium' | 'low', { dot: string; label: string }> = {
  high: { dot: 'bg-red-500', label: '高' },
  medium: { dot: 'bg-amber-400', label: '中' },
  low: { dot: 'bg-gray-300', label: '低' },
}

/**
 * 板块底部统一来源条 —— 所有板块（Assortment / Content / Empowerment / Benchmark）
 * 的「来源」小标统一放到板块的左下角，保持产品一致性。
 */
function SectionFooter({ evidence }: { evidence?: import('@/types').Evidence[] }) {
  if (!evidence || evidence.length === 0) return null
  return (
    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center">
      <EvidenceChips evidence={evidence} compact />
    </div>
  )
}

/**
 * 顶部诊断头（精简版）：
 *   - 商家名 + 周 + 健康分
 *   - 一段阶段总结
 *   - 一行 inline caption：本周最弱维度 + 一句判断依据
 *
 * 四维健康度卡 / 本周必做 3 件事 / 完整判断依据 已下沉到右栏 AlertPanel
 * 与飞书群预览（LarkPreview）；顶部不再重复，避免信息过载。
 */
function DiagnoseHeader({
  report,
  score,
  scoreColor,
}: {
  report: FullReport
  score: number
  scoreColor: string
}) {
  const merchant = mockMerchants.find((m) => m.id === report.merchantId) as
    | MerchantData
    | undefined
  const wd = merchant?.weeklyData
  const inv = report.assortment?.inventoryAnalysis

  /** 与 LarkPreview 同口径的四维评分，仅用于推算「最弱维度」 */
  const weakest = (() => {
    if (!wd) return null
    const totalSku = inv?.totalSkus ?? merchant?.skuList.length ?? 0
    const starCount = inv?.starSkus.length ?? 0
    const starRatio = totalSku > 0 ? starCount / totalSku : 0
    const structureBonus = inv?.structureHealth.isHealthy ? 20 : 0
    const assortmentScore = Math.round(Math.min(100, 50 + starRatio * 200 + structureBonus))
    const creatorRatio = wd.totalGMV > 0 ? wd.creatorContentGMV / wd.totalGMV : 0
    const videoBonus = Math.min(20, (wd.videoCount / 10) * 20)
    const contentScore = Math.round(Math.min(100, 40 + creatorRatio * 80 + videoBonus))
    const roiScore = Math.round(Math.min(100, Math.max(0, (wd.adROI / 2.0) * 80 + 10)))
    const cvrScore = Math.round(Math.min(100, Math.max(0, (wd.conversionRate / 2.0) * 80 + 10)))
    const dims = [
      { label: '货盘结构', score: assortmentScore },
      { label: '内容生产', score: contentScore },
      { label: '投流效率', score: roiScore },
      { label: '成交转化', score: cvrScore },
    ]
    return dims.reduce((a, b) => (a.score < b.score ? a : b))
  })()

  function dimColor(s: number) {
    return s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-500' : 'text-rose-500'
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{report.merchantName}</h2>
          <p className="text-sm text-gray-500">
            {report.week} 经营诊断报告 · {report.generatedAt}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-xs text-gray-400">健康评分 / 100</p>
        </div>
      </div>

      {report.diagnose?.stageSummary && (
        <p className="text-sm text-gray-700 leading-relaxed">
          {report.diagnose.stageSummary}
        </p>
      )}

      {weakest && (
        <p className="text-[11px] text-gray-500 mt-2">
          本周最弱：
          <span className={`font-medium ${dimColor(weakest.score)}`}>
            {weakest.label}（{weakest.score}）
          </span>
          <span className="text-gray-400 ml-1">→ 主攻方向。完整四维拆解与本周必做项见右栏。</span>
        </p>
      )}
    </div>
  )
}

export default function ReportCard({ report }: Props) {
  const score = report.diagnose?.healthScore ?? 0
  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-500'

  const products = report.assortment?.recommendedProducts ?? []
  const opportunities = report.assortment?.upcomingOpportunities ?? []
  const inventoryWarnings = report.assortment?.inventoryWarnings ?? []
  // 明星品 SKU 名称集合 —— 用于在选品列表中将命中的 SKU 显示为 ⭐ star 类型
  const starSkuNames = new Set(
    (report.assortment?.inventoryAnalysis?.starSkus ?? []).map((s) => s.name),
  )
  const formats = report.content?.recommendedFormats ?? []
  const angles = report.content?.topicAngles ?? []
  const actionableSteps = report.benchmark?.actionableSteps ?? []
  const matchDimensions = report.benchmark?.matchDimensions ?? []
  const matchSummary = report.benchmark?.matchSummary

  return (
    <div className="space-y-3">
      {/* 顶部：商家 + 健康分 + 四维拆解 + 本周优先级（不折叠） */}
      <DiagnoseHeader report={report} score={score} scoreColor={scoreColor} />

      {/* A · 选品（默认展开） */}
      <Collapsible
        title="Assortment · 选品货盘"
        accent="bg-teal-500"
        defaultOpen
        badge={
          products.length > 0 ? (
            <span className="text-xs text-gray-400 font-normal">
              {products.length} 条建议 · {inventoryWarnings.length} 条预警
            </span>
          ) : null
        }
      >
        <div className="space-y-1.5 mt-2">
          {products.filter((p) => p && p.name).map((p, i) => {
            const urgencyKey =
              p.urgency && ['high', 'medium', 'low'].includes(p.urgency)
                ? (p.urgency as keyof typeof URGENCY_DOT)
                : 'low'
            // 优先级：明星品命中 > LLM 给的 type > 默认常青
            const isStar = starSkuNames.has(p.name)
            const typeKey: ProductTypeKey = isStar
              ? 'star'
              : p.type && (VALID_PRODUCT_TYPES as string[]).includes(p.type)
                ? (p.type as ProductTypeKey)
                : 'evergreen'
            const tMeta = PRODUCT_TYPE_META[typeKey]
            const uMeta = URGENCY_DOT[urgencyKey]
            return (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${uMeta.dot}`}
                  title={`紧急度：${uMeta.label}`}
                />
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded border font-medium mt-0.5 whitespace-nowrap ${tMeta.chip}`}
                >
                  {tMeta.icon ? `${tMeta.icon} ` : ''}{tMeta.label}
                </span>
                <div className="min-w-0 flex-1">
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
        <SectionFooter evidence={report.assortment?.evidence} />
      </Collapsible>

      {/* B · 内容（默认展开，AM 主战场） */}
      <Collapsible
        title={
          <span className="inline-flex items-baseline gap-2">
            Content · 内容策略
            <span className="text-xs font-normal text-gray-400">（聚焦短视频）</span>
          </span>
        }
        accent="bg-blue-500"
        defaultOpen
        badge={
          formats.length + angles.length > 0 ? (
            <span className="text-xs text-gray-400 font-normal">
              {formats.length} 种形式 · {angles.reduce((n, a) => n + (a.topics?.length ?? 0), 0)} 条选题
            </span>
          ) : null
        }
      >
        <ContentSectionBody report={report} />
      </Collapsible>

      {/* C · 投流（默认展开） */}
      <Collapsible
        title="Empowerment · 投流营销"
        accent="bg-amber-500"
        defaultOpen
        badge={
          report.empowerment?.campaignNode ? (
            <span className="text-xs text-amber-700 font-normal bg-amber-50 px-1.5 py-0.5 rounded">
              🎯 {report.empowerment.campaignNode.campaignName}
            </span>
          ) : null
        }
      >
        <EmpowermentSectionBody report={report} />
      </Collapsible>

      {/* E · 标杆（默认展开） */}
      <Collapsible
        title="Benchmark · 标杆学习"
        accent="bg-purple-500"
        defaultOpen
        badge={
          report.benchmark?.matchedCase?.name ? (
            <span className="text-xs text-purple-700 font-normal">
              对标：{report.benchmark.matchedCase.name}
            </span>
          ) : null
        }
      >
        {report.benchmark?.matchedCase && (
          <div className="bg-purple-50 rounded-lg p-3 mb-3 mt-2">
            <p className="text-xs text-purple-500 mb-0.5">匹配标杆</p>
            <p className="text-sm font-medium text-purple-900">
              {report.benchmark.matchedCase.name}
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              {report.benchmark.matchedCase.breakthrough}
            </p>
          </div>
        )}
        {matchDimensions.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <p className="text-xs text-gray-500 font-medium">对标匹配（4 维评分）</p>
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
              <p className="text-xs text-purple-600 mt-1">{matchSummary}</p>
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
        <SectionFooter evidence={report.benchmark?.evidence} />
      </Collapsible>
    </div>
  )
}

/**
 * Empowerment（投流营销）板块 —— 案例分析复盘风格 dashboard：
 *   1. 顶部 highlight banner（amber gradient）：策略标题 + inline KPI + 编号要点
 *   2. 6 指标条带：消耗 / ROI / GMV / 转化率 / 视频数 / 周环比（前 4 项带 7 天 sparkline）
 *   3. 营销节点 + 预算分配（含周建议）：左右分栏，2:3 比例，同一行
 */
function EmpowermentSectionBody({ report }: { report: FullReport }) {
  const emp = report.empowerment
  const merchant = mockMerchants.find((m) => m.id === report.merchantId) as
    | MerchantData
    | undefined
  const wd = merchant?.weeklyData
  const breakdown = (emp?.budgetBreakdown ?? []).filter(
    (b) => b && b.tool && b.share > 0
  )
  // share 归一化（防 LLM 输出加和不为 100）
  const shareSum = breakdown.reduce((s, b) => s + (b.share || 0), 0) || 1
  const totalDaily = breakdown.reduce((s, b) => s + (b.dailyUsd || 0), 0)

  // 把 LLM 那段策略文本拆解成「标题 / 正文 / 编号要点」结构
  const strategyParsed = parseStrategy(emp?.adStrategy)

  // 7 天迷你趋势：基于本周 adSpend / adROI / 转化率，合成确定性的 7 天点（用 daily 缓动）
  // 真实历史不可用时用本周值反推单调微调，保证视觉合理。
  const trendDays = wd
    ? buildSyntheticTrend({
        adSpend: wd.adSpend,
        adROI: wd.adROI,
        conversionRate: wd.conversionRate,
        wow: wd.weekOverWeekChange,
      })
    : null

  return (
    <div className="mt-2 space-y-3">
      {/* 1. 顶部 banner —— 结构化：标题 + inline KPIs + numbered bullets */}
      {emp?.adStrategy && (
        <div className="rounded-lg bg-gradient-to-r from-amber-50 via-amber-50/80 to-orange-50 border border-amber-200/70 px-3 py-2.5">
          {/* 大标题（headline，红色突出） */}
          {strategyParsed.headline && (
            <p className="text-[13px] font-semibold text-rose-700 leading-snug">
              {strategyParsed.headline}
            </p>
          )}
          {/* inline KPIs —— 顶部 banner 下的 4-5 个内嵌指标 */}
          {wd && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-amber-900/90">
              <span>
                现金消耗 <span className="font-semibold tabular-nums">${wd.adSpend.toLocaleString()}</span>
                <span className={wd.weekOverWeekChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {' '}({wd.weekOverWeekChange >= 0 ? '↑' : '↓'} {Math.abs(wd.weekOverWeekChange)}%)
                </span>
              </span>
              <span className="text-amber-300">·</span>
              <span>
                ROI{' '}
                <span className="font-semibold tabular-nums">
                  {wd.adROI.toFixed(2)}
                </span>
                <span className="text-gray-500">
                  （健康线 2.0；
                  {wd.adROI >= 2
                    ? '已达标'
                    : wd.adROI >= 1.5
                    ? '偏低'
                    : '不达标'}
                  ）
                </span>
              </span>
              <span className="text-amber-300">·</span>
              <span>
                转化率 <span className="font-semibold tabular-nums">{(wd.conversionRate * 100).toFixed(1)}%</span>
              </span>
              {totalDaily > 0 && (
                <>
                  <span className="text-amber-300">·</span>
                  <span>
                    建议日预算 <span className="font-semibold tabular-nums">${totalDaily.toLocaleString()}</span>
                  </span>
                </>
              )}
            </div>
          )}
          {/* 正文（非编号部分） */}
          {strategyParsed.body && (
            <p className="text-[11px] text-gray-700 leading-relaxed mt-2">
              {strategyParsed.body}
            </p>
          )}
          {/* 编号要点 */}
          {strategyParsed.bullets.length > 0 && (
            <ol className="mt-2 space-y-1">
              {strategyParsed.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-800 leading-snug">
                  <span className="flex-shrink-0 mt-px w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>
                    {b.title && <span className="font-medium">{b.title}</span>}
                    {b.title && b.detail && <span className="text-amber-700"> — </span>}
                    {b.detail && <span>{b.detail}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* 2. 六指标条带 + 趋势图 */}
      {wd && (
        <div className="grid grid-cols-6 gap-0 rounded-md border border-gray-100 overflow-hidden bg-white">
          <KpiCell
            label="现金消耗"
            value={`$${wd.adSpend.toLocaleString()}`}
            delta={wd.weekOverWeekChange}
            spark={trendDays?.spend}
            sparkColor="#ef4444"
          />
          <KpiCell
            label="ROI"
            value={wd.adROI.toFixed(2)}
            tone={wd.adROI >= 2 ? 'good' : wd.adROI >= 1.5 ? 'warn' : 'bad'}
            sub={
              wd.adROI >= 2 ? '复利期' : wd.adROI >= 1.5 ? '亚健康' : '需调优'
            }
            spark={trendDays?.roi}
            sparkColor="#f59e0b"
          />
          <KpiCell
            label="本周 GMV"
            value={`$${wd.totalGMV.toLocaleString()}`}
            delta={wd.weekOverWeekChange}
            spark={trendDays?.gmv}
            sparkColor="#10b981"
          />
          <KpiCell
            label="转化率"
            value={`${(wd.conversionRate * 100).toFixed(2)}%`}
            spark={trendDays?.cvr}
            sparkColor="#8b5cf6"
          />
          <KpiCell
            label="视频数"
            value={`${wd.videoCount} 条`}
            sub={wd.videoCount >= 10 ? '矩阵齐全' : '需扩量'}
            tone={wd.videoCount >= 10 ? 'good' : 'warn'}
          />
          <KpiCell
            label="周环比"
            value={`${wd.weekOverWeekChange > 0 ? '+' : ''}${wd.weekOverWeekChange}%`}
            tone={wd.weekOverWeekChange >= 0 ? 'good' : wd.weekOverWeekChange >= -10 ? 'warn' : 'bad'}
            sub={wd.weekOverWeekChange >= 0 ? '持续增长' : '环比下滑'}
          />
        </div>
      )}

      {/* 3. 年中大促 + 预算分配（左右分栏 · 同一行）。无营销节点时预算独占整行。 */}
      {(emp?.campaignNode || breakdown.length > 0) && (
        <div
          className={`grid gap-2 ${
            emp?.campaignNode && breakdown.length > 0
              ? 'grid-cols-5'
              : 'grid-cols-1'
          }`}
        >
          {emp?.campaignNode && (
            <div className={breakdown.length > 0 ? 'col-span-2' : ''}>
              <CampaignBlock
                node={emp.campaignNode}
                wd={wd}
                dailyBudget={totalDaily || undefined}
              />
            </div>
          )}
          {breakdown.length > 0 && (
            <div
              className={`rounded-md border border-gray-100 p-2.5 bg-white ${
                emp?.campaignNode ? 'col-span-3' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium text-gray-700">
                  预算分配 · 4 工具
                </p>
                <p className="text-[10px] text-gray-400">
                  合计{' '}
                  <span className="font-semibold text-gray-700 tabular-nums">
                    ${totalDaily.toLocaleString()}
                  </span>{' '}
                  / 天
                </p>
              </div>
              {/* stacked bar */}
              <div className="flex h-4 rounded-sm overflow-hidden border border-gray-100 bg-gray-50 mb-2">
                {breakdown.map((b) => {
                  const meta = AD_TOOL_META[b.tool] ?? AD_TOOL_META['GMV Max']
                  const pct = ((b.share || 0) / shareSum) * 100
                  if (pct <= 0) return null
                  return (
                    <div
                      key={b.tool}
                      className={`${meta.bar} flex items-center justify-center text-[10px] font-medium text-white/95`}
                      style={{ width: `${pct}%` }}
                      title={`${b.tool} · ${Math.round(pct)}% · $${b.dailyUsd}/天`}
                    >
                      {pct >= 14 ? `${Math.round(pct)}%` : ''}
                    </div>
                  )
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {breakdown.map((b) => {
                  const meta = AD_TOOL_META[b.tool] ?? AD_TOOL_META['GMV Max']
                  return (
                    <div
                      key={b.tool}
                      className={`rounded-md border ${meta.card} px-2 py-1.5`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-medium ${meta.text}`}>
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${meta.bar} mr-1.5 align-middle`}
                          />
                          {b.tool}
                        </span>
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          {Math.round(((b.share || 0) / shareSum) * 100)}%
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-[13px] font-semibold text-gray-800 tabular-nums">
                          ${b.dailyUsd?.toLocaleString() ?? 0}
                        </span>
                        <span className="text-[9px] text-gray-400">/天</span>
                        {typeof b.targetRoi === 'number' && (
                          <span className="ml-auto text-[10px] text-gray-500">
                            目标 ROI {b.targetRoi}
                          </span>
                        )}
                      </div>
                      {b.purpose && (
                        <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">
                          {b.purpose}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* 周预算建议合并到预算卡底部 */}
              {emp?.weeklyBudgetSuggestion && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-0.5">周预算建议</p>
                  <p className="text-[11px] text-gray-700 leading-relaxed">
                    {emp.weeklyBudgetSuggestion}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 板块底部统一来源 */}
      <SectionFooter evidence={emp?.evidence} />
    </div>
  )
}

/** 6 指标条带的单元格：大数字 + 标签 + 可选 sub / delta 着色 + 可选 7 天迷你趋势线 */
function KpiCell({
  label,
  value,
  sub,
  delta,
  tone,
  spark,
  sparkColor = '#9ca3af',
}: {
  label: string
  value: string
  sub?: string
  delta?: number
  tone?: 'good' | 'warn' | 'bad'
  spark?: number[]
  sparkColor?: string
}) {
  const toneCls =
    tone === 'good'
      ? 'text-emerald-700'
      : tone === 'warn'
      ? 'text-amber-700'
      : tone === 'bad'
      ? 'text-rose-700'
      : 'text-gray-900'
  const deltaCls =
    typeof delta === 'number'
      ? delta >= 0
        ? 'text-emerald-600'
        : 'text-rose-600'
      : ''
  const subCls =
    tone === 'good'
      ? 'text-emerald-600'
      : tone === 'warn'
      ? 'text-amber-600'
      : tone === 'bad'
      ? 'text-rose-600'
      : 'text-gray-400'
  return (
    <div className="px-2 py-1.5 border-r border-gray-100 last:border-r-0 text-center flex flex-col items-center">
      <p className="text-[10px] text-gray-400 mb-0.5 leading-none">{label}</p>
      <p className={`text-[14px] font-semibold tabular-nums leading-tight ${toneCls}`}>
        {value}
      </p>
      {typeof delta === 'number' ? (
        <p className={`text-[9px] ${deltaCls} leading-none mt-0.5`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </p>
      ) : sub ? (
        <p className={`text-[9px] ${subCls} leading-none mt-0.5`}>{sub}</p>
      ) : null}
      {spark && spark.length >= 2 && (
        <Sparkline values={spark} color={sparkColor} />
      )}
    </div>
  )
}

/** 极简 7 点 sparkline —— inline SVG，宽自适应、固定高 14 */
function Sparkline({
  values,
  color = '#9ca3af',
  width = 60,
  height = 14,
}: {
  values: number[]
  color?: string
  width?: number
  height?: number
}) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - min) / span) * (height - 2) - 1
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  // 末点圆点
  const lastX = (values.length - 1) * stepX
  const lastY = height - ((values[values.length - 1] - min) / span) * (height - 2) - 1
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="mt-1"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="1.6" fill={color} />
    </svg>
  )
}

/**
 * 把 LLM 输出的 adStrategy 文本拆解：
 *   - headline: 第一段（截到第一个句号/感叹号/问号或 "建议:" 前），用作大标题
 *   - bullets: 1) 2) 3) ... 这种编号要点
 *   - body: 介于标题和编号要点之间的过渡说明（可空）
 */
function parseStrategy(raw?: string): {
  headline: string
  body: string
  bullets: { title: string; detail: string }[]
} {
  if (!raw) return { headline: '', body: '', bullets: [] }
  const text = raw.trim()
  const bullets: { title: string; detail: string }[] = []
  // 提取编号要点（中英括号 + 阿拉伯数字 + ）/. 都接受）
  const splitRe = /(?:^|[\s，。；])(\d{1,2})[）)]\s*/g
  const matches: { idx: number; pos: number }[] = []
  let m: RegExpExecArray | null
  while ((m = splitRe.exec(text))) {
    matches.push({ idx: parseInt(m[1], 10), pos: m.index + m[0].length })
  }
  let beforeBullets = text
  if (matches.length >= 2) {
    // 取第一个编号位置的开头作为切点（往前回退 1 个字符的标点）
    const firstStart = matches[0].pos - matches[0].pos // 占位
    void firstStart
    const segs: string[] = []
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].pos
      const end = i + 1 < matches.length ? matches[i + 1].pos - String(matches[i + 1].idx).length - 2 : text.length
      segs.push(text.slice(start, end).trim().replace(/[，。；]+$/, ''))
    }
    segs.forEach((s) => {
      // s 形如 "暂停ROI低于1.5的广告组，将预算集中..."；取 "—"/"："/前 14 字 作为 title
      const dashSplit = s.split(/[—：:\-]+\s*/)
      if (dashSplit.length >= 2 && dashSplit[0].length <= 16) {
        bullets.push({ title: dashSplit[0].trim(), detail: dashSplit.slice(1).join('').trim() })
      } else {
        const cut = s.length > 16 ? s.slice(0, 14) + '…' : s
        bullets.push({ title: cut, detail: s })
      }
    })
    beforeBullets = text.slice(0, text.indexOf(`${matches[0].idx}）`) >= 0 ? text.indexOf(`${matches[0].idx}）`) : text.indexOf(`${matches[0].idx})`))
  }
  // 拆 headline / body
  const cleaned = beforeBullets
    .trim()
    .replace(/[，。；]+$/, '')
    .replace(/^建议[：:]/, '')
  // 头部到第一个 "。" 作为 headline
  const dot = cleaned.search(/[。！？]/)
  let headline = ''
  let body = ''
  if (dot > 0 && dot < cleaned.length - 1) {
    headline = cleaned.slice(0, dot).trim()
    body = cleaned
      .slice(dot + 1)
      .trim()
      .replace(/^建议[：:]/, '')
  } else {
    headline = cleaned.length > 80 ? cleaned.slice(0, 78) + '…' : cleaned
  }
  return { headline, body, bullets }
}

/**
 * 用本周值合成 7 天确定性趋势（无真实历史时的视觉占位）。
 *
 * 设计原则：
 *   - GMV 跟 wow 同向（这是 wow 的语义）
 *   - spend 跟随 wow 但幅度更小（运营往往不会同比例砍/加预算）
 *   - ROI 与 GMV 弱解耦——GMV 涨不代表 ROI 一定涨；用 ROI 健康度（基线 2.0）做小幅趋势
 *   - CVR 同理用基线（2%）反推趋势，幅度小
 *   - 每条线带各自确定性 noise（seed 不同），不会"齐刷刷"同方向
 *
 * "本周值"为 D7（终点），D1 = end / (1 + change)；change 即周环比，正为上涨。
 */
function buildSyntheticTrend({
  adSpend,
  adROI,
  conversionRate,
  wow,
}: {
  adSpend: number
  adROI: number
  conversionRate: number
  wow: number
}): { spend: number[]; roi: number[]; gmv: number[]; cvr: number[] } {
  // 把 wow 限制在合理范围（防极端值把曲线拉爆）
  const safeWow = Math.max(-50, Math.min(50, wow))
  // 单条线的合成函数：endValue 是本周值，change 是该指标自己的周变化%（正=上涨）
  const series = (end: number, change: number, seed = 1, jitter = 0.04) => {
    const safe = Math.max(-50, Math.min(50, change))
    const start = end / (1 + safe / 100)
    return Array.from({ length: 7 }, (_, i) => {
      const t = i / 6
      const eased = start + (end - start) * (t * t * (3 - 2 * t)) // smoothstep
      // 每条线用不同 seed 的确定性 noise，避免视觉上"齐刷刷"
      const noise = ((i * 9301 + seed * 49297 + 7919) % 233280) / 233280
      return eased * (1 + (noise - 0.5) * jitter * 2)
    })
  }
  // 各指标的 change 推导：
  const spend = series(adSpend, safeWow * 0.5, 1) // spend 跟随但幅度减半
  const gmv = series(adROI * adSpend, safeWow, 2) // GMV 直接跟随 wow
  // ROI 趋势：当前 ROI 高于 2.0 视为微涨，低于 1.5 视为微跌
  const roiChange = adROI >= 2 ? 4 : adROI >= 1.5 ? 0 : -3
  const roi = series(adROI, roiChange, 3, 0.05)
  // CVR 趋势：以 2% 为健康线，每偏离 1% 给 ±2 的趋势
  const cvrPct = conversionRate * 100
  const cvrChange = cvrPct >= 2 ? 1.5 : cvrPct >= 1 ? -1 : -3
  const cvr = series(conversionRate, cvrChange, 4, 0.06)
  return { spend, roi, gmv, cvr }
}

const AD_TOOL_META: Record<
  'GMV Max' | 'Promote' | 'Spark Ads' | 'Live GMV Max',
  { bar: string; card: string; text: string }
> = {
  'GMV Max': {
    bar: 'bg-amber-500',
    card: 'border-amber-200 bg-amber-50/60',
    text: 'text-amber-800',
  },
  'Promote': {
    bar: 'bg-blue-400',
    card: 'border-blue-200 bg-blue-50/60',
    text: 'text-blue-800',
  },
  'Spark Ads': {
    bar: 'bg-purple-400',
    card: 'border-purple-200 bg-purple-50/60',
    text: 'text-purple-800',
  },
  'Live GMV Max': {
    bar: 'bg-rose-400',
    card: 'border-rose-200 bg-rose-50/60',
    text: 'text-rose-800',
  },
}

/**
 * CampaignBlock：营销节点卡。包含
 *  · 标题 + 阶段 chip + 倒计时数字
 *  · 时间轴：T-21 预热 / T-14 蓄水 / T-7 冲刺 / T 大促日，当前位置 ring 高亮
 *  · 本节点重点：actions（最多 3 条）
 *  · 节点目标：大促日 GMV 目标（按当前阶段给倍数）+ 目标 ROI（向健康线 2.0 收敛）
 */
function CampaignBlock({
  node,
  wd,
  dailyBudget,
}: {
  node: import('@/types').CampaignAlert
  wd?: { totalGMV: number; adROI: number; adSpend: number } | null
  dailyBudget?: number
}) {
  const urgency =
    node.daysUntil <= 7 ? 'urgent' : node.daysUntil <= 14 ? 'soon' : 'far'
  const urgencyMeta = {
    urgent: {
      bar: 'bg-rose-500',
      barLight: 'bg-rose-200',
      label: '冲刺期',
      tone: 'text-rose-700',
      bg: 'bg-rose-50 border-rose-200',
      ring: 'ring-rose-300',
    },
    soon: {
      bar: 'bg-amber-500',
      barLight: 'bg-amber-200',
      label: '预热期',
      tone: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
      ring: 'ring-amber-300',
    },
    far: {
      bar: 'bg-blue-400',
      barLight: 'bg-blue-200',
      label: '观察期',
      tone: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
      ring: 'ring-blue-300',
    },
  }[urgency]

  // 时间轴里程碑（按 daysUntil 倒推）
  const milestones = [
    { d: 21, label: 'T-21', desc: '预热' },
    { d: 14, label: 'T-14', desc: '蓄水' },
    { d: 7, label: 'T-7', desc: '冲刺' },
    { d: 0, label: '大促', desc: '爆发' },
  ]
  // "当前"位置 = daysUntil 落在哪两个里程碑之间
  const currentIdx = milestones.findIndex((m) => node.daysUntil >= m.d) // 第一个 >= 当前剩余天数的里程碑就是"刚过"
  // 已经过去的里程碑数量（用于轴线进度）
  const passedCount = milestones.filter((m) => node.daysUntil < m.d).length
  const linePct =
    milestones.length > 1
      ? ((passedCount + (currentIdx >= 0 ? 0.5 : 0)) / (milestones.length - 1)) * 100
      : 0

  // 节点目标：基于 wd 推算
  // 大促日 GMV 目标：按节点紧迫度给倍数（远 1.3x，近 1.6x，冲刺期 2.0x）
  const targetMult = urgency === 'urgent' ? 2.0 : urgency === 'soon' ? 1.6 : 1.3
  const targetGmv = wd ? wd.totalGMV * targetMult : 0
  // 目标 ROI：当前 ROI 向健康线 2.0 收敛 50%（让 AM 心里有数：要往哪个数字打）
  const targetRoi = wd ? wd.adROI + (2.0 - wd.adROI) * 0.5 : 0

  return (
    <div className={`rounded-md border ${urgencyMeta.bg} px-2.5 py-2 h-full flex flex-col`}>
      {/* 顶部：标题 + 阶段 + 倒计时 */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px]">🎯</span>
            <span className={`text-[11px] font-semibold ${urgencyMeta.tone} truncate`}>
              {node.campaignName}
            </span>
          </div>
          <span
            className={`inline-block mt-0.5 text-[9px] px-1 py-0 rounded ${urgencyMeta.tone} bg-white/60`}
          >
            {urgencyMeta.label}
          </span>
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-[18px] font-bold tabular-nums leading-none ${urgencyMeta.tone}`}>
            {node.daysUntil}
          </span>
          <p className="text-[9px] text-gray-500 leading-none mt-0.5">天后</p>
        </div>
      </div>

      {/* 时间轴：里程碑 + 当前位置 */}
      <div className="relative px-1 mb-2.5">
        {/* 底层连续线 */}
        <div className="absolute left-2 right-2 top-[7px] h-0.5 bg-white/70 rounded-full" />
        <div
          className={`absolute left-2 top-[7px] h-0.5 ${urgencyMeta.bar} rounded-full transition-all`}
          style={{ width: `calc((100% - 16px) * ${linePct} / 100)` }}
        />
        <div className="relative flex justify-between">
          {milestones.map((m) => {
            const isPast = node.daysUntil < m.d
            const isCurrent =
              !isPast &&
              (node.daysUntil <= m.d + 3 ||
                (m.d === 0 && node.daysUntil <= 3))
            const dotCls = isPast
              ? `${urgencyMeta.bar} border-white`
              : isCurrent
              ? `bg-white ${urgencyMeta.tone} border-current ring-2 ring-offset-1 ${urgencyMeta.ring}`
              : 'bg-white border-gray-300'
            return (
              <div key={m.label} className="flex flex-col items-center w-9">
                <span
                  className={`w-3 h-3 rounded-full border-2 z-10 ${dotCls}`}
                />
                <span
                  className={`mt-1 leading-tight ${
                    isCurrent
                      ? `${urgencyMeta.tone} font-semibold`
                      : isPast
                      ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}
                  style={{ fontSize: '9px' }}
                >
                  {m.label}
                </span>
                <span
                  className={`leading-tight ${
                    isCurrent ? urgencyMeta.tone : 'text-gray-400'
                  }`}
                  style={{ fontSize: '9px' }}
                >
                  {m.desc}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 本节点重点 actions */}
      {(node.actions ?? []).length > 0 && (
        <div className="mb-2">
          <p
            className="text-gray-500 mb-1 leading-tight"
            style={{ fontSize: '9px' }}
          >
            本节点重点
          </p>
          <ul className="space-y-0.5">
            {(node.actions ?? []).slice(0, 3).map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-1 text-[10px] text-gray-700 leading-snug"
              >
                <span
                  className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${urgencyMeta.bar}`}
                />
                <span className="line-clamp-2">{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 节点目标卡（pin 到底部） */}
      {wd && (
        <div className="mt-auto pt-2 border-t border-white/70">
          <p
            className="text-gray-500 mb-1 leading-tight"
            style={{ fontSize: '9px' }}
          >
            节点目标
          </p>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-white/60 rounded px-1.5 py-1">
              <p className="text-gray-500 leading-none" style={{ fontSize: '9px' }}>
                大促 GMV
              </p>
              <p className={`font-semibold tabular-nums leading-tight mt-0.5 ${urgencyMeta.tone}`}
                 style={{ fontSize: '11px' }}>
                ${(targetGmv / 1000).toFixed(1)}k
              </p>
              <p className="text-gray-400 leading-none" style={{ fontSize: '8px' }}>
                {targetMult.toFixed(1)}× 本周
              </p>
            </div>
            <div className="bg-white/60 rounded px-1.5 py-1">
              <p className="text-gray-500 leading-none" style={{ fontSize: '9px' }}>
                目标 ROI
              </p>
              <p
                className={`font-semibold tabular-nums leading-tight mt-0.5 ${urgencyMeta.tone}`}
                style={{ fontSize: '11px' }}
              >
                {targetRoi.toFixed(1)}
              </p>
              <p className="text-gray-400 leading-none" style={{ fontSize: '8px' }}>
                向 2.0 收敛
              </p>
            </div>
            <div className="bg-white/60 rounded px-1.5 py-1">
              <p className="text-gray-500 leading-none" style={{ fontSize: '9px' }}>
                建议日预算
              </p>
              <p
                className={`font-semibold tabular-nums leading-tight mt-0.5 ${urgencyMeta.tone}`}
                style={{ fontSize: '11px' }}
              >
                ${(dailyBudget ?? wd.adSpend / 7).toLocaleString()}
              </p>
              <p className="text-gray-400 leading-none" style={{ fontSize: '8px' }}>
                {dailyBudget ? '4 工具合计' : '本周日均'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Content 卡内部：诊断（永远展开）+ 矩阵（永远展开）+ 形式/选题/节奏/Brief/周计划（可折叠子项）
 * + 末尾参考视频。
 */
function ContentSectionBody({ report }: { report: FullReport }) {
  const content = report.content
  const merchant = mockMerchants.find((m) => m.id === report.merchantId) as
    | MerchantData
    | undefined
  const formats = content?.recommendedFormats ?? []
  const matrix = content?.contentMatrix
  const angles = content?.topicAngles ?? []
  const diag = content?.productDiagnosis
  const cadence = content?.publishCadence
  const [briefLang, setBriefLang] = useState<'cn' | 'en'>('cn')

  const lifecycle = diag?.lifecycle && LIFECYCLE_LABELS[diag.lifecycle]

  return (
    <div className="mt-2">
      {/* 一、商品诊断（不折叠） */}
      {(diag || merchant?.heroImage) && (
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-3 mb-4 flex gap-3">
          {merchant?.heroImage && (
            <div className="flex-shrink-0 w-20 h-20 bg-white rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={merchant.heroImage}
                alt={merchant.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">商品诊断</span>
              {lifecycle && (
                <span className={`text-xs px-2 py-0.5 rounded ${lifecycle.style}`}>
                  {lifecycle.label}
                </span>
              )}
            </div>
            {diag && diag.topSearchTerms.length > 0 && (
              <p className="text-xs text-gray-700 mb-1">
                <span className="text-gray-500">Top 搜索词：</span>
                {diag.topSearchTerms.map((t, i) => (
                  <span
                    key={i}
                    className="inline-block bg-white border border-blue-100 text-blue-700 px-1.5 py-0.5 rounded mr-1 mb-1"
                  >
                    {t}
                  </span>
                ))}
              </p>
            )}
            {diag?.audienceProfile && (
              <p className="text-xs text-gray-700 mb-1">
                <span className="text-gray-500">人群：</span>
                {diag.audienceProfile}
              </p>
            )}
            {diag && diag.realSellingPoints.length > 0 && (
              <p className="text-xs text-gray-700 mb-1">
                <span className="text-gray-500">真实卖点：</span>
                {diag.realSellingPoints.join(' · ')}
              </p>
            )}
            {diag && diag.riskKeywords.length > 0 && (
              <p className="text-xs text-rose-600">
                <span className="text-gray-500">⚠ 禁忌词：</span>
                {diag.riskKeywords.join('、')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 二、内容矩阵（诊断 → 改进） */}
      {matrix && (matrix.diagnosis || matrix.rationale) && (
        <ContentMatrixBody matrix={matrix} />
      )}

      {/* 三、推荐内容形式（默认展开，但每张卡可单独折叠） */}
      {formats.length > 0 && (
        <Collapsible
          flat
          defaultOpen
          accent="bg-blue-300"
          title={`推荐内容形式（${formats.length}）`}
        >
          <div className="space-y-2.5 pt-1">
            {formats.map((f, i) => (
              <FormatCard key={i} format={f} defaultOpen />
            ))}
          </div>
        </Collapsible>
      )}

      {/* 四、选题方向（默认展开，每个人群一个折叠子卡） */}
      {angles.length > 0 && (
        <Collapsible
          flat
          defaultOpen
          accent="bg-blue-300"
          title={`选题方向（${angles.length} 个人群）`}
        >
          <div className="space-y-2 pt-1">
            {angles.map((g, i) => (
              <Collapsible
                key={i}
                flat
                accent="bg-gray-200"
                defaultOpen={i === 0}
                title={`人群：${g.audience}`}
                badge={
                  <span className="text-[10px] text-gray-400 font-normal">
                    {g.topics?.length ?? 0} 条
                  </span>
                }
              >
                <div className="space-y-1.5 pt-1">
                  {g.topics.map((t, j) => (
                    <div
                      key={j}
                      className="bg-white rounded px-2 py-1.5 border border-gray-100"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap mt-0.5 ${
                            HOOK_TYPE_STYLE[t.hookType] ?? 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {t.hookType}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 leading-snug">
                            {t.description}
                          </p>
                          {t.scene && (
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              <span className="text-gray-400">场景：</span>
                              {t.scene}
                            </p>
                          )}
                          <EvidenceChips evidence={t.evidence} compact />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Collapsible>
            ))}
          </div>
        </Collapsible>
      )}

      {/* 五、节奏（默认展开） */}
      {cadence && (cadence.testPhase || cadence.stablePhase || cadence.peakPhase) && (
        <Collapsible flat defaultOpen accent="bg-blue-300" title="发布节奏">
          <div className="space-y-1 bg-gray-50 rounded-lg p-3 mt-1">
            {cadence.testPhase && (
              <p className="text-xs text-gray-700">
                <span className="text-emerald-700 font-medium">测试期：</span>
                {cadence.testPhase}
              </p>
            )}
            {cadence.stablePhase && (
              <p className="text-xs text-gray-700">
                <span className="text-blue-700 font-medium">稳定期：</span>
                {cadence.stablePhase}
              </p>
            )}
            {cadence.peakPhase && (
              <p className="text-xs text-gray-700">
                <span className="text-amber-700 font-medium">爆发期：</span>
                {cadence.peakPhase}
              </p>
            )}
          </div>
        </Collapsible>
      )}

      {/* 六、达人 Brief（默认展开 · 中英切换内联在标题右侧） */}
      {(content?.creatorBrief || content?.creatorBriefEN) && (
        <Collapsible
          flat
          defaultOpen
          accent="bg-blue-300"
          title="达人 Brief"
          badge={
            <div className="flex bg-gray-100 rounded-md p-0.5 text-[11px]">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setBriefLang('cn')
                }}
                className={`px-2 py-0.5 rounded transition-colors ${
                  briefLang === 'cn'
                    ? 'bg-white shadow text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                中文
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setBriefLang('en')
                }}
                disabled={!content?.creatorBriefEN}
                className={`px-2 py-0.5 rounded transition-colors ${
                  briefLang === 'en'
                    ? 'bg-white shadow text-gray-900'
                    : !content?.creatorBriefEN
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                English
              </button>
            </div>
          }
        >
          <CreatorBriefBody
            briefLang={briefLang}
            briefCN={content?.creatorBrief}
            briefEN={content?.creatorBriefEN}
          />
        </Collapsible>
      )}

      {/* 七、本周发布计划（默认展开） */}
      {content?.weeklyPlan && (
        <Collapsible flat defaultOpen accent="bg-blue-300" title="本周发布计划">
          <div className="bg-gray-50 rounded-lg p-3 mt-1">
            <p className="text-xs text-gray-700 leading-relaxed">{content.weeklyPlan}</p>
          </div>
        </Collapsible>
      )}

      {/* 九、参考视频（按白皮书五大分型，三列等宽对齐 · 紧凑卡片） */}
      {merchant?.exampleVideos && merchant.exampleVideos.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2 font-medium">参考视频 · 同类爆款</p>
          <div className="grid grid-cols-3 gap-2">
            {merchant.exampleVideos.slice(0, 3).map((v, i) => {
              const normFmt = normalizeFormatType(v.format)
              const style = FORMAT_STYLE[normFmt] ?? FORMAT_STYLE['卖点讲解型']
              return (
                <div
                  key={i}
                  className="bg-white border border-gray-200 rounded-md overflow-hidden flex flex-col"
                >
                  {/* 顶部：类型标签 + 缩略图（横向并排，缩略图更小） */}
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-2 p-2 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative flex-shrink-0 w-12 aspect-[9/16] bg-gray-100 rounded overflow-hidden group">
                      {v.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={v.thumbnail}
                          alt={v.title || normFmt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] bg-gradient-to-br from-gray-100 to-gray-200">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center text-blue-600 text-[10px] opacity-80 group-hover:opacity-100 transition">
                          ▶
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block text-[9px] px-1 py-0 rounded border font-medium ${style.chip} mb-1`}
                      >
                        {normFmt}
                      </span>
                      {v.title && (
                        <p className="text-[11px] font-semibold text-gray-800 leading-snug line-clamp-2">
                          {v.title}
                        </p>
                      )}
                    </div>
                  </a>
                  {/* 创意公式 + 可借鉴点（紧凑文本） */}
                  <div className="px-2 pb-2 space-y-1.5 border-t border-gray-50">
                    {v.formula && (
                      <div className="pt-1.5">
                        <p className="text-[9px] text-gray-400 mb-0.5">创意公式</p>
                        <p className="text-[10px] text-gray-700 leading-snug line-clamp-2">
                          {v.formula}
                        </p>
                      </div>
                    )}
                    {(v.takeaway || v.note) && (
                      <div>
                        <p className="text-[9px] text-gray-400 mb-0.5">可借鉴点</p>
                        <p className="text-[10px] text-gray-600 leading-snug line-clamp-3">
                          {v.takeaway || v.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** 达人 Brief 主体：中文展示结构化字段，英文整段渲染 */
function CreatorBriefBody({
  briefLang,
  briefCN,
  briefEN,
}: {
  briefLang: 'cn' | 'en'
  briefCN?: import('@/types').CreatorBriefCN | string
  briefEN?: string
}) {
  if (briefLang === 'en') {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
          {briefEN || '(暂无英文版)'}
        </p>
      </div>
    )
  }

  // 中文：兼容字符串和结构化对象
  if (typeof briefCN === 'string') {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
          {briefCN || '(暂无中文版)'}
        </p>
      </div>
    )
  }

  if (!briefCN) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-400">(暂无中文版)</p>
      </div>
    )
  }

  const sections: { title: string; items?: string[]; accent: string }[] = [
    { title: '商品核心卖点', items: briefCN.productHighlights, accent: 'bg-emerald-400' },
    { title: '必须展示要素', items: briefCN.mustShow, accent: 'bg-blue-400' },
    { title: '拍摄 / 口播要求', items: briefCN.shootingNotes, accent: 'bg-amber-400' },
    { title: '合作条款', items: briefCN.collaborationTerms, accent: 'bg-purple-400' },
  ]

  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-3">
      {sections.map((s) =>
        s.items && s.items.length > 0 ? (
          <div key={s.title}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`w-1 h-3 ${s.accent} rounded-full`} />
              <span className="text-[11px] font-semibold text-gray-700">{s.title}</span>
            </div>
            <ul className="space-y-1 pl-3">
              {s.items.map((it, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-700 leading-relaxed list-disc list-outside marker:text-gray-300"
                >
                  {it}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      )}
    </div>
  )
}

/** 单个推荐内容形式卡（默认 i===0 展开，其他折叠） */
function FormatCard({
  format: f,
  defaultOpen,
}: {
  format: import('@/types').ContentFormat
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const normType = normalizeFormatType(f.type)
  const style = FORMAT_STYLE[normType] ?? FORMAT_STYLE['卖点讲解型']

  return (
    <div className="bg-white border border-blue-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 p-3 hover:bg-blue-50/50 transition-colors text-left"
      >
        <span
          className={`text-[11px] px-2 py-0.5 rounded border font-medium flex-shrink-0 ${style.chip}`}
        >
          {normType}
        </span>
        <Tooltip content={f.reason} maxWidth={320}>
          <span className="text-xs text-gray-500 underline decoration-dotted decoration-gray-300 underline-offset-4">
            推荐原因
          </span>
        </Tooltip>
        <span className="flex-1" />
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-blue-50">
          {f.hookExamples && f.hookExamples.length > 0 && (
            <div className="bg-gray-50 rounded p-2 my-2">
              <p className="text-[10px] tracking-wide text-gray-500 mb-1">
                3 秒 Hook · 英文原话
              </p>
              {f.hookExamples.map((h, j) => (
                <p key={j} className="text-xs text-gray-800 italic">
                  · &ldquo;{h}&rdquo;
                </p>
              ))}
            </div>
          )}
          {f.videoStructure && (
            <p className="text-xs text-gray-700 mb-1.5">
              <span className="text-gray-500">视频结构：</span>
              {f.videoStructure}
            </p>
          )}
          {f.usCtaScript && (
            <p className="text-xs text-gray-700 mb-1.5">
              <span className="text-gray-500">CTA：</span>
              <span className="italic">&ldquo;{f.usCtaScript}&rdquo;</span>
            </p>
          )}
          {f.complianceNotes && (
            <p className="text-xs text-rose-600">
              <span className="text-gray-500">⚠ 合规：</span>
              {f.complianceNotes}
            </p>
          )}
          <EvidenceChips evidence={f.evidence} />
        </div>
      )}
    </div>
  )
}

/**
 * 内容矩阵：诊断当前结构 → 改进结构。
 * 4 个渠道（短视频·达人 / 短视频·商家 / 直播·达人 / 直播·商家）按比例并排展示，
 * 上下两条带形可视化"现状 vs 目标"，下方给出问题诊断、改进理由、落地动作。
 */
const CHANNEL_META: Record<
  keyof import('@/types').ChannelMix,
  { label: string; bar: string; chip: string }
> = {
  creatorVideo: {
    label: '短视频·达人',
    bar: 'bg-blue-400',
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  sellerVideo: {
    label: '短视频·商家',
    bar: 'bg-emerald-400',
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  creatorLive: {
    label: '直播·达人',
    bar: 'bg-purple-400',
    chip: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  sellerLive: {
    label: '直播·商家',
    bar: 'bg-amber-400',
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
  },
}

function ChannelBar({ mix }: { mix: import('@/types').ChannelMix }) {
  const keys = ['creatorVideo', 'sellerVideo', 'creatorLive', 'sellerLive'] as const
  const total = keys.reduce((s, k) => s + (mix[k] || 0), 0) || 1
  return (
    <div className="flex h-5 rounded-md overflow-hidden border border-gray-100 bg-gray-50">
      {keys.map((k) => {
        const v = mix[k] || 0
        if (v === 0) return null
        const m = CHANNEL_META[k]
        return (
          <div
            key={k}
            className={`${m.bar} flex items-center justify-center text-[10px] font-medium text-white/95`}
            style={{ width: `${(v / total) * 100}%` }}
            title={`${m.label} ${v}%`}
          >
            {v >= 12 ? `${v}%` : ''}
          </div>
        )
      })}
    </div>
  )
}

function ContentMatrixBody({ matrix }: { matrix: import('@/types').ContentMatrix }) {
  const keys = ['creatorVideo', 'sellerVideo', 'creatorLive', 'sellerLive'] as const
  const delta = (k: (typeof keys)[number]) =>
    (matrix.improved[k] || 0) - (matrix.current[k] || 0)

  return (
    <div className="mb-4 rounded-lg border border-gray-100 bg-gradient-to-br from-blue-50/40 to-white p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">内容矩阵 · 诊断 → 改进</p>
        <p className="text-[10px] text-gray-400">
          TTS 4 渠道：短视频（达人 / 商家）+ 直播（达人 / 商家）
        </p>
      </div>

      {/* 现状 → 目标 双带形对比 */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">现状</span>
          <div className="flex-1">
            <ChannelBar mix={matrix.current} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-blue-600 font-medium w-10 flex-shrink-0">改进</span>
          <div className="flex-1">
            <ChannelBar mix={matrix.improved} />
          </div>
        </div>
      </div>

      {/* 渠道明细 + delta */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        {keys.map((k) => {
          const m = CHANNEL_META[k]
          const cur = matrix.current[k] || 0
          const imp = matrix.improved[k] || 0
          const d = delta(k)
          const dColor = d > 0 ? 'text-emerald-600' : d < 0 ? 'text-rose-600' : 'text-gray-400'
          return (
            <div key={k} className="flex items-center gap-1.5 text-[11px]">
              <span className={`w-1.5 h-1.5 rounded-full ${m.bar}`} />
              <span className="text-gray-600 flex-1 truncate">{m.label}</span>
              <span className="text-gray-500 tabular-nums">
                {cur}% → {imp}%
              </span>
              <span className={`tabular-nums font-medium w-10 text-right ${dColor}`}>
                {d > 0 ? `+${d}` : d}pp
              </span>
            </div>
          )
        })}
      </div>

      {/* 诊断 + 改进理由 */}
      {matrix.diagnosis && (
        <div className="mt-3">
          <p className="text-[10px] text-gray-400 mb-0.5">问题诊断</p>
          <p className="text-xs text-gray-700 leading-relaxed">{matrix.diagnosis}</p>
        </div>
      )}
      {matrix.rationale && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 mb-0.5">为什么这样改</p>
          <p className="text-xs text-gray-700 leading-relaxed">{matrix.rationale}</p>
        </div>
      )}

      {/* 落地动作 */}
      {matrix.actions && matrix.actions.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-400 mb-0.5">落地动作</p>
          <ul className="space-y-0.5">
            {matrix.actions.map((a, i) => (
              <li key={i} className="text-xs text-gray-700 leading-snug pl-3 -indent-3">
                · {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EvidenceChips evidence={matrix.evidence} />
    </div>
  )
}
