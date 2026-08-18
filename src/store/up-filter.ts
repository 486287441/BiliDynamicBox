import { defineStore } from "pinia"

import { buildUpVideoBundle, type SpaceArchiveInput } from "../domain/up-video-bundle"
import type { UpCreator, UpFollowSort } from "../domain/up-filter-types"
import type { VideoDynamicCard } from "../domain/types"
import {
  fetchFollowingsPage,
  fetchLoggedInUser,
  fetchUpCreatorBundle,
  unfollowUp,
} from "../services/bilibili-api"
import { readPersistedState } from "../services/storage"

const PAGE_SIZE = 20
const REQUEST_INTERVAL_MS = 2500
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000
const CACHE_KEY = "billnext:up-creator-cache-v2"
const RISK_BLOCK_KEY = "billnext:up-risk-blocked-until-v1"
const RISK_COOLDOWN_MS = 10 * 60 * 1000

interface CachedCreatorBundle {
  recentArchives: SpaceArchiveInput[]
  mostPlayedArchive?: SpaceArchiveInput
  cachedAt: number
}

interface UpFilterState {
  loading: boolean
  loadingMore: boolean
  error: string | null
  sort: UpFollowSort
  page: number
  total: number
  hasMore: boolean
  myMid: string
  creators: UpCreator[]
  bootstrapped: boolean
  unfollowingMid: string | null
}

let requestTail: Promise<void> = Promise.resolve()
let nextRequestAt = 0
let riskBlockedUntil = readRiskBlockedUntil()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function readRiskBlockedUntil(): number {
  const value = Number(localStorage.getItem(RISK_BLOCK_KEY))
  return Number.isFinite(value) && value > Date.now() ? value : 0
}

function blockRequestsAfterRisk(): void {
  riskBlockedUntil = Date.now() + RISK_COOLDOWN_MS
  try {
    localStorage.setItem(RISK_BLOCK_KEY, String(riskBlockedUntil))
  } catch {
    // 存储失败时仍保留当前页面内的熔断。
  }
}

function isRiskControlError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /(?:-?352|-?412|风控|请求被拦截|访问权限)/i.test(message)
}

function enqueueRequest<T>(task: () => Promise<T>): Promise<T> {
  const run = requestTail.then(async () => {
    const now = Date.now()
    if (riskBlockedUntil > now) {
      const seconds = Math.ceil((riskBlockedUntil - now) / 1000)
      throw new Error(`B 站接口正在冷却，请约 ${seconds} 秒后重试`)
    }
    const waitMs = Math.max(0, nextRequestAt - now)
    if (waitMs > 0) {
      await sleep(waitMs)
    }
    try {
      return await task()
    } catch (error) {
      if (isRiskControlError(error)) {
        blockRequestsAfterRisk()
      }
      throw error
    } finally {
      nextRequestAt = Date.now() + REQUEST_INTERVAL_MS
    }
  })
  requestTail = run.then(() => undefined, () => undefined)
  return run
}

function readCache(): Record<string, CachedCreatorBundle> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, CachedCreatorBundle>
    const now = Date.now()
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) =>
        value && typeof value.cachedAt === "number" && now - value.cachedAt < CACHE_MAX_AGE_MS,
      ),
    )
  } catch {
    return {}
  }
}

function writeCache(mid: string, bundle: Omit<CachedCreatorBundle, "cachedAt">): void {
  try {
    const cache = readCache()
    cache[mid] = { ...bundle, cachedAt: Date.now() }
    const entries = Object.entries(cache)
      .sort((left, right) => right[1].cachedAt - left[1].cachedAt)
      .slice(0, 300)
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    // 缓存失败不影响主流程。
  }
}

function wantedArchiveFor(mid: string): SpaceArchiveInput | undefined {
  const cards = readPersistedState().wantWatchCards
  const card = [...cards].reverse().find((item) => item.upMid === mid)
  return card ? dynamicCardToArchive(card) : undefined
}

function dynamicCardToArchive(card: VideoDynamicCard): SpaceArchiveInput {
  return {
    bvid: card.videoBvid,
    aid: card.videoAid,
    title: card.title,
    cover: card.cover,
    durationText: card.durationText,
    playCount: card.playCount,
    danmakuCount: card.danmakuCount,
    publishAt: card.publishAt,
  }
}

function videosFromBundle(mid: string, bundle: CachedCreatorBundle) {
  return buildUpVideoBundle(
    bundle.recentArchives,
    bundle.mostPlayedArchive,
    wantedArchiveFor(mid),
  )
}

