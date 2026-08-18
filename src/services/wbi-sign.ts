import { md5 } from "../utils/md5"

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28,
  14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21,
  56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
]

interface WbiKeyCache {
  imgKey: string
  subKey: string
  fetchedAt: number
}

let wbiKeyCache: WbiKeyCache | null = null
const WBI_KEY_TTL_MS = 30 * 60 * 1000

function getMixinKey(raw: string): string {
  return MIXIN_KEY_ENC_TAB.map((index) => raw[index]).join("").slice(0, 32)
}

function extractWbiKey(url: string): string {
  const fileName = url.slice(url.lastIndexOf("/") + 1)
  return fileName.replace(/\.(png|jpg|webp)$/i, "")
}

async function fetchWbiKeys(force = false): Promise<WbiKeyCache> {
  const now = Date.now()
  if (!force && wbiKeyCache && now - wbiKeyCache.fetchedAt < WBI_KEY_TTL_MS) {
    return wbiKeyCache
  }

  const response = await fetch("https://api.bilibili.com/x/web-interface/nav", {
    credentials: "include",
  })
  if (!response.ok) {
    throw new Error(`获取 WBI 密钥失败: ${response.status}`)
  }

  const payload = (await response.json()) as {
    code?: number
    data?: {
      wbi_img?: {
        img_url?: string
        sub_url?: string
      }
    }
  }

  const imgUrl = payload.data?.wbi_img?.img_url ?? ""
  const subUrl = payload.data?.wbi_img?.sub_url ?? ""
  if (!imgUrl || !subUrl) {
    throw new Error("WBI 密钥缺失")
  }

  wbiKeyCache = {
    imgKey: extractWbiKey(imgUrl),
    subKey: extractWbiKey(subUrl),
    fetchedAt: now,
  }
  return wbiKeyCache
}

export function invalidateWbiKeys(): void {
  wbiKeyCache = null
}

export async function signWbiParams(params: Record<string, string | number>): Promise<URLSearchParams> {
  const keys = await fetchWbiKeys()
  const mixinKey = getMixinKey(keys.imgKey + keys.subKey)
  const wts = Math.round(Date.now() / 1000)
  const signedParams: Record<string, string> = {
    wts: String(wts),
  }

  for (const [key, value] of Object.entries(params)) {
    signedParams[key] = String(value).replace(/[!'()*]/g, "")
  }

  const query = Object.keys(signedParams)
    .sort()
    .map((key) => {
      const value = signedParams[key]
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join("&")

  const wRid = md5(`${query}${mixinKey}`)
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(signedParams)) {
    search.set(key, value)
  }
  search.set("w_rid", wRid)
  return search
}

export async function signedWbiGet(
  endpoint: string,
  params: Record<string, string | number>,
  retryOnSignError = true,
): Promise<Response> {
  const query = await signWbiParams(params)
  let response = await fetch(`${endpoint}?${query.toString()}`, {
    credentials: "include",
  })

  if (!response.ok || !retryOnSignError) {
    return response
  }

  const payload = (await response.json()) as { code?: number }
  if (payload.code === -352 || payload.code === -403) {
    invalidateWbiKeys()
    const retryQuery = await signWbiParams(params)
    response = await fetch(`${endpoint}?${retryQuery.toString()}`, {
      credentials: "include",
    })
  }

  return response
}
