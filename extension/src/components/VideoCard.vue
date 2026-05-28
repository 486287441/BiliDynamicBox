<template>
  <article class="video-card">
    <a class="video-cover-link" :href="videoUrl" target="_blank" rel="noopener noreferrer">
      <img class="video-cover" :src="coverUrl" :alt="card.title" loading="lazy" />
    </a>

    <div class="video-meta">
      <a class="video-title" :href="videoUrl" target="_blank" rel="noopener noreferrer" :title="card.title">
        {{ card.title }}
      </a>
      <div class="video-subtitle">
        <span class="video-up">{{ card.upName }}</span>
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
</script>
