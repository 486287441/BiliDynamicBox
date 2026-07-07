import type { DynamicItem } from "../domain/types"
import type { VideoDynamicCard } from "../domain/types"
import type { UpFollowSort } from "../domain/up-filter-types"
import type { SpaceArchiveInput } from "../domain/up-video-bundle"
import { invalidateWbiKeys, signWbiParams } from "./wbi-sign"

export type { UpFollowSort }

interface MomentsApiResponse {
  code?: number
  data?: {
    items?: DynamicItem[]
    offset?: string
    has_more?: boolean
  }
}

export interface MomentsPageResult {
  items: DynamicItem[]
  nextOffset: string
  hasMore: boolean
}

export async function fetchMomentsPage(offset = ""): Promise<MomentsPageResult> {
  const url = new URL("https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all")
  url.searchParams.set("type", "video")
  if (offset) {
    url.searchParams.set("offset", offset)
  }

  const response = await fetch(url.toString(), {
    credentials: "include",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch moments: ${response.status}`)
  }

  const payload = (await response.json()) as MomentsApiResponse
  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new Error(`Moments API error code: ${payload.code}`)
  }

  const items = Array.isArray(payload.data?.items) ? payload.data.items : []
  const nextOffset = typeof payload.data?.offset === "string" ? payload.data.offset : ""
  const hasMore = Boolean(payload.data?.has_more && nextOffset)

  return {
    items,
    nextOffset,
    hasMore,
  }
}

interface CommonApiResponse {
  code: number
  message?: string
}

function getCsrfTokenFromCookie(): string {
  const cookies = document.cookie.split(";")
  for (const segment of cookies) {
    const [key, value] = segment.split("=")
    if (key?.trim() === "bili_jct") {
      return decodeURIComponent((value ?? "").trim())
    }
  }
  return ""
}

export async function saveToWatchLater(card: VideoDynamicCard): Promise<void> {
  const aid = Number(card.videoAid)
  if (!Number.isFinite(aid) || aid <= 0) {
    throw new Error("视频 aid 无效")
  }

  const csrf = getCsrfTokenFromCookie()
  if (!csrf) {
    throw new Error("缺少登录凭证")
  }

  const payload = new URLSearchParams()
  payload.set("aid", String(aid))
  payload.set("csrf", csrf)

  const response = await fetch("https://api.bilibili.com/x/v2/history/toview/add", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    throw new Error(`接口请求失败: ${response.status}`)
  }

  const result = (await response.json()) as CommonApiResponse
  if (result.code !== 0) {
    throw new Error(result.message || `接口错误: ${result.code}`)
  }
}

export async function unfollowUp(upMid: string): Promise<void> {
  const mid = Number(upMid)
  if (!Number.isFinite(mid) || mid <= 0) {
    throw new Error("UP 主 mid 无效")
  }

  const csrf = getCsrfTokenFromCookie()
  if (!csrf) {
    throw new Error("缺少登录凭证")
  }

  const payload = new URLSearchParams()
  payload.set("fid", String(mid))
  payload.set("act", "2")
  payload.set("re_src", "11")
  payload.set("jsonp", "jsonp")
  payload.set("csrf", csrf)

  const response = await fetch("https://api.bilibili.com/x/relation/modify", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    throw new Error(`接口请求失败: ${response.status}`)
  }

  const result = (await response.json()) as CommonApiResponse
  if (result.code !== 0) {
    throw new Error(result.message || `接口错误: ${result.code}`)
  }
}

export interface LoggedInUser {
  mid: string
  name: string
  face: string
}

export async function fetchLoggedInUser(): Promise<LoggedInUser> {
  const response = await fetch("https://api.bilibili.com/x/web-interface/nav", {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error(`获取登录信息失败: ${response.status}`)
  }

  const payload = (await response.json()) as {
    code?: number
    message?: string
    data?: {
      isLogin?: boolean
      mid?: number
      uname?: string
      face?: string
    }
  }

  if (payload.code !== 0) {
    throw new Error(payload.message || "获取登录信息失败")
  }
  if (!payload.data?.isLogin || !payload.data.mid) {
    throw new Error("请先登录 B 站账号")
  }

  return {
    mid: String(payload.data.mid),
    name: payload.data.uname ?? "",
    face: payload.data.face ?? "",
  }
}

export interface FollowingUser {
  mid: string
  name: string
  face: string
  sign: string
  followedAt: number
}

export interface FollowingsPageResult {
  list: FollowingUser[]
  total: number
  hasMore: boolean
}

export async function fetchFollowingsPage(
  vmid: string,
  page: number,
  pageSize: number,
  sort: UpFollowSort,
): Promise<FollowingsPageResult> {
  const url = new URL("https://api.bilibili.com/x/relation/followings")
  url.searchParams.set("vmid", vmid)
  url.searchParams.set("pn", String(page))
  url.searchParams.set("ps", String(pageSize))
  url.searchParams.set("order", "desc")
  if (sort === "frequent") {
    url.searchParams.set("order_type", "attention")
  }

  const response = await fetch(url.toString(), {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error(`获取关注列表失败: ${response.status}`)
  }

  const payload = (await response.json()) as {
    code?: number
    message?: string
    data?: {
      list?: Array<{
        mid?: number
        uname?: string
        face?: string
        sign?: string
        mtime?: number
      }>
      total?: number
    }
  }

  if (payload.code !== 0) {
    throw new Error(payload.message || `获取关注列表失败: ${payload.code}`)
  }

  const rawList = Array.isArray(payload.data?.list) ? payload.data.list : []
  const total = typeof payload.data?.total === "number" ? payload.data.total : rawList.length
  const list: FollowingUser[] = rawList
    .map((item) => {
      const mid = item.mid
      if (typeof mid !== "number" || mid <= 0) {
        return null
      }
      return {
        mid: String(mid),
        name: item.uname ?? "",
        face: item.face ?? "",
        sign: item.sign ?? "",
        followedAt: typeof item.mtime === "number" ? item.mtime : 0,
      }
    })
    .filter((item): item is FollowingUser => item !== null)

  return {
    list,
    total,
    hasMore: page * pageSize < total,
  }
}

export async function fetchUserFollowerCount(mid: string): Promise<number> {
  const url = new URL("https://api.bilibili.com/x/relation/stat")
  url.searchParams.set("vmid", mid)

  const response = await fetch(url.toString(), {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error(`获取粉丝数失败: ${response.status}`)
  }

  const payload = (await response.json()) as {
    code?: number
    data?: {
      follower?: number
    }
  }

  if (payload.code !== 0) {
    return 0
  }

  const follower = payload.data?.follower
  return typeof follower === "number" && follower > 0 ? follower : 0
}

function normalizeDurationText(length: unknown, durationText: unknown): string {
  if (typeof durationText === "string" && durationText.trim()) {
    return durationText.trim()
  }
  const seconds = typeof length === "number" ? length : Number(length)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return ""
  }
  const total = Math.floor(seconds)
  const minute = Math.floor(total / 60)
  const second = total % 60
  return `${minute}:${String(second).padStart(2, "0")}`
}

function mapSpaceArchive(item: Record<string, unknown>): SpaceArchiveInput | null {
  const bvid = typeof item.bvid === "string" ? item.bvid : ""
  const aidRaw = item.aid
  const aid = typeof aidRaw === "number" || typeof aidRaw === "string" ? String(aidRaw) : ""
  if (!bvid && !aid) {
    return null
  }

  const title = typeof item.title === "string" ? item.title : ""
  const pic = typeof item.pic === "string" ? item.pic : ""
  const created = typeof item.created === "number" ? item.created : Number(item.pubdate)
  const stat = item.stat && typeof item.stat === "object" ? (item.stat as Record<string, unknown>) : {}
  const playRaw = item.play ?? stat.view ?? stat.play ?? 0
  const play = typeof playRaw === "number" ? playRaw : Number(playRaw)
  const danmakuRaw = item.video_review ?? stat.danmaku ?? 0
  const danmaku = typeof danmakuRaw === "number" ? danmakuRaw : Number(danmakuRaw)

  return {
    bvid,
    aid,
    title,
    cover: pic,
    durationText: normalizeDurationText(item.length, item.duration),
    playCount: Number.isFinite(play) && play > 0 ? Math.floor(play) : 0,
    danmakuCount: Number.isFinite(danmaku) && danmaku > 0 ? Math.floor(danmaku) : 0,
    publishAt: Number.isFinite(created) && created > 0 ? Math.floor(created) : 0,
  }
}

function extractSpaceVlist(payload: {
  data?: {
    list?: Array<Record<string, unknown>> | { vlist?: Array<Record<string, unknown>> }
  }
}): Array<Record<string, unknown>> {
  const list = payload.data?.list
  if (Array.isArray(list)) {
    return list
  }
  if (list && typeof list === "object" && Array.isArray(list.vlist)) {
    return list.vlist
  }
  return []
}

function parseSpaceArchivePayload(payload: {
  code?: number
  message?: string
  data?: {
    list?: Array<Record<string, unknown>> | { vlist?: Array<Record<string, unknown>> }
  }
}): SpaceArchiveInput[] {
  if (payload.code !== 0) {
    throw new Error(payload.message || `获取投稿失败: ${payload.code}`)
  }

  return extractSpaceVlist(payload)
    .map((item) => mapSpaceArchive(item))
    .filter((item): item is SpaceArchiveInput => item !== null)
}

async function fetchSpaceArchivesPage(
  mid: string,
  page: number,
  pageSize: number,
): Promise<SpaceArchiveInput[]> {
  const params = {
    mid,
    pn: page,
    ps: pageSize,
    tid: 0,
    order: "pubdate",
    platform: "web",
    web_location: 1550101,
  }

  async function requestWithWbi(retry: boolean): Promise<SpaceArchiveInput[]> {
    const query = await signWbiParams(params)
    const response = await fetch(`https://api.bilibili.com/x/space/wbi/arc/search?${query.toString()}`, {
      credentials: "include",
      headers: {
        Referer: `https://space.bilibili.com/${mid}`,
      },
    })
    if (!response.ok) {
      throw new Error(`获取投稿失败: ${response.status}`)
    }

    const payload = (await response.json()) as {
      code?: number
      message?: string
      data?: {
        list?: Array<Record<string, unknown>> | { vlist?: Array<Record<string, unknown>> }
      }
    }

    if ((payload.code === -352 || payload.code === -403) && retry) {
      invalidateWbiKeys()
      return requestWithWbi(false)
    }

    return parseSpaceArchivePayload(payload)
  }

  try {
    return await requestWithWbi(true)
  } catch {
    const legacyUrl = new URL("https://api.bilibili.com/x/space/arc/search")
    legacyUrl.searchParams.set("mid", mid)
    legacyUrl.searchParams.set("pn", String(page))
    legacyUrl.searchParams.set("ps", String(pageSize))
    legacyUrl.searchParams.set("order", "pubdate")
    legacyUrl.searchParams.set("tid", "0")

    const response = await fetch(legacyUrl.toString(), {
      credentials: "include",
      headers: {
        Referer: `https://space.bilibili.com/${mid}`,
      },
    })
    if (!response.ok) {
      throw new Error(`获取投稿失败: ${response.status}`)
    }

    const payload = (await response.json()) as {
      code?: number
      message?: string
      data?: {
        list?: Array<Record<string, unknown>> | { vlist?: Array<Record<string, unknown>> }
      }
    }

    return parseSpaceArchivePayload(payload)
  }
}

export async function fetchUpCreatorBundle(mid: string): Promise<{
  followerCount: number
  recentArchives: SpaceArchiveInput[]
}> {
  const followerCount = await fetchUserFollowerCount(mid)
  const recentArchives = await fetchSpaceArchivesPage(mid, 1, 30)
  return {
    followerCount,
    recentArchives,
  }
}

export async function followUp(upMid: string): Promise<void> {
  const mid = Number(upMid)
  if (!Number.isFinite(mid) || mid <= 0) {
    throw new Error("UP 主 mid 无效")
  }

  const csrf = getCsrfTokenFromCookie()
  if (!csrf) {
    throw new Error("缺少登录凭证")
  }

  const payload = new URLSearchParams()
  payload.set("fid", String(mid))
  payload.set("act", "1")
  payload.set("re_src", "11")
  payload.set("jsonp", "jsonp")
  payload.set("csrf", csrf)

  const response = await fetch("https://api.bilibili.com/x/relation/modify", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    throw new Error(`接口请求失败: ${response.status}`)
  }

  const result = (await response.json()) as CommonApiResponse
  if (result.code !== 0) {
    throw new Error(result.message || `接口错误: ${result.code}`)
  }
}
