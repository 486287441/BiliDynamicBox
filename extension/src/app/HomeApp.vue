<template>
  <main class="inbox-shell home-shell">
    <AppNav :active="navActive" :trash-count="trash.count" @open-trash="trash.setOpen(true)" @navigate-library="navigateLibrary" />
    <AppDock :active="navActive" @refresh="refresh" @open-tools="openSettings" @navigate-library="navigateLibrary" />

    <HomeTabsBar v-if="!libraryKind" :active="activeTab" @select="selectTab" />

    <LibraryView
      v-if="libraryKind"
      :kind="libraryKind"
      :cards="libraryCards"
      :folders="favoriteFolders"
      :active-folder-id="activeFavoriteFolderId"
      :loading="libraryLoading"
      :error="libraryError"
      :has-more="libraryHasMore"
      :pending-map="decision.pendingMap"
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
    />

    <DynamicFeed
      v-else
      ref="followingFeedRef"
      embedded
      :feed-visible="activeTab === 'following'"
      @settings-change="onSettingsChange"
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

    <section v-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking' && error" class="inbox-error home-feed-error">
      <span>{{ error }}</span><button type="button" @click="loadMore">重试</button>
    </section>

    <TransitionGroup v-else-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking'" class="home-video-grid" tag="section" name="home-card">
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
        @want-watch="onWantWatch(card)"
        @help-read="onHelpRead(card)"
        @dislike="onDislike(card)"
        @toggle-follow="onToggleFollow(card)"
      />
    </TransitionGroup>

    <div v-if="!libraryKind && activeTab !== 'following' && activeTab !== 'tracking'" class="home-feed-sentinel">
      <span v-if="loading">正在获取内容…</span>
      <span v-else-if="hasMore">继续下滑，自动加载更多</span>
      <span v-else-if="cards.length">已经到底了</span>
    </div>

    <TrashModal :open="trash.open" :items="trash.items" @close="trash.setOpen(false)" @restore="onRestore" @restore-all="onRestoreAll" @clear-all="onClearAll" />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue"
import DynamicFeed from "./App.vue"
import AppDock from "../components/AppDock.vue"
import AppNav from "../components/AppNav.vue"
import HomeTabsBar, { type HomeTabValue } from "../components/HomeTabsBar.vue"
import AnimeTrackingView, { type AnimeEditorPayload } from "../components/AnimeTrackingView.vue"
import LibraryView from "../components/LibraryView.vue"
import TrashModal from "../components/TrashModal.vue"
import VideoCard from "../components/VideoCard.vue"
import type { FavoriteFolder, LibraryKind, VideoDynamicCard } from "../domain/types"
import type { AnimeTrackingItem } from "../domain/anime-tracking"
import {
  fetchFavoriteFolders,
  fetchFavoriteVideos,
  fetchHistoryVideos,
  fetchHomeFeedPage,
  fetchPopularVideosPage,
  fetchRankingVideos,
  fetchWatchLaterVideos,
} from "../services/bilibili-api"
import { editTrackedAnime, fetchAnimeByName, refreshTrackedAnime } from "../services/anime-tracking"
import { readPersistedState, writePersistedState } from "../services/storage"
import { showToast } from "../services/toast"
import { useDecisionStore } from "../store/decision"
import { useTranscriberStore } from "../store/transcriber"
import { useTrashStore } from "../store/trash"

type HomeTab = HomeTabValue
const persisted = readPersistedState()
const decision = useDecisionStore()
const transcriber = useTranscriberStore()
const trash = useTrashStore()
const requestedTab = new URL(window.location.href).searchParams.get("readflow")
const libraryKind = ref<LibraryKind | null>(
  requestedTab === "favorites" || requestedTab === "history" || requestedTab === "watchlater" ? requestedTab : null,
)
const activeTab = ref<HomeTab>(requestedTab === "following" || requestedTab === "tracking" || requestedTab === "popular" || requestedTab === "ranking" ? requestedTab : "recommended")
const cards = ref<VideoDynamicCard[]>([])
const query = ref("")
const loading = ref(false)
const error = ref<string | null>(null)
const hasMore = ref(true)
const pageIndex = ref(1)
const minDurationMinutes = ref(persisted.minDurationMinutes)
const hideWantWatch = ref(persisted.hideWantWatch)
const openVideoOnWantWatch = ref(persisted.openVideoOnWantWatch)
const trackedAnime = ref<AnimeTrackingItem[]>(persisted.trackedAnime)
const trackingLoading = ref(false)
const trackingError = ref("")
const followingFeedRef = ref<{ openSettings: () => void; refreshFeed: () => void } | null>(null)
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
}
function createLibraryState(): LibraryState {
  return { cards: [], loading: false, loaded: false, error: "", hasMore: false, page: 1, historyMax: 0, historyViewAt: 0 }
}
const libraryStates = reactive<Record<LibraryKind, LibraryState>>({
  favorites: createLibraryState(),
  history: createLibraryState(),
  watchlater: createLibraryState(),
})
let transcriberPollTimer = 0
let scrollRoot: HTMLElement | null = null
let scrollFrame = 0
let autoFilling = false

