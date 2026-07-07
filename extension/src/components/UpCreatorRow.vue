<template>
  <article class="up-creator-row">
    <header class="up-creator-header">
      <a
        class="up-creator-avatar-link"
        :href="spaceUrl"
        target="_blank"
        rel="noopener noreferrer"
        :title="`打开 ${creator.name} 的个人空间`"
      >
        <img class="up-creator-avatar" :src="avatarUrl" :alt="creator.name" loading="lazy" />
      </a>

      <div class="up-creator-info">
        <div class="up-creator-title-row">
          <a
            class="up-creator-name"
            :href="spaceUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="creator.name"
          >
            {{ creator.name }}
          </a>
          <button
            class="up-creator-unfollow-button"
            type="button"
            :disabled="unfollowing"
            @click="$emit('unfollow', creator.mid)"
          >
            {{ unfollowing ? "处理中..." : "取关" }}
          </button>
          <span v-if="creator.followerCount > 0" class="up-creator-followers">{{ followerLabel }} 粉丝</span>
        </div>
        <p v-if="creator.sign" class="up-creator-sign" :title="creator.sign">{{ creator.sign }}</p>
      </div>
    </header>

    <div v-if="creator.videosLoading" class="up-creator-videos-loading">正在加载视频...</div>
    <div v-else-if="creator.videosError" class="up-creator-videos-error">
      {{ creator.videosError }}
      <button class="up-creator-retry-button" type="button" @click="retryLoad">重试</button>
    </div>
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
import { computed } from "vue"

import type { UpCreator } from "../domain/up-filter-types"
import { useUpFilterStore } from "../store/up-filter"
import { formatCount } from "../utils/format-count"
import UpSpaceVideoCard from "./UpSpaceVideoCard.vue"

const props = defineProps<{
  creator: UpCreator
  unfollowing: boolean
}>()

defineEmits<{
  (event: "unfollow", mid: string): void
}>()

const upFilter = useUpFilterStore()

const spaceUrl = computed(() => `https://space.bilibili.com/${props.creator.mid}`)

const avatarUrl = computed(() => {
  return props.creator.face ? `${props.creator.face}@96w_96h_1c_1s` : ""
})

const followerLabel = computed(() => formatCount(props.creator.followerCount))

function retryLoad(): void {
  upFilter.patchCreator(props.creator.mid, {
    videosLoading: true,
    videosError: null,
  })
  void upFilter.loadCreatorDetails(props.creator.mid)
}
</script>
