import type { ChecklistItem, ChecklistKind } from "../domain/checklist"

declare const chrome: any

interface ChecklistResponse { ok?: boolean; data?: unknown; error?: string }

interface ChecklistCacheEntry {
  version: number
  fetchedAt: number
  items: unknown[]
}

const CHECKLIST_CACHE_VERSION = 3
const CHECKLIST_CACHE_TTL_MS = 24 * 60 * 60 * 1000

function cacheKey(kind: ChecklistKind): string {
  return `bewly:checklist-data-cache-v${CHECKLIST_CACHE_VERSION}:${kind}`
}

function readCachedChecklist(kind: ChecklistKind): Promise<{ items: ChecklistItem[]; fetchedAt: number } | null> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return resolve(null)
    const key = cacheKey(kind)
    chrome.storage.local.get(key, (result: Record<string, unknown>) => {
      if (chrome.runtime.lastError) return resolve(null)
      const entry = result[key] as Partial<ChecklistCacheEntry> | undefined
      if (entry?.version !== CHECKLIST_CACHE_VERSION || !Array.isArray(entry.items)) return resolve(null)
      const items = entry.items.map((item) => normalizeItem(item, kind)).filter((item): item is ChecklistItem => item !== null)
      resolve(items.length ? { items: items.sort((left, right) => left.rank - right.rank), fetchedAt: Number(entry.fetchedAt || 0) } : null)
    })
  })
}

function writeCachedChecklist(kind: ChecklistKind, items: ChecklistItem[]): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return resolve()
    chrome.storage.local.set({
      [cacheKey(kind)]: { version: CHECKLIST_CACHE_VERSION, fetchedAt: Date.now(), items } satisfies ChecklistCacheEntry,
    }, () => resolve())
  })
}

const FALLBACK: Record<ChecklistKind, ChecklistItem[]> = {
  imdb: [
    ["tt0111161", "肖申克的救赎", "The Shawshank Redemption", "1994", 9.3],
    ["tt0068646", "教父", "The Godfather", "1972", 9.2],
    ["tt0468569", "蝙蝠侠：黑暗骑士", "The Dark Knight", "2008", 9.1],
    ["tt0071562", "教父2", "The Godfather Part II", "1974", 9.0],
    ["tt0050083", "十二怒汉", "12 Angry Men", "1957", 9.0],
    ["tt0108052", "辛德勒的名单", "Schindler's List", "1993", 9.0],
    ["tt0167260", "指环王3：王者无敌", "The Lord of the Rings: The Return of the King", "2003", 9.0],
    ["tt0110912", "低俗小说", "Pulp Fiction", "1994", 8.9],
  ].map((row, index) => fallbackItem("imdb", index + 1, row)),
  douban: [
    ["1292052", "肖申克的救赎", "The Shawshank Redemption", "1994", 9.7],
    ["1291546", "霸王别姬", "Farewell My Concubine", "1993", 9.6],
    ["1292720", "阿甘正传", "Forrest Gump", "1994", 9.5],
    ["1295644", "这个杀手不太冷", "Léon", "1994", 9.4],
    ["1292063", "美丽人生", "La vita è bella", "1997", 9.5],
    ["1291561", "千与千寻", "千と千尋の神隠し", "2001", 9.4],
    ["1295124", "辛德勒的名单", "Schindler's List", "1993", 9.5],
    ["3541415", "盗梦空间", "Inception", "2010", 9.4],
  ].map((row, index) => fallbackItem("douban", index + 1, row)),
  bangumi: [
    ["253", "星际牛仔", "カウボーイビバップ", "1998", 8.9],
    ["1428", "钢之炼金术师 FULLMETAL ALCHEMIST", "鋼の錬金術師 FULLMETAL ALCHEMIST", "2009", 8.8],
    ["326", "银河英雄传说", "銀河英雄伝説", "1988", 8.8],
    ["265", "新世纪福音战士", "新世紀エヴァンゲリオン", "1995", 8.7],
    ["228", "攻壳机动队 STAND ALONE COMPLEX", "攻殻機動隊 STAND ALONE COMPLEX", "2002", 8.7],
    ["292970", "孤独摇滚！", "ぼっち・ざ・ろっく！", "2022", 8.6],
    ["400602", "葬送的芙莉莲", "葬送のフリーレン", "2023", 8.6],
    ["10380", "命运石之门", "STEINS;GATE", "2011", 8.6],
  ].map((row, index) => fallbackItem("bangumi", index + 1, row)),
}

