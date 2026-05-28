<template>
  <header class="top-toolbar">
    <div class="top-toolbar-left">
      <h1 class="top-toolbar-title">动态收件箱</h1>
      <input
        class="toolbar-search-input"
        type="search"
        :value="searchQuery"
        placeholder="搜索视频标题或UP主"
        @input="onInput"
      />
    </div>
    <button class="trash-entry-button" type="button" @click="$emit('open-trash')">垃圾箱（{{ trashCount }}）</button>
  </header>
</template>

<script setup lang="ts">
const props = defineProps<{
  trashCount: number
  searchQuery: string
}>()

const emit = defineEmits<{
  (event: "open-trash"): void
  (event: "update:searchQuery", value: string): void
}>()

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit("update:searchQuery", target.value)
}
</script>
