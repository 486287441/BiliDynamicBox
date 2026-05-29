<template>
  <header class="top-toolbar">
    <h1 class="top-toolbar-title">动态收件箱</h1>
    <div class="top-toolbar-center">
      <input
        class="toolbar-search-input"
        type="search"
        :value="searchQuery"
        placeholder="搜索视频标题或UP主"
        @input="onInput"
      />
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

const props = defineProps<{
  trashCount: number
  searchQuery: string
  minDurationMinutes: string
  hideWantWatch: boolean
}>()

const emit = defineEmits<{
  (event: "open-trash"): void
  (event: "toggle-hide-want-watch"): void
  (event: "update:searchQuery", value: string): void
  (event: "update:minDurationMinutes", value: string): void
}>()

const durationPanelOpen = ref(false)
const draftDurationMinutes = ref(props.minDurationMinutes)

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

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit("update:searchQuery", target.value)
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
