import { AMPreference, AgentModule } from '@/types'

const mockAMPreferences: Record<string, AMPreference> = {
  am_001: {
    amId: 'am_001',
    editHistory: [],
    preferredTone: 'balanced',
    focusAreas: ['达人内容场', '广告ROI', '大促备战'],
    templateOverrides: {},
  },
}

export function getAMPreference(amId: string): AMPreference {
  return mockAMPreferences[amId] ?? {
    amId,
    editHistory: [],
    preferredTone: 'balanced',
    focusAreas: [],
    templateOverrides: {},
  }
}

export function recordAMEdit(
  amId: string,
  merchantId: string,
  module: string,
  original: string,
  edited: string
): void {
  const pref = mockAMPreferences[amId]
  if (!pref) return
  pref.editHistory.push({
    week: new Date().toISOString().slice(0, 10),
    merchantId,
    original,
    edited,
    module: module as AgentModule,
  })
}