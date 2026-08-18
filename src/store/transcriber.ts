import { defineStore } from "pinia"

import type { VideoDynamicCard } from "../domain/types"
import { getVideoUrl } from "../utils/video-url"

declare const chrome: any

export interface TranscriberRecommendation {
  score: number
  grade: "S" | "A" | "B" | "C"
  verdict: "推荐" | "不推荐"
  advice: string
  scoring_reason: string
  recommendation_reason: string
  reason: string
}

export interface TranscriberCardState {
  state: "transcribing" | "completed"
  outputUrl: string
  recommendation: TranscriberRecommendation | null
  submittedAt: number
}

interface TranscriberSnapshot {
  queue?: Array<{ url?: unknown; status?: unknown }>
  history?: Array<{
    url?: unknown
    status?: unknown
    output_doc_url?: unknown
    recommendation?: unknown
  }>
}

function videoKey(value: string): string {
  const match = value.match(/(?:bilibili\.com\/video\/|^)(BV[0-9A-Za-z]+)/i)
  return match?.[1]?.toUpperCase() ?? value.trim()
}

function cardKey(card: VideoDynamicCard): string {
  return videoKey(card.videoBvid || getVideoUrl(card))
}

function sendMessage<T>(message: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
      reject(new Error("扩展后台不可用"))
      return
    }
    chrome.runtime.sendMessage(message, (response: { ok?: boolean; error?: string; data?: T } | undefined) => {
      const runtimeError = chrome.runtime.lastError
      if (runtimeError) {
        reject(new Error(runtimeError.message))
        return
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "无法连接 Transcriber"))
        return
      }
      resolve(response.data as T)
    })
  })
}

function normalizeRecommendation(value: unknown): TranscriberRecommendation | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const row = value as Partial<TranscriberRecommendation>
  if (typeof row.score !== "number" || !["S", "A", "B", "C"].includes(row.grade ?? "")) {
    return null
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(row.score))),
    grade: row.grade as TranscriberRecommendation["grade"],
    verdict: row.verdict === "推荐" ? "推荐" : "不推荐",
    advice: typeof row.advice === "string" ? row.advice : "",
    scoring_reason: typeof row.scoring_reason === "string" ? row.scoring_reason : "",
    recommendation_reason: typeof row.recommendation_reason === "string" ? row.recommendation_reason : "",
    reason: typeof row.reason === "string" ? row.reason : "",
  }
}

export const useTranscriberStore = defineStore("transcriber", {
  state: () => ({
    cards: {} as Record<string, TranscriberCardState>,
    refreshing: false,
  }),
  actions: {
    getForCard(card: VideoDynamicCard): TranscriberCardState | undefined {
      return this.cards[cardKey(card)]
    },
    markTranscribing(card: VideoDynamicCard): void {
      const key = cardKey(card)
      this.cards = {
        ...this.cards,
        [key]: { state: "transcribing", outputUrl: "", recommendation: null, submittedAt: Date.now() },
      }
    },
    async refresh(): Promise<void> {
      if (this.refreshing) {
        return
      }
      this.refreshing = true
      try {
        const snapshot = await sendMessage<TranscriberSnapshot>({ type: "transcriber:snapshot" })
        const next = { ...this.cards }
        const activeKeys = new Set<string>()

        for (const task of snapshot.queue ?? []) {
          if (
            typeof task.url !== "string" ||
            !["pending", "downloading", "transcribing", "polishing"].includes(String(task.status))
          ) {
            continue
          }
          const key = videoKey(task.url)
          activeKeys.add(key)
          next[key] = {
            state: "transcribing",
            outputUrl: "",
            recommendation: null,
            submittedAt: next[key]?.submittedAt ?? 0,
          }
        }

        for (const item of snapshot.history ?? []) {
          if (item.status !== "completed" || typeof item.url !== "string") {
            continue
          }
          next[videoKey(item.url)] = {
            state: "completed",
            outputUrl: typeof item.output_doc_url === "string" ? item.output_doc_url : "",
            recommendation: normalizeRecommendation(item.recommendation),
            submittedAt: 0,
          }
        }

        const now = Date.now()
        for (const [key, item] of Object.entries(next)) {
          if (item.state === "transcribing" && item.submittedAt > 0 && !activeKeys.has(key) && now - item.submittedAt > 20_000) {
            delete next[key]
          }
        }

        this.cards = next
      } finally {
        this.refreshing = false
      }
    },
  },
})
