<template>
  <main class="inbox-shell">
    <TopToolbar
      :view-mode="viewMode"
      :trash-count="trash.count"
      :search-query="searchQuery"
      :search-scope="searchScope"
      :min-duration-minutes="minDurationMinutes"
      :hide-want-watch="hideWantWatch"
      :open-video-on-want-watch="openVideoOnWantWatch"
      @open-trash="trash.setOpen(true)"
      @toggle-hide-want-watch="onToggleHideWantWatch"
      @toggle-open-video-on-want-watch="onToggleOpenVideoOnWantWatch"
      @update:view-mode="onViewModeUpdate"
      @update:search-query="searchQuery = $event"
      @update:search-scope="searchScope = $event"
      @update:min-duration-minutes="onMinDurationMinutesUpdate"
    />

    <section v-if="viewMode === 'inbox' && inbox.error" class="inbox-error">
      {{ inbox.error }}
    </section>

    <section v-else-if="viewMode === 'inbox'" class="inbox-content">
      <InboxGroup
        v-for="group in displayGroups"
        :key="group.key"
        :group="group"
        :pending-map="decision.pendingMap"
        :want-watch-map="wantWatchMap"
        :open-video-on-want-watch="openVideoOnWantWatch"
        :final-count-map="filteredFinalGroupCounts"
        :leave-reason-map="cardLeaveReasons"
        :enter-card-ids="inbox.enterAnimatedIds"
        :unfollowing-up-mid="decision.unfollowingUpMid"
        @want-watch="onWantWatch"
        @dislike="onDislike"
        @unfollow="onUnfollow"
        @leave-complete="onCardLeaveComplete"
        @enter-complete="onCardEnterComplete"
      />
      <p v-if="inbox.loading && visibleCardCount === 0" class="inbox-load-more-tip">正在加载动态...</p>
      <p v-else-if="isFillingList" class="inbox-load-more-tip">正在补足列表...</p>
      <p v-else-if="!inbox.loading && !isFillingList && displayGroups.length === 0">
        {{
          (searchScope === "dynamics" && normalizedQuery) || minDurationSeconds > 0
            ? "没有匹配到筛选条件的视频。"
            : "暂无可展示的视频动态。"
        }}
      </p>
      <p v-else-if="inbox.loadingMore && !inbox.prefetching" class="inbox-load-more-tip">正在加载更多...</p>
      <p v-else-if="!inbox.hasMore && displayGroups.length > 0" class="inbox-load-more-tip">已经到底了</p>
    </section>

    <UpFilterView v-else-if="viewMode === 'up-filter'" />

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

import TopToolbar, { type SearchScope } from "../components/TopToolbar.vue"
import UpFilterView from "../components/UpFilterView.vue"
import TrashModal from "../components/TrashModal.vue"
import type { ViewMode } from "../domain/view-mode"
import { getDateGroupKey } from "../domain/group-by-date"
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"
import { useUpFilterStore } from "../store/up-filter"
import { useTrashStore } from "../store/trash"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"
import type { CardLeaveVariant } from "../utils/motion"

const persistedState = readPersistedState()
const inbox = useInboxStore()
const upFilter = useUpFilterStore()
const decision = useDecisionStore()
const trash = useTrashStore()
const searchQuery = ref("")
const searchScope = ref<SearchScope>("dynamics")
const viewMode = ref<ViewMode>("inbox")
const minDurationMinutes = ref(persistedState.minDurationMinutes)
const hideWantWatch = ref(persistedState.hideWantWatch)
const openVideoOnWantWatch = ref(persistedState.openVideoOnWantWatch)
const cardLeaveReasons = ref<Record<string, CardLeaveVariant>>({})
const leavingGroupCounts = ref<Record<string, number>>({})
let pendingFillAfterLeave = 0
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
const hasActiveDisplayFilters = computed(
  () =>
    (searchScope.value === "dynamics" && normalizedQuery.value.length > 0) ||
    minDurationSeconds.value > 0 ||
    hideWantWatch.value,
)
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
  if (searchScope.value !== "dynamics" || !normalizedQuery.value) {
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
    .filter((group) => group.items.length > 0 || (leavingGroupCounts.value[group.key] ?? 0) > 0)
})