const PREFETCH_DISTANCE_PX = 1600
const MAX_AUTO_PAGES_PER_PASS = 4

const visibleCards = computed(() => {
  const normalized = query.value.trim().toLocaleLowerCase()
  const minimumSeconds = Number(minDurationMinutes.value) * 60
  return cards.value.filter((card) => {
    if (decision.dislikedIds.has(card.dynamicId)) return false
    if (hideWantWatch.value && decision.wantWatchIds.has(card.dynamicId)) return false
    if (Number.isFinite(minimumSeconds) && minimumSeconds > 0 && card.durationSeconds < minimumSeconds) return false
    if (!normalized) return true
    return card.title.toLocaleLowerCase().includes(normalized) || card.upName.toLocaleLowerCase().includes(normalized)
  })
})
const wantWatchMap = computed(() => Object.fromEntries([...decision.wantWatchIds].map((id) => [id, true])))
const navActive = computed(() => libraryKind.value ?? (activeTab.value === "following" ? "moments" : "home"))
const activeLibraryState = computed(() => libraryKind.value ? libraryStates[libraryKind.value] : null)
const libraryCards = computed(() => activeLibraryState.value?.cards ?? [])
const libraryLoading = computed(() => activeLibraryState.value?.loading ?? false)
const libraryError = computed(() => activeLibraryState.value?.error ?? "")
const libraryHasMore = computed(() => activeLibraryState.value?.hasMore ?? false)
const libraryTranscriberStateMap = computed(() => Object.fromEntries(
  libraryCards.value.map((card) => [card.dynamicId, transcriber.getForCard(card)]),
))

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
      const result = await fetchHistoryVideos(state.historyMax, state.historyViewAt)
      if (reset) state.cards = result.cards
      else {
        const known = new Set(state.cards.map((card) => card.dynamicId))
        state.cards.push(...result.cards.filter((card) => !known.has(card.dynamicId)))
      }
      state.hasMore = result.hasMore
      state.historyMax = result.nextMax ?? 0
      state.historyViewAt = result.nextViewAt ?? 0
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
  url.searchParams.set("readflow", kind)
  window.history.pushState({ readflow: kind }, "", url.toString())
  scrollRoot?.scrollTo({ top: 0, behavior: "smooth" })
  if (!libraryStates[kind].loaded) void loadLibrary(true, kind)
}

function syncLibraryFromUrl(): void {
  const value = new URL(window.location.href).searchParams.get("readflow")
  const kind = value === "favorites" || value === "history" || value === "watchlater" ? value : null
  libraryKind.value = kind
  if (kind && !libraryStates[kind].loaded) void loadLibrary(true, kind)
}

function prefetchLibraries(): void {
  for (const kind of ["favorites", "history", "watchlater"] as LibraryKind[]) {
    if (!libraryStates[kind].loaded && !libraryStates[kind].loading) void loadLibrary(true, kind)
  }
}

async function selectTab(tab: HomeTab): Promise<void> {
  if (tab === "following") {
    activeTab.value = tab
    query.value = ""
    return
  }
  if (activeTab.value === tab) {
    void refresh()
    return
  }
  activeTab.value = tab
  query.value = ""
  if (tab === "tracking") {
    void refreshTrackedAnimeList()
    return
  }
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
  if (autoFilling || activeTab.value === "following" || activeTab.value === "tracking") return
  autoFilling = true
  try {
    let loadedPages = 0
    while (hasMore.value && isNearFeedEnd() && loadedPages < MAX_AUTO_PAGES_PER_PASS) {
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
    trackedAnime.value = trackedAnime.value.filter((item) => item.id !== payload.item.id && item.id !== updated.id)
    trackedAnime.value.push(updated)
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
function onSettingsChange(settings: {
  minDurationMinutes: string
  hideWantWatch: boolean
  openVideoOnWantWatch: boolean
}): void {
  minDurationMinutes.value = settings.minDurationMinutes
  hideWantWatch.value = settings.hideWantWatch
  openVideoOnWantWatch.value = settings.openVideoOnWantWatch
  if (activeTab.value !== "following" && activeTab.value !== "tracking" && visibleCards.value.length < 12 && hasMore.value) {
    void loadMore()
  }
}
async function onWantWatch(card: VideoDynamicCard): Promise<void> { await decision.markWantWatch(card) }
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
  scrollRoot = document.getElementById("bewly-inbox-root")
  scrollRoot?.addEventListener("scroll", scheduleAutoFill, { passive: true })
  window.addEventListener("popstate", syncLibraryFromUrl)
  if (libraryKind.value) void loadLibrary(true)
  else if (activeTab.value === "tracking") void refreshTrackedAnimeList()
  else void loadMore()
  window.setTimeout(prefetchLibraries, 500)
})
onUnmounted(() => {
  scrollRoot?.removeEventListener("scroll", scheduleAutoFill)
  window.removeEventListener("popstate", syncLibraryFromUrl)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
  if (transcriberPollTimer) window.clearInterval(transcriberPollTimer)
})
</script>