function createCreator(user: {
  mid: string
  name: string
  face: string
  sign: string
  followedAt: number
}): UpCreator {
  return {
    ...user,
    followerCount: 0,
    videos: [],
    detailsLoaded: false,
    videosLoading: false,
    videosError: null,
  }
}

export const useUpFilterStore = defineStore("up-filter", {
  state: (): UpFilterState => ({
    loading: false,
    loadingMore: false,
    error: null,
    sort: "frequent",
    page: 0,
    total: 0,
    hasMore: false,
    myMid: "",
    creators: [],
    bootstrapped: false,
    unfollowingMid: null,
  }),
  actions: {
    resetState() {
      this.loading = false
      this.loadingMore = false
      this.error = null
      this.page = 0
      this.total = 0
      this.hasMore = false
      this.creators = []
      this.bootstrapped = false
    },

    setSort(sort: UpFollowSort) {
      if (this.sort === sort) return
      this.sort = sort
      this.resetState()
      void this.bootstrap()
    },

    patchCreator(mid: string, patch: Partial<UpCreator>) {
      const index = this.creators.findIndex((creator) => creator.mid === mid)
      if (index < 0) return
      const next = [...this.creators]
      next[index] = { ...next[index], ...patch }
      this.creators = next
    },

    async loadCreatorDetails(mid: string, force = false): Promise<void> {
      const creator = this.creators.find((item) => item.mid === mid)
      if (!creator || creator.videosLoading || (creator.detailsLoaded && !force)) return

      const cached = readCache()[mid]
      if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        this.patchCreator(mid, {
          videos: videosFromBundle(mid, cached),
          detailsLoaded: true,
          videosLoading: false,
          videosError: null,
        })
        return
      }

      this.patchCreator(mid, { videosLoading: true, videosError: null })
      try {
        const bundle = await enqueueRequest(() => fetchUpCreatorBundle(mid))
        writeCache(mid, bundle)
        this.patchCreator(mid, {
          videos: videosFromBundle(mid, { ...bundle, cachedAt: Date.now() }),
          detailsLoaded: true,
          videosLoading: false,
          videosError: null,
        })
      } catch (error) {
        if (cached) {
          this.patchCreator(mid, {
            videos: videosFromBundle(mid, cached),
            detailsLoaded: true,
            videosLoading: false,
            videosError: null,
          })
          return
        }
        this.patchCreator(mid, {
          videosLoading: false,
          videosError: error instanceof Error ? error.message : "加载视频失败",
        })
      }
    },

    async loadFollowingPage(page: number): Promise<void> {
      const result = await fetchFollowingsPage(this.myMid, page, PAGE_SIZE, this.sort)
      const known = new Set(this.creators.map((item) => item.mid))
      const additions = result.list.filter((item) => !known.has(item.mid)).map(createCreator)
      this.creators = [...this.creators, ...additions]
      this.page = page
      this.total = result.total
      this.hasMore = result.hasMore
    },

    refreshWantedVideos(): void {
      const cache = readCache()
      for (const creator of this.creators) {
        if (!creator.detailsLoaded || !cache[creator.mid]) continue
        this.patchCreator(creator.mid, { videos: videosFromBundle(creator.mid, cache[creator.mid]) })
      }
    },

    async bootstrap(): Promise<void> {
      if (this.loading || this.bootstrapped) return
      this.loading = true
      this.error = null
      try {
        if (!this.myMid) this.myMid = (await fetchLoggedInUser()).mid
        await this.loadFollowingPage(1)
        this.bootstrapped = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : "加载关注列表失败"
      } finally {
        this.loading = false
      }
    },

    async loadMore(): Promise<void> {
      if (this.loadingMore || !this.hasMore) return
      this.loadingMore = true
      try {
        await this.loadFollowingPage(this.page + 1)
      } catch (error) {
        this.error = error instanceof Error ? error.message : "加载更多关注失败"
      } finally {
        this.loadingMore = false
      }
    },

    async unfollow(mid: string): Promise<void> {
      if (this.unfollowingMid) return
      this.unfollowingMid = mid
      try {
        await unfollowUp(mid)
        this.removeCreator(mid)
      } finally {
        this.unfollowingMid = null
      }
    },

    removeCreator(mid: string) {
      if (!this.creators.some((creator) => creator.mid === mid)) return
      this.creators = this.creators.filter((creator) => creator.mid !== mid)
      this.total = Math.max(0, this.total - 1)
    },
  },
})

export type { UpFollowSort }
