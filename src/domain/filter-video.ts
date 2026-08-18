import type { DynamicItem, VideoDynamicCard } from "./types"

const MAJOR_TYPE_ARCHIVE = "MAJOR_TYPE_ARCHIVE"
const DYNAMIC_TYPE_AV = "DYNAMIC_TYPE_AV"

function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim()
  }
  if (typeof value === "number") {
    return String(value)
  }
  return fallback
}

function toTimestamp(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (typeof value === "string" && value.length > 0) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric > 1_000_000_000_000 ? Math.floor(numeric / 1000) : Math.floor(numeric)
    }
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed / 1000)
    }
  }
  return Math.floor(Date.now() / 1000)
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const text = value.trim().toLowerCase()
    const normalized = text.replace(/[,\s+]/g, "")
    const unitMatch = normalized.match(/^(-?\d+(?:\.\d+)?)(万|w|亿)?$/)
    if (unitMatch) {
      const base = Number(unitMatch[1])
      if (Number.isFinite(base)) {
        const unit = unitMatch[2]
        const multiplier = unit === "亿" ? 100000000 : unit === "万" || unit === "w" ? 10000 : 1
        return Math.max(0, Math.floor(base * multiplier))
      }
    }

    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed))
    }
  }
  return fallback
}

function formatDurationText(rawText: string, durationSeconds: number): string {
  if (rawText) {
    return rawText
  }
  if (durationSeconds <= 0) {
    return ""
  }
  const hour = Math.floor(durationSeconds / 3600)
  const minute = Math.floor((durationSeconds % 3600) / 60)
  const second = durationSeconds % 60
  if (hour > 0) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`
  }
  return `${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`
}

function parseDurationTextToSeconds(rawText: string): number {
  if (!rawText) {
    return 0
  }
  const parts = rawText
    .split(":")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part >= 0)
  if (parts.length === 0) {
    return 0
  }
  if (parts.length === 3) {
    return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2])
  }
  if (parts.length === 2) {
    return Math.floor(parts[0] * 60 + parts[1])
  }
  return Math.floor(parts[0])
}

function resolveDurationSeconds(duration: unknown, durationText: string): number {
  const fromText = parseDurationTextToSeconds(durationText)
  if (fromText > 0) {
    return fromText
  }
  if (typeof duration === "string" && duration.includes(":")) {
    const fromDurationField = parseDurationTextToSeconds(duration)
    if (fromDurationField > 0) {
      return fromDurationField
    }
  }
  return toNumber(duration)
}

function isVideoDynamic(item: DynamicItem): boolean {
  const itemType = toText(item.type)
  const majorType = toText(item.modules?.module_dynamic?.major?.type)
  const hasArchive = !!item.modules?.module_dynamic?.major?.archive
  return itemType === DYNAMIC_TYPE_AV || (majorType === MAJOR_TYPE_ARCHIVE && hasArchive)
}

function mapToCard(item: DynamicItem): VideoDynamicCard | null {
  const archive = item.modules?.module_dynamic?.major?.archive
  if (!archive) {
    return null
  }

  const dynamicId = toText(item.id_str)
  const bvid = toText(archive.bvid)
  const aid = toText(archive.aid)
  const upMid = toText(item.modules?.module_author?.mid)
  const upName = toText(item.modules?.module_author?.name, "未知UP")
  const upAvatar = toText(item.modules?.module_author?.face)
  const title = toText(archive.title, "未命名视频")
  const playCount = toNumber(archive.stat?.play)
  const danmakuCount = toNumber(archive.stat?.danmaku)
  const rawDurationText = toText(archive.duration_text)
  const durationSeconds = resolveDurationSeconds(archive.duration, rawDurationText)
  const durationText = formatDurationText(rawDurationText, durationSeconds)

  if (!dynamicId) {
    return null
  }

  return {
    dynamicId,
    videoAid: aid,
    videoBvid: bvid,
    title,
    cover: toText(archive.cover),
    durationText,
    durationSeconds,
    playCount,
    danmakuCount,
    upMid,
    upName,
    upAvatar,
    publishAt: toTimestamp(item.modules?.module_author?.pub_ts ?? item.modules?.module_author?.pub_time),
  }
}

export function filterVideoDynamics(items: DynamicItem[]): VideoDynamicCard[] {
  const result: VideoDynamicCard[] = []

  for (const item of items) {
    try {
      if (!isVideoDynamic(item)) {
        continue
      }
      const card = mapToCard(item)
      if (card) {
        result.push(card)
      }
    } catch {
      // Skip dirty row and keep rendering the rest.
      continue
    }
  }

  return result
}
