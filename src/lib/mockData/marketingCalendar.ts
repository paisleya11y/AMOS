export interface MarketingNode {
  name: string
  date: string
  daysUntil: number
  type: 'major' | 'category' | 'brand'
  prepWeeks: number
  actions: string[]
}

export function getUpcomingCampaigns(today: Date): MarketingNode[] {
  const nodes: Omit<MarketingNode, 'daysUntil'>[] = [
    {
      name: '年中大促',
      date: '2025-06-15',
      type: 'major',
      prepWeeks: 6,
      actions: [
        '提前6周备货，核心品备平日1.5-2倍库存',
        '提前4周完成达人寄样并提升主推品佣金',
        '提前2周自制内容投稿加量',
        '提前7天开启GMV Max预热',
      ],
    },
    {
      name: '夏促',
      date: '2025-06-28',
      type: 'major',
      prepWeeks: 4,
      actions: [
        '季度最低价准备',
        '夏季趋势品提前备货',
        '达人寄样提前1个月',
        '促前14天内容加量投稿',
      ],
    },
    {
      name: '返校季',
      date: '2025-08-15',
      type: 'category',
      prepWeeks: 4,
      actions: [
        '3C/文具/日用品重点备货',
        '学生场景内容策划',
        '垂类达人提前联系',
      ],
    },
    {
      name: '黑五',
      date: '2025-11-28',
      type: 'major',
      prepWeeks: 12,
      actions: [
        '全年最低价准备',
        '提前3个月备货，核心品备平日2倍库存',
        '提前6周完成达人寄样',
        '提前2周自制内容加量',
        '提前7天开启GMV Max预热',
        '优先使用FBT确保物流时效',
      ],
    },
    {
      name: '网一',
      date: '2025-12-01',
      type: 'major',
      prepWeeks: 12,
      actions: [
        '与黑五联动备货',
        '黑五期间优质素材继续加热',
        '网一专属优惠券设置',
      ],
    },
    {
      name: '假日节',
      date: '2025-12-20',
      type: 'major',
      prepWeeks: 8,
      actions: [
        '节庆礼盒/限定款备货',
        '礼物场景内容策划',
        '达人节庆主题直播',
      ],
    },
  ]

  return nodes
    .map((node) => {
      const target = new Date(node.date)
      const diff = Math.ceil(
        (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )
      return { ...node, daysUntil: diff }
    })
    .filter((n) => n.daysUntil > 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}