<template>
  <article class="video-card" :data-dynamic-id="card.dynamicId">
    <a class="video-cover-link" :href="videoUrl" target="_blank" rel="noopener noreferrer">
      <img class="video-cover" :src="coverUrl" :alt="card.title" loading="lazy" />
      <span v-if="card.durationText" class="video-duration-badge">{{ card.durationText }}</span>
    </a>

    <div class="video-meta">
      <a class="video-title" :href="videoUrl" target="_blank" rel="noopener noreferrer" :title="card.title">
        {{ card.title }}
      </a>
      <div class="video-subtitle">
        <a
          v-if="card.upAvatar"
          class="video-up-avatar-link"
          :href="upSpaceUrl"
          target="_blank"
          rel="noopener noreferrer"
          :title="`打开 ${card.upName} 的个人空间`"
        >
          <img class="video-up-avatar" :src="avatarUrl" :alt="card.upName" loading="lazy" />
        </a>
        <a class="video-up" :href="upSpaceUrl" target="_blank" rel="noopener noreferrer" :title="`打开 ${card.upName} 的个人空间`">
          {{ card.upName }}
        </a>
        <button
          v-if="card.upMid"
          class="video-up-unfollow"
          type="button"
          :disabled="isUnfollowingUp"
          @click.stop="$emit('unfollow')"
        >
          {{ isUnfollowingUp ? "处理中..." : "取关" }}
        </button>
      </div>
      <div class="video-stats">
        <span>{{ playCountLabel }} 播放</span>
        <span>·</span>
        <span>{{ danmakuLabel }} 弹幕</span>
        <span>·</span>
        <span>{{ publishLabel }}</span>
      </div>
    </div>

    <div class="video-actions">
      <div class="video-actions-buttons">
        <button
          class="action-button action-button-primary"
          type="button"
          :disabled="isPending"
          @click="onWantWatchClick"
        >
          {{ isPending ? "处理中..." : "想看" }}
        </button>
        <button class="action-button action-button-ghost" type="button" :disabled="isPending" @click="$emit('dislike')">
          不想看
        </button>
      </div>
      <span v-if="isWantWatched" class="video-want-watch-note">已点击想看</span>
    </div>

    <button
      class="video-copy-link"
      type="button"
      title="复制链接并加入想看"
      aria-label="复制链接并加入想看"
      :disabled="isPending"
      @click.stop="copyVideoLink"
    >
      <CopyLinkIcon />
    </button>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue"

import CopyLinkIcon from "./CopyLinkIcon.vue"
import type { VideoDynamicCard } from "../domain/types"
import { showToast } from "../services/toast"
import { getVideoUrl, openVideoInNewTab } from "../utils/video-url"

const props = defineProps<{
  card: VideoDynamicCard
  pendingMap: Record<string, boolean>
  wantWatchMap: Record<string, boolean>
  openVideoOnWantWatch: boolean
  unfollowingUpMid: string
}>()

const emit = defineEmits<{
  (event: "want-watch"): void
  (event: "dislike"): void
  (event: "unfollow"): void
}>()

function triggerWantWatch(): void {
  if (props.openVideoOnWantWatch) {
    openVideoInNewTab(props.card)
  }
  emit("want-watch")
}

function onWantWatchClick(): void {
  triggerWantWatch()
}

async function copyVideoLink(event: MouseEvent): Promise<void> {
  event.stopPropagation()
  event.preventDefault()

  if (isPending.value) {
    return
  }

  const url = videoUrl.value
  let copied = false

  try {
    await navigator.clipboard.writeText(url)
    copied = true
  } catch {
    /* fallback below */
  }

  if (!copied) {
    const textarea = document.createElement("textarea")
    textarea.value = url
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    copied = document.execCommand("copy")
    document.body.removeChild(textarea)
    showToast(copied ? "链接已复制" : "复制失败", copied ? "success" : "error")
  } else {
    showToast("链接已复制")
  }

  if (copied) {
    triggerWantWatch()
  }
}

const coverUrl = computed(() => {
  return props.card.cover ? `${props.card.cover}@672w_378h_1c` : ""
})

const avatarUrl = computed(() => {
  return props.card.upAvatar ? `${props.card.upAvatar}@48w_48h_1c_1s` : ""
})

const videoUrl = computed(() => getVideoUrl(props.card))

const upSpaceUrl = computed(() => {
  if (props.card.upMid) {
    return `https://space.bilibili.com/${props.card.upMid}`
  }
  return "https://space.bilibili.com/"
})

const publishLabel = computed(() => {
  const value = props.card.publishAt
  const date = new Date(value * 1000)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${month}-${day} ${hour}:${minute}`
})

const isPending = computed(() => Boolean(props.pendingMap[props.card.dynamicId]))
const isWantWatched = computed(() => Boolean(props.wantWatchMap[props.card.dynamicId]))
const isUnfollowingUp = computed(
  () => Boolean(props.card.upMid) && props.unfollowingUpMid === props.card.upMid,
)

function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0"
  }
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1).replace(/\.0$/, "")}亿`
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\.0$/, "")}万`
  }
  return String(value)
}

const playCountLabel = computed(() => formatCount(props.card.playCount))
const danmakuLabel = computed(() => formatCount(props.card.danmakuCount))
</script>
