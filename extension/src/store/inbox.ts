import { defineStore } from "pinia"

import { filterVideoDynamics } from "../domain/filter-video"
import { groupByDate } from "../domain/group-by-date"
import type { DateGroup } from "../domain/types"
import { fetchMomentsItems } from "../services/bilibili-api"

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
  error: string | null
  rawTotal: number
  videoTotal: number
  groups: DateGroup[]
  hiddenIds: Set<string>
}

export const useInboxStore = defineStore("inbox", {
  state: (): InboxState => ({
    loading: false,
    error: null,
    rawTotal: 0,
    videoTotal: 0,
    groups: [],
    hiddenIds: readHiddenIds(),
  }),
  actions: {
    removeCard(dynamicId: string) {
      if (!dynamicId) {
        return
      }
      this.hiddenIds.add(dynamicId)
      this.groups = this.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.dynamicId !== dynamicId),
        }))
        .filter((group) => group.items.length > 0)
      this.videoTotal = this.groups.reduce((total, group) => total + group.items.length, 0)
    },
    async load() {
      this.loading = true
      this.error = null
      try {
        const items = await fetchMomentsItems()
        this.rawTotal = items.length

        const videoCards = filterVideoDynamics(items).filter((card) => !this.hiddenIds.has(card.dynamicId))
        this.videoTotal = videoCards.length

        this.groups = groupByDate(videoCards)
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error"
        this.error = `加载动态失败: ${message}`
        this.groups = []
      } finally {
        this.loading = false
      }
    },
  },
})
