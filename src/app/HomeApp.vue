<template>
  <main ref="shellRef" class="inbox-shell home-shell" :class="{ 'detail-open': Boolean(selectedCard), 'sidebar-collapsed': sidebarCollapsed, 'checklist-active': !libraryKind && activeTab === 'checklist' }">
    <AppNav
      :active="navActive"
      :trash-count="trash.count"
      :collapsed="sidebarCollapsed"
      @update:collapsed="setSidebarCollapsed"
      @open-trash="trash.setOpen(true)"
      @open-tools="openSettings"
      @navigate-library="navigateLibrary"
      @navigate-tab="selectTab"
    />
    <WorkspaceToolbar
      v-if="libraryKind || activeTab !== 'checklist'"
      :category="categoryFilter"
      :scope="activeTab === 'following' ? 'dynamics' : 'home'"
      :search-only="!libraryKind && activeTab === 'tracking'"
      :min-duration-minutes="activeTab === 'following' ? dynamicMinDurationMinutes : homeMinDurationMinutes"
      :publish-after-date="activeTab === 'following' ? dynamicPublishAfterDate : homePublishAfterDate"
      :refreshing="toolbarRefreshing"
      @update:category="setCategoryFilter"
      @update:min-duration-minutes="setScopedMinDuration"
      @update:publish-after-date="setScopedPublishAfter"
      @update:search-query="setScopedSearchQuery"
      @refresh="refresh"
    />

    <LibraryView
      v-if="libraryKind"
      :kind="libraryKind"
      :cards="libraryCards"
      :folders="favoriteFolders"
      :active-folder-id="activeFavoriteFolderId"
      :loading="libraryLoading"
      :error="libraryError"
      :has-more="libraryHasMore"
      :pending-map="libraryPendingMap"
      :want-watch-map="wantWatchMap"
      :open-video-on-want-watch="openVideoOnWantWatch"
      :following-up-map="decision.followingUpMap"
      :relation-pending-mid="decision.relationPendingMid"
      :transcriber-state-map="libraryTranscriberStateMap"
      @select-folder="selectFavoriteFolder"
      @load-more="loadLibrary(false)"
      @retry="loadLibrary(true)"
      @want-watch="onWantWatch"
      @help-read="onHelpRead"
      @dislike="onDislike"
      @toggle-follow="onToggleFollow"
      @add-favorite="onAddLibraryFavorite"
      @remove-favorite="onRemoveLibraryFavorite"
      @remove-watch-later="onRemoveLibraryWatchLater"
    />

    <DynamicFeed
      v-else
      ref="followingFeedRef"
      embedded
      :feed-visible="activeTab === 'following'"
      :selected-card-id="selectedCard?.dynamicId"
      @settings-change="onSettingsChange"
      @select-card="openSelectedCard"
    />

    <AnimeTrackingView
      v-if="!libraryKind && activeTab === 'tracking'"
      :items="trackedAnime"
      :loading="trackingLoading"
      :error="trackingError"
      @add="addTrackedAnime"
      @edit="editTrackedAnimeItem"
      @open="markAnimeSeen"
      @remove="removeTrackedAnime"
      @clear-error="trackingError = ''"
    />

    <ChecklistView
      v-if="!libraryKind && activeTab === 'checklist'"
      :watched-ids="watchedChecklistIds"
      :availability-map="checklistAvailability"
      @update:watched-ids="setWatchedChecklistIds"
      @availability="setChecklistAvailability"
    />

    <section v-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking' && activeTab !== 'checklist' && error" class="inbox-error home-feed-error">
      <span>{{ error }}</span><button type="button" @click="loadMore">重试</button>
    </section>

    <TransitionGroup v-else-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking' && activeTab !== 'checklist'" class="home-video-grid" tag="section" name="home-card">
      <VideoCard
        v-for="card in visibleCards"
        :key="card.dynamicId"
        :card="card"
        :pending-map="decision.pendingMap"
        :want-watch-map="wantWatchMap"
        :open-video-on-want-watch="openVideoOnWantWatch"
        :following-up-map="decision.followingUpMap"
        :relation-pending-mid="decision.relationPendingMid"
        :transcriber-state="transcriber.getForCard(card)"
        :selected="selectedCard?.dynamicId === card.dynamicId"
        @want-watch="onWantWatch(card)"
        @help-read="onHelpRead(card)"
        @dislike="onDislike(card)"
        @toggle-follow="onToggleFollow(card)"
        @select="openSelectedCard(card)"
      />
    </TransitionGroup>

    <div v-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking' && activeTab !== 'checklist'" class="home-feed-sentinel">
      <span v-if="loading">正在获取内容…</span>
      <span v-else-if="hasMore">继续下滑，自动加载更多</span>
      <span v-else-if="cards.length">已经到底了</span>
    </div>

    <VideoDetailPanel
      :card="selectedCard"
      :transcriber-state="selectedCard ? transcriber.getForCard(selectedCard) : undefined"
      :pending="Boolean(selectedCard && decision.pendingMap[selectedCard.dynamicId])"
      :want-watched="Boolean(selectedCard && wantWatchMap[selectedCard.dynamicId])"
      @close="closeSelectedCard"
      @want-watch="selectedCard && onWantWatch(selectedCard)"
      @help-read="selectedCard && onHelpRead(selectedCard)"
      @dislike="selectedCard && onDetailDislike(selectedCard)"
    />
    <TrashModal :open="trash.open" :items="trash.items" @close="trash.setOpen(false)" @restore="onRestore" @restore-all="onRestoreAll" @clear-all="onClearAll" />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import DynamicFeed from "./App.vue"
