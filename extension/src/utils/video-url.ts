import type { VideoDynamicCard } from "../domain/types"

declare const chrome: any

const FALLBACK_VIDEO_URL = "https://www.bilibili.com/"

export function getVideoUrl(card: VideoDynamicCard): string {
  if (card.url) {
    return card.url
  }
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

  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return
  }

  chrome.runtime.sendMessage({ type: "tabs:open-background", url }, () => {
    // Accessing lastError prevents Chrome from logging an unchecked rejection
    // when the extension is reloaded while this page is still open.
    void chrome.runtime.lastError
  })
}
