import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { FullReport } from '@/types'

async function getLarkToken(): Promise<string> {
  const res = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      app_id: process.env.LARK_APP_ID,
      app_secret: process.env.LARK_APP_SECRET,
    }
  )
  return res.data.tenant_access_token
}

function buildLarkCard(report: FullReport): string {
  const score = report.diagnose.healthScore
  const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red'
  const alerts = report.diagnose.alerts.filter((a) => a.level === 'critical')

  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: {
        tag: 'plain_text',
        content: `📊 ${report.merchantName} · 本周经营诊断报告`,
      },
      template: scoreColor,
    },
    elements: [
      {
        tag: 'div',
        fields: [
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**健康评分**\n${score}/100`,
            },
          },
          {
            is_short: true,
            text: {
              tag: 'lark_md',
              content: `**经营阶段**\n${{ cold_start: '冷启期', growth: '成长期', mature: '成熟期' }[report.diagnose.stage]}`,
            },
          },
        ],
      },
      { tag: 'hr' },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**本周诊断**\n${report.diagnose.stageSummary}`,
        },
      },
      ...(alerts.length > 0
        ? [
            { tag: 'hr' },
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: `**⚠️ 需关注**\n${alerts.map((a) => `• ${a.title}：${a.body}`).join('\n')}`,
              },
            },
          ]
        : []),
      { tag: 'hr' },
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: `**本周优先行动**\n${report.assortment.upcomingOpportunities.slice(0, 2).map((o) => `• ${o}`).join('\n')}\n${report.empowerment.adStrategy.slice(0, 80)}...`,
        },
      },
      { tag: 'hr' },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: `由 ACE 运营副驾驶生成 · ${report.generatedAt} · 如有疑问请联系您的 AM`,
          },
        ],
      },
    ],
  }

  return JSON.stringify(card)
}

export async function POST(req: NextRequest) {
  try {
    const { report }: { report: FullReport } = await req.json()
    const chatId = process.env.LARK_CHAT_ID

    if (!chatId || chatId === 'placeholder') {
      return NextResponse.json({
        success: false,
        message: '飞书未配置，已跳过发送',
        preview: report.larkMessage,
      })
    }

    const token = await getLarkToken()
    const cardContent = buildLarkCard(report)

    await axios.post(
      'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id',
      {
        receive_id: chatId,
        msg_type: 'interactive',
        content: cardContent,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return NextResponse.json({ success: true, message: '飞书消息发送成功' })
  } catch (err) {
    console.error('[lark]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}