import AppNav from "../components/AppNav.vue"
import type { HomeTabValue } from "../components/HomeTabsBar.vue"
import WorkspaceToolbar from "../components/WorkspaceToolbar.vue"
import VideoDetailPanel from "../components/VideoDetailPanel.vue"
import AnimeTrackingView, { type AnimeEditorPayload } from "../components/AnimeTrackingView.vue"
import ChecklistView from "../components/ChecklistView.vue"
import LibraryView from "../components/LibraryView.vue"
import TrashModal from "../components/TrashModal.vue"
import VideoCard from "../components/VideoCard.vue"
import type { FavoriteFolder, LibraryKind, VideoDynamicCard } from "../domain/types"
import type { AnimeTrackingItem } from "../domain/anime-tracking"
import { inferContentCategory, type ContentCategoryFilter } from "../domain/content-category"
import { getPublishAfterTimestamp } from "../domain/publish-date-filter"
import {
  fetchFavoriteFolders,
  fetchFavoriteVideos,
  fetchHistoryVideos,
  fetchHomeFeedPage,
  fetchPopularVideosPage,
  fetchRankingVideos,
  fetchWatchLaterVideos,
  addVideoToDefaultFavorite,
  removeVideoFromFavorite,
  removeVideoFromWatchLater,
} from "../services/bilibili-api"
import { editTrackedAnime, fetchAnimeByName, refreshTrackedAnime } from "../services/anime-tracking"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"
import { animateGridReflow, captureCardRects } from "../utils/motion"
import { useDecisionStore } from "../store/decision"
import { useTranscriberStore } from "../store/transcriber"
import { useTrashStore } from "../store/trash"

