import { defineStore } from "pinia"

import { filterVideoDynamics } from "../domain/filter-video"
import { getDateGroupKey, groupByDate } from "../domain/group-by-date"
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import { fetchMomentsPage } from "../services/bilibili-api"

const DISLIKED_KEY = "bewly:disliked-dynamic-ids"

function readHiddenIds(): Set<string> {
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

interface InboxState {
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  nextOffset: string
  error: string | null
  rawTotal: number
  videoTotal: number
  groups: DateGroup[]
  hiddenIds: Set<string>
  seenRawIds: Set<string>
  allCards: VideoDynamicCard[]
  seenCardIds: Set<string>
  countedCardIds: Set<string>
  finalGroupCounts: Record<string, number>
  countingFinalCounts: boolean
  finalCountsReady: boolean
  countScanToken: number
}

export const useInboxStore = defineStore("inbox", {
  state: (): InboxState => ({
    loading: false,
    loadingMore: false,
    hasMore: true,
    nextOffset: "",
    error: null,
    rawTotal: 0,
    videoTotal: 0,
    groups: [],
    hiddenIds: readHiddenIds(),
    seenRawIds: new Set(),
    allCards: [],
    seenCardIds: new Set(),
    countedCardIds: new Set(),
    finalGroupCounts: {},
    countingFinalCounts: false,
    finalCountsReady: false,
    countScanToken: 0,
  }),
  actions: {
    addCountForCard(card: VideoDynamicCard) {
      if (this.hiddenIds.has(card.dynamicId)) {
        return
      }
      if (this.countedCardIds.has(card.dynamicId)) {
        return
      }
      const key = getDateGroupKey(card.publishAt)
      this.finalGroupCounts[key] = (this.finalGroupCounts[key] ?? 0) + 1
      this.countedCardIds.add(card.dynamicId)
    },
    addCountsForCards(cards: VideoDynamicCard[]) {
      for (const card of cards) {
        this.addCountForCard(card)
      }
    },
    async runFinalCountScan(startOffset: string, token: number) {
      if (!startOffset) {
        this.countingFinalCounts = false
        this.finalCountsReady = true
        return
      }

      this.countingFinalCounts = true
      let offset = startOffset
      let hasMore = true
      const seenRawInScan = new Set(this.seenRawIds)

      try {
        while (hasMore && offset && token === this.countScanToken) {
          const page = await fetchMomentsPage(offset)
          offset = page.nextOffset
          hasMore = page.hasMore

          const freshItems = page.items.filter((item) => {
            const id = typeof item.id_str === "string" ? item.id_str : ""
            if (!id || seenRawInScan.has(id)) {
              return false
            }
            seenRawInScan.add(id)
            return true
          })

          const cards = filterVideoDynamics(freshItems)
          for (const card of cards) {
            if (this.seenCardIds.has(card.dynamicId)) {
              continue
            }
            this.addCountForCard(card)
          }
        }
      } catch {
        // Keep current visible flow stable even if count prefetch fails.
      } finally {
        if (token === this.countScanToken) {
          this.countingFinalCounts = false
          this.finalCountsReady = true
        }
      }
    },
    rebuildGroups() {
      const visibleCards = this.allCards.filter((card) => !this.hiddenIds.has(card.dynamicId))
      this.videoTotal = visibleCards.length
      this.groups = groupByDate(visibleCards)
    },
    removeCard(dynamicId: string) {
      if (!dynamicId) {
        return
      }
      const card = this.allCards.find((item) => item.dynamicId === dynamicId)
      if (card) {
        const key = getDateGroupKey(card.publishAt)
        if (this.finalGroupCounts[key] && this.finalGroupCounts[key] > 0) {
          this.finalGroupCounts[key] -= 1
        }
      }
      this.hiddenIds.add(dynamicId)
      this.rebuildGroups()
    },
    async load(reset = true) {
      if (this.loading || this.loadingMore) {
        return
      }
      if (!reset && !this.hasMore) {
        return
      }

      if (reset) {
        this.loading = true
        this.error = null
        this.hasMore = true
        this.nextOffset = ""
        this.rawTotal = 0
        this.videoTotal = 0
        this.groups = []
        this.seenRawIds.clear()
        this.seenCardIds.clear()
        this.countedCardIds.clear()
        this.allCards = []
        this.finalGroupCounts = {}
        this.countingFinalCounts = false
        this.finalCountsReady = false
        this.countScanToken += 1
      } else {
        this.loadingMore = true
      }

      this.error = null
      try {
        const page = await fetchMomentsPage(this.nextOffset)
        this.nextOffset = page.nextOffset
        this.hasMore = page.hasMore

        const freshItems = page.items.filter((item) => {
          const id = typeof item.id_str === "string" ? item.id_str : ""
          if (!id || this.seenRawIds.has(id)) {
            return false
          }
          this.seenRawIds.add(id)
          return true
        })

        this.rawTotal = this.seenRawIds.size

        const freshCards = filterVideoDynamics(freshItems)
        const appendedCards: VideoDynamicCard[] = []
        for (const card of freshCards) {
          if (this.seenCardIds.has(card.dynamicId)) {
            continue
          }
          this.seenCardIds.add(card.dynamicId)
          this.allCards.push(card)
          appendedCards.push(card)
        }
        this.addCountsForCards(appendedCards)
        this.rebuildGroups()

        if (reset) {
          const scanToken = this.countScanToken
          void this.runFinalCountScan(this.nextOffset, scanToken)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error"
        this.error = `加载动态失败: ${message}`
        if (reset) {
          this.groups = []
        }
      } finally {
        if (reset) {
          this.loading = false
        } else {
          this.loadingMore = false
        }
      }
    },
    async loadMore() {
      await this.load(false)
    },
  },
})
