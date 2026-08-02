import type { VideoDynamicCard } from "../domain/types"
import type { AnimeTrackingItem, AnimeTrackingKind } from "../domain/anime-tracking"
import type { ViewMode } from "../domain/view-mode"
import { normalizePublishAfterDate } from "../domain/publish-date-filter"

const LEGACY_DISLIKED_KEY = "bewly:disliked-dynamic-ids"
const STORAGE_KEY = "bewly:inbox-state"
const STORAGE_VERSION = 1

export interface TrashItem {
  dynamicId: string
  removedAt: number
  card: VideoDynamicCard
}

export interface PersistedInboxState {
  dislikedDynamicIds: string[]
  trashItems: TrashItem[]
  upDislikeCounts: Record<string, number>
  minDurationMinutes: string
  publishAfterDate: string
  wantWatchDynamicIds: string[]
  wantWatchCards: VideoDynamicCard[]
  hideWantWatch: boolean
  openVideoOnWantWatch: boolean
  viewMode: ViewMode
  trackedAnime: AnimeTrackingItem[]
}

interface PersistedEnvelope {
  version: number
  payload: PersistedInboxState
}

const EMPTY_STATE: PersistedInboxState = {
  dislikedDynamicIds: [],
  trashItems: [],
  upDislikeCounts: {},
  minDurationMinutes: "",
  publishAfterDate: "",
  wantWatchDynamicIds: [],
  wantWatchCards: [],
  hideWantWatch: false,
  openVideoOnWantWatch: true,
  viewMode: "inbox",
  trackedAnime: [],
}

function normalizeTrackedAnime(value: unknown): AnimeTrackingItem[] {
  if (!Array.isArray(value)) return []
  const kinds = new Set<AnimeTrackingKind>(["bangumi", "pgc", "ugc", "video"])
  const result: AnimeTrackingItem[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue
    const item = raw as Partial<AnimeTrackingItem>
    if (typeof item.id !== "string" || !item.id || !kinds.has(item.kind as AnimeTrackingKind)) continue
    if (typeof item.lookupId !== "string" || typeof item.latestEpisodeKey !== "string") continue
    result.push({
      id: item.id,
      kind: item.kind as AnimeTrackingKind,
      lookupId: item.lookupId,
      sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl : "",
      title: typeof item.title === "string" ? item.title : "未命名番剧",
      cover: typeof item.cover === "string" ? item.cover : "",
      author: typeof item.author === "string" ? item.author : "",
      authorUrl: typeof item.authorUrl === "string" ? item.authorUrl : "https://www.bilibili.com/",
      latestEpisodeTitle: typeof item.latestEpisodeTitle === "string" ? item.latestEpisodeTitle : "最新一集",
      latestEpisodeUrl: typeof item.latestEpisodeUrl === "string" ? item.latestEpisodeUrl : item.sourceUrl || "https://www.bilibili.com/",
      latestEpisodeKey: item.latestEpisodeKey,
      episodeCount: typeof item.episodeCount === "number" ? Math.max(0, Math.floor(item.episodeCount)) : 0,
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : 0,
      checkedAt: typeof item.checkedAt === "number" ? item.checkedAt : 0,
      seenEpisodeKey: typeof item.seenEpisodeKey === "string" ? item.seenEpisodeKey : item.latestEpisodeKey,
      queryTitle: typeof item.queryTitle === "string" && item.queryTitle.trim() ? item.queryTitle.trim() : (typeof item.title === "string" ? item.title : "未命名番剧"),
      bangumiSubjectId: typeof item.bangumiSubjectId === "number" ? Math.max(0, Math.floor(item.bangumiSubjectId)) : 0,
      totalEpisodes: typeof item.totalEpisodes === "number" ? Math.max(0, Math.floor(item.totalEpisodes)) : (typeof item.episodeCount === "number" ? Math.max(0, Math.floor(item.episodeCount)) : 0),
      airedEpisodes: typeof item.airedEpisodes === "number" ? Math.max(0, Math.floor(item.airedEpisodes)) : (typeof item.episodeCount === "number" ? Math.max(0, Math.floor(item.episodeCount)) : 0),
      airStatus: item.airStatus === "airing" || item.airStatus === "completed" || item.airStatus === "upcoming" ? item.airStatus : "unknown",
      airDate: typeof item.airDate === "string" ? item.airDate : "",
      nextEpisodeDate: typeof item.nextEpisodeDate === "string" ? item.nextEpisodeDate : "",
      summary: typeof item.summary === "string" ? item.summary : "",
    })
  }
  return result.slice(-100)
}

function normalizeIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeCard(value: unknown): VideoDynamicCard | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const card = value as Partial<VideoDynamicCard>
  if (typeof card.dynamicId !== "string" || !card.dynamicId.trim()) {
    return null
  }
  if (typeof card.upMid !== "string" || typeof card.publishAt !== "number") {
    return null
  }
  return {
    dynamicId: card.dynamicId,
    videoAid: typeof card.videoAid === "string" ? card.videoAid : "",
    videoBvid: typeof card.videoBvid === "string" ? card.videoBvid : "",
    title: typeof card.title === "string" ? card.title : "",
    cover: typeof card.cover === "string" ? card.cover : "",
    durationText: typeof card.durationText === "string" ? card.durationText : "",
    durationSeconds: typeof card.durationSeconds === "number" ? Math.max(0, Math.floor(card.durationSeconds)) : 0,
    playCount: typeof card.playCount === "number" ? card.playCount : 0,
    danmakuCount: typeof card.danmakuCount === "number" ? card.danmakuCount : 0,
    upMid: card.upMid,
    upName: typeof card.upName === "string" ? card.upName : "",
    upAvatar: typeof card.upAvatar === "string" ? card.upAvatar : "",
    publishAt: card.publishAt,
  }
}

function normalizeTrashItems(value: unknown): TrashItem[] {
  if (!Array.isArray(value)) {
    return []
  }
  const list: TrashItem[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue
    }
    const row = item as { dynamicId?: unknown; removedAt?: unknown; card?: unknown }
    if (typeof row.dynamicId !== "string" || !row.dynamicId.trim()) {
      continue
    }
    const card = normalizeCard(row.card)
    if (!card) {
      continue
    }
    list.push({
      dynamicId: row.dynamicId,
      removedAt: typeof row.removedAt === "number" ? row.removedAt : Date.now(),
      card,
    })
  }
  return list
}

function normalizeCards(value: unknown): VideoDynamicCard[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .map((item) => normalizeCard(item))
    .filter((item): item is VideoDynamicCard => item !== null)
    .slice(-500)
}

function normalizeMinDurationMinutes(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return ""
  }
  return trimmed
}

function normalizeUpCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {}
  }
  const source = value as Record<string, unknown>
  const result: Record<string, number> = {}
  for (const [key, raw] of Object.entries(source)) {
    const id = key.trim()
    if (!id) {
      continue
    }
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
      continue
    }
    result[id] = Math.floor(raw)
  }
  return result
}

function normalizeState(value: unknown): PersistedInboxState {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_STATE }
  }
  const state = value as Partial<PersistedInboxState>
  return {
    dislikedDynamicIds: normalizeIdList(state.dislikedDynamicIds),
    trashItems: normalizeTrashItems(state.trashItems),
    upDislikeCounts: normalizeUpCounts(state.upDislikeCounts),
    minDurationMinutes: normalizeMinDurationMinutes(state.minDurationMinutes),
    publishAfterDate: normalizePublishAfterDate(state.publishAfterDate),
    wantWatchDynamicIds: normalizeIdList(state.wantWatchDynamicIds),
    wantWatchCards: normalizeCards(state.wantWatchCards),
    hideWantWatch: state.hideWantWatch === true,
    openVideoOnWantWatch: state.openVideoOnWantWatch !== false,
    viewMode: "inbox",
    trackedAnime: normalizeTrackedAnime(state.trackedAnime),
  }
}

function readLegacyDislikedIds(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_DISLIKED_KEY)
    if (!raw) {
      return []
    }
    return normalizeIdList(JSON.parse(raw) as unknown)
  } catch {
    return []
  }
}

export function readPersistedState(): PersistedInboxState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const dislikedDynamicIds = readLegacyDislikedIds()
      return {
        ...EMPTY_STATE,
        dislikedDynamicIds,
      }
    }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") {
      return { ...EMPTY_STATE }
    }
    const envelope = parsed as Partial<PersistedEnvelope>
    if (envelope.version !== STORAGE_VERSION) {
      return normalizeState(envelope.payload)
    }
    return normalizeState(envelope.payload)
  } catch {
    return { ...EMPTY_STATE }
  }
}

export function writePersistedState(patch: Partial<PersistedInboxState>): void {
  const payload = normalizeState({
    ...readPersistedState(),
    ...patch,
  })
  const envelope: PersistedEnvelope = {
    version: STORAGE_VERSION,
    payload,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    localStorage.removeItem(LEGACY_DISLIKED_KEY)
  } catch {
    // Ignore write failures to avoid breaking runtime flow.
  }
}
