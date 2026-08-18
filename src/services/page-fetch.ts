const FETCH_REQUEST_EVENT = "bewly:fetch-request"
const FETCH_RESPONSE_EVENT = "bewly:fetch-response"
const PAGE_FETCH_TIMEOUT_MS = 30000

interface PageFetchResponseDetail {
  id: number
  ok: boolean
  status: number
  statusText: string
  bodyText: string
  error?: string
}

interface PendingPageFetch {
  resolve: (response: Response) => void
  reject: (error: Error) => void
}

const pendingPageFetches = new Map<number, PendingPageFetch>()
let pageFetchListenerReady = false
let nextPageFetchId = 1

function ensurePageFetchListener(): void {
  if (pageFetchListenerReady) {
    return
  }
  pageFetchListenerReady = true

  document.addEventListener(FETCH_RESPONSE_EVENT, (event) => {
    const detail = (event as CustomEvent<PageFetchResponseDetail>).detail
    if (!detail || typeof detail.id !== "number") {
      return
    }

    const pending = pendingPageFetches.get(detail.id)
    if (!pending) {
      return
    }
    pendingPageFetches.delete(detail.id)

    if (detail.error) {
      pending.reject(new Error(detail.error))
      return
    }

    pending.resolve(
      new Response(detail.bodyText, {
        status: detail.status,
        statusText: detail.statusText,
      }),
    )
  })
}

function normalizeHeaders(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {}
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return { ...headers }
}

/** 在页面 MAIN 世界发起 fetch，绕过部分接口对 Content Script 的风控（如 412）。 */
export async function pageFetch(url: string, init: RequestInit = {}): Promise<Response> {
  ensurePageFetchListener()

  const id = nextPageFetchId
  nextPageFetchId += 1

  return new Promise<Response>((resolve, reject) => {
    pendingPageFetches.set(id, { resolve, reject })

    document.dispatchEvent(
      new CustomEvent(FETCH_REQUEST_EVENT, {
        bubbles: true,
        composed: true,
        detail: {
          id,
          url,
          init: {
            method: init.method ?? "GET",
            headers: normalizeHeaders(init.headers),
          },
        },
      }),
    )

    window.setTimeout(() => {
      if (!pendingPageFetches.has(id)) {
        return
      }
      pendingPageFetches.delete(id)
      reject(new Error("页面请求超时"))
    }, PAGE_FETCH_TIMEOUT_MS)
  })
}
