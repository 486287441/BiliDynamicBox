<template>
  <section class="anime-tracking-view">
    <header class="anime-tracking-header">
      <div>
        <span class="home-feed-eyebrow">WATCHING</span>
        <h1>我的追番</h1>
        <p>按番名同步 Bangumi 更新信息，观看时回到你保存的合集链接。</p>
      </div>
      <button v-if="!adding" class="anime-header-add" type="button" @click="openAdd">＋ 添加番剧</button>
    </header>

    <form v-if="adding" class="anime-editor anime-editor-add" @submit.prevent="submitAdd">
      <div class="anime-editor-heading">
        <div><strong>添加正在看的番</strong><small>名称用于查询更新；链接用于“去观看”</small></div>
        <button type="button" aria-label="关闭" @click="closeEditor">×</button>
      </div>
      <label><span>番剧名称</span><input ref="nameInputRef" v-model="draftTitle" type="text" placeholder="例如：葬送的芙莉莲" :disabled="loading" /></label>
      <label>
        <span class="anime-link-label"><span>观看合集链接</span><button type="button" :disabled="loading || matching || !draftTitle.trim()" @click="autoMatchWatchLink">{{ matching ? "正在匹配…" : "自动匹配合集" }}</button></span>
        <input v-model="draftUrl" type="url" placeholder="B 站合集、播放列表或其他观看链接" :disabled="loading" />
      </label>
      <div v-if="matchResult" class="anime-match-result">
        <span>已选最优</span><a :href="matchResult.url" target="_blank" rel="noopener noreferrer">{{ matchResult.title }}</a>
        <small>{{ matchResult.author ? `${matchResult.author} · ` : "" }}{{ formatCount(matchResult.playCount) }}播放 · {{ formatCount(matchResult.danmakuCount) }}弹幕<span v-if="matchResult.durationSeconds"> · {{ formatDuration(matchResult.durationSeconds) }}</span></small>
      </div>
      <p v-if="matchError" class="anime-match-error">{{ matchError }}</p>
      <p class="anime-editor-hint">会自动从 Bangumi 匹配封面、总集数、放送状态和最新集数。</p>
      <p v-if="error" class="anime-add-error">{{ error }}</p>
      <div class="anime-add-actions">
        <button type="button" :disabled="loading" @click="closeEditor">取消</button>
        <button class="is-primary" type="submit" :disabled="loading || matching || !draftTitle.trim() || !draftUrl.trim()">{{ matching ? "正在匹配…" : loading ? "正在查询…" : "添加并同步" }}</button>
      </div>
    </form>

    <div v-if="!items.length && !adding" class="anime-empty-state">
      <span>还没有正在追的番</span>
      <button type="button" @click="openAdd">添加第一部</button>
    </div>

    <div v-else class="anime-rich-grid">
      <article v-for="item in items" :key="item.id" class="anime-rich-card" :class="{ 'has-update': hasUpdate(item) }">
        <a class="anime-poster" :href="item.sourceUrl" target="_blank" rel="noopener noreferrer" @click="$emit('open', item)">
          <img :src="coverUrl(item.cover)" :alt="item.title" loading="lazy" />
          <span class="anime-status-badge" :class="'is-' + item.airStatus">{{ statusLabel(item) }}</span>
          <span v-if="hasUpdate(item)" class="anime-new-badge">NEW</span>
        </a>

        <form v-if="editingId === item.id" class="anime-editor anime-card-editor" @submit.prevent="submitEdit(item)">
          <div class="anime-editor-heading"><div><strong>编辑追番</strong><small>更换名称会重新匹配 Bangumi 条目</small></div></div>
          <label><span>番剧名称</span><input v-model="draftTitle" type="text" :disabled="loading" /></label>
          <label>
            <span class="anime-link-label"><span>观看合集链接</span><button type="button" :disabled="loading || matching || !draftTitle.trim()" @click="autoMatchWatchLink">{{ matching ? "正在匹配…" : "自动匹配合集" }}</button></span>
            <input v-model="draftUrl" type="url" :disabled="loading" />
          </label>
          <div v-if="matchResult" class="anime-match-result">
            <span>已选最优</span><a :href="matchResult.url" target="_blank" rel="noopener noreferrer">{{ matchResult.title }}</a>
            <small>{{ matchResult.author ? `${matchResult.author} · ` : "" }}{{ formatCount(matchResult.playCount) }}播放 · {{ formatCount(matchResult.danmakuCount) }}弹幕<span v-if="matchResult.durationSeconds"> · {{ formatDuration(matchResult.durationSeconds) }}</span></small>
          </div>
          <p v-if="matchError" class="anime-match-error">{{ matchError }}</p>
          <p v-if="error" class="anime-add-error">{{ error }}</p>
          <div class="anime-add-actions">
            <button type="button" :disabled="loading" @click="closeEditor">取消</button>
            <button class="is-primary" type="submit" :disabled="loading || matching || !draftTitle.trim() || !draftUrl.trim()">{{ matching ? "正在匹配…" : loading ? "正在同步…" : "保存" }}</button>
          </div>
        </form>

        <div v-else class="anime-rich-body">
          <div class="anime-rich-heading">
            <div>
              <h2>{{ item.title }}</h2>
              <p v-if="item.queryTitle && item.queryTitle !== item.title">按“{{ item.queryTitle }}”匹配</p>
            </div>
            <button class="anime-more-button" type="button" title="编辑" @click="openEdit(item)">编辑</button>
          </div>

          <div class="anime-progress-line">
            <strong>{{ progressLabel(item) }}</strong>
            <span>{{ item.totalEpisodes ? `共 ${item.totalEpisodes} 集` : "总集数待定" }}</span>
          </div>
          <div class="anime-progress-track"><i :style="{ width: progressPercent(item) + '%' }"></i></div>

          <div class="anime-latest-info">
            <span :class="{ 'is-update': hasUpdate(item) }">{{ hasUpdate(item) ? "有新更新" : "当前进度" }}</span>
            <strong>{{ item.latestEpisodeTitle }}</strong>
            <small v-if="item.updatedAt">本集更新 {{ formatScheduleDate(timestampDate(item.updatedAt)) }}</small>
            <small v-if="item.nextEpisodeDate">下集预计 {{ formatScheduleDate(item.nextEpisodeDate) }}</small>
            <small v-else-if="item.airDate">{{ statusLabel(item) }} · {{ formatDate(item.airDate) }} 开播</small>
          </div>

          <div class="anime-rich-actions">
            <a :href="item.authorUrl" target="_blank" rel="noopener noreferrer">Bangumi 资料</a>
            <button class="anime-delete-button" type="button" @click="$emit('remove', item)">移除</button>
            <a class="anime-watch-button" :href="item.sourceUrl" target="_blank" rel="noopener noreferrer" @click="$emit('open', item)">去观看</a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue"
