<template>
  <article class="video-card" :class="{ 'is-selected': selected }" :data-dynamic-id="card.dynamicId" :aria-current="selected ? 'true' : undefined" tabindex="0" @click="$emit('select')" @keydown.enter="$emit('select')">
    <div class="video-cover-wrap">
      <a class="video-cover-link" :href="videoUrl" target="_blank" rel="noopener noreferrer" @click.stop>
        <img class="video-cover" :src="coverUrl" :alt="card.title" loading="lazy" />
        <span v-if="card.rank" class="video-rank-badge">{{ card.rank }}</span>
        <span v-if="card.durationText" class="video-duration-badge">{{ card.durationText }}</span>
      </a>
    </div>
    <div class="video-info-row">
      <a v-if="card.upAvatar" class="video-up-avatar-link" :href="upSpaceUrl" target="_blank" rel="noopener noreferrer" @click.stop>
        <img class="video-up-avatar" :src="avatarUrl" :alt="card.upName" loading="lazy" />
      </a>
      <div class="video-meta">
        <a class="video-title" :href="videoUrl" target="_blank" rel="noopener noreferrer" :title="card.title" @click.stop>{{ card.title }}</a>
        <div class="video-subtitle">
          <a class="video-up" :href="upSpaceUrl" target="_blank" rel="noopener noreferrer" @click.stop>{{ card.upName }}</a>
          <button v-if="card.upMid" class="video-up-unfollow" type="button" :disabled="isRelationPending || isRelationUnknown" @click.stop="$emit('toggle-follow')">{{ isRelationPending ? "处理中…" : isRelationUnknown ? "读取中…" : isFollowing ? "取消关注" : "关注" }}</button>
        </div>
        <div class="video-stats"><span>{{ playCountLabel }} 播放</span><span>·</span><span>{{ danmakuLabel }} 弹幕</span><span>·</span><span>{{ publishLabel }}</span></div>
      </div>
    </div>
    <div v-if="actionMode === 'default'" class="video-card-footer-actions">
      <button class="footer-action footer-action-primary" type="button" :disabled="isPending" @click.stop="onWantWatchClick">{{ isPending ? "处理中…" : isWantWatched ? "已想看" : "想看" }}</button>
      <button class="footer-action footer-action-help-read" type="button" :disabled="isPending || Boolean(transcriberState)" @click="helpMeRead">{{ transcriberState?.state === 'transcribing' ? '正在帮读' : '帮我读' }}</button>
      <button class="footer-action" type="button" :disabled="isPending" @click.stop="$emit('dislike')">不想看</button>
    </div>
    <div v-else-if="actionMode === 'favorites'" class="video-card-footer-actions library-card-actions">
      <button class="footer-action footer-action-help-read" type="button" :disabled="isPending || Boolean(transcriberState)" @click="helpMeRead">{{ transcriberState?.state === 'transcribing' ? '正在帮读' : '帮我读' }}</button>
      <button class="footer-action" type="button" :disabled="isPending" @click.stop="$emit('remove-favorite')">{{ isPending ? "处理中…" : "取消收藏" }}</button>
    </div>
    <div v-else class="video-card-footer-actions library-card-actions">
      <button class="footer-action" type="button" :disabled="isPending" @click.stop="$emit('add-favorite')">加入收藏</button>
      <button class="footer-action footer-action-help-read" type="button" :disabled="isPending || Boolean(transcriberState)" @click="helpMeRead">{{ transcriberState?.state === 'transcribing' ? '正在帮读' : '帮我读' }}</button>
      <button class="footer-action" type="button" :disabled="isPending" @click.stop="$emit('remove-watch-later')">{{ isPending ? "处理中…" : "移出稍后再看" }}</button>
    </div>
    <div v-if="transcriberState?.state === 'completed'" class="video-transcriber-result">
      <a class="video-transcriber-status is-completed" :href="transcriberOutputUrl" target="_blank" rel="noopener noreferrer">查看帮读结果</a>
      <div v-if="transcriberState.state === 'completed' && transcriberState.recommendation" class="video-recommendation">
        <div class="video-recommendation-heading">
          <strong class="recommendation-grade">{{ transcriberState.recommendation.grade }} · {{ transcriberState.recommendation.score }}分</strong>
          <span>{{ transcriberState.recommendation.advice || transcriberState.recommendation.verdict }}</span>
        </div>
        <p>{{ recommendationReason }}</p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { VideoDynamicCard } from "../domain/types"
