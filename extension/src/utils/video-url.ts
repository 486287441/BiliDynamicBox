import type { VideoDynamicCard } from "../domain/types"

const FALLBACK_VIDEO_URL = "https://www.bilibili.com/"

export function getVideoUrl(card: VideoDynamicCard): string {
  if (card.videoBvid) {
    return `https://www.bilibili.com/video/${card.videoBvid}`
  }
  if (card.videoAid) {
    return `https://www.bilibili.com/video/av${card.videoAid}`
  }
  return FALLBACK_VIDEO_URL
}

export function openVideoInNewTab(card: VideoDynamicCard): void {
  const url = getVideoUrl(card)
  if (url === FALLBACK_VIDEO_URL) {
    return
  }

  const link = document.createElement("a")
  link.href = url
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
}