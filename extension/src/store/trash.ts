import { defineStore } from "pinia"

import type { VideoDynamicCard } from "../domain/types"
import { readPersistedState, type TrashItem } from "../services/storage"

const persistedState = readPersistedState()
const MAX_TRASH_ITEMS = 50

export const useTrashStore = defineStore("trash", {
  state: () => ({
    open: false,
    items: persistedState.trashItems.slice(0, MAX_TRASH_ITEMS) as TrashItem[],
  }),
  getters: {
    count(state): number {
      return state.items.length
    },
  },
  actions: {
    setOpen(value: boolean): void {
      this.open = value
    },
    add(card: VideoDynamicCard): void {
      const nextItems = this.items.filter((item) => item.dynamicId !== card.dynamicId)
      nextItems.unshift({
        dynamicId: card.dynamicId,
        removedAt: Date.now(),
        card,
      })
      this.items = nextItems.slice(0, MAX_TRASH_ITEMS)
    },
    remove(dynamicId: string): void {
      this.items = this.items.filter((item) => item.dynamicId !== dynamicId)
    },
    clearAll(): void {
      this.items = []
    },
  },
})
