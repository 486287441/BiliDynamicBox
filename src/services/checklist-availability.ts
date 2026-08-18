import {
  checklistFingerprint,
  checklistItemKey,
  type ChecklistAvailability,
  type ChecklistItem,
} from "../domain/checklist"
import { pageFetch } from "./page-fetch"
import { invalidateWbiKeys, signWbiParams } from "./wbi-sign"

declare const chrome: any

const SEARCH_ENDPOINT = "https://api.bilibili.com/x/web-interface/wbi/search/type"
const SEASON_ENDPOINT = "https://api.bilibili.com/pgc/view/web/season"
export const AVAILABILITY_TTL_MS = 14 * 24 * 60 * 60 * 1000

interface PgcSearchItem {
  title?: string
  org_title?: string
  season_id?: number | string
  url?: string
  pubtime?: number | string
}

interface PgcEpisode {
  duration?: number
  link?: string
  share_url?: string
  status?: number
  is_view_hide?: boolean
}

interface PgcSeason {
  season_id?: number
  status?: number
  total?: number
  title?: string
  episodes?: PgcEpisode[]
  positive?: { id?: number; title?: string }
  rights?: { can_watch?: number }
}

function plainText(value: unknown): string {
  return typeof value === "string"
    ? value.replace(/<[^>]*>/g, "").replace(/&amp;/gi, "&").replace(/&quot;/gi, "\"").replace(/&#39;|&apos;/gi, "'").trim()
    : ""
}

function normalizedTitle(value: string): string {
  return plainText(value)
    .toLocaleLowerCase()
    .replace(/(?:高清|超清|中文配音|普通话|普通話|国语|國語|粤语|粵語|完整版|电影版|電影版)$/gu, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
}

function titleSimilarity(left: string, right: string): number {
  const a = normalizedTitle(left)
  const b = normalizedTitle(right)
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  const pairs = (value: string) => new Set(Array.from({ length: Math.max(0, value.length - 1) }, (_, index) => value.slice(index, index + 2)))
  const aPairs = pairs(a)
  const bPairs = pairs(b)
  if (!aPairs.size || !bPairs.size) return 0
  let overlap = 0
  for (const pair of aPairs) if (bPairs.has(pair)) overlap += 1
  return 2 * overlap / (aPairs.size + bPairs.size)
}

function searchResultYear(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value * 1000).getFullYear()
  if (typeof value !== "string") return 0
  const direct = Number(value.match(/(?:19|20)\d{2}/)?.[0] || 0)
  if (direct) return direct
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 1_000_000_000 ? new Date(numeric * 1000).getFullYear() : 0
}

function scoreResult(item: ChecklistItem, result: PgcSearchItem): number {
  const resultTitle = plainText(result.title)
  const original = plainText(result.org_title)
  const titleScore = Math.max(titleSimilarity(item.title, resultTitle), titleSimilarity(item.originalTitle, resultTitle), titleSimilarity(item.title, original), titleSimilarity(item.originalTitle, original))
  const expectedYear = Number(item.year)
  const actualYear = searchResultYear(result.pubtime)
  const yearAdjustment = expectedYear && actualYear ? (Math.abs(expectedYear - actualYear) <= 1 ? 0.08 : -0.18) : 0
  return titleScore + yearAdjustment
}

async function searchPgc(keyword: string, searchType: "media_ft" | "media_bangumi", retry = true): Promise<PgcSearchItem[]> {
  const query = await signWbiParams({ keyword, search_type: searchType, page: 1, page_size: 20 })
  const response = await pageFetch(`${SEARCH_ENDPOINT}?${query.toString()}`, { headers: { Referer: "https://search.bilibili.com/" } })
  const payload = await response.json().catch(() => null) as { code?: number; message?: string; data?: { result?: PgcSearchItem[] } } | null
  if (retry && (payload?.code === -352 || payload?.code === -403)) {
    invalidateWbiKeys()
    return searchPgc(keyword, searchType, false)
  }
  if (!response.ok || payload?.code !== 0) throw new Error(payload?.message || `B 站影视搜索失败（${response.status}）`)
  return Array.isArray(payload.data?.result) ? payload.data.result : []
}

async function getSeason(seasonId: number, episodeId = 0): Promise<PgcSeason> {
  const lookup = seasonId ? `season_id=${seasonId}` : `ep_id=${episodeId}`
  const response = await pageFetch(`${SEASON_ENDPOINT}?${lookup}`, { headers: { Referer: "https://www.bilibili.com/" } })
  const payload = await response.json().catch(() => null) as { code?: number; message?: string; result?: PgcSeason } | null
  if (!response.ok || payload?.code !== 0 || !payload.result) throw new Error(payload?.message || `B 站剧集详情失败（${response.status}）`)
  return payload.result
}

function biliUrl(result: PgcSearchItem, seasonId: number): string {
  const url = plainText(result.url)
  if (url.startsWith("//")) return `https:${url}`
  if (/^https:\/\//i.test(url)) return url
  return seasonId ? `https://www.bilibili.com/bangumi/play/ss${seasonId}` : ""
}

function baseResult(item: ChecklistItem): ChecklistAvailability {
  return {
    key: checklistItemKey(item.kind, item.id),
    fingerprint: checklistFingerprint(item),
    status: "unknown",
    completeness: "unknown",
    biliTitle: "",
    biliUrl: "",
    seasonId: 0,
    referenceRuntimeSeconds: item.runtimeSeconds,
    biliRuntimeSeconds: 0,
    checkedAt: Date.now(),
    confidence: "unknown",
    note: "",
  }
}

function playableMovieEpisodes(episodes: PgcEpisode[]): PgcEpisode[] {
  return episodes.filter((episode) => episode.is_view_hide !== true && Number(episode.duration || 0) >= 10 * 60 * 1000)
}

function hasOfficialMovieListing(season: PgcSeason): boolean {
  return Number(season.total || 0) > 0
    && Number(season.positive?.id || 0) > 0
    && Number(season.rights?.can_watch || 0) === 1
}

function compareVersion(episodes: PgcEpisode[], result: ChecklistAvailability): void {
  const published = playableMovieEpisodes(episodes)
  result.biliRuntimeSeconds = published.reduce((longest, episode) => Math.max(longest, Number(episode.duration || 0) / 1000), 0)
  const reference = result.referenceRuntimeSeconds
  if (!reference || !result.biliRuntimeSeconds) {
    result.completeness = "unverifiable"
    result.note = "缺少可比对的标准片长，暂不能判断完整性"
    return
  }
  const difference = result.biliRuntimeSeconds - reference
  const tolerance = Math.max(180, reference * 0.025)
  if (difference >= -tolerance) {
    result.completeness = "runtime_match"
    result.note = difference > tolerance
      ? "B站片长大于完整版参考时长，按规则判定为未删减；较长部分可能来自片头、片尾或附加内容"
      : "B站片长与完整版参考时长在容差内一致，按规则判定为未删减"
  } else {
    result.completeness = "possibly_cut"
    result.note = "B站片长明显短于完整版参考时长，按规则判定为已删减"
  }
}

function requestReferenceRuntime(item: ChecklistItem): Promise<number> {
  if (item.kind !== "douban" || typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return Promise.resolve(0)
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "checklist:runtime", kind: item.kind, id: item.id, title: item.title, year: item.year }, (response: { ok?: boolean; runtimeSeconds?: number } | undefined) => {
      if (chrome.runtime.lastError || !response?.ok) return resolve(0)
      resolve(typeof response.runtimeSeconds === "number" ? Math.max(0, Math.floor(response.runtimeSeconds)) : 0)
    })
  })
}

