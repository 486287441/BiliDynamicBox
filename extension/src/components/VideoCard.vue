<template>
  <article class="video-card">
    <a class="video-cover-link" :href="videoUrl" target="_blank" rel="noopener noreferrer">
      <img class="video-cover" :src="coverUrl" :alt="card.title" loading="lazy" />
      <span v-if="card.durationText" class="video-duration-badge">{{ card.durationText }}</span>
    </a>

    <div class="video-meta">
      <a class="video-title" :href="videoUrl" target="_blank" rel="noopener noreferrer" :title="card.title">
        {{ card.title }}
      </a>
      <div class="video-subtitle">
        <img v-if="card.upAvatar" class="video-up-avatar" :src="avatarUrl" :alt="card.upName" loading="lazy" />
        <span class="video-up">{{ card.upName }}</span>
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
      <button
        class="action-button action-button-primary"
        type="button"
        :disabled="isPending"
        @click="$emit('want-watch')"
      >
        {{ isPending ? "处理中..." : "想看" }}
      </button>
      <button class="action-button action-button-ghost" type="button" :disabled="isPending" @click="$emit('dislike')">
        不想看
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue"

import type { VideoDynamicCard } from "../domain/types"

const props = defineProps<{
  card: VideoDynamicCard
  pendingMap: Record<string, boolean>
}>()

defineEmits<{
  (event: "want-watch"): void
  (event: "dislike"): void
}>()

const coverUrl = computed(() => {
  return props.card.cover ? `${props.card.cover}@672w_378h_1c` : ""
})

const avatarUrl = computed(() => {
  return props.card.upAvatar ? `${props.card.upAvatar}@48w_48h_1c_1s` : ""
})

const videoUrl = computed(() => {
  if (props.card.videoBvid) {
    return `https://www.bilibili.com/video/${props.card.videoBvid}`
  }
  if (props.card.videoAid) {
    return `https://www.bilibili.com/video/av${props.card.videoAid}`
  }
  return "https://www.bilibili.com/"
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
