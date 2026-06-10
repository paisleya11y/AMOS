'use client'
import { useEffect, useState } from 'react'
import { listReports, type ReportHistoryEntry } from '@/lib/reportHistory'
import { feedbackStats } from '@/lib/feedbackStore'

interface Props {
  merchantId: string
  /** 本次报告周期 label（用于识别"上一份"是哪一份） */
  currentWeek: string
  /** 本次健康分（算 Δ 用） */
  currentScore: number
  /** 反馈/归档变化时刷新 */
  refreshToken?: number
}

/**
 * P2-⑦ 执行回顾卡 —— 把数据飞轮"演"出来。
 * 读上一份归档报告（上周说了什么 + 当时的健康分）+ 本地反馈（AM 采纳了几条），
 * 对比本周健康分，回答"上周那些建议，做了吗？有效吗？"。
 *
 * 没有上一份归档时不渲染（首次诊断无回顾可言）。
 */
export default function WeeklyReviewCard({
  merchantId,
  currentWeek,
  currentScore,
  refreshToken,
}: Props) {
  const [prev, setPrev] = useState<ReportHistoryEntry | null>(null)
  const [stats, setStats] = useState<ReturnType<typeof feedbackStats> | null>(null)

  useEffect(() => {
    const all = listReports(merchantId) // 时间倒序
    // "上一份" = 周期 label 与本次不同的、最近的一份归档
    const previous = all.find((r) => r.week && r.week !== currentWeek) ?? null
    setPrev(previous)
    setStats(previous ? feedbackStats(merchantId, previous.week) : null)
  }, [merchantId, currentWeek, refreshToken])

  if (!prev || !stats) return null

  const planned = Math.max(
    stats.total,
    prev.criticalTitles?.length ?? 0,
    (prev.alertCounts?.critical ?? 0) + (prev.alertCounts?.warning ?? 0),
  )
  const handled = stats.adopted + stats.revised
  const delta = currentScore - prev.healthScore
  const deltaColor =
    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-rose-600' : 'text-gray-500'
  const deltaSign = delta > 0 ? '↑' : delta < 0 ? '↓' : '→'

  // 采纳率（有反馈记录时才算）
  const adoptRate = stats.total > 0 ? Math.round((handled / stats.total) * 100) : null

  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
          上周执行回顾
        </span>
        <span className="text-[10px] text-gray-400">对比 {prev.week}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* 上周必做 */}
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-800">{planned}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">上周必做项</p>
        </div>

        {/* 采纳 / 改写 */}
        <div className="text-center border-x border-gray-100">
          <p className="text-xl font-semibold text-gray-800">
            {handled}
            {adoptRate !== null && (
              <span className="text-xs font-normal text-gray-400 ml-1">/{adoptRate}%</span>
            )}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            已采纳/改写
            {stats.ignored > 0 && (
              <span className="text-gray-400"> · 忽略 {stats.ignored}</span>
            )}
          </p>
        </div>

        {/* 健康分变化 */}
        <div className="text-center">
          <p className={`text-xl font-semibold ${deltaColor}`}>
            {deltaSign} {Math.abs(delta)}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            健康分 {prev.healthScore}→{currentScore}
          </p>
        </div>
      </div>

      {/* 一句话结论 */}
      <p className="text-[11px] text-gray-500 leading-relaxed mt-3 pt-2 border-t border-gray-100">
        {stats.total === 0 ? (
          <>上周的建议尚未在系统里标注处置 —— 处理本周必做项后，下周这里会显示采纳率与成效。</>
        ) : delta > 0 ? (
          <>
            上周 {planned} 条必做你处理了 {handled} 条，健康分回升{' '}
            <span className="text-emerald-600 font-medium">{Math.abs(delta)} 分</span>
            ，方向是对的，本周继续。
          </>
        ) : delta < 0 ? (
          <>
            上周处理了 {handled} 条，但健康分仍跌{' '}
            <span className="text-rose-600 font-medium">{Math.abs(delta)} 分</span>
            ，需要换打法 —— 看本周第一优先项。
          </>
        ) : (
          <>上周处理了 {handled} 条，健康分持平，本周聚焦第一优先项突破。</>
        )}
      </p>
    </div>
  )
}
