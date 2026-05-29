<template>
  <main class="inbox-shell">
    <TopToolbar
      :trash-count="trash.count"
      :search-query="searchQuery"
      :min-duration-minutes="minDurationMinutes"
      :hide-want-watch="hideWantWatch"
      @open-trash="trash.setOpen(true)"
      @toggle-hide-want-watch="onToggleHideWantWatch"
      @update:search-query="searchQuery = $event"
      @update:min-duration-minutes="onMinDurationMinutesUpdate"
    />

    <section v-if="inbox.error" class="inbox-error">
      {{ inbox.error }}
    </section>

    <section v-else class="inbox-content">
      <InboxGroup
        v-for="group in displayGroups"
        :key="group.key"
        :group="group"
        :pending-map="decision.pendingMap"
        :want-watch-map="wantWatchMap"
        :final-count-map="searchQuery.trim() ? {} : inbox.finalGroupCounts"
        @want-watch="onWantWatch"
        @dislike="onDislike"
      />
      <p v-if="inbox.loading && visibleCardCount === 0" class="inbox-load-more-tip">正在加载动态...</p>
      <p v-else-if="isFillingList" class="inbox-load-more-tip">正在补足列表...</p>
      <p v-else-if="!inbox.loading && !isFillingList && displayGroups.length === 0">
        {{ normalizedQuery || minDurationSeconds > 0 ? "没有匹配到筛选条件的视频。" : "暂无可展示的视频动态。" }}
      </p>
      <p v-else-if="inbox.loadingMore && !inbox.prefetching" class="inbox-load-more-tip">正在加载更多...</p>
      <p v-else-if="!inbox.hasMore && displayGroups.length > 0" class="inbox-load-more-tip">已经到底了</p>
    </section>

    <TrashModal
      :open="trash.open"
      :items="trash.items"
      @close="trash.setOpen(false)"
      @restore="onRestore"
      @restore-all="onRestoreAll"
      @clear-all="onClearAll"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"

import TopToolbar from "../components/TopToolbar.vue"
import TrashModal from "../components/TrashModal.vue"
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"
import { useTrashStore } from "../store/trash"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"

const persistedState = readPersistedState()
const inbox = useInboxStore()
const decision = useDecisionStore()
const trash = useTrashStore()
const searchQuery = ref("")
const minDurationMinutes = ref(persistedState.minDurationMinutes)
const hideWantWatch = ref(persistedState.hideWantWatch)
let scrollRoot: HTMLElement | null = null
let onScrollHandler: (() => void) | null = null
let scrollRaf = 0

function getScrollRoot(): HTMLElement | null {
  if (scrollRoot instanceof HTMLElement) {
    return scrollRoot
  }
  const root = document.getElementById("bewly-inbox-root")
  if (root instanceof HTMLElement) {
    scrollRoot = root
    return root
  }
  return null
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase())
const minDurationSeconds = computed(() => {
  const text = minDurationMinutes.value.trim()
  if (!text) {
    return 0
  }
  const value = Number(text)
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }
  return Math.floor(value * 60)
})

function passesDisplayFilters(item: VideoDynamicCard): boolean {
  if (hideWantWatch.value && decision.wantWatchIds.has(item.dynamicId)) {
    return false
  }
  const matchesDuration =
    minDurationSeconds.value <= 0 ||
    item.durationSeconds <= 0 ||
    item.durationSeconds >= minDurationSeconds.value
  if (!matchesDuration) {
    return false
  }
  if (!normalizedQuery.value) {
    return true
  }
  const title = item.title.toLocaleLowerCase()
  const upName = item.upName.toLocaleLowerCase()
  return title.includes(normalizedQuery.value) || upName.includes(normalizedQuery.value)
}

const displayGroups = computed<DateGroup[]>(() => {
  return inbox.groups
    .map((group) => {
      const items = group.items.filter((item) => passesDisplayFilters(item))
      return {
        ...group,
        items,
      }
    })
    .filter((group) => group.items.length > 0)
})

const visibleCardCount = computed(() => {
  return displayGroups.value.reduce((count, group) => count + group.items.length, 0)
})

const wantWatchMap = computed(() => {
  const map: Record<string, boolean> = {}
  for (const id of decision.wantWatchIds) {
    map[id] = true
  }
  return map
})

const isFillingList = computed(() => {
  return inbox.prefetching || (inbox.loadingMore && visibleCardCount.value < 18)
})

async function onWantWatch(card: VideoDynamicCard): Promise<void> {
  await decision.markWantWatch(card)
  if (hideWantWatch.value) {
    void inbox.fillAfterHide(getScrollRoot())
  }
}

function onDislike(card: VideoDynamicCard): void {
  decision.markDislike(card)
  void inbox.fillAfterHide(getScrollRoot())
}

function onToggleHideWantWatch(): void {
  hideWantWatch.value = !hideWantWatch.value
  writePersistedState({ hideWantWatch: hideWantWatch.value })
  void inbox.fillAfterHide(getScrollRoot())
}

function onMinDurationMinutesUpdate(value: string): void {
  minDurationMinutes.value = value
  writePersistedState({ minDurationMinutes: value })
  void inbox.fillAfterHide(getScrollRoot())
}

function onRestore(dynamicId: string): void {
  const item = trash.items.find((row) => row.dynamicId === dynamicId)
  if (!item) {
    return
  }
  decision.restoreDisliked(item.card)
  inbox.restoreCard(dynamicId)
  showToast("已恢复到收件箱")
}

function onRestoreAll(): void {
  const count = trash.items.length
  if (count === 0) {
    return
  }
  inbox.restoreAllHidden()
  decision.clearAllDisliked()
  showToast(`已恢复 ${count} 条视频`)
}

function onClearAll(): void {
  const count = trash.items.length
  if (count === 0) {
    return
  }
  const confirmed = window.confirm(
    `确认清空垃圾箱中的 ${count} 条记录？清空后不会恢复到收件箱。`,
  )
  if (!confirmed) {
    return
  }
  decision.clearAllDisliked()
  showToast(`已清空 ${count} 条记录`)
}

onMounted(() => {
  const root = getScrollRoot()
  if (!root) {
    return
  }

  void inbox.bootstrap(root)

  onScrollHandler = () => {
    if (scrollRaf) {
      return
    }
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0
      void inbox.maintainScrollBuffer(root)
    })
  }

  root.addEventListener("scroll", onScrollHandler, { passive: true })
})

onUnmounted(() => {
  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf)
    scrollRaf = 0
  }
  if (scrollRoot && onScrollHandler) {
    scrollRoot.removeEventListener("scroll", onScrollHandler)
  }
})
</script>
