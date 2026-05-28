import type { DateGroup, VideoDynamicCard } from "./types"

function getDayStartMs(timestampSec: number): number {
  const date = new Date(timestampSec * 1000)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function formatDateLabel(timestampSec: number): string {
  const date = new Date(timestampSec * 1000)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function buildDateKey(timestampSec: number): string {
  const date = new Date(timestampSec * 1000)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

export function groupByDate(cards: VideoDynamicCard[]): DateGroup[] {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayStartMs = now.getTime()
  const yesterdayStartMs = todayStartMs - 24 * 60 * 60 * 1000

  const seen = new Set<string>()
  const today: VideoDynamicCard[] = []
  const yesterday: VideoDynamicCard[] = []
  const olderMap = new Map<string, VideoDynamicCard[]>()

  for (const card of cards) {
    if (seen.has(card.dynamicId)) {
      continue
    }
    seen.add(card.dynamicId)

    const dayStartMs = getDayStartMs(card.publishAt)
    if (dayStartMs === todayStartMs) {
      today.push(card)
      continue
    }
    if (dayStartMs === yesterdayStartMs) {
      yesterday.push(card)
      continue
    }

    const key = buildDateKey(card.publishAt)
    const bucket = olderMap.get(key) ?? []
    bucket.push(card)
    olderMap.set(key, bucket)
  }

  const olderGroups: DateGroup[] = [...olderMap.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      key,
      label: formatDateLabel(items[0]?.publishAt ?? Math.floor(Date.now() / 1000)),
      items: items.sort((a, b) => b.publishAt - a.publishAt),
    }))

  const groups: DateGroup[] = []
  if (today.length > 0) {
    groups.push({
      key: "today",
      label: "今天",
      items: today.sort((a, b) => b.publishAt - a.publishAt),
    })
  }
  if (yesterday.length > 0) {
    groups.push({
      key: "yesterday",
      label: "昨天",
      items: yesterday.sort((a, b) => b.publishAt - a.publishAt),
    })
  }

  return [...groups, ...olderGroups]
}
