import type { VideoDynamicCard } from "../domain/types"

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
  wantWatchDynamicIds: string[]
  hideWantWatch: boolean
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
  wantWatchDynamicIds: [],
  hideWantWatch: false,
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
    wantWatchDynamicIds: normalizeIdList(state.wantWatchDynamicIds),
    hideWantWatch: state.hideWantWatch === true,
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