type HomeTab = HomeTabValue
const persisted = readPersistedState()
const decision = useDecisionStore()
const transcriber = useTranscriberStore()
const trash = useTrashStore()
const requestedTab = new URL(window.location.href).searchParams.get("billnext")
const libraryKind = ref<LibraryKind | null>(
  requestedTab === "favorites" || requestedTab === "history" || requestedTab === "watchlater" ? requestedTab : null,
)
const activeTab = ref<HomeTab>(requestedTab === "following" || requestedTab === "tracking" || requestedTab === "checklist" || requestedTab === "popular" || requestedTab === "ranking" ? requestedTab : "recommended")
const cards = ref<VideoDynamicCard[]>([])
const query = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const hasMore = ref(true)
const pageIndex = ref(1)
const homeMinDurationMinutes = ref(persisted.homeMinDurationMinutes)
const homePublishAfterDate = ref(persisted.homePublishAfterDate)
const dynamicMinDurationMinutes = ref(persisted.dynamicMinDurationMinutes)
const dynamicPublishAfterDate = ref(persisted.dynamicPublishAfterDate)
const hideWantWatch = ref(persisted.hideWantWatch)
const openVideoOnWantWatch = ref(persisted.openVideoOnWantWatch)
const sidebarCollapsed = ref(persisted.sidebarCollapsed)
const trackedAnime = ref<AnimeTrackingItem[]>(persisted.trackedAnime)
const watchedChecklistIds = ref<string[]>(persisted.watchedChecklistIds)
const checklistAvailability = ref(persisted.checklistAvailability)
const trackingLoading = ref(false)
const trackingError = ref("")
const followingFeedRef = ref<{
  openSettings: () => void
  refreshFeed: () => void
  setCategoryFilter: (value: ContentCategoryFilter) => void
  setMinDuration: (value: string) => void
  setPublishAfter: (value: string) => void
  setSearchQuery: (value: string) => void
} | null>(null)
const categoryFilter = ref<ContentCategoryFilter>("all")
const selectedCard = ref<VideoDynamicCard | null>(null)
const shellRef = ref<HTMLElement | null>(null)
const favoriteFolders = ref<FavoriteFolder[]>([])
const activeFavoriteFolderId = ref(0)
interface LibraryState {
  cards: VideoDynamicCard[]
  loading: boolean
  loaded: boolean
  error: string
  hasMore: boolean
  page: number
  historyMax: number
  historyViewAt: number
  historyBusiness: string
}
function createLibraryState(): LibraryState {
  return { cards: [], loading: false, loaded: false, error: "", hasMore: false, page: 1, historyMax: 0, historyViewAt: 0, historyBusiness: "" }
}
const libraryStates = reactive<Record<LibraryKind, LibraryState>>({
  favorites: createLibraryState(),
  history: createLibraryState(),
  watchlater: createLibraryState(),
})
const libraryActionPending = reactive<Record<string, boolean>>({})
let transcriberPollTimer = 0
let scrollRoot: HTMLElement | null = null
let scrollFrame = 0
let autoFilling = false

const PREFETCH_DISTANCE_PX = 1600
const MAX_AUTO_PAGES_PER_PASS = 12

const publishAfterTimestamp = computed(() => getPublishAfterTimestamp(homePublishAfterDate.value))
const visibleCards = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase()
  const minimumSeconds = Number(homeMinDurationMinutes.value) * 60
  return cards.value.filter((card) => {
    if (decision.dislikedIds.has(card.dynamicId)) return false
    if (hideWantWatch.value && decision.wantWatchIds.has(card.dynamicId)) return false
    if (Number.isFinite(minimumSeconds) && minimumSeconds > 0 && card.durationSeconds < minimumSeconds) return false
    if (homePublishAfterDate.value && card.publishAt < publishAfterTimestamp.value) return false
    if (categoryFilter.value !== "all" && inferContentCategory(card) !== categoryFilter.value) return false
    if (!normalized) return true
    return card.title.toLocaleLowerCase().includes(normalized) || card.upName.toLocaleLowerCase().includes(normalized)
  })
})
const wantWatchMap = computed(() => Object.fromEntries([...decision.wantWatchIds].map((id) => [id, true])))
const navActive = computed(() => libraryKind.value ?? (activeTab.value === "following" ? "moments" : activeTab.value === "tracking" ? "tracking" : activeTab.value === "checklist" ? "checklist" : "home"))
const activeLibraryState = computed(() => libraryKind.value ? libraryStates[libraryKind.value] : null)
const libraryCards = computed(() => activeLibraryState.value?.cards ?? [])
const libraryLoading = computed(() => activeLibraryState.value?.loading ?? false)
const libraryError = computed(() => activeLibraryState.value?.error ?? "")
const libraryHasMore = computed(() => activeLibraryState.value?.hasMore ?? false)
const libraryTranscriberStateMap = computed(() => Object.fromEntries(
  libraryCards.value.map((card) => [card.dynamicId, transcriber.getForCard(card)]),
))
const libraryPendingMap = computed(() => ({ ...decision.pendingMap, ...libraryActionPending }))
const toolbarRefreshing = computed(() => {
  if (libraryKind.value) return libraryLoading.value
  if (activeTab.value === "tracking") return trackingLoading.value
  return loading.value
})