function fallbackItem(kind: ChecklistKind, rank: number, row: Array<string | number>): ChecklistItem {
  const [id, title, originalTitle, year, rating, director = ""] = row
  const url = kind === "imdb"
    ? `https://www.imdb.com/title/${id}/`
    : kind === "douban"
      ? `https://movie.douban.com/subject/${id}/`
      : `https://bgm.tv/subject/${id}`
  return { id: String(id), kind, rank, title: String(title), originalTitle: String(originalTitle), year: String(year), director: String(director), rating: Number(rating), poster: "", genres: [], summary: "", url, runtimeSeconds: 0 }
}

function normalizeItem(value: unknown, kind: ChecklistKind): ChecklistItem | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<ChecklistItem>
  if (typeof item.id !== "string" || !item.id || typeof item.title !== "string" || !item.title) return null
  return {
    id: item.id,
    kind,
    rank: typeof item.rank === "number" ? item.rank : 0,
    title: item.title,
    originalTitle: typeof item.originalTitle === "string" ? item.originalTitle : "",
    year: typeof item.year === "string" ? item.year : "",
    director: typeof item.director === "string" ? item.director : "",
    rating: typeof item.rating === "number" ? item.rating : 0,
    poster: typeof item.poster === "string" ? item.poster.replace(/^http:/, "https:") : "",
    genres: Array.isArray(item.genres) ? item.genres.filter((genre): genre is string => typeof genre === "string").slice(0, 3) : [],
    summary: typeof item.summary === "string" ? item.summary : "",
    url: typeof item.url === "string" ? item.url : "",
    runtimeSeconds: typeof item.runtimeSeconds === "number" ? Math.max(0, Math.floor(item.runtimeSeconds)) : 0,
  }
}

function requestChecklist(kind: ChecklistKind): Promise<ChecklistItem[]> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("扩展后台不可用"))
      return
    }
    chrome.runtime.sendMessage({ type: "checklist:fetch", kind }, (response: ChecklistResponse | undefined) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) return reject(new Error(runtimeError.message))
      if (!response?.ok || !Array.isArray(response.data)) return reject(new Error(response?.error || "榜单加载失败"))
      resolve(response.data.map((item) => normalizeItem(item, kind)).filter((item): item is ChecklistItem => item !== null))
    })
  })
}

const memoryCache = new Map<ChecklistKind, ChecklistItem[]>()
const refreshes = new Map<ChecklistKind, Promise<ChecklistItem[]>>()

function refreshChecklist(kind: ChecklistKind): Promise<ChecklistItem[]> {
  const running = refreshes.get(kind)
  if (running) return running
  const refresh = requestChecklist(kind).then(async (items) => {
    if (!items.length) throw new Error("榜单暂时没有返回内容")
    const sorted = items.sort((left, right) => left.rank - right.rank)
    memoryCache.set(kind, sorted)
    await writeCachedChecklist(kind, sorted)
    return sorted
  }).finally(() => refreshes.delete(kind))
  refreshes.set(kind, refresh)
  return refresh
}

export async function fetchChecklist(kind: ChecklistKind, force = false): Promise<{ items: ChecklistItem[]; fallback: boolean; error: string }> {
  if (!force && memoryCache.has(kind)) return { items: memoryCache.get(kind) ?? [], fallback: false, error: "" }
  const cached = await readCachedChecklist(kind)
  if (!force && cached) {
    memoryCache.set(kind, cached.items)
    if (Date.now() - cached.fetchedAt > CHECKLIST_CACHE_TTL_MS) void refreshChecklist(kind).catch(() => undefined)
    return { items: cached.items, fallback: false, error: "" }
  }
  try {
    const sorted = await refreshChecklist(kind)
    return { items: sorted, fallback: false, error: "" }
  } catch (caught) {
    if (cached) {
      memoryCache.set(kind, cached.items)
      return { items: cached.items, fallback: false, error: caught instanceof Error ? caught.message : "榜单更新失败" }
    }
    return { items: FALLBACK[kind], fallback: true, error: caught instanceof Error ? caught.message : "榜单加载失败" }
  }
}
