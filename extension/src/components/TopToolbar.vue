<template>
  <Teleport to="#bewly-inbox-root">
    <Transition name="settings-window">
      <div v-if="toolsPanelOpen" class="settings-modal-mask" @click.self="close">
        <section class="settings-modal-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <header class="settings-modal-header">
            <div>
              <span class="settings-modal-kicker">READFLOW PREFERENCES</span>
              <h2 id="settings-title">阅读与动态设置</h2>
              <p>管理内容筛选、AI 分类、处理行为和数据入口。</p>
            </div>
            <div class="settings-modal-header-actions">
              <span class="settings-status-pill" :class="{ active: aiConfigured }">{{ aiConfigured ? "AI 已连接" : "AI 未配置" }}</span>
              <button class="settings-close-button" type="button" aria-label="关闭设置" @click="close"><Icon icon="mingcute:close-line" /></button>
            </div>
          </header>

          <div class="settings-modal-body">
            <section class="settings-section settings-section-wide">
              <div class="settings-section-heading">
                <Icon icon="mingcute:search-2-line" />
                <div><h3>浏览与搜索</h3><p>切换动态视图，并搜索当前动态或整个 B 站。</p></div>
              </div>
              <div class="settings-control-grid">
                <div class="settings-control">
                  <label>浏览模式</label>
                  <div class="settings-segmented">
                    <button v-for="option in viewModeOptions" :key="option.value" type="button" :class="{ active: viewMode === option.value }" @click="setViewMode(option.value)">{{ option.label }}</button>
                  </div>
                </div>
                <div class="settings-control settings-control-grow">
                  <label>搜索范围</label>
                  <div class="settings-search-row">
                    <div class="settings-segmented">
                      <button type="button" :class="{ active: searchScope === 'dynamics' }" @click="$emit('update:searchScope', 'dynamics')">当前动态</button>
                      <button type="button" :class="{ active: searchScope === 'bilibili' }" @click="$emit('update:searchScope', 'bilibili')">B 站</button>
                    </div>
                    <input class="settings-input" type="search" :value="searchQuery" :placeholder="searchScope === 'bilibili' ? '搜索 B 站，按回车打开结果' : '搜索视频标题或 UP 主'" @input="onSearchInput" @keydown="onSearchKeydown" />
                  </div>
                </div>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">
                <Icon icon="mingcute:filter-2-line" />
                <div><h3>内容筛选</h3><p>控制动态收件箱中保留哪些视频。</p></div>
              </div>
              <div class="settings-control">
                <label>内容分类</label>
                <div class="settings-chip-grid">
                  <button v-for="option in categoryFilterOptions" :key="option.value" type="button" :class="{ active: categoryFilter === option.value }" @click="$emit('update:categoryFilter', option.value)">{{ option.label }}</button>
                </div>
              </div>
              <div class="settings-control">
                <label for="settings-duration">最小时长（分钟）</label>
                <div class="settings-inline">
                  <input id="settings-duration" v-model="draftDurationMinutes" class="settings-input" type="number" min="0.5" step="0.5" placeholder="例如 10" @keydown.enter="applyDuration" />
                  <button class="settings-button primary" type="button" @click="applyDuration">应用</button>
                  <button class="settings-button" type="button" @click="clearDuration">清除</button>
                </div>
              </div>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">
                <Icon icon="mingcute:sparkles-2-line" />
                <div><h3>AI 内容分类</h3><p>使用 DeepSeek 对动态内容进行知识、娱乐分类。</p></div>
              </div>
              <div class="settings-control">
                <label for="settings-api-key">DeepSeek API Key</label>
                <input id="settings-api-key" v-model="draftApiKey" class="settings-input" type="password" autocomplete="off" :placeholder="aiConfigured ? '已保存；留空并保存可移除' : 'sk-…'" @keydown.enter="saveAiKey" />
                <small>密钥只保存在扩展本地存储中，不会写入网页或源码。</small>
                <span v-if="aiClassifying" class="settings-working"><i></i>正在分类当前视频</span>
                <span v-if="aiError" class="settings-error">{{ aiError }}</span>
              </div>
              <button class="settings-button primary settings-full-button" type="button" @click="saveAiKey">{{ aiConfigured ? "更新密钥" : "保存并连接" }}</button>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">
                <Icon icon="mingcute:cursor-2-line" />
                <div><h3>处理行为</h3><p>决定点击“想看”之后卡片与视频如何响应。</p></div>
              </div>
              <button class="settings-toggle-row" type="button" @click="$emit('toggle-hide-want-watch')">
                <span><strong>处理后隐藏“想看”卡片</strong><small>保持收件箱只显示尚未处理的视频</small></span>
                <i :class="{ active: hideWantWatch }"><b></b></i>
              </button>
              <button class="settings-toggle-row" type="button" @click="$emit('toggle-open-video-on-want-watch')">
                <span><strong>点击“想看”时打开视频</strong><small>同时加入稍后再看并打开新标签页</small></span>
                <i :class="{ active: openVideoOnWantWatch }"><b></b></i>
              </button>
            </section>

            <section class="settings-section">
              <div class="settings-section-heading">
                <Icon icon="mingcute:folder-open-2-line" />
                <div><h3>数据与入口</h3><p>访问稍后再看、垃圾箱和 UP 主筛选。</p></div>
              </div>
              <div class="settings-entry-grid">
                <a href="https://www.bilibili.com/?readflow=watchlater"><Icon icon="mingcute:carplay-line" /><span><strong>稍后再看</strong><small>查看已标记的视频</small></span></a>
                <button type="button" @click="$emit('open-trash')"><Icon icon="mingcute:delete-2-line" /><span><strong>垃圾箱</strong><small>{{ trashCount }} 条记录</small></span></button>
                <button type="button" @click="setViewMode('up-filter')"><Icon icon="mingcute:user-search-line" /><span><strong>UP 主筛选</strong><small>管理关注与创作者</small></span></button>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { ref, watch } from "vue"
