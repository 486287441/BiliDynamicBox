<template>
  <header class="workspace-toolbar" aria-label="全局工具栏">
    <form class="workspace-global-search" role="search" @submit.prevent="search">
      <Icon icon="mingcute:search-2-line" />
      <input v-model="searchText" type="search" placeholder="搜索视频、番剧或 UP 主" aria-label="全局搜索" />
    </form>
    <span class="workspace-toolbar-divider" aria-hidden="true"></span>
    <div class="workspace-categories" role="radiogroup" aria-label="内容分类">
      <button v-for="item in categories" :key="item.value" type="button" :class="{ active: category === item.value }" @click="$emit('update:category', item.value)">
        {{ item.label }}
      </button>
    </div>
    <span class="workspace-toolbar-divider" aria-hidden="true"></span>
    <button class="workspace-filter-button" type="button" aria-label="打开筛选与设置" title="筛选与设置" @click="$emit('open-tools')">
      <Icon icon="tabler:filter" />
    </button>
  </header>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { onMounted, onUnmounted, ref } from "vue"
import type { ContentCategoryFilter } from "../domain/content-category"

defineProps<{ category: ContentCategoryFilter }>()
defineEmits<{
  (event: "update:category", value: ContentCategoryFilter): void
  (event: "open-tools"): void
}>()

const searchText = ref("")
const categories: Array<{ value: ContentCategoryFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "work", label: "知识" },
  { value: "entertainment", label: "娱乐" },
]

function search(): void {
  const value = searchText.value.trim()
  if (value) window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(value), "_blank", "noopener,noreferrer")
}
function onShortcut(event: KeyboardEvent): void {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLocaleLowerCase() !== "k") return
  event.preventDefault()
  document.querySelector<HTMLInputElement>(".workspace-global-search input")?.focus()
}
onMounted(() => window.addEventListener("keydown", onShortcut))
onUnmounted(() => window.removeEventListener("keydown", onShortcut))
</script>
