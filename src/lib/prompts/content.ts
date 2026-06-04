import { MerchantData, ContentGoal } from '@/types'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from '@/lib/rag/retriever'
import { getUpcomingCampaigns } from '@/lib/mockData/marketingCalendar'
import { DateRange, rangePromptLine } from '@/lib/dateRange'

const GOAL_LABELS: Record<ContentGoal, string> = {
  awareness: 'A. 让更多人知道（曝光/种草）',
  conversion: 'B. 直接卖出去（转化成交）',
  followers: 'C. 积累粉丝/私域',
  testing: 'D. 测试商品潜力',
}

/**
 * 不同目标下，TTS 4 渠道（短视频·达人 / 短视频·商家 / 直播·达人 / 直播·商家）的参考改进配比。
 * LLM 必须基于商家当前结构 + 目标 给出"改进结构"，本表只是参考锚点。
 */
const GOAL_CHANNEL_HINT: Record<ContentGoal, string> = {
  awareness:
    '短视频·达人 50% / 短视频·商家 25% / 直播·达人 15% / 直播·商家 10%（曝光优先，达人短视频做主力扩散）',
  conversion:
    '短视频·达人 35% / 短视频·商家 25% / 直播·达人 25% / 直播·商家 15%（直播提单价、短视频带流量进直播间）',
  followers:
    '短视频·达人 30% / 短视频·商家 35% / 直播·达人 15% / 直播·商家 20%（商家自播沉淀粉丝、互动型短视频拉新）',
  testing:
    '短视频·达人 40% / 短视频·商家 30% / 直播·达人 20% / 直播·商家 10%（短视频多形式 AB，直播放在验证爆款后）',
}