async function loadLibrary(reset: boolean, requestedKind: LibraryKind | null = libraryKind.value): Promise<void> {
  const kind = requestedKind
  if (!kind) return
  const state = libraryStates[kind]
  if (state.loading) return
  state.loading = true
  state.error = ""
  try {
    if (reset) {
      state.page = 1
      state.hasMore = false
      state.historyMax = 0
      state.historyViewAt = 0
      state.historyBusiness = ""
    }
    if (kind === "favorites") {
      if (!favoriteFolders.value.length) {
        favoriteFolders.value = await fetchFavoriteFolders()
        activeFavoriteFolderId.value = favoriteFolders.value[0]?.id ?? 0
      }
      if (!activeFavoriteFolderId.value) return
      const result = await fetchFavoriteVideos(activeFavoriteFolderId.value, state.page)
      if (reset) state.cards = result.cards
      else {
        const known = new Set(state.cards.map((card) => card.dynamicId))
        state.cards.push(...result.cards.filter((card) => !known.has(card.dynamicId)))
      }
      state.hasMore = result.hasMore
    } else if (kind === "watchlater") {
      const result = await fetchWatchLaterVideos()
      state.cards = result.cards
      state.hasMore = false
    } else {
      const result = await fetchHistoryVideos(state.historyMax, state.historyViewAt, state.historyBusiness)
      if (reset) state.cards = result.cards
      else {
        const known = new Set(state.cards.map((card) => card.dynamicId))
        state.cards.push(...result.cards.filter((card) => !known.has(card.dynamicId)))
      }
      state.hasMore = result.hasMore
      state.historyMax = result.nextMax ?? 0
      state.historyViewAt = result.nextViewAt ?? 0
      state.historyBusiness = result.nextBusiness ?? ""
    }
    state.page += 1
    state.loaded = true
    void decision.ensureFollowingStatuses(state.cards)
  } catch (caught) {
    state.error = caught instanceof Error ? caught.message : "资料库加载失败"
  } finally {
    state.loading = false
  }
}

function selectFavoriteFolder(folderId: number): void {
  if (folderId === activeFavoriteFolderId.value) return
  activeFavoriteFolderId.value = folderId
  libraryStates.favorites.loaded = false
  void loadLibrary(true)
}

function navigateLibrary(kind: LibraryKind): void {
  if (libraryKind.value === kind) return
  libraryKind.value = kind
  const url = new URL(window.location.href)
  url.pathname = "/"
  url.search = ""
  url.searchParams.set("billnext", kind)
  window.history.pushState({ billnext: kind }, "", url.toString())
  scrollRoot?.scrollTo({ top: 0, behavior: "smooth" })
  if (!libraryStates[kind].loaded) void loadLibrary(true, kind)
}

function syncLibraryFromUrl(): void {
  const value = new URL(window.location.href).searchParams.get("billnext")
  const kind = value === "favorites" || value === "history" || value === "watchlater" ? value : null
  libraryKind.value = kind
  if (kind) {
    if (!libraryStates[kind].loaded) void loadLibrary(true, kind)
    return
  }
  const nextTab: HomeTab = value === "following" || value === "tracking" || value === "checklist" || value === "popular" || value === "ranking" ? value : "recommended"
  if (activeTab.value === nextTab) return
  activeTab.value = nextTab
  selectedCard.value = null
  query.value = ""
  if (nextTab === "tracking") void refreshTrackedAnimeList()
  else if (nextTab !== "following" && nextTab !== "checklist" && !cards.value.length) void refresh()
}

function prefetchLibraries(): void {
  for (const kind of ["favorites", "history", "watchlater"] as LibraryKind[]) {
    if (!libraryStates[kind].loaded && !libraryStates[kind].loading) void loadLibrary(true, kind)
  }
}

async function selectTab(tab: HomeTab): Promise<void> {
  const leavingLibrary = Boolean(libraryKind.value)
  if (leavingLibrary) {
    libraryKind.value = null
  }
  selectedCard.value = null
  if (!leavingLibrary && activeTab.value === tab) {
    void refresh()
    return
  }
  activeTab.value = tab
  const tabUrl = new URL(window.location.href)
  if (tab === "recommended") tabUrl.searchParams.delete("billnext")
  else tabUrl.searchParams.set("billnext", tab)
  window.history.pushState({ billnext: tab }, "", tabUrl.toString())
  query.value = ""
  if (tab === "following") return
  if (tab === "tracking") {
    void refreshTrackedAnimeList()
    return
  }
  if (tab === "checklist") return
  void refresh()
}

async function requestPage(): Promise<{ cards: VideoDynamicCard[]; hasMore: boolean }> {
  if (activeTab.value === "popular") return fetchPopularVideosPage(pageIndex.value++)
  if (activeTab.value === "ranking") return fetchRankingVideos()
  return fetchHomeFeedPage(pageIndex.value++)
}

