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
      <label><span>观看合集链接</span><input v-model="draftUrl" type="url" placeholder="B 站合集、播放列表或其他观看链接" :disabled="loading" /></label>
      <p class="anime-editor-hint">会自动从 Bangumi 匹配封面、总集数、放送状态和最新集数。</p>
      <p v-if="error" class="anime-add-error">{{ error }}</p>
      <div class="anime-add-actions">
        <button type="button" :disabled="loading" @click="closeEditor">取消</button>
        <button class="is-primary" type="submit" :disabled="loading || !draftTitle.trim() || !draftUrl.trim()">{{ loading ? "正在查询…" : "添加并同步" }}</button>
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
          <label><span>观看合集链接</span><input v-model="draftUrl" type="url" :disabled="loading" /></label>
          <p v-if="error" class="anime-add-error">{{ error }}</p>
          <div class="anime-add-actions">
            <button type="button" :disabled="loading" @click="closeEditor">取消</button>
            <button class="is-primary" type="submit" :disabled="loading || !draftTitle.trim() || !draftUrl.trim()">{{ loading ? "正在同步…" : "保存" }}</button>
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
            <small v-if="item.nextEpisodeDate">下集预计 {{ formatDate(item.nextEpisodeDate) }}</small>
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

function resetDraft(): void { draftTitle.value = ""; draftUrl.value = "" }
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
watch(() => props.loading, (loading, previous) => {
  if (previous && !loading && !props.error && (adding.value || editingId.value)) closeEditor()
}, { flush: "post" })
</script>
