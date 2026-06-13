<template>
  <header class="top-toolbar">
    <div class="top-toolbar-left">
      <h1 class="top-toolbar-title">动态收件箱</h1>
      <a
        class="toolbar-entry-button toolbar-back-button"
        href="https://www.bilibili.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        回到B站
      </a>
    </div>
    <div class="top-toolbar-center">
      <div class="toolbar-search-wrap">
        <div class="toolbar-search-scope" role="radiogroup" aria-label="搜索范围">
          <button
            class="toolbar-search-scope-button"
            :class="{ 'is-active': searchScope === 'dynamics' }"
            type="button"
            role="radio"
            :aria-checked="searchScope === 'dynamics'"
            @click="setSearchScope('dynamics')"
          >
            动态
          </button>
          <button
            class="toolbar-search-scope-button"
            :class="{ 'is-active': searchScope === 'bilibili' }"
            type="button"
            role="radio"
            :aria-checked="searchScope === 'bilibili'"
            @click="setSearchScope('bilibili')"
          >
            B站
          </button>
        </div>
        <div class="toolbar-search-field">
          <input
            ref="searchInputRef"
            class="toolbar-search-input"
            type="text"
            :value="searchQuery"
            :placeholder="searchPlaceholder"
            enterkeyhint="search"
            @input="onInput"
            @keydown="onSearchKeydown"
          />
          <button
            v-if="searchQuery"
            class="toolbar-search-clear"
            type="button"
            aria-label="清除搜索"
            @click="clearSearch"
          >
            ×
          </button>
        </div>
      </div>
    </div>
    <div class="top-toolbar-actions">
      <div class="duration-filter-wrap">
        <button class="toolbar-entry-button" type="button" @click="toggleDurationPanel">
          {{ durationFilterLabel }}
        </button>
        <div v-if="durationPanelOpen" class="duration-filter-panel">
          <label class="duration-filter-label" for="duration-filter-input">最小时长（分钟）</label>
          <input
            id="duration-filter-input"
            class="toolbar-duration-input"
            type="number"
            min="0"
            step="0.5"
            :value="draftDurationMinutes"
            placeholder="例如 10"
            @input="onDurationInput"
          />
          <div class="duration-filter-panel-actions">
            <button class="duration-panel-action-button" type="button" @click="applyDurationFilter">应用</button>
            <button class="duration-panel-action-button ghost" type="button" @click="clearDurationFilter">清空</button>
          </div>
        </div>
      </div>
      <button
        class="toolbar-entry-button"
        :class="{ 'is-active': hideWantWatch }"
        type="button"
        @click="$emit('toggle-hide-want-watch')"
      >
        {{ hideWantWatch ? "显示想看" : "隐藏想看" }}
      </button>
      <a
        class="toolbar-entry-button"
        href="https://www.bilibili.com/watchlater/#/list"
        target="_blank"
        rel="noopener noreferrer"
      >
        稍后再看
      </a>
      <button class="toolbar-entry-button" type="button" @click="$emit('open-trash')">垃圾箱（{{ trashCount }}）</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"

export type SearchScope = "dynamics" | "bilibili"

const props = defineProps<{
  trashCount: number
  searchQuery: string
  searchScope: SearchScope
  minDurationMinutes: string
  hideWantWatch: boolean
}>()

const emit = defineEmits<{
  (event: "open-trash"): void
  (event: "toggle-hide-want-watch"): void
  (event: "update:searchQuery", value: string): void
  (event: "update:searchScope", value: SearchScope): void
  (event: "update:minDurationMinutes", value: string): void
}>()

const searchPlaceholder = computed(() => {
  if (props.searchScope === "bilibili") {
    return "搜索 B 站视频，回车跳转"
  }
  return "搜索视频标题或UP主"
})

const durationPanelOpen = ref(false)
const draftDurationMinutes = ref(props.minDurationMinutes)
const searchInputRef = ref<HTMLInputElement | null>(null)

const durationFilterLabel = computed(() => {
  const text = props.minDurationMinutes.trim()
  if (!text) {
    return "筛选时长"
  }
  return `时长≥${text}分钟`
})

watch(
  () => props.minDurationMinutes,
  (value) => {
    draftDurationMinutes.value = value
  },
)

function setSearchScope(scope: SearchScope): void {
  if (scope === props.searchScope) {
    return
  }
  emit("update:searchScope", scope)
}

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit("update:searchQuery", target.value)
}

function clearSearch(): void {
  emit("update:searchQuery", "")
  searchInputRef.value?.focus()
}

function onSearchKeydown(event: KeyboardEvent): void {
  if (props.searchScope !== "bilibili" || event.key !== "Enter") {
    return
  }
  event.preventDefault()
  const query = props.searchQuery.trim()
  if (!query) {
    return
  }
  window.open(
    `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`,
    "_blank",
    "noopener,noreferrer",
  )
}

function onDurationInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  draftDurationMinutes.value = target.value
}

function toggleDurationPanel(): void {
  durationPanelOpen.value = !durationPanelOpen.value
  if (durationPanelOpen.value) {
    draftDurationMinutes.value = props.minDurationMinutes
  }
}

function applyDurationFilter(): void {
  emit("update:minDurationMinutes", draftDurationMinutes.value.trim())
  durationPanelOpen.value = false
}

function clearDurationFilter(): void {
  draftDurationMinutes.value = ""
  emit("update:minDurationMinutes", "")
  durationPanelOpen.value = false
}

function onWindowClick(event: MouseEvent): void {
  if (!durationPanelOpen.value) {
    return
  }
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }
  if (target.closest(".duration-filter-wrap")) {
    return
  }
  durationPanelOpen.value = false
}

onMounted(() => {
  window.addEventListener("click", onWindowClick)
})

onUnmounted(() => {
  window.removeEventListener("click", onWindowClick)
})
</script>