export function isAvailabilityFresh(value: ChecklistAvailability | undefined): boolean {
  const ttl = value?.status === "unknown" ? 30 * 60 * 1000 : AVAILABILITY_TTL_MS
  return Boolean(value?.checkedAt && Date.now() - value.checkedAt < ttl)
}

export function reuseAvailability(item: ChecklistItem, source: ChecklistAvailability): ChecklistAvailability {
  const result: ChecklistAvailability = {
    ...source,
    key: checklistItemKey(item.kind, item.id),
    fingerprint: checklistFingerprint(item),
    referenceRuntimeSeconds: item.runtimeSeconds || source.referenceRuntimeSeconds,
  }
  result.completeness = "unknown"
  if (result.status !== "available" || !result.referenceRuntimeSeconds || !result.biliRuntimeSeconds) {
    if (result.status === "available") {
      result.completeness = "unverifiable"
      result.note = "已完成片源确认，但缺少可比对的标准片长，无法判断版本完整性"
    }
    return result
  }
  const difference = result.biliRuntimeSeconds - result.referenceRuntimeSeconds
  const tolerance = Math.max(180, result.referenceRuntimeSeconds * 0.025)
  if (difference >= -tolerance) {
    result.completeness = "runtime_match"
    result.note = difference > tolerance
      ? "B站片长大于完整版参考时长，按规则判定为未删减；较长部分可能来自片头、片尾或附加内容"
      : "B站片长与完整版参考时长在容差内一致，按规则判定为未删减"
  } else {
    result.completeness = "possibly_cut"
    result.note = "B站片长明显短于完整版参考时长，按规则判定为已删减"
  }
  return result
}

