<template>
  <main class="inbox-shell" :class="{ 'dynamic-feed-embedded': props.embedded, 'feed-hidden': props.embedded && !props.feedVisible }">
    <AppNav v-if="!props.embedded" active="moments" :trash-count="trash.count" @open-trash="trash.setOpen(true)" />
    <AppDock v-if="!props.embedded" active="moments" @refresh="reloadMoments" @open-tools="openDynamicTools" />
    <HomeTabsBar v-if="!props.embedded" active="following" @select="onSharedTabSelect" />
    <TopToolbar
      ref="toolbarRef"
      :view-mode="viewMode"
      :trash-count="trash.count"
      :search-query="searchQuery"
      :search-scope="searchScope"
      :min-duration-minutes="minDurationMinutes"
      :hide-want-watch="hideWantWatch"
      :open-video-on-want-watch="openVideoOnWantWatch"
      :category-filter="categoryFilter"
      :ai-configured="classification.configured"
      :ai-classifying="classification.classifying"
      :ai-error="classification.error"
      @open-trash="trash.setOpen(true)"
      @toggle-hide-want-watch="onToggleHideWantWatch"
      @toggle-open-video-on-want-watch="onToggleOpenVideoOnWantWatch"
      @update:view-mode="onViewModeUpdate"
      @update:search-query="searchQuery = $event"
      @update:search-scope="searchScope = $event"
      @update:min-duration-minutes="onMinDurationMinutesUpdate"
      @update:category-filter="onCategoryFilterUpdate"
      @save-ai-key="onSaveAiKey"
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
        :following-up-map="decision.followingUpMap"
        :relation-pending-mid="decision.relationPendingMid"
        :transcriber-map="transcriberMap"
        @want-watch="onWantWatch"
        @help-read="onHelpRead"
        @dislike="onDislike"
        @toggle-follow="onToggleFollow"
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
      v-if="!props.embedded"
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
import { computed, onMounted, onUnmounted, ref, watch } from "vue"

import TopToolbar, { type SearchScope } from "../components/TopToolbar.vue"
import AppNav from "../components/AppNav.vue"
import AppDock from "../components/AppDock.vue"
import HomeTabsBar, { type HomeTabValue } from "../components/HomeTabsBar.vue"
import UpFilterView from "../components/UpFilterView.vue"
import TrashModal from "../components/TrashModal.vue"
import type { ViewMode } from "../domain/view-mode"
import type { ContentCategoryFilter } from "../domain/content-category"
import { getDateGroupKey } from "../domain/group-by-date"
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"
import { useUpFilterStore } from "../store/up-filter"
import { useTrashStore } from "../store/trash"
import { useContentClassificationStore } from "../store/content-classification"
import { useTranscriberStore } from "../store/transcriber"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"
import type { CardLeaveVariant } from "../utils/motion"

const persistedState = readPersistedState()
const props = withDefaults(defineProps<{ embedded?: boolean; feedVisible?: boolean }>(), {
  embedded: false,
  feedVisible: true,
})
const emit = defineEmits<{
  (event: "settings-change", settings: {
    minDurationMinutes: string
    hideWantWatch: boolean
    openVideoOnWantWatch: boolean
  }): void
}>()
const inbox = useInboxStore()
const upFilter = useUpFilterStore()
const decision = useDecisionStore()
const trash = useTrashStore()
const classification = useContentClassificationStore()
const transcriber = useTranscriberStore()
const searchQuery = ref("")
const searchScope = ref<SearchScope>("dynamics")
const viewMode = ref<ViewMode>(persistedState.viewMode)
const minDurationMinutes = ref(persistedState.minDurationMinutes)
const hideWantWatch = ref(persistedState.hideWantWatch)
const openVideoOnWantWatch = ref(persistedState.openVideoOnWantWatch)
const categoryFilter = ref<ContentCategoryFilter>("all")
const cardLeaveReasons = ref<Record<string, CardLeaveVariant>>({})
const leavingGroupCounts = ref<Record<string, number>>({})
let pendingFillAfterLeave = 0
let scrollRoot: HTMLElement | null = null
let onScrollHandler: (() => void) | null = null
let scrollRaf = 0
let transcriberPollTimer = 0
const toolbarRef = ref<{ openToolsPanel: () => void } | null>(null)

function reloadMoments(): void {
  void inbox.refresh(getScrollRoot())
}

function openDynamicTools(): void {
  toolbarRef.value?.openToolsPanel()
}

defineExpose({ openSettings: openDynamicTools, refreshFeed: reloadMoments })

