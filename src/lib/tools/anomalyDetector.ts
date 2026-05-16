import { MerchantData, Alert } from '@/types'

export function detectAnomalies(merchant: MerchantData): Alert[] {
  const alerts: Alert[] = []
  const d = merchant.weeklyData

  if (d.weekOverWeekChange <= -15) {
    alerts.push({
      level: 'critical',
      title: 'GMV 异动预警',
      body: `本周 GMV 环比下降 ${Math.abs(d.weekOverWeekChange)}%，超过预警阈值 15%。请立即检查：达人内容发布频次、广告投放状态、库存是否断货。`,
      module: 'diagnose',
    })
  }

  if (d.adROI < 1.5) {
    alerts.push({
      level: 'critical',
      title: '广告 ROI 过低',
      body: `当前广告 ROI ${d.adROI.toFixed(1)}，低于健康线 1.5。建议暂停低效广告计划，优先投放近期表现好的达人素材。`,
      module: 'empowerment',
    })
  } else if (d.adROI < 2.0) {
    alerts.push({
      level: 'warning',
      title: '广告 ROI 偏低',
      body: `当前广告 ROI ${d.adROI.toFixed(1)}，建议优化至 2.0 以上。可尝试用 GMV Max 替代手动投放。`,
      module: 'empowerment',
    })
  }

  if (merchant.spsScore < 60) {
    alerts.push({
      level: 'critical',
      title: 'SPS 店铺健康分预警',
      body: `SPS 评分 ${merchant.spsScore}，低于 60 分将影响搜索排名和活动资格。请立即检查物流时效、差评率、取消率。`,
      module: 'diagnose',
    })
  }

  const sellerRatio = d.sellerContentGMV / d.totalGMV
  if (sellerRatio < 0.1 && merchant.stage !== 'cold_start') {
    alerts.push({
      level: 'warning',
      title: '自制内容占比过低',
      body: `商家自制内容 GMV 占比仅 ${(sellerRatio * 100).toFixed(0)}%，行业建议 20%+。自制内容可降低达人佣金成本，建议尽快搭建自制团队。`,
      module: 'content',
    })
  }

  if (d.videoCount < 3) {
    alerts.push({
      level: 'warning',
      title: '本周视频发布不足',
      body: `本周仅发布 ${d.videoCount} 条视频，建议保持每周 5 条以上稳定更新频率以维持算法推荐权重。`,
      module: 'content',
    })
  }

  return alerts
}