export async function hydrateAvailabilityVersion(item: ChecklistItem, source: ChecklistAvailability): Promise<ChecklistAvailability> {
  const legacyOfficialPage = source.status === "unavailable"
    && source.note === "B站官方页面存在，但当前未提供可播放正片"
    && Boolean(source.biliUrl)
  const result = reuseAvailability(item, legacyOfficialPage ? { ...source, status: "available" } : source)
  result.checkedAt = Date.now()
  if (!result.referenceRuntimeSeconds) result.referenceRuntimeSeconds = item.runtimeSeconds || await requestReferenceRuntime(item)
  if (result.status !== "available") return result
  const linkedSeasonId = Number(result.biliUrl.match(/\/ss(\d+)/)?.[1] || 0)
  const linkedEpisodeId = Number(result.biliUrl.match(/\/ep(\d+)/)?.[1] || 0)
  if (!result.biliRuntimeSeconds && (result.seasonId || linkedSeasonId || linkedEpisodeId)) {
    try {
      const season = await getSeason(result.seasonId || linkedSeasonId, linkedEpisodeId)
      result.seasonId = Number(season.season_id || result.seasonId || linkedSeasonId)
      const episodes = Array.isArray(season.episodes) ? season.episodes : []
      const playableEpisodes = playableMovieEpisodes(episodes)
      if (!playableEpisodes.length) {
        if (hasOfficialMovieListing(season)) {
          result.status = "available"
          result.completeness = "unverifiable"
          result.note = "已确认B站官方正片页可观看；接口未返回正片时长，无法判断版本完整性"
        } else {
          result.status = "unavailable"
          result.completeness = "unknown"
          result.biliRuntimeSeconds = 0
          result.note = "B站官方页面存在，但当前未提供可播放正片"
        }
        return result
      }
      const firstPlayable = playableEpisodes.find((episode) => episode.link || episode.share_url)
      if (firstPlayable) result.biliUrl = plainText(firstPlayable.share_url || firstPlayable.link) || result.biliUrl
      compareVersion(playableEpisodes, result)
      return result
    } catch (caught) {
      result.note = caught instanceof Error ? `已确认B站官方收录；${caught.message}` : "已确认B站官方收录，版本详情待重试"
      return result
    }
  }
  compareVersion(result.biliRuntimeSeconds ? [{ duration: result.biliRuntimeSeconds * 1000 }] : [], result)
  return result
}

export async function checkBilibiliAvailability(item: ChecklistItem): Promise<ChecklistAvailability> {
  const result = baseResult(item)
  const keywords = [...new Set([item.title.trim(), item.originalTitle.trim()].filter(Boolean))]
  const collected: PgcSearchItem[] = []

  try {
    for (const keyword of keywords) {
      collected.push(...await searchPgc(keyword, "media_ft"))
      if (collected.some((candidate) => scoreResult(item, candidate) >= 0.92)) break
      collected.push(...await searchPgc(keyword, "media_bangumi"))
      if (collected.some((candidate) => scoreResult(item, candidate) >= 0.92)) break
    }
  } catch (caught) {
    result.note = caught instanceof Error ? caught.message : "B站检查失败，稍后会自动重试"
    return result
  }

  const candidates = collected
    .map((candidate) => ({ candidate, score: scoreResult(item, candidate) }))
    .filter(({ candidate, score }) => Boolean(candidate.season_id) && score >= 0.76)
    .sort((left, right) => right.score - left.score)
  const best = candidates[0]
  if (!best) {
    result.status = "unavailable"
    result.confidence = "high"
    result.note = "B站官方影视目录未匹配到该作品"
    return result
  }

  const seasonId = Number(best.candidate.season_id || 0)
  result.status = "available"
  result.confidence = best.score >= 0.92 ? "high" : "medium"
  result.biliTitle = plainText(best.candidate.title)
  result.seasonId = seasonId
  result.biliUrl = biliUrl(best.candidate, seasonId)

  try {
    const season = await getSeason(seasonId)
    result.biliTitle = plainText(season.title) || result.biliTitle
    const episodes = Array.isArray(season.episodes) ? season.episodes : []
    const playableEpisodes = playableMovieEpisodes(episodes)
    if (!playableEpisodes.length) {
      if (hasOfficialMovieListing(season)) {
        result.status = "available"
        result.completeness = "unverifiable"
        result.note = "已确认B站官方正片页可观看；接口未返回正片时长，无法判断版本完整性"
      } else {
        result.status = "unavailable"
        result.completeness = "unknown"
        result.biliRuntimeSeconds = 0
        result.note = "B站官方页面存在，但当前未提供可播放正片"
      }
      return result
    }
    const firstPlayable = playableEpisodes.find((episode) => episode.link || episode.share_url)
    if (firstPlayable) result.biliUrl = plainText(firstPlayable.share_url || firstPlayable.link) || result.biliUrl
    if (!result.referenceRuntimeSeconds) result.referenceRuntimeSeconds = await requestReferenceRuntime(item)
    compareVersion(playableEpisodes, result)
  } catch (caught) {
    result.note = caught instanceof Error ? `已确认B站官方收录；${caught.message}` : "已确认B站官方收录，版本详情待重试"
  }
  return result
}