import { CONTENT_CATEGORY_FILTER_LABELS, type ContentCategoryFilter } from "../domain/content-category"
import { VIEW_MODE_LABELS, type ViewMode } from "../domain/view-mode"

export type SearchScope = "dynamics" | "bilibili"
const props = defineProps<{
  viewMode: ViewMode
  trashCount: number
  searchQuery: string
  searchScope: SearchScope
  minDurationMinutes: string
  hideWantWatch: boolean
  openVideoOnWantWatch: boolean
  categoryFilter: ContentCategoryFilter
  aiConfigured: boolean
  aiClassifying: boolean
  aiError: string | null
}>()
const emit = defineEmits<{
  (event: "open-trash"): void
  (event: "toggle-hide-want-watch"): void
  (event: "toggle-open-video-on-want-watch"): void
  (event: "update:viewMode", value: ViewMode): void
  (event: "update:searchQuery", value: string): void
  (event: "update:searchScope", value: SearchScope): void
  (event: "update:minDurationMinutes", value: string): void
  (event: "update:categoryFilter", value: ContentCategoryFilter): void
  (event: "save-ai-key", value: string): void
}>()
const viewModeOptions: Array<{ value: ViewMode; label: string }> = [
  { value: "inbox", label: VIEW_MODE_LABELS.inbox },
  { value: "up-filter", label: VIEW_MODE_LABELS["up-filter"] },
]
const categoryFilterOptions = (Object.entries(CONTENT_CATEGORY_FILTER_LABELS) as Array<[ContentCategoryFilter, string]>).map(([value, label]) => ({ value, label }))
const toolsPanelOpen = ref(false)
const draftApiKey = ref("")
// Vue automatically casts v-model values from number inputs to numbers at runtime.
const draftDurationMinutes = ref<string | number>(props.minDurationMinutes)
watch(() => props.minDurationMinutes, (value) => { draftDurationMinutes.value = value })
function openToolsPanel(): void { toolsPanelOpen.value = true }
function close(): void { toolsPanelOpen.value = false }
function setViewMode(mode: ViewMode): void { emit("update:viewMode", mode) }
function onSearchInput(event: Event): void {
  const target = event.target
  if (target instanceof HTMLInputElement) emit("update:searchQuery", target.value)
}
function onSearchKeydown(event: KeyboardEvent): void {
  if (props.searchScope !== "bilibili" || event.key !== "Enter") return
  event.preventDefault()
  const value = props.searchQuery.trim()
  if (value) window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(value), "_blank", "noopener,noreferrer")
}
function applyDuration(): void {
  emit("update:minDurationMinutes", String(draftDurationMinutes.value).trim())
}
function clearDuration(): void {
  draftDurationMinutes.value = ""
  emit("update:minDurationMinutes", "")
}
function saveAiKey(): void {
  if (!draftApiKey.value.trim() && !props.aiConfigured) return
  emit("save-ai-key", draftApiKey.value.trim())
  draftApiKey.value = ""
}
defineExpose({ openToolsPanel })
</script>
