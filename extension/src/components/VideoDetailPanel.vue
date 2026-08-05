<template>
  <Transition name="detail-panel">
    <aside v-if="card" class="video-detail-panel" aria-label="视频详情" aria-live="polite">
      <button class="video-detail-close" type="button" aria-label="关闭详情" @click="$emit('close')"><Icon icon="mingcute:close-line" /></button>
      <div class="video-detail-heading">
        <h2>{{ card.title }}</h2>
        <div class="video-detail-creator">
          <img v-if="card.upAvatar" :src="avatarUrl" :alt="card.upName" />
          <span><strong>{{ card.upName }}</strong><small>{{ card.tag || '正在关注的 UP 主' }}</small></span>
          <a :href="upSpaceUrl" target="_blank" rel="noopener noreferrer">进入主页</a>
        </div>
        <div class="video-detail-stats">
          <span><Icon icon="mingcute:play-circle-line" />{{ playCountLabel }}</span>
          <span><Icon icon="mingcute:message-2-line" />{{ danmakuLabel }}</span>
          <span><Icon icon="mingcute:time-line" />{{ card.durationText }}</span>
        </div>
      </div>

      <section class="video-detail-summary">
        <div class="video-detail-summary-title"><Icon icon="mingcute:sparkles-2-line" /><strong>AI 摘要</strong><small>由 billnext 生成</small></div>
        <p>{{ summaryText }}</p>
        <ul v-if="recommendation">
          <li><strong>{{ recommendation.grade }} · {{ recommendation.score }}分</strong></li>
          <li>{{ recommendation.advice || recommendation.verdict }}</li>
          <li v-if="recommendationReason">{{ recommendationReason }}</li>
        </ul>
        <div class="video-detail-tags"><span>{{ card.tag || '待分类' }}</span><span>稍后决策</span></div>
      </section>

      <div class="video-detail-actions">
        <button type="button" :disabled="pending" @click="$emit('want-watch')"><Icon icon="mingcute:eye-2-line" />{{ wantWatched ? '已想看' : '想看' }}</button>
        <button class="primary" type="button" :disabled="pending || transcribing" @click="$emit('help-read')"><Icon icon="mingcute:sparkles-2-line" />{{ transcribing ? '正在帮读' : '帮我读' }}</button>
        <button type="button" :disabled="pending" @click="$emit('dislike')"><Icon icon="mingcute:close-circle-line" />不想看</button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { computed } from "vue"
import type { VideoDynamicCard } from "../domain/types"
import type { TranscriberCardState } from "../store/transcriber"

const props = defineProps<{
  card: VideoDynamicCard | null
  transcriberState?: TranscriberCardState
  pending: boolean
  wantWatched: boolean
}>()
defineEmits<{
  (event: "close"): void
  (event: "want-watch"): void
  (event: "help-read"): void
  (event: "dislike"): void
}>()

const avatarUrl = computed(() => props.card?.upAvatar ? props.card.upAvatar + "@72w_72h_1c_1s" : "")
const upSpaceUrl = computed(() => props.card?.upMid ? "https://space.bilibili.com/" + props.card.upMid : "https://space.bilibili.com/")
const recommendation = computed(() => props.transcriberState?.recommendation)
const recommendationReason = computed(() => recommendation.value?.recommendation_reason || recommendation.value?.reason || recommendation.value?.scoring_reason || "")
const transcribing = computed(() => props.transcriberState?.state === "transcribing")
const summaryText = computed(() => {
  if (recommendationReason.value) return recommendationReason.value
  if (transcribing.value) return "正在提取视频内容并整理重点，完成后会在这里呈现可快速扫读的摘要。"
  return "点击“帮我读”后，billnext 会提炼视频的核心观点、信息密度和观看建议，帮助你在播放前完成判断。"
})
function formatCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value >= 100000000) return (value / 100000000).toFixed(1).replace(/\.0$/, "") + "亿"
  if (value >= 10000) return (value / 10000).toFixed(1).replace(/\.0$/, "") + "万"
  return String(value)
}
const playCountLabel = computed(() => formatCount(props.card?.playCount ?? 0))
const danmakuLabel = computed(() => formatCount(props.card?.danmakuCount ?? 0))
</script>