async function loadMore(): Promise<void> {
  if (loading.value || !hasMore.value) return
  loading.value = true
  error.value = null
  try {
    const page = await requestPage()
    const known = new Set(cards.value.map((card) => card.dynamicId))
    const freshCards = page.cards.filter((card) => !known.has(card.dynamicId) && !decision.dislikedIds.has(card.dynamicId))
    cards.value.push(...freshCards)
    hasMore.value = page.hasMore
    decision.syncWantWatchCards(freshCards)
    void decision.ensureFollowingStatuses(freshCards)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "内容加载失败"
  } finally {
    loading.value = false
    if (!autoFilling) scheduleAutoFill()
  }
}

function isNearFeedEnd(): boolean {
  if (!scrollRoot) return false
  return scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight <= PREFETCH_DISTANCE_PX
}

async function fillScrollBuffer(): Promise<void> {
  if (autoFilling || activeTab.value === "following" || activeTab.value === "tracking" || activeTab.value === "checklist") return
  autoFilling = true
  try {
    let loadedPages = 0
    while (hasMore.value && (visibleCards.value.length < 12 || isNearFeedEnd()) && loadedPages < MAX_AUTO_PAGES_PER_PASS) {
      await loadMore()
      loadedPages += 1
      await nextTick()
      if (error.value) break
    }
  } finally {
    autoFilling = false
  }
}

function scheduleAutoFill(): void {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    void fillScrollBuffer()
  })
}
async function refresh(): Promise<void> {
  if (libraryKind.value) {
    await loadLibrary(true)
    return
  }
  if (activeTab.value === "following") {
    followingFeedRef.value?.refreshFeed()
    return
  }
  if (activeTab.value === "tracking") {
    await refreshTrackedAnimeList()
    return
  }
  if (activeTab.value === "checklist") return
  cards.value = []
  pageIndex.value = 1
  hasMore.value = true
  await loadMore()
}

function persistTrackedAnime(): void {
  writePersistedState({ trackedAnime: trackedAnime.value })
}

async function addTrackedAnime(payload: AnimeEditorPayload): Promise<void> {
  if (trackingLoading.value) return
  trackingLoading.value = true
  trackingError.value = ""
  try {
    const item = await fetchAnimeByName(payload.title, payload.sourceUrl)
    const existingIndex = trackedAnime.value.findIndex((row) => row.id === item.id)
    if (existingIndex >= 0) {
      const existing = trackedAnime.value[existingIndex]
      trackedAnime.value.splice(existingIndex, 1, { ...item, seenEpisodeKey: existing.seenEpisodeKey || item.latestEpisodeKey })
      showToast("这部番已经在追番列表中，已刷新信息")
    } else {
      trackedAnime.value.push({ ...item, seenEpisodeKey: item.latestEpisodeKey })
      showToast("已加入正在追番")
    }
    persistTrackedAnime()
  } catch (caught) {
    trackingError.value = caught instanceof Error ? caught.message : "添加失败"
  } finally {
    trackingLoading.value = false
  }
}

async function editTrackedAnimeItem(payload: AnimeEditorPayload & { item: AnimeTrackingItem }): Promise<void> {
  if (trackingLoading.value) return
  trackingLoading.value = true
  trackingError.value = ""
  try {
    const updated = await editTrackedAnime(payload.item, payload.title, payload.sourceUrl)
    const nextItems = [...trackedAnime.value]
    let originalIndex = nextItems.findIndex((item) => item.id === payload.item.id)
    const duplicateIndex = nextItems.findIndex((item, index) => index !== originalIndex && item.id === updated.id)
    if (duplicateIndex >= 0) {
      nextItems.splice(duplicateIndex, 1)
      if (duplicateIndex < originalIndex) originalIndex -= 1
    }
    if (originalIndex >= 0) nextItems.splice(originalIndex, 1, updated)
    else nextItems.push(updated)
    trackedAnime.value = nextItems
    persistTrackedAnime()
    showToast("追番信息已更新")
  } catch (caught) {
    trackingError.value = caught instanceof Error ? caught.message : "编辑失败"
  } finally {
    trackingLoading.value = false
  }
}

