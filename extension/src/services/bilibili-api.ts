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

export async function fetchMomentsItems(): Promise<DynamicItem[]> {
  const targetVideoCount = 400
  const maxPages = 30
  let offset = ""
  let page = 0
  let hasMore = true

  const merged: DynamicItem[] = []
  const seen = new Set<string>()

  while (hasMore && page < maxPages && merged.length < targetVideoCount) {
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
    for (const item of items) {
      const id = typeof item.id_str === "string" ? item.id_str : ""
      if (!id || seen.has(id)) {
        continue
      }
      seen.add(id)
      merged.push(item)
    }

    offset = typeof payload.data?.offset === "string" ? payload.data.offset : ""
    hasMore = Boolean(payload.data?.has_more && offset)
    page += 1
  }

  return merged.slice(0, targetVideoCount)
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
