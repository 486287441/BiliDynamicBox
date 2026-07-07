import { defineStore } from "pinia"

import { buildUpVideoBundle, type SpaceArchiveInput } from "../domain/up-video-bundle"
import type { UpCreator, UpFollowSort } from "../domain/up-filter-types"
import {
  fetchFollowingsPage,
  fetchLoggedInUser,
  fetchUpCreatorBundle,
  unfollowUp,
} from "../services/bilibili-api"

/** 仅展示前 3 位关注，降低 B 站接口风控风险 */
const PAGE_SIZE = 3
const VIDEO_REQUEST_INTERVAL_MS = 1200
const CREATOR_CACHE_TTL_MS = 30 * 60 * 1000

interface CachedCreatorBundle {
  followerCount: number
  recentArchives: SpaceArchiveInput[]
  cachedAt: number
}

interface UpFilterState {
  loading: boolean
  error: string | null
  sort: UpFollowSort
  total: number
  myMid: string
  creators: UpCreator[]
  bootstrapped: boolean
  unfollowingMid: string | null
}

const creatorBundleCache = new Map<string, CachedCreatorBundle>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function readCreatorCache(mid: string): CachedCreatorBundle | null {
  const cached = creatorBundleCache.get(mid)
  if (!cached) {
    return null
  }
  if (Date.now() - cached.cachedAt > CREATOR_CACHE_TTL_MS) {
    creatorBundleCache.delete(mid)
    return null
  }
  return cached
}

function writeCreatorCache(mid: string, bundle: Omit<CachedCreatorBundle, "cachedAt">): void {
  creatorBundleCache.set(mid, {
    ...bundle,
    cachedAt: Date.now(),
  })
}

function createCreatorFromFollowing(user: {
  mid: string
  name: string
  face: string
  sign: string
  followedAt: number
}): UpCreator {
  return {
    mid: user.mid,
    name: user.name,
    face: user.face,
    sign: user.sign,
    followerCount: 0,
    followedAt: user.followedAt,
    videos: [],
    videosLoading: true,
    videosError: null,
  }
}

export const useUpFilterStore = defineStore("up-filter", {
  state: (): UpFilterState => ({
    loading: false,
    error: null,
    sort: "recent",
    total: 0,
    myMid: "",
    creators: [],
    bootstrapped: false,
    unfollowingMid: null,
  }),
  actions: {
    resetState() {
      this.loading = false
      this.error = null
      this.total = 0
      this.creators = []
      this.bootstrapped = false
    },

    setSort(sort: UpFollowSort) {
      if (this.sort === sort) {
        return
      }
      this.sort = sort
      this.resetState()
      void this.bootstrap()
    },

    patchCreator(mid: string, patch: Partial<UpCreator>) {
      const index = this.creators.findIndex((creator) => creator.mid === mid)
      if (index < 0) {
        return
      }
      const next = [...this.creators]
      next[index] = {
        ...next[index],
        ...patch,
      }
      this.creators = next
    },

    async loadCreatorDetails(mid: string): Promise<void> {
      const cached = readCreatorCache(mid)
      if (cached) {
        this.patchCreator(mid, {
          followerCount: cached.followerCount,
          videos: buildUpVideoBundle(cached.recentArchives),
          videosLoading: false,
          videosError: null,
        })
        return
      }

      try {
        const bundle = await fetchUpCreatorBundle(mid)
        writeCreatorCache(mid, bundle)
        this.patchCreator(mid, {
          followerCount: bundle.followerCount,
          videos: buildUpVideoBundle(bundle.recentArchives),
          videosLoading: false,
          videosError: null,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载视频失败"
        this.patchCreator(mid, {
          videosLoading: false,
          videosError: message,
        })
      }
    },

    async loadCreatorDetailsBatch(mids: string[]): Promise<void> {
      for (const mid of mids) {
        await this.loadCreatorDetails(mid)
        if (VIDEO_REQUEST_INTERVAL_MS > 0) {
          await sleep(VIDEO_REQUEST_INTERVAL_MS)
        }
      }
    },

    async bootstrap(): Promise<void> {
      if (this.loading) {
        return
      }

      this.resetState()
      this.loading = true
      this.error = null

      try {
        if (!this.myMid) {
          const user = await fetchLoggedInUser()
          this.myMid = user.mid
        }

        const result = await fetchFollowingsPage(this.myMid, 1, PAGE_SIZE, this.sort)
        const creators = result.list.map(createCreatorFromFollowing)
        this.creators = creators
        this.total = result.total
        this.bootstrapped = true
        this.error = null

        await this.loadCreatorDetailsBatch(creators.map((creator) => creator.mid))
      } catch (error) {
        this.error = error instanceof Error ? error.message : "加载关注列表失败"
      } finally {
        this.loading = false
      }
    },

    async unfollow(mid: string): Promise<void> {
      if (this.unfollowingMid) {
        return
      }

      this.unfollowingMid = mid
      try {
        await unfollowUp(mid)
        this.removeCreator(mid)
      } finally {
        this.unfollowingMid = null
      }
    },

    removeCreator(mid: string) {
      if (!this.creators.some((creator) => creator.mid === mid)) {
        return
      }
      creatorBundleCache.delete(mid)
      this.creators = this.creators.filter((creator) => creator.mid !== mid)
      this.total = Math.max(0, this.total - 1)
    },
  },
})

export type { UpFollowSort }
