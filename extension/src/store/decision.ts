import { defineStore } from "pinia"

import type { VideoDynamicCard } from "../domain/types"
import { saveToWatchLater } from "../services/bilibili-api"
import { showToast } from "../services/toast"
import { useInboxStore } from "./inbox"

const DISLIKED_KEY = "bewly:disliked-dynamic-ids"

function readDislikedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISLIKED_KEY)
    if (!raw) {
      return new Set()
    }
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) {
      return new Set()
    }
    return new Set(
      list
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    )
  } catch {
    return new Set()
  }
}

function writeDislikedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DISLIKED_KEY, JSON.stringify([...ids]))
  } catch {
    // Ignore storage failure to avoid blocking UX.
  }
}

export const useDecisionStore = defineStore("decision", {
  state: () => ({
    pendingMap: {} as Record<string, boolean>,
    dislikedIds: readDislikedIds(),
  }),
  actions: {
    async markWantWatch(card: VideoDynamicCard): Promise<void> {
      if (!card.dynamicId || this.pendingMap[card.dynamicId]) {
        return
      }

      this.pendingMap[card.dynamicId] = true
      try {
        await saveToWatchLater(card)
        showToast("已加入稍后再看")
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误"
        showToast(`加入稍后再看失败：${message}`, "error")
      } finally {
        this.pendingMap[card.dynamicId] = false
      }
    },
    markDislike(card: VideoDynamicCard): void {
      if (!card.dynamicId) {
        return
      }
      this.dislikedIds.add(card.dynamicId)
      writeDislikedIds(this.dislikedIds)

      const inbox = useInboxStore()
      inbox.removeCard(card.dynamicId)
      showToast("已隐藏该动态")
    },
  },
})
