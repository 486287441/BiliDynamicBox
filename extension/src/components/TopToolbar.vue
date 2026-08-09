<template>
  <Teleport to="#bewly-inbox-root">
    <Transition name="settings-window">
      <div v-if="toolsPanelOpen" class="settings-modal-mask" @click.self="close">
        <section class="settings-modal-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <aside class="settings-sidebar">
            <div class="settings-sidebar-heading">
              <span class="settings-modal-kicker">READFLOW</span>
              <h2 id="settings-title">设置</h2>
              <p>阅读与动态偏好</p>
            </div>

            <nav class="settings-nav" aria-label="设置分类">
              <button
                v-for="section in settingsSections"
                :key="section.value"
                type="button"
                :class="{ active: activeSettingsSection === section.value }"
                :aria-current="activeSettingsSection === section.value ? 'page' : undefined"
                :aria-controls="`settings-panel-${section.value}`"
                @click="activeSettingsSection = section.value"
              >
                <Icon :icon="section.icon" />
                <span><strong>{{ section.label }}</strong><small>{{ section.caption }}</small></span>
              </button>
            </nav>

            <div class="settings-sidebar-status">
              <span class="settings-status-pill" :class="{ active: aiConfigured }">{{ aiConfigured ? "AI 已连接" : "AI 未配置" }}</span>
              <small>偏好自动保存在本机</small>
            </div>
          </aside>

          <div class="settings-main">
            <header class="settings-modal-header">
              <div>
                <div class="settings-header-context">
                  <span class="settings-modal-kicker">PREFERENCES</span>
                  <span class="settings-scope-badge">{{ activeSettingsMeta.scope }}</span>
                </div>
                <h2>{{ activeSettingsMeta.label }}</h2>
                <p>{{ activeSettingsMeta.description }}</p>
              </div>
              <button class="settings-close-button" type="button" aria-label="关闭设置" @click="close"><Icon icon="mingcute:close-line" /></button>
            </header>

            <div class="settings-modal-body">
              <section id="settings-panel-dynamics" v-show="activeSettingsSection === 'dynamics'" class="settings-section" aria-label="动态设置">
                <div class="settings-control-grid">
                  <div class="settings-control">
                    <label>动态浏览模式</label>
                    <div class="settings-segmented">
                      <button v-for="option in viewModeOptions" :key="option.value" type="button" :class="{ active: viewMode === option.value }" @click="setViewMode(option.value)">{{ option.label }}</button>
                    </div>
                    <small>仅改变动态页的收件箱与 UP 主筛选视图。</small>
                  </div>
                  <div class="settings-control settings-control-grow">
                    <label>动态搜索范围</label>
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

              <section id="settings-panel-global" v-show="activeSettingsSection === 'global'" class="settings-section" aria-label="跨页面设置">
                <button class="settings-toggle-row" type="button" @click="$emit('toggle-hide-want-watch')">
                  <span><strong>处理后隐藏“想看”卡片</strong><small>影响首页与动态列表，只保留尚未处理的视频</small></span>
                  <i :class="{ active: hideWantWatch }"><b></b></i>
                </button>
                <button class="settings-toggle-row" type="button" @click="$emit('toggle-open-video-on-want-watch')">
                  <span><strong>点击“想看”时打开视频</strong><small>适用于首页、动态与资料库中的视频卡片</small></span>
                  <i :class="{ active: openVideoOnWantWatch }"><b></b></i>
                </button>
                <button class="settings-toggle-row" type="button" @click="$emit('toggle-sidebar-collapsed')">
                  <span><strong>收起左侧导航</strong><small>开启后固定显示图标栏；关闭后固定显示完整导航</small></span>
                  <i :class="{ active: sidebarCollapsed }"><b></b></i>
                </button>
              </section>

              <section id="settings-panel-ai" v-show="activeSettingsSection === 'ai'" class="settings-section" aria-label="AI 内容分类">
                <div class="settings-control">
                  <label for="settings-api-key">DeepSeek API Key</label>
                  <input id="settings-api-key" v-model="draftApiKey" class="settings-input" type="password" autocomplete="off" :placeholder="aiConfigured ? '已保存；留空并保存可移除' : 'sk-…'" @keydown.enter="saveAiKey" />
                  <small>用于动态内容分类；密钥只保存在扩展本地存储中。</small>
                  <span v-if="aiClassifying" class="settings-working"><i></i>正在分类当前视频</span>
                  <span v-if="aiError" class="settings-error">{{ aiError }}</span>
                </div>
                <button class="settings-button primary settings-full-button" type="button" @click="saveAiKey">{{ aiConfigured ? "更新密钥" : "保存并连接" }}</button>
              </section>

              <section id="settings-panel-data" v-show="activeSettingsSection === 'data'" class="settings-section" aria-label="数据与入口">
                <div class="settings-entry-grid">
                  <a href="https://www.bilibili.com/?readflow=watchlater"><Icon icon="mingcute:carplay-line" /><span><strong>稍后再看</strong><small>通用入口 · 查看已标记的视频</small></span></a>
                  <button type="button" @click="$emit('open-trash')"><Icon icon="mingcute:delete-2-line" /><span><strong>垃圾箱</strong><small>通用数据 · {{ trashCount }} 条记录</small></span></button>
                  <button type="button" @click="setViewMode('up-filter')"><Icon icon="mingcute:user-search-line" /><span><strong>UP 主筛选</strong><small>动态工具 · 管理关注与创作者</small></span></button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { computed, ref } from "vue"
