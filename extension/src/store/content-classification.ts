import { defineStore } from "pinia"

import type { ContentCategory } from "../domain/content-category"
import type { VideoDynamicCard } from "../domain/types"

declare const chrome: any

interface RuntimeResponse {
  ok?: boolean
  configured?: boolean
  model?: string
  results?: Record<string, ContentCategory>
  error?: string
}

function sendMessage(message: unknown): Promise<RuntimeResponse> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("扩展后台服务不可用，请重新加载扩展"))
      return
    }
    chrome.runtime.sendMessage(message, (response: RuntimeResponse | undefined) => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(new Error(error.message))
        return
      }
      resolve(response ?? {})
    })
  })
}

export const useContentClassificationStore = defineStore("content-classification", {
  state: () => ({
    labels: {} as Record<string, ContentCategory>,
    configured: false,
    model: "deepseek-v4-flash",
    classifying: false,
    error: null as string | null,
    pendingIds: new Set<string>(),
    queuedCards: [] as VideoDynamicCard[],
  }),
  actions: {
    async bootstrap() {
      try {
        const response = await sendMessage({ type: "ai:get-status" })
        if (!response.ok) {
          throw new Error(response.error || "读取 AI 设置失败")
        }
        this.configured = Boolean(response.configured)
        this.model = response.model || this.model
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error)
      }
    },
    async saveApiKey(apiKey: string) {
      const response = await sendMessage({ type: "ai:set-key", apiKey })
      if (!response.ok) {
        throw new Error(response.error || "保存 API Key 失败")
      }
      this.configured = Boolean(response.configured)
      this.model = response.model || this.model
      this.error = null
      if (this.configured) {
        void this.drainQueue()
      }
    },
    ensureClassified(cards: VideoDynamicCard[]) {
      const knownQueuedIds = new Set(this.queuedCards.map((card) => card.dynamicId))
      for (const card of cards) {
        if (!card.title.trim() || this.labels[card.dynamicId] || this.pendingIds.has(card.dynamicId) || knownQueuedIds.has(card.dynamicId)) {
          continue
        }
        this.queuedCards.push(card)
        knownQueuedIds.add(card.dynamicId)
      }
      if (this.configured) {
        void this.drainQueue()
      }
    },
    async drainQueue() {
      if (this.classifying || !this.configured || this.queuedCards.length === 0) {
        return
      }
      this.classifying = true
      const batch = this.queuedCards.splice(0, 30)
      for (const card of batch) {
        this.pendingIds.add(card.dynamicId)
      }
      try {
        const response = await sendMessage({
          type: "ai:classify",
          items: batch.map((card) => ({ id: card.dynamicId, title: card.title, publishAt: card.publishAt })),
        })
        if (!response.ok) {
          throw new Error(response.error || "AI 分类失败")
        }
        this.labels = { ...this.labels, ...(response.results ?? {}) }
        const unresolved = batch.filter((card) => !response.results?.[card.dynamicId])
        this.queuedCards.push(...unresolved)
        this.error = unresolved.length > 0 ? `${unresolved.length} 个标题未返回分类，将稍后重试` : null
      } catch (error) {
        this.queuedCards.unshift(...batch)
        this.error = error instanceof Error ? error.message : String(error)
      } finally {
        for (const card of batch) {
          this.pendingIds.delete(card.dynamicId)
        }
        this.classifying = false
        if (this.queuedCards.length > 0 && !this.error) {
          void this.drainQueue()
        }
      }
    },
  },
})
