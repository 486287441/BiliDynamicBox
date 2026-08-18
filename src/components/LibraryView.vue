<template>
  <section class="library-view">
    <header class="library-header">
      <div>
        <span class="library-kicker">MY LIBRARY</span>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
    </header>

    <div v-if="kind === 'favorites' && folders.length" class="library-folders" aria-label="收藏夹">
      <button
        v-for="folder in folders"
        :key="folder.id"
        type="button"
        :class="{ active: folder.id === activeFolderId }"
        @click="$emit('select-folder', folder.id)"
      >
        <span>{{ folder.title }}</span><small>{{ folder.mediaCount }}</small>
      </button>
    </div>

    <div v-if="loading && !cards.length" class="library-state"><Icon icon="line-md:loading-twotone-loop" /><span>正在加载{{ title }}…</span></div>
    <div v-else-if="error" class="library-state is-error"><Icon icon="mingcute:warning-line" /><span>{{ error }}</span><button type="button" @click="$emit('retry')">重试</button></div>
    <div v-else-if="!cards.length" class="library-state"><Icon :icon="emptyIcon" /><span>{{ emptyText }}</span></div>

    <TransitionGroup v-else class="home-video-grid library-five-grid" tag="div" name="home-card">
      <VideoCard
        v-for="card in cards"
        :key="card.dynamicId"
        :card="card"
        :pending-map="pendingMap"
        :want-watch-map="wantWatchMap"
        :open-video-on-want-watch="openVideoOnWantWatch"
        :following-up-map="followingUpMap"
        :relation-pending-mid="relationPendingMid"
        :transcriber-state="transcriberStateMap[card.dynamicId]"
        :action-mode="kind === 'favorites' ? 'favorites' : kind === 'watchlater' ? 'watchlater' : 'default'"
        @want-watch="$emit('want-watch', card)"
        @help-read="$emit('help-read', card)"
        @dislike="$emit('dislike', card)"
        @toggle-follow="$emit('toggle-follow', card)"
        @add-favorite="$emit('add-favorite', card)"
        @remove-favorite="$emit('remove-favorite', card)"
        @remove-watch-later="$emit('remove-watch-later', card)"
      />
    </TransitionGroup>

    <button v-if="hasMore && cards.length" class="library-load-more" type="button" :disabled="loading" @click="$emit('load-more')">
      {{ loading ? "加载中…" : "加载更多" }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { computed } from "vue"
import type { FavoriteFolder, LibraryKind, VideoDynamicCard } from "../domain/types"
import type { TranscriberCardState } from "../store/transcriber"
import VideoCard from "./VideoCard.vue"

const props = defineProps<{
  kind: LibraryKind
  cards: VideoDynamicCard[]
  folders: FavoriteFolder[]
  activeFolderId: number
  loading: boolean
  error: string
  hasMore: boolean
  pendingMap: Record<string, boolean>
  wantWatchMap: Record<string, boolean>
  openVideoOnWantWatch: boolean
  followingUpMap: Record<string, boolean>
  relationPendingMid: string
  transcriberStateMap: Record<string, TranscriberCardState | undefined>
}>()
defineEmits<{
  (event: "select-folder", folderId: number): void
  (event: "load-more"): void
  (event: "retry"): void
  (event: "want-watch", card: VideoDynamicCard): void
  (event: "help-read", card: VideoDynamicCard): void
  (event: "dislike", card: VideoDynamicCard): void
  (event: "toggle-follow", card: VideoDynamicCard): void
  (event: "add-favorite", card: VideoDynamicCard): void
  (event: "remove-favorite", card: VideoDynamicCard): void
  (event: "remove-watch-later", card: VideoDynamicCard): void
}>()

const title = computed(() => ({ favorites: "我的收藏", history: "观看历史", watchlater: "稍后再看" })[props.kind])
const subtitle = computed(() => ({
  favorites: "按收藏夹整理，随时回到值得保留的内容",
  history: "找回最近看过的视频",
  watchlater: "留到合适的时候，再认真看完",
})[props.kind])
const emptyText = computed(() => ({ favorites: "这个收藏夹还是空的", history: "暂时没有观看记录", watchlater: "稍后再看列表还是空的" })[props.kind])
const emptyIcon = computed(() => ({ favorites: "mingcute:star-line", history: "mingcute:time-line", watchlater: "mingcute:carplay-line" })[props.kind])

</script>