const filteredFinalGroupCounts = computed(() => {
  if (!hasActiveDisplayFilters.value) {
    return inbox.finalGroupCounts
  }
  const counts: Record<string, number> = {}
  for (const card of Object.values(inbox.countedCards)) {
    if (!passesDisplayFilters(card)) {
      continue
    }
    const key = getDateGroupKey(card.publishAt)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
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

function markCardLeaving(card: VideoDynamicCard, reason: CardLeaveVariant): void {
  cardLeaveReasons.value = { ...cardLeaveReasons.value, [card.dynamicId]: reason }
  const groupKey = getDateGroupKey(card.publishAt)
  leavingGroupCounts.value = {
    ...leavingGroupCounts.value,
    [groupKey]: (leavingGroupCounts.value[groupKey] ?? 0) + 1,
  }
}

function scheduleFillAfterLeave(): void {
  pendingFillAfterLeave += 1
}

function runPendingFillAfterLeave(): void {
  if (pendingFillAfterLeave <= 0) {
    return
  }
  pendingFillAfterLeave -= 1
  void inbox.fillAfterHide(getScrollRoot())
}

function onCardLeaveComplete(payload: { dynamicId: string; groupKey: string }): void {
  const nextReasons = { ...cardLeaveReasons.value }
  delete nextReasons[payload.dynamicId]
  cardLeaveReasons.value = nextReasons

  const remaining = (leavingGroupCounts.value[payload.groupKey] ?? 1) - 1
  if (remaining <= 0) {
    const nextCounts = { ...leavingGroupCounts.value }
    delete nextCounts[payload.groupKey]
    leavingGroupCounts.value = nextCounts
  } else {
    leavingGroupCounts.value = { ...leavingGroupCounts.value, [payload.groupKey]: remaining }
  }

  runPendingFillAfterLeave()
}

function onCardEnterComplete(dynamicId: string): void {
  inbox.clearEnterAnimatedId(dynamicId)
}

async function onWantWatch(card: VideoDynamicCard): Promise<void> {
  if (hideWantWatch.value) {
    markCardLeaving(card, "want-watch")
  }
  await decision.markWantWatch(card)
  if (hideWantWatch.value) {
    scheduleFillAfterLeave()
  }
}

function onDislike(card: VideoDynamicCard): void {
  markCardLeaving(card, "dislike")
  decision.markDislike(card)
  scheduleFillAfterLeave()
}

async function onUnfollow(card: VideoDynamicCard): Promise<void> {
  if (!card.upMid) {
    return
  }

  const succeeded = await decision.unfollowCreator(card.upMid, card.upName)
  if (!succeeded) {
    return
  }

  const sameUpCards = inbox.allCards.filter(
    (item) => item.upMid === card.upMid && !inbox.hiddenIds.has(item.dynamicId),
  )
  for (const item of sameUpCards) {
    if (item.dynamicId !== card.dynamicId) {
      inbox.removeCard(item.dynamicId)
    }
  }

  markCardLeaving(card, "default")
  inbox.removeCard(card.dynamicId)
  upFilter.removeCreator(card.upMid)
  scheduleFillAfterLeave()
}

function onToggleHideWantWatch(): void {
  hideWantWatch.value = !hideWantWatch.value
  writePersistedState({ hideWantWatch: hideWantWatch.value })
  void inbox.fillAfterHide(getScrollRoot())
}

function onToggleOpenVideoOnWantWatch(): void {
  openVideoOnWantWatch.value = !openVideoOnWantWatch.value
  writePersistedState({ openVideoOnWantWatch: openVideoOnWantWatch.value })
}

function onMinDurationMinutesUpdate(value: string): void {
  minDurationMinutes.value = value
  writePersistedState({ minDurationMinutes: value })
  void inbox.fillAfterHide(getScrollRoot())
}

function onViewModeUpdate(mode: ViewMode): void {
  viewMode.value = mode
  if (mode === "inbox") {
    void inbox.fillAfterHide(getScrollRoot())
    return
  }
  void upFilter.bootstrap()
}

function onRestore(dynamicId: string): void {
  const item = trash.items.find((row) => row.dynamicId === dynamicId)
  if (!item) {
    return
  }
  decision.restoreDisliked(item.card)
  inbox.restoreCard(dynamicId, item.card)
  showToast("已恢复到收件箱")
}

function onRestoreAll(): void {
  const count = trash.items.length
  if (count === 0) {
    return
  }
  inbox.restoreAllHidden(trash.items.map((item) => item.card))
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
  if (viewMode.value === "up-filter") {
    void upFilter.bootstrap()
  }

  onScrollHandler = () => {
    if (scrollRaf) {
      return
    }
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0
      if (viewMode.value === "inbox") {
        void inbox.maintainScrollBuffer(root)
      }
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