import type { AnimeTrackingItem } from "../domain/anime-tracking"
import { findBestAnimeWatchLink, type AnimeWatchMatch } from "../services/anime-watch-match"

export interface AnimeEditorPayload { title: string; sourceUrl: string }

const props = defineProps<{ items: AnimeTrackingItem[]; loading: boolean; error: string }>()
const emit = defineEmits<{
  (event: "add", payload: AnimeEditorPayload): void
  (event: "edit", payload: AnimeEditorPayload & { item: AnimeTrackingItem }): void
  (event: "open", item: AnimeTrackingItem): void
  (event: "remove", item: AnimeTrackingItem): void
  (event: "clear-error"): void
}>()
const adding = ref(false)
const editingId = ref("")
const draftTitle = ref("")
const draftUrl = ref("")
const nameInputRef = ref<HTMLInputElement | null>(null)
const matching = ref(false)
const matchError = ref("")
const matchResult = ref<AnimeWatchMatch | null>(null)

function resetMatch(): void { matchError.value = ""; matchResult.value = null }
function resetDraft(): void { draftTitle.value = ""; draftUrl.value = ""; resetMatch() }
function openAdd(): void {
  editingId.value = ""
  adding.value = true
  resetDraft()
  emit("clear-error")
  void nextTick(() => nameInputRef.value?.focus())
}
function openEdit(item: AnimeTrackingItem): void {
  adding.value = false
  editingId.value = item.id
  resetMatch()
  draftTitle.value = item.queryTitle || item.title
  draftUrl.value = item.sourceUrl
  emit("clear-error")
}
function closeEditor(): void { adding.value = false; editingId.value = ""; resetDraft(); emit("clear-error") }
function submitAdd(): void {
  if (!draftTitle.value.trim() || !draftUrl.value.trim()) return
  emit("add", { title: draftTitle.value.trim(), sourceUrl: draftUrl.value.trim() })
}
function submitEdit(item: AnimeTrackingItem): void {
  if (!draftTitle.value.trim() || !draftUrl.value.trim()) return
  emit("edit", { item, title: draftTitle.value.trim(), sourceUrl: draftUrl.value.trim() })
}
async function autoMatchWatchLink(): Promise<void> {
  const title = draftTitle.value.trim()
  if (!title || matching.value) return
  matching.value = true
  resetMatch()
  emit("clear-error")
  try {
    const result = await findBestAnimeWatchLink(title)
    if (draftTitle.value.trim() !== title) return
    draftUrl.value = result.url
    matchResult.value = result
  } catch (caught) {
    matchError.value = caught instanceof Error ? caught.message : "自动匹配失败"
  } finally {
    matching.value = false
  }
}
function formatCount(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1).replace(/\.0$/, "")}亿`
  if (value >= 10_000) return `${(value / 10_000).toFixed(1).replace(/\.0$/, "")}万`
  return String(value)
}
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const rest = Math.floor(seconds % 60)
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`
}
function coverUrl(value: string): string { return value ? value.replace(/^http:/, "https:") : "" }
function hasUpdate(item: AnimeTrackingItem): boolean { return Boolean(item.seenEpisodeKey && item.seenEpisodeKey !== item.latestEpisodeKey) }
function statusLabel(item: AnimeTrackingItem): string {
  return ({ airing: "连载中", completed: "已完结", upcoming: "未开播", unknown: "状态待定" })[item.airStatus]
}
function progressLabel(item: AnimeTrackingItem): string {
  if (item.airedEpisodes <= 0) return "尚未更新"
  return `已更新至第 ${item.airedEpisodes} 集`
}
function progressPercent(item: AnimeTrackingItem): number {
  if (!item.totalEpisodes) return item.airedEpisodes > 0 ? 35 : 0
  return Math.min(100, Math.round(item.airedEpisodes / item.totalEpisodes * 100))
}
function formatDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${Number(match[2])} 月 ${Number(match[3])} 日` : value
}
function parseLocalDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}
function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}
function formatScheduleDate(value: string): string {
  const date = parseLocalDate(value)
  if (!date) return formatDate(value)
  const weekOffset = Math.round((startOfWeek(date).getTime() - startOfWeek(new Date()).getTime()) / 604_800_000)
  const weekLabel = weekOffset === 0
    ? "本周"
    : weekOffset === 1
      ? "下周"
      : weekOffset === -1
        ? "上周"
        : weekOffset > 1
          ? `${weekOffset} 周后`
          : `${Math.abs(weekOffset)} 周前`
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][date.getDay()]
  return `${formatDate(value)} · ${weekLabel}星期${weekday}`
}
function timestampDate(value: number): string {
  const date = new Date(value * 1000)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
watch(() => props.loading, (loading, previous) => {
  if (previous && !loading && !props.error && (adding.value || editingId.value)) closeEditor()
}, { flush: "post" })
watch(draftTitle, () => {
  if (!matching.value) resetMatch()
})
</script>
