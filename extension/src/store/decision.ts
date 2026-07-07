import { defineStore } from "pinia"

import { shouldPromptUnfollow } from "../domain/decision-rules"
import type { VideoDynamicCard } from "../domain/types"
import { saveToWatchLater, unfollowUp } from "../services/bilibili-api"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"
import { useInboxStore } from "./inbox"
import { useTrashStore } from "./trash"

const persistedState = readPersistedState()

export const useDecisionStore = defineStore("decision", {
  state: () => ({
    pendingMap: {} as Record<string, boolean>,
    dislikedIds: new Set(persistedState.dislikedDynamicIds),
    wantWatchIds: new Set(persistedState.wantWatchDynamicIds),
    upDislikeCounts: { ...persistedState.upDislikeCounts } as Record<string, number>,
    promptingUpMid: "",
    unfollowingUpMid: "",
  }),
  actions: {
    async markWantWatch(card: VideoDynamicCard): Promise<void> {
      if (!card.dynamicId || this.pendingMap[card.dynamicId]) {
        return
      }

      this.pendingMap[card.dynamicId] = true
      try {
        await saveToWatchLater(card)
        this.wantWatchIds.add(card.dynamicId)
        writePersistedState({
          wantWatchDynamicIds: [...this.wantWatchIds],
        })
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
      if (this.dislikedIds.has(card.dynamicId)) {
        return
      }
      this.dislikedIds.add(card.dynamicId)
      if (card.upMid) {
        this.upDislikeCounts[card.upMid] = (this.upDislikeCounts[card.upMid] ?? 0) + 1
      }

      const trash = useTrashStore()
      trash.add(card)

      writePersistedState({
        dislikedDynamicIds: [...this.dislikedIds],
        trashItems: trash.items,
        upDislikeCounts: this.upDislikeCounts,
      })

      const inbox = useInboxStore()
      inbox.removeCard(card.dynamicId)
      showToast("已隐藏该动态")

      if (card.upMid) {
        void this.maybePromptUnfollow(card.upMid, card.upName)
      }
    },
    restoreDisliked(card: VideoDynamicCard): void {
      if (!card.dynamicId) {
        return
      }
      this.dislikedIds.delete(card.dynamicId)
      const trash = useTrashStore()
      trash.remove(card.dynamicId)
      writePersistedState({
        dislikedDynamicIds: [...this.dislikedIds],
        trashItems: trash.items,
        upDislikeCounts: this.upDislikeCounts,
      })
    },
    clearAllDisliked(): void {
      if (this.dislikedIds.size === 0) {
        return
      }
      this.dislikedIds.clear()
      const trash = useTrashStore()
      trash.clearAll()
      writePersistedState({
        dislikedDynamicIds: [],
        trashItems: [],
        upDislikeCounts: this.upDislikeCounts,
      })
    },
    async maybePromptUnfollow(upMid: string, upName: string): Promise<void> {
      if (!upMid || this.promptingUpMid === upMid) {
        return
      }
      const count = this.upDislikeCounts[upMid] ?? 0
      if (!shouldPromptUnfollow(count)) {
        return
      }

      this.promptingUpMid = upMid
      try {
        const displayName = upName || "该 UP"
        const confirmed = window.confirm(
          `你已连续 ${count} 次对 ${displayName} 点“不想看”，是否现在取关？`,
        )
        if (!confirmed) {
          return
        }
        await unfollowUp(upMid)
        showToast(`已取关 ${displayName}`)
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误"
        showToast(`取关失败：${message}`, "error")
      } finally {
        this.promptingUpMid = ""
      }
    },
    async unfollowCreator(upMid: string, upName: string): Promise<boolean> {
      if (!upMid || this.unfollowingUpMid) {
        return false
      }

      const displayName = upName || "该 UP"
      const confirmed = window.confirm(`确认取关 ${displayName}？`)
      if (!confirmed) {
        return false
      }

      this.unfollowingUpMid = upMid
      try {
        await unfollowUp(upMid)
        showToast(`已取关 ${displayName}`)
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "未知错误"
        showToast(`取关失败：${message}`, "error")
        return false
      } finally {
        this.unfollowingUpMid = ""
      }
    },
  },
})
