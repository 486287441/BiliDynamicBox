<template>
  <a class="up-space-video-card" :href="videoUrl" target="_blank" rel="noopener noreferrer">
    <div class="up-space-video-cover-wrap">
      <img class="up-space-video-cover" :src="coverUrl" :alt="video.title" loading="lazy" />
      <span v-if="video.durationText" class="up-space-video-duration">{{ video.durationText }}</span>
      <span class="up-space-video-kind">{{ video.selectionLabel }}</span>
    </div>
    <div class="up-space-video-meta">
      <p class="up-space-video-title" :title="video.title">{{ video.title }}</p>
      <p class="up-space-video-stats">
        <span>{{ playCountLabel }} 播放</span>
        <span>·</span>
        <span>{{ publishLabel }}</span>
      </p>
    </div>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue"

import type { UpSpaceVideo } from "../domain/up-filter-types"
import { formatCount } from "../utils/format-count"

const props = defineProps<{
  video: UpSpaceVideo
}>()

const videoUrl = computed(() => {
  if (props.video.bvid) {
    return `https://www.bilibili.com/video/${props.video.bvid}`
  }
  if (props.video.aid) {
    return `https://www.bilibili.com/video/av${props.video.aid}`
  }
  return "https://www.bilibili.com/"
})

const coverUrl = computed(() => {
  return props.video.cover ? `${props.video.cover}@672w_378h_1c` : ""
})

const playCountLabel = computed(() => formatCount(props.video.playCount))

const publishLabel = computed(() => {
  const value = props.video.publishAt
  if (!value) {
    return "未知时间"
  }
  const date = new Date(value * 1000)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${month}-${day}`
})
</script>
