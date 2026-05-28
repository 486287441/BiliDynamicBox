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
  const title = toText(archive.title, "未命名视频")

  if (!dynamicId) {
    return null
  }

  return {
    dynamicId,
    videoAid: aid,
    videoBvid: bvid,
    title,
    cover: toText(archive.cover),
    upMid,
    upName,
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
