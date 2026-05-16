import { getUpcomingCampaigns, MarketingNode } from '@/lib/mockData/marketingCalendar'

export function getNextCampaign(): MarketingNode | null {
  const campaigns = getUpcomingCampaigns(new Date())
  return campaigns.length > 0 ? campaigns[0] : null
}

export function getCampaignsWithinWeeks(weeks: number): MarketingNode[] {
  const campaigns = getUpcomingCampaigns(new Date())
  return campaigns.filter((c) => c.daysUntil <= weeks * 7)
}

export function formatCampaignContext(): string {
  const upcoming = getCampaignsWithinWeeks(12)
  if (upcoming.length === 0) return '未来12周内暂无重大营销节点。'
  return upcoming
    .map((c) => `【${c.name}】距今${c.daysUntil}天（${c.date}），建议提前${c.prepWeeks}周备战`)
    .join('\n')
}