import type { ContentCategoryFilter } from "../domain/content-category"
import { VIEW_MODE_LABELS, type ViewMode } from "../domain/view-mode"

export type SearchScope = "dynamics" | "bilibili"
type SettingsSectionId = "dynamics" | "global" | "ai" | "data"

const settingsSections: Array<{
  value: SettingsSectionId
  label: string
  caption: string
  scope: string
  description: string
  icon: string
}> = [
  { value: "dynamics", label: "动态", caption: "收件箱、搜索与分类", scope: "仅影响动态", description: "管理动态收件箱的视图、搜索和内容分类。", icon: "mingcute:planet-line" },
  { value: "global", label: "跨页面", caption: "通用处理与界面行为", scope: "影响多个页面", description: "管理首页、动态及其他视频卡片共用的处理与界面行为。", icon: "mingcute:adjustment-line" },
  { value: "ai", label: "AI 分类", caption: "DeepSeek 连接", scope: "服务于动态分类", description: "配置动态内容分类所需的 AI 服务。", icon: "mingcute:sparkles-2-line" },
  { value: "data", label: "数据与入口", caption: "稍后再看和管理", scope: "通用入口", description: "访问稍后再看、垃圾箱和 UP 主筛选。", icon: "mingcute:folder-open-2-line" },
]

const props = defineProps<{
  viewMode: ViewMode
  trashCount: number
  searchQuery: string
  searchScope: SearchScope
  hideWantWatch: boolean
  openVideoOnWantWatch: boolean
  sidebarCollapsed: boolean
  categoryFilter: ContentCategoryFilter
  aiConfigured: boolean
  aiClassifying: boolean
  aiError: string | null
}>()
const emit = defineEmits<{
  (event: "open-trash"): void
  (event: "toggle-hide-want-watch"): void
  (event: "toggle-open-video-on-want-watch"): void
  (event: "toggle-sidebar-collapsed"): void
  (event: "update:viewMode", value: ViewMode): void
  (event: "update:searchQuery", value: string): void
  (event: "update:searchScope", value: SearchScope): void
  (event: "update:categoryFilter", value: ContentCategoryFilter): void
  (event: "save-ai-key", value: string): void
}>()
const viewModeOptions: Array<{ value: ViewMode; label: string }> = [
  { value: "inbox", label: VIEW_MODE_LABELS.inbox },
  { value: "up-filter", label: VIEW_MODE_LABELS["up-filter"] },
]
const toolsPanelOpen = ref(false)
const activeSettingsSection = ref<SettingsSectionId>("dynamics")
const activeSettingsMeta = computed(() => settingsSections.find((section) => section.value === activeSettingsSection.value) ?? settingsSections[0])
const draftApiKey = ref("")
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
function saveAiKey(): void {
  if (!draftApiKey.value.trim() && !props.aiConfigured) return
  emit("save-ai-key", draftApiKey.value.trim())
  draftApiKey.value = ""
}
defineExpose({ openToolsPanel })
</script>