export async function buildContentPrompt(
  merchant: MerchantData,
  goal: ContentGoal = 'conversion',
  focusNote?: string,
  dateRange?: DateRange
): Promise<string> {
  const relevantKnowledge = await retrieveRelevantKnowledge(merchant, 'content', 3)
  const knowledgeCtx = formatKnowledgeContext(relevantKnowledge)

  const creatorRatio = (
    (merchant.weeklyData.creatorContentGMV / merchant.weeklyData.totalGMV) * 100
  ).toFixed(0)
  const sellerRatio = (
    (merchant.weeklyData.sellerContentGMV / merchant.weeklyData.totalGMV) * 100
  ).toFixed(0)

  // 估算 4 渠道当前占比（基于本周 GMV 和直播场次粗算，作为 LLM 诊断起点）
  const wd = merchant.weeklyData
  const liveSignal = wd.liveCount > 0
  // 粗估：内容场 GMV 默认全归短视频；直播 GMV 用 shopTab+search 之外不剩余的部分简单兜底
  const videoGmv = wd.creatorContentGMV + wd.sellerContentGMV
  const liveGmv = liveSignal
    ? Math.max(wd.totalGMV - videoGmv - wd.shopTabGMV - wd.searchGMV, 0)
    : 0
  const totalContentGmv = videoGmv + liveGmv || 1
  const pct = (n: number) => Math.round((n / totalContentGmv) * 100)
  const currentMix = {
    creatorVideo: pct(wd.creatorContentGMV),
    sellerVideo: pct(wd.sellerContentGMV),
    creatorLive: liveSignal ? pct(liveGmv * 0.6) : 0, // 直播 GMV 默认 60% 算达人、40% 算商家自播
    sellerLive: liveSignal ? pct(liveGmv * 0.4) : 0,
  }
  // 调和到 100
  const mixSum =
    currentMix.creatorVideo +
    currentMix.sellerVideo +
    currentMix.creatorLive +
    currentMix.sellerLive
  if (mixSum > 0 && mixSum !== 100) {
    currentMix.creatorVideo += 100 - mixSum
  }

  // 取 isStar 的 SKU 作为本次主推依据
  const starSkus = merchant.skuList.filter((s) => s.isStar).slice(0, 3)
  const starSkuLines = starSkus
    .map(
      (s) =>
        `  - ${s.name} | $${s.price} | 周销 ${s.weeklySales} | 趋势 ${s.salesTrend} | 内容场占比 ${s.fieldMix.creatorContent}%`
    )
    .join('\n')

  const isColdStart = merchant.stage === 'cold_start'

  // 注入营销日历：取未来最近 3 个档期，给 LLM 用于 peakPhase 锚点
  const upcoming = getUpcomingCampaigns(new Date()).slice(0, 3)
  const calendarLines = upcoming.length
    ? upcoming
        .map(
          (c) =>
            `  - ${c.name}（${c.date}，${c.daysUntil} 天后）｜建议提前 ${c.prepWeeks} 周开始预热`
        )
        .join('\n')
    : '  - 近 3 个月内无重大档期'

  // 注入本周已发布节奏，让 cadence 建议从「现状」出发
  const currentCadenceLine = `本周视频 ${merchant.weeklyData.videoCount} 条 · 周 GMV ${merchant.weeklyData.totalGMV} · ROI ${merchant.weeklyData.adROI} · 周环比 ${merchant.weeklyData.weekOverWeekChange}%`

  const rangeLine = rangePromptLine(dateRange)

  return `请为以下美区 TikTok Shop 商家生成内容策略，输出 JSON。
${rangeLine ? rangeLine + '\n（所有"本周/近期"诊断都基于此周期，避免出现与该周期不一致的时间词。）\n' : ''}
【语言规则 · 非常重要】
- 所有「分析、解释、原因、人群画像、卖点、合规说明、达人 brief 中文版、内容形式名解释、选题描述、节奏说明、直播排品、本周计划」全部用**中文**。
- 仅以下三类字段保留**英文原话**（直接给美区达人/拍摄团队用）：
  1. hookExamples（英文钩子原话）
  2. usCtaScript（英文 CTA 原话）
  3. creatorBriefEN（英文版 brief）
  4. topicAngles[].topics[].hookExample（英文 hook 样例）
  5. topSearchTerms（美区搜索词，英文）
- 内容形式名（Honest Review / Dupe / Problem→Solution 等）保留英文术语，**但 reason 必须中文解释**。
- 不要在中文里夹杂"美区/US/TikTok Shop US"这种地域前缀，默认就是美区。

${focusNote ? `【AM 本次重点关注（必须在 diagnosis / rationale / actions / topicAngles 中体现）】\n${focusNote}\n` : ''}
【商家本次目标】
${GOAL_LABELS[goal]}
→ 改进结构参考锚点（4 渠道：短视频·达人 / 短视频·商家 / 直播·达人 / 直播·商家）：
  ${GOAL_CHANNEL_HINT[goal]}
注意：参考锚点不是直接抄，必须结合商家当前结构和品类特征给出"改进结构"。

【商家当前内容渠道结构（基于本周 GMV 反推，作为诊断起点）】
- 短视频·达人：${currentMix.creatorVideo}%
- 短视频·商家自制：${currentMix.sellerVideo}%
- 直播·达人：${currentMix.creatorLive}%${liveSignal ? '' : '（本周无直播）'}
- 直播·商家自制：${currentMix.sellerLive}%${liveSignal ? '' : '（本周无直播）'}
- 本周直播场次：${wd.liveCount} 场 · 视频数：${wd.videoCount} 条

${isColdStart ? '【冷启动模式】\n该商家历史数据少，请基于品类 benchmark 和美区头部内容特征给策略，并在 productDiagnosis.audienceProfile 末尾标注「行业参考策略，将随数据积累个性化」。\n' : ''}
【检索到的相关知识（建议必须基于此生成）】
${knowledgeCtx}

【商家信息】
名称：${merchant.name}
品类：${merchant.category}（${merchant.categoryType}）
经营阶段：${merchant.stage}
达人内容场 GMV 占比：${creatorRatio}%
商家自制内容 GMV 占比：${sellerRatio}%
本周视频发布数：${merchant.weeklyData.videoCount}
新增粉丝：${merchant.weeklyData.newFollowers}

【主推 SKU（请基于这些产出选题）】
${starSkuLines || '  - 暂无 star SKU 标记，按品类通用产出'}

【当前发布节奏 · 现状】
${currentCadenceLine}

【未来档期 · 美区营销日历（peakPhase 必须锚定到这些真实档期，禁止编造）】
${calendarLines}

【内容形式 · 白皮书"商家好内容五大分型"（recommendedFormats[].type 必须从这 5 个中选 2-3 种）】
1. 卖点讲解型：围绕商品功能卖点和使用方法结构化讲解（字幕/口播/图文）。适配 3C 配件、清洁工具等功能清晰、卖点可量化的小件标品。
2. 生活场景型：把商品自然嵌入具体生活场景，"真实场景如何使用"传递价值。适配家居用品、户外用品、日用百货等品类。
3. 买家·卖家实测型：真实用户或商家亲身使用、试穿、前后对比，强调体验与口碑。适配美妆个护、家居、服饰配饰等需要体验感和高客单价的品类。
4. 测评对比·情景演绎型：同类产品对比或小剧情演绎放大优势。适配工具、家电、功能性日用品等对比明显的品。
5. 开箱直拍型：从拆包、展开、细节特写到使用呈现，强化外观/参数直观感知。适配 3C 配件、小家电、收纳类。

【美区落地手法（写在 reason / hookExamples / videoStructure 时可借用，但 type 必须用上面 5 个分型名）】
- "Honest Review" 是"买家·卖家实测型"的美区表达；"Dupe / Spec 对比" 是"测评对比·情景演绎型"的美区表达
- "Problem→Solution" 通常落在"卖点讲解型"或"测评对比·情景演绎型"
- "Unboxing with on-screen timer" 是"开箱直拍型"的强化版本
- "Vlog / Travel 场景代入"、"ASMR / 桌面整洁" 都属于"生活场景型"

【合规底线 · 中文表达（必须在 complianceNotes 体现）】
- 不能写："best ever / #1 / guaranteed / cures / better than Apple / noise-cancels everything / medical-grade"
- 必须披露：付费/seeded 用 #ad、#sponsored、#TikTokShopAffiliate；#TikTokMadeMeBuyIt 不是披露
- 限制类目：weapons / CBD / THC / 处方药 / 仿牌

【输出 JSON 结构（不要有任何其他文字，所有 hook/cta/英文 brief 用美区风格英文）】
{
  "productDiagnosis": {
    "lifecycle": "new | potential | hit | declining",
    "topSearchTerms": ["美区搜索词1（保留英文）", "搜索词2", "搜索词3"],
    "audienceProfile": "中文一句话：年龄+身份+地域+核心诉求。冷启动模式末尾加「行业参考策略，将随数据积累个性化」",
    "realSellingPoints": ["中文卖点1", "中文卖点2", "中文卖点3"],
    "riskKeywords": ["禁用词原文（英文）", "禁用词原文"]
  },
  "contentMatrix": {
    "current": {
      "creatorVideo": ${currentMix.creatorVideo},
      "sellerVideo": ${currentMix.sellerVideo},
      "creatorLive": ${currentMix.creatorLive},
      "sellerLive": ${currentMix.sellerLive}
    },
    "diagnosis": "中文一段（≤80字）：基于上方"商家当前内容渠道结构"指出问题。必须量化引用具体百分比和现状（例 \"达人短视频占 X%、过度依赖单一渠道；直播 0 场，缺失高客单转化场\"）。",
    "improved": {
      "creatorVideo": 数字,
      "sellerVideo": 数字,
      "creatorLive": 数字,
      "sellerLive": 数字
      // 四项之和必须 = 100。基于"当前 → 改进"差值要给出杠杆方向：哪个渠道加、哪个减。
    },
    "rationale": "中文一段（≤80字）：为什么改成这个结构。必须点出杠杆点（例 \"短视频·商家从 X% 提到 Y%，因为达人寄样周期长，先用商家自制内容补节奏\"），结合品类特征和本次目标。",
    "actions": [
      "中文落地动作 1（具体到 \"做什么/谁做/几条\"）",
      "中文落地动作 2",
      "中文落地动作 3"
    ],
    "evidence": [
      { "type": "metric|sku|benchmark|knowledge", "label": "≤10字", "detail": "中文 ≤40 字引用真实数据/案例" }
    ]
  },
  "recommendedFormats": [
    {
      "type": "卖点讲解型 | 生活场景型 | 买家·卖家实测型 | 测评对比·情景演绎型 | 开箱直拍型（只能从五大分型选）",
      "reason": "中文：为什么这个分型适合该商家——必须基于具体证据（哪个 SKU/哪段数据/哪条 benchmark），禁止空泛描述。这条内容会作为 hover tooltip 给 AM 看",
      "hookExamples": [
        "Hook 英文原话1（≤15词，可直接照拍）",
        "Hook 英文原话2",
        "Hook 英文原话3"
      ],
      "videoStructure": "中文描述时间轴：0-3s 钩子=...; 4-10s 痛点/规格=...; 11-25s 演示=...; 26-34s CTA=...",
      "usCtaScript": "CTA 英文原话（含 yellow cart / search / ships in N days 等元素）",
      "complianceNotes": "中文：本品类禁忌至少 2 条，列出具体禁用词（禁用词本身保留英文）",
      "evidence": [
        { "type": "sku|metric|benchmark|knowledge|trend|calendar", "label": "≤10字标签", "detail": "中文一句话引用具体数值/案例名/SKU 名（≤40字）" }
        // 必须 1-3 条，每条 evidence 引用上下文里真实出现过的数据/案例/SKU/知识，禁止编造
      ]
    }
    // 至少 2 条，最多 3 条
  ],
  "topicAngles": [
    {
      "audience": "中文人群描述（如：Tesla 车主，25-35 岁通勤族）",
      "topics": [
        {
          "scene": "中文场景描述（≤20字）",
          "hookType": "痛点型|悬念反转型|数字冲击型|场景代入型|价值承诺型",
          "description": "中文一句话选题描述（≤30字，不要写脚本）",
          "evidence": [
            { "type": "sku|metric|benchmark|knowledge|trend", "label": "≤10字", "detail": "中文一句话引用真实数据/案例（≤40字）" }
            // 1-2 条，禁止编造
          ]
        }
        // 每个人群 3 条（精简）
      ]
    }
    // 2-3 个人群
  ],
  "publishCadence": {
    "testPhase": "中文：测试期建议——必须先点出当前节奏（参考上方"当前发布节奏"，例 "本周仅 X 条" / "环比 -Y%"），再给出测试期发布数量、覆盖方向、目标",
    "stablePhase": "中文：稳定期聚焦方向 + 频次（在测试期基础上的递进，要量化频次）",
    "peakPhase": "中文：必须从上方"未来档期"列表中**指名**最近的 1 个档期（例 "夏促 2026-06-28"），然后给出该档期前 N 周的预热节奏（提前几周开始加量、加到几条/周、何时切达人寄样、何时切 GMV Max 预热）。禁止编造档期、禁止使用列表外的节点。"
  },
  "creatorBrief": {
    "productHighlights": ["中文卖点 1（一句话）", "中文卖点 2", "中文卖点 3"],
    "mustShow": ["中文必须展示要素 1", "中文必须展示要素 2", "中文必须展示要素 3"],
    "shootingNotes": ["中文拍摄/口播要求 1（时长、节奏、调性、字幕等）", "中文拍摄/口播要求 2"],
    "collaborationTerms": ["中文合作条款 1（佣金区间）", "中文合作条款 2（寄样周期）", "中文合作条款 3（#ad 披露要求）"]
  },
  "creatorBriefEN": "English creator brief (直接发美区达人，全英文): 3-4 paragraphs covering product hook, must-show points, affiliate commission range, sample seeding timeline, required #ad disclosure",
  "weeklyPlan": "中文：本周短视频发布计划——几条短视频、覆盖哪些内容形式、发布时间建议（时区用 ET 表示）",
  "evidence": [
    { "type": "metric", "label": "≤10字短标签", "detail": "≤40字真实数据/出处" }
  ]
}

【顶层 evidence 字段（必填，3-5 条）】
- 这是整个"内容策略"板块结论的依据，前端会在板块标题旁渲染统一的"来源"小标签，hover 弹出列表（与其他三个板块同一种 UI）。
- 与下方 contentMatrix.evidence / recommendedFormats[].evidence / topicAngles[].topics[].evidence 含义独立，顶层 evidence 概括"为什么内容策略这样定"。
- 同样遵循 type/label/detail 规则。


重要：
- 中文部分要像运营总结一样自然，不要带翻译腔、不要中英混杂。
- 英文部分（Hook/CTA/英文 Brief）必须是真实美区 TikTok 创作者风格，禁止中翻英直译。
- 所有"reason / 选题 description / videoStructure 文字说明"都要有数据/案例支撑，不能空想。
- 正文文本中**严禁**出现"（来源：…）"、"（依据：…）"、"根据 XXX："等显式归因短语；归因统一通过下方 evidence 字段呈现。

【evidence 字段使用规则】
- evidence 是这条建议的真实依据，前端会以彩色标签 + hover tooltip 形式展示给运营。
- type 取值含义：
  · sku：引用具体商品（用 SKU 名，例 "360° 镜头保护罩"）
  · metric：引用商家本周/本月数据（例 "周 GMV -12%、ROI 1.8、视频数 8 条"）
  · benchmark：引用上方"相关知识"中的标杆案例
  · knowledge：引用上方"相关知识"中的方法/规则
  · trend：引用品类趋势/搜索热度
  · calendar：引用美区档期（BFCM、Prime Day、back-to-school 等）
- label 必须 ≤10 字，是 type 对应的简短摘要（例 "周 GMV -12%"、"标杆 Anker"、"主推 SKU"）。
- detail 必须 ≤40 字，引用真实数值或真实出现过的案例名/SKU 名。
- 严禁编造数据。如果某条建议找不到证据，宁可不输出这条建议。`
}
