import type { MomentsPageResult } from "./bilibili-api"
import { fetchMomentsPage } from "./bilibili-api"

export type InboxFirstPagePreload =
  | { ok: true; page: MomentsPageResult }
  | { ok: false; error: string }

let preloadPromise: Promise<InboxFirstPagePreload> | null = null
let cachedPreload: InboxFirstPagePreload | null = null

export function clearInboxFirstPagePreload(): void {
  preloadPromise = null
  cachedPreload = null
}

export function startInboxFirstPagePreload(): void {
  if (preloadPromise || cachedPreload) {
    return
  }

  preloadPromise = (async (): Promise<InboxFirstPagePreload> => {
    try {
      const page = await fetchMomentsPage()
      const result: InboxFirstPagePreload = { ok: true, page }
      cachedPreload = result
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      const result: InboxFirstPagePreload = { ok: false, error: message }
      cachedPreload = result
      return result
    } finally {
      preloadPromise = null
    }
  })()
}

export async function waitInboxFirstPagePreload(): Promise<InboxFirstPagePreload> {
  if (cachedPreload) {
    return cachedPreload
  }
  if (!preloadPromise) {
    startInboxFirstPagePreload()
  }
  return preloadPromise as Promise<InboxFirstPagePreload>
}

/** 取出预加载结果（单次有效），供 inbox store 灌入首屏 */
export function takeInboxFirstPagePreload(): InboxFirstPagePreload | null {
  const value = cachedPreload
  cachedPreload = null
  return value
}