async function refreshTrackedAnimeList(): Promise<void> {
  if (trackingLoading.value || !trackedAnime.value.length) return
  trackingLoading.value = true
  trackingError.value = ""
  const results = await Promise.allSettled(trackedAnime.value.map((item) => refreshTrackedAnime(item)))
  let failed = 0
  trackedAnime.value = trackedAnime.value.map((item, index) => {
    const result = results[index]
    if (result.status === "fulfilled") return result.value
    failed += 1
    return item
  })
  persistTrackedAnime()
  if (failed) trackingError.value = `${failed} 部番暂时刷新失败，已保留上次信息`
  trackingLoading.value = false
}

function markAnimeSeen(item: AnimeTrackingItem): void {
  if (item.seenEpisodeKey === item.latestEpisodeKey) return
  item.seenEpisodeKey = item.latestEpisodeKey
  persistTrackedAnime()
}

function removeTrackedAnime(item: AnimeTrackingItem): void {
  if (!window.confirm(`确认不再追「${item.title}」？`)) return
  trackedAnime.value = trackedAnime.value.filter((row) => row.id !== item.id)
  persistTrackedAnime()
  showToast("已移出正在追番")
}

function openSettings(): void {
  followingFeedRef.value?.openSettings()
}

function setWatchedChecklistIds(value: string[]): void {
  watchedChecklistIds.value = value
  writePersistedState({ watchedChecklistIds: value })
}
function setChecklistAvailability(value: import("../domain/checklist").ChecklistAvailability): void {
  checklistAvailability.value = { ...checklistAvailability.value, [value.key]: value }
  writePersistedState({ checklistAvailability: checklistAvailability.value })
}
function transitionCardLayout(update: () => void): void {
  const shell = shellRef.value
  const before = shell ? captureCardRects(shell) : new Map<HTMLElement, DOMRect>()
  shell?.classList.add("layout-flip-active")
  update()
  void nextTick(() => {
    if (!shell) return
    animateGridReflow(shell, before, () => shell.classList.remove("layout-flip-active"))
  })
}
function openSelectedCard(card: VideoDynamicCard): void {
  if (selectedCard.value?.dynamicId === card.dynamicId) return
  transitionCardLayout(() => { selectedCard.value = card })
}
function closeSelectedCard(): void {
  if (!selectedCard.value) return
  transitionCardLayout(() => { selectedCard.value = null })
}
function setCategoryFilter(value: ContentCategoryFilter): void {
  if (categoryFilter.value === value) return
  if (activeTab.value === "following") {
    categoryFilter.value = value
    followingFeedRef.value?.setCategoryFilter(value)
  } else {
    categoryFilter.value = value
  }
  void nextTick(() => {
    if (activeTab.value !== "following" && activeTab.value !== "tracking" && activeTab.value !== "checklist") scheduleAutoFill()
  })
}
function setScopedMinDuration(value: string): void {
  if (activeTab.value === "following") {
    dynamicMinDurationMinutes.value = value
    followingFeedRef.value?.setMinDuration(value)
    return
  }
  homeMinDurationMinutes.value = value
  writePersistedState({ homeMinDurationMinutes: value })
  scheduleAutoFill()
}
function setScopedPublishAfter(value: string): void {
  if (activeTab.value === "following") {
    dynamicPublishAfterDate.value = value
    followingFeedRef.value?.setPublishAfter(value)
    return
  }
  homePublishAfterDate.value = value
  writePersistedState({ homePublishAfterDate: value })
  scheduleAutoFill()
}
function setScopedSearchQuery(value: string): void {
  if (activeTab.value === "following") followingFeedRef.value?.setSearchQuery(value)
}
function setSidebarCollapsed(value: boolean): void {
  if (sidebarCollapsed.value === value) return
  sidebarCollapsed.value = value
  writePersistedState({ sidebarCollapsed: value })
}
function onSettingsChange(settings: {
  dynamicMinDurationMinutes: string
  dynamicPublishAfterDate: string
  hideWantWatch: boolean
  openVideoOnWantWatch: boolean
  sidebarCollapsed: boolean
}): void {
  dynamicMinDurationMinutes.value = settings.dynamicMinDurationMinutes
  dynamicPublishAfterDate.value = settings.dynamicPublishAfterDate
  hideWantWatch.value = settings.hideWantWatch
  openVideoOnWantWatch.value = settings.openVideoOnWantWatch
  if (sidebarCollapsed.value !== settings.sidebarCollapsed) setSidebarCollapsed(settings.sidebarCollapsed)
  if (activeTab.value !== "following" && activeTab.value !== "tracking" && activeTab.value !== "checklist" && visibleCards.value.length < 12 && hasMore.value) {
    void loadMore()
  }
}
async function onWantWatch(card: VideoDynamicCard): Promise<void> { await decision.markWantWatch(card) }
async function runLibraryAction(card: VideoDynamicCard, action: () => Promise<void>, successMessage: string, removeFrom?: LibraryKind): Promise<void> {
  if (libraryActionPending[card.dynamicId]) return
  libraryActionPending[card.dynamicId] = true
  try {
    await action()
    if (removeFrom) libraryStates[removeFrom].cards = libraryStates[removeFrom].cards.filter((item) => item.dynamicId !== card.dynamicId)
    showToast(successMessage)
  } catch (caught) {
    showToast(caught instanceof Error ? caught.message : "操作失败", "error")
  } finally {
    delete libraryActionPending[card.dynamicId]
  }
}
function onAddLibraryFavorite(card: VideoDynamicCard): void {
  void runLibraryAction(card, () => addVideoToDefaultFavorite(card), "已加入收藏")
}
function onRemoveLibraryFavorite(card: VideoDynamicCard): void {
  const mediaId = activeFavoriteFolderId.value
  void runLibraryAction(card, () => removeVideoFromFavorite(card, mediaId), "已取消收藏", "favorites")
}
function onRemoveLibraryWatchLater(card: VideoDynamicCard): void {
  void runLibraryAction(card, () => removeVideoFromWatchLater(card), "已移出稍后再看", "watchlater")
}
function onHelpRead(card: VideoDynamicCard): void {
  transcriber.markTranscribing(card)
  window.setTimeout(() => void transcriber.refresh().catch(() => undefined), 1500)
}
async function onDislike(card: VideoDynamicCard): Promise<void> {
  if (!(await decision.markDislike(card))) return
  cards.value = cards.value.filter((item) => item.dynamicId !== card.dynamicId)
  for (const state of Object.values(libraryStates)) state.cards = state.cards.filter((item) => item.dynamicId !== card.dynamicId)
  if (visibleCards.value.length < 12 && hasMore.value) void loadMore()
}
function onDetailDislike(card: VideoDynamicCard): void {
  void onDislike(card)
  closeSelectedCard()
}
async function onToggleFollow(card: VideoDynamicCard): Promise<void> {
  if (!card.upMid) return
  await decision.toggleFollowCreator(card.upMid, card.upName)
}
function onRestore(dynamicId: string): void {
  const item = trash.items.find((row) => row.dynamicId === dynamicId)
  if (!item) return
  decision.restoreDisliked(item.card)
  if (!cards.value.some((card) => card.dynamicId === dynamicId)) cards.value.unshift(item.card)
  showToast("已恢复")
}
function onRestoreAll(): void { for (const item of [...trash.items]) onRestore(item.dynamicId) }
function onClearAll(): void {
  if (!trash.items.length || !window.confirm("确认永久清空 " + trash.items.length + " 条记录？")) return
  decision.clearAllDisliked()
  showToast("垃圾箱已清空")
}
onMounted(() => {
  void transcriber.refresh().catch(() => undefined)
  transcriberPollTimer = window.setInterval(() => {
    if (Object.values(transcriber.cards).some((item) => item.state === "transcribing")) void transcriber.refresh().catch(() => undefined)
  }, 5000)
  scrollRoot = document.getElementById("billnext-inbox-root")
  scrollRoot?.addEventListener("scroll", scheduleAutoFill, { passive: true })
  window.addEventListener("popstate", syncLibraryFromUrl)
  if (libraryKind.value) void loadLibrary(true)
  else if (activeTab.value === "tracking") void refreshTrackedAnimeList()
  else if (activeTab.value !== "checklist") void loadMore()
  window.setTimeout(prefetchLibraries, 500)
})
onUnmounted(() => {
  scrollRoot?.removeEventListener("scroll", scheduleAutoFill)
  window.removeEventListener("popstate", syncLibraryFromUrl)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (transcriberPollTimer) window.clearInterval(transcriberPollTimer)
})
</script>
