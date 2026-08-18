export type ChecklistKind = "imdb" | "douban" | "bangumi"

export interface ChecklistDefinition {
  kind: ChecklistKind
  title: string
  shortTitle: string
  total: number
  description: string
}

export interface ChecklistItem {
  id: string
  kind: ChecklistKind
  rank: number
  title: string
  originalTitle: string
  year: string
  director: string
  rating: number
  poster: string
  genres: string[]
  summary: string
  url: string
  runtimeSeconds: number
}

export type BilibiliAvailabilityStatus = "available" | "unavailable" | "unknown"
export type BilibiliCompleteness = "runtime_match" | "possibly_cut" | "runtime_differs" | "unverifiable" | "unknown"

export interface ChecklistAvailability {
  key: string
  fingerprint: string
  status: BilibiliAvailabilityStatus
  completeness: BilibiliCompleteness
  biliTitle: string
  biliUrl: string
  seasonId: number
  referenceRuntimeSeconds: number
  biliRuntimeSeconds: number
  checkedAt: number
  confidence: "high" | "medium" | "unknown"
  note: string
}

export const CHECKLIST_DEFINITIONS: ChecklistDefinition[] = [
  { kind: "imdb", title: "IMDb Top 250", shortTitle: "IMDb", total: 250, description: "全球影迷长期投票形成的经典电影坐标" },
  { kind: "douban", title: "豆瓣电影 Top 250", shortTitle: "豆瓣电影", total: 250, description: "中文影迷共同筛选出的高分电影典藏" },
  { kind: "bangumi", title: "Bangumi Top 100 动画", shortTitle: "Bangumi 动画", total: 100, description: "Bangumi 社区评分领先的动画作品" },
]

export function checklistItemKey(kind: ChecklistKind, id: string): string {
  return `${kind}:${id}`
}

export function checklistFingerprint(item: Pick<ChecklistItem, "title" | "originalTitle" | "year">): string {
  const normalize = (value: string) => value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "")
  return `${normalize(item.title || item.originalTitle)}:${item.year}`
}
