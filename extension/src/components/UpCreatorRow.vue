<template>
  <article ref="rowElement" class="up-creator-row">
    <header class="up-creator-header">
      <a class="up-creator-avatar-link" :href="spaceUrl" target="_blank" rel="noopener noreferrer">
        <img class="up-creator-avatar" :src="avatarUrl" :alt="creator.name" loading="lazy" />
      </a>
      <div class="up-creator-info">
        <div class="up-creator-title-row">
          <a class="up-creator-name" :href="spaceUrl" target="_blank" rel="noopener noreferrer">
            {{ creator.name }}
          </a>
          <button
            class="up-creator-unfollow-button"
            type="button"
            :disabled="unfollowing"
            @click="$emit('unfollow', creator.mid)"
          >
            {{ unfollowing ? "处理中..." : "取消关注" }}
          </button>
        </div>
        <p v-if="creator.sign" class="up-creator-sign" :title="creator.sign">{{ creator.sign }}</p>
      </div>
    </header>

    <div v-if="creator.videosLoading" class="up-creator-videos-loading">正在低速加载视频...</div>
    <div v-else-if="creator.videosError" class="up-creator-videos-error">
      {{ creator.videosError }}
      <button class="up-creator-retry-button" type="button" @click="retryLoad">重试</button>
    </div>
    <div v-else-if="!creator.detailsLoaded" class="up-creator-videos-pending">滚动到附近后自动加载</div>
    <div v-else-if="creator.videos.length === 0" class="up-creator-videos-empty">暂无公开投稿</div>
    <div v-else class="up-creator-video-list">
      <UpSpaceVideoCard
        v-for="video in creator.videos"
        :key="`${video.bvid || video.aid}-${video.selectionLabel}`"
        :video="video"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"

import type { UpCreator } from "../domain/up-filter-types"
import { useUpFilterStore } from "../store/up-filter"
import UpSpaceVideoCard from "./UpSpaceVideoCard.vue"

const props = defineProps<{ creator: UpCreator; unfollowing: boolean }>()
defineEmits<{ (event: "unfollow", mid: string): void }>()

const upFilter = useUpFilterStore()
const rowElement = ref<HTMLElement | null>(null)
const spaceUrl = computed(() => `https://space.bilibili.com/${props.creator.mid}`)
const avatarUrl = computed(() => props.creator.face ? `${props.creator.face}@96w_96h_1c_1s` : "")
let observer: IntersectionObserver | null = null

function ensureLoaded(): void {
  if (!props.creator.detailsLoaded && !props.creator.videosLoading) {
    void upFilter.loadCreatorDetails(props.creator.mid)
  }
}

function retryLoad(): void {
  void upFilter.loadCreatorDetails(props.creator.mid, true)
}

onMounted(() => {
  if (!("IntersectionObserver" in window)) {
    ensureLoaded()
    return
  }
  observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      ensureLoaded()
      observer?.disconnect()
    }
  }, { rootMargin: "600px 0px" })
  if (rowElement.value) observer.observe(rowElement.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>