function onSharedTabSelect(tab: HomeTabValue): void {
  if (tab === "following") return
  window.location.href = tab === "recommended"
    ? "https://www.bilibili.com/"
    : "https://www.bilibili.com/?readflow=" + tab
}

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
    hideWantWatch.value ||
    categoryFilter.value !== "all",
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
    item.durationSeconds >= minDurationSeconds.value
  if (!matchesDuration) {
    return false
  }
  if (categoryFilter.value !== "all" && classification.labels[item.dynamicId] !== categoryFilter.value) {
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


const transcriberMap = computed(() => {
  const map: Record<string, ReturnType<typeof transcriber.getForCard>> = {}
  for (const card of inbox.allCards) {
    map[card.dynamicId] = transcriber.getForCard(card)
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

async function onDislike(card: VideoDynamicCard): Promise<void> {
  markCardLeaving(card, "dislike")
  if (!(await decision.markDislike(card))) {
    cancelCardLeaving(card)
    return
  }
  scheduleFillAfterLeave()
}

async function onToggleFollow(card: VideoDynamicCard): Promise<void> {
  if (!card.upMid) return
  await decision.toggleFollowCreator(card.upMid, card.upName)
}

function onToggleHideWantWatch(): void {
  hideWantWatch.value = !hideWantWatch.value
  writePersistedState({ hideWantWatch: hideWantWatch.value })
  emitSettingsChange()
  showToast(hideWantWatch.value ? "已隐藏标记为“想看”的视频" : "已显示标记为“想看”的视频")
  void inbox.fillAfterHide(getScrollRoot())
}

function onToggleOpenVideoOnWantWatch(): void {
  openVideoOnWantWatch.value = !openVideoOnWantWatch.value
  writePersistedState({ openVideoOnWantWatch: openVideoOnWantWatch.value })
  emitSettingsChange()
  showToast(openVideoOnWantWatch.value ? "点击“想看”时将打开视频" : "点击“想看”时不再打开视频")
}

function onMinDurationMinutesUpdate(value: string): void {
  const trimmed = value.trim()
  const numeric = Number(trimmed)
  if (trimmed && (!Number.isFinite(numeric) || numeric <= 0)) {
    showToast("请输入大于 0 的视频时长", "error")
    return
  }
  const normalized = trimmed ? String(numeric) : ""
  minDurationMinutes.value = normalized
  writePersistedState({ minDurationMinutes: normalized })
  emitSettingsChange()
  showToast(normalized ? `已只显示 ${normalized} 分钟及以上的视频` : "已清除时长筛选")
  void inbox.fillAfterHide(getScrollRoot())
}

function emitSettingsChange(): void {
  emit("settings-change", {
    minDurationMinutes: minDurationMinutes.value,
    hideWantWatch: hideWantWatch.value,
    openVideoOnWantWatch: openVideoOnWantWatch.value,
  })
}

function onHelpRead(card: VideoDynamicCard): void {
  transcriber.markTranscribing(card)
  window.setTimeout(() => void transcriber.refresh().catch(() => undefined), 1500)
}

function onCategoryFilterUpdate(value: ContentCategoryFilter): void {
  categoryFilter.value = value
  classification.ensureClassified(inbox.allCards)
  void inbox.fillAfterHide(getScrollRoot())
}

async function onSaveAiKey(apiKey: string): Promise<void> {
  try {
    await classification.saveApiKey(apiKey)
    classification.ensureClassified(inbox.allCards)
    showToast(apiKey.trim() ? "DeepSeek API Key 已保存到扩展本地存储" : "已移除 DeepSeek API Key")
  } catch (error) {
    showToast(error instanceof Error ? error.message : "保存 DeepSeek API Key 失败", "error")
  }
}

function cancelCardLeaving(card: VideoDynamicCard): void {
  const nextReasons = { ...cardLeaveReasons.value }
  delete nextReasons[card.dynamicId]
  cardLeaveReasons.value = nextReasons
  const groupKey = getDateGroupKey(card.publishAt)
  const remaining = (leavingGroupCounts.value[groupKey] ?? 1) - 1
  if (remaining <= 0) {
    const nextCounts = { ...leavingGroupCounts.value }
    delete nextCounts[groupKey]
    leavingGroupCounts.value = nextCounts
  } else {
    leavingGroupCounts.value = { ...leavingGroupCounts.value, [groupKey]: remaining }
  }
}

watch(
  () => inbox.allCards.map((card) => `${card.dynamicId}:${card.title}`).join("\n"),
  () => {
    classification.ensureClassified(inbox.allCards)
    decision.syncWantWatchCards(inbox.allCards)
    void decision.ensureFollowingStatuses(inbox.allCards)
  },
)

function onViewModeUpdate(mode: ViewMode): void {
  viewMode.value = mode
  if (mode !== "up-filter") writePersistedState({ viewMode: mode })
  if (mode === "inbox") {
    void inbox.fillAfterHide(getScrollRoot())
    return
  }
  upFilter.refreshWantedVideos()
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

  void classification.bootstrap().then(() => classification.ensureClassified(inbox.allCards))
  void transcriber.refresh().catch(() => undefined)
  transcriberPollTimer = window.setInterval(() => {
    if (Object.values(transcriber.cards).some((item) => item.state === "transcribing")) {
      void transcriber.refresh().catch(() => undefined)
    }
  }, 5000)
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
  if (transcriberPollTimer) {
    window.clearInterval(transcriberPollTimer)
    transcriberPollTimer = 0
  }
  if (scrollRaf) {
    window.cancelAnimationFrame(scrollRaf)
    scrollRaf = 0
  }
  if (scrollRoot && onScrollHandler) {
    scrollRoot.removeEventListener("scroll", onScrollHandler)
  }
})
</script>
