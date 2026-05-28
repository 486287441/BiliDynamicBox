import type { DynamicItem } from "../domain/types"
import type { VideoDynamicCard } from "../domain/types"

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