import type { TranscriberCardState } from "../store/transcriber"
import { showToast } from "../services/toast"
import { getVideoUrl, openVideoInNewTab } from "../utils/video-url"

const props = defineProps<{
  card: VideoDynamicCard
  pendingMap: Record<string, boolean>
  wantWatchMap: Record<string, boolean>
  openVideoOnWantWatch: boolean
  followingUpMap: Record<string, boolean>
  relationPendingMid: string
  transcriberState?: TranscriberCardState
  selected?: boolean
  actionMode?: "default" | "favorites" | "watchlater"
}>()
const emit = defineEmits<{
  (event: "want-watch"): void
  (event: "dislike"): void
  (event: "toggle-follow"): void
  (event: "help-read"): void
  (event: "select"): void
  (event: "add-favorite"): void
  (event: "remove-favorite"): void
  (event: "remove-watch-later"): void
}>()

const actionMode = computed(() => props.actionMode ?? "default")

function onWantWatchClick(): void {
  if (props.openVideoOnWantWatch) openVideoInNewTab(props.card)
  emit("want-watch")
}
async function helpMeRead(event: MouseEvent): Promise<void> {
  event.stopPropagation()
  event.preventDefault()
  if (isPending.value || props.transcriberState?.state === "transcribing") return
  const url = videoUrl.value
  let copied = false
  try {
    await navigator.clipboard.writeText(url)
    copied = true
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = url
    textarea.style.position = "fixed"
    textarea.style.opacity = "0"
    document.body.appendChild(textarea)
    textarea.select()
    copied = document.execCommand("copy")
    document.body.removeChild(textarea)
  }
  if (!copied) {
    showToast("复制失败，无法交给 Transcriber", "error")
    return
  }
  emit("help-read")
  showToast("已复制链接，Transcriber 将自动接收")
}

const coverUrl = computed(() => props.card.cover ? props.card.cover + "@672w_378h_1c" : "")
const avatarUrl = computed(() => props.card.upAvatar ? props.card.upAvatar + "@48w_48h_1c_1s" : "")
const videoUrl = computed(() => getVideoUrl(props.card))
const transcriberOutputUrl = computed(() => props.transcriberState?.outputUrl || "http://127.0.0.1:8765/")
const recommendationReason = computed(() => {
  const recommendation = props.transcriberState?.recommendation
  return recommendation?.recommendation_reason || recommendation?.reason || recommendation?.scoring_reason || ""
})
const upSpaceUrl = computed(() => props.card.upMid ? "https://space.bilibili.com/" + props.card.upMid : "https://space.bilibili.com/")
const publishLabel = computed(() => {
  const date = new Date(props.card.publishAt * 1000)
  return String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0")
})
const isPending = computed(() => Boolean(props.pendingMap[props.card.dynamicId]))
const isWantWatched = computed(() => Boolean(props.wantWatchMap[props.card.dynamicId]))
const isFollowing = computed(() => Boolean(props.card.upMid) && props.followingUpMap[props.card.upMid] === true)
const isRelationUnknown = computed(() => Boolean(props.card.upMid) && props.followingUpMap[props.card.upMid] === undefined)
const isRelationPending = computed(() => Boolean(props.card.upMid) && props.relationPendingMid === props.card.upMid)
function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value >= 100000000) return (value / 100000000).toFixed(1).replace(/\.0$/, "") + "亿"
  if (value >= 10000) return (value / 10000).toFixed(1).replace(/\.0$/, "") + "万"
  return String(value)
}
const playCountLabel = computed(() => formatCount(props.card.playCount))
const danmakuLabel = computed(() => formatCount(props.card.danmakuCount))
</script>
