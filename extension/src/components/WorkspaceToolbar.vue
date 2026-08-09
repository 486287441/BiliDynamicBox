<template>
  <header class="workspace-toolbar" aria-label="全局工具栏">
    <form class="workspace-global-search" :class="{ 'is-dynamics-search': scope === 'dynamics' }" role="search" @submit.prevent="search">
      <Icon icon="mingcute:search-2-line" />
      <span v-if="scope === 'dynamics'" class="workspace-search-scope">动态内</span>
      <input v-model="searchText" type="search" :placeholder="searchPlaceholder" :aria-label="scope === 'dynamics' ? '搜索当前动态' : 'B站全站搜索'" @input="onSearchInput" />
    </form>
    <span class="workspace-toolbar-divider" aria-hidden="true"></span>
    <div class="workspace-categories" role="radiogroup" aria-label="内容分类">
      <button v-for="item in categories" :key="item.value" type="button" :class="{ active: category === item.value }" @click="$emit('update:category', item.value)">
        {{ item.label }}
      </button>
    </div>
    <span class="workspace-toolbar-divider" aria-hidden="true"></span>
    <div ref="filterWrapRef" class="workspace-filter-wrap">
      <button class="workspace-filter-button" :class="{ active: filterOpen || hasActiveFilter }" type="button" aria-label="打开筛选" title="筛选" :aria-expanded="filterOpen" @click="filterOpen = !filterOpen">
        <Icon icon="tabler:filter" />
      </button>
      <Transition name="filter-popover">
        <section v-if="filterOpen" class="workspace-filter-popover" role="dialog" :aria-label="`${scopeLabel}筛选`">
          <header><div><strong>{{ scopeLabel }}筛选</strong><small>只在{{ scopeLabel }}生效，并单独记忆</small></div><button type="button" aria-label="关闭筛选" @click="filterOpen = false"><Icon icon="mingcute:close-line" /></button></header>
          <label>
            <span>起始日期</span>
            <input class="workspace-filter-input" type="date" :value="publishAfterDate" aria-label="最早发布时间" @input="onDateInput" />
          </label>
          <label>
            <span>最短时长</span>
            <span class="workspace-duration-field"><input class="workspace-filter-input" type="number" min="0" step="0.5" inputmode="decimal" :value="minDurationMinutes" placeholder="不限" aria-label="最短视频时长（分钟）" @input="onDurationInput" /><em>分钟</em></span>
          </label>
          <button class="workspace-filter-clear" type="button" :disabled="!hasActiveFilter" @click="clearFilters">清除筛选</button>
        </section>
      </Transition>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import type { ContentCategoryFilter } from "../domain/content-category"

const props = defineProps<{
  category: ContentCategoryFilter
  scope: "home" | "dynamics"
  minDurationMinutes: string
  publishAfterDate: string
}>()
const emit = defineEmits<{
  (event: "update:category", value: ContentCategoryFilter): void
  (event: "update:minDurationMinutes", value: string): void
  (event: "update:publishAfterDate", value: string): void
  (event: "update:searchQuery", value: string): void
}>()

const searchText = ref("")
const filterOpen = ref(false)
const filterWrapRef = ref<HTMLElement | null>(null)
const scopeLabel = computed(() => props.scope === "dynamics" ? "动态页" : "首页")
const searchPlaceholder = computed(() => props.scope === "dynamics" ? "搜索动态标题或 UP 主" : "搜索 B 站全站内容")
const hasActiveFilter = computed(() => Boolean(props.minDurationMinutes || props.publishAfterDate))
const categories: Array<{ value: ContentCategoryFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "work", label: "知识" },
  { value: "entertainment", label: "娱乐" },
]

function search(): void {
  const value = searchText.value.trim()
  if (props.scope === "dynamics") {
    emit("update:searchQuery", value)
  } else if (value) {
    window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(value), "_blank", "noopener,noreferrer")
  }
}
function onSearchInput(): void {
  if (props.scope === "dynamics") emit("update:searchQuery", searchText.value)
}
function onDateInput(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit("update:publishAfterDate", event.target.value)
}
function onDurationInput(event: Event): void {
  if (event.target instanceof HTMLInputElement) emit("update:minDurationMinutes", event.target.value)
}
function clearFilters(): void {
  emit("update:minDurationMinutes", "")
  emit("update:publishAfterDate", "")
}
function onDocumentPointerDown(event: PointerEvent): void {
  if (filterOpen.value && event.target instanceof Node && !filterWrapRef.value?.contains(event.target)) filterOpen.value = false
}
function onShortcut(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "k") return
  event.preventDefault()
  document.querySelector<HTMLInputElement>(".workspace-global-search input")?.focus()
}
onMounted(() => {
  window.addEventListener("keydown", onShortcut)
  document.addEventListener("pointerdown", onDocumentPointerDown)
})
onUnmounted(() => {
  window.removeEventListener("keydown", onShortcut)
  document.removeEventListener("pointerdown", onDocumentPointerDown)
})
watch(() => props.scope, () => {
  searchText.value = ""
  emit("update:searchQuery", "")
})
</script>
