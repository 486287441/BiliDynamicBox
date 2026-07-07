<template>
  <div v-if="visible" class="trash-modal-mask" ref="maskRef" @click.self="close">
    <section class="trash-modal-panel" ref="panelRef">
      <header class="trash-modal-header">
        <h2>垃圾箱</h2>
        <div class="trash-header-actions">
          <button
            v-if="items.length > 0"
            class="trash-restore-all-button"
            type="button"
            @click="$emit('restore-all')"
          >
            全部恢复
          </button>
          <button
            v-if="items.length > 0"
            class="trash-clear-all-button"
            type="button"
            @click="$emit('clear-all')"
          >
            全部清空
          </button>
          <button class="trash-close-button" type="button" @click="close">关闭</button>
        </div>
      </header>

      <p v-if="items.length === 0" class="trash-empty-tip">暂无记录</p>
      <ul v-else class="trash-list" ref="listRef">
        <li v-for="item in items" :key="item.dynamicId" class="trash-item">
          <div class="trash-item-meta">
            <p class="trash-item-title">{{ item.card.title || "未命名视频" }}</p>
            <p class="trash-item-sub">
              {{ item.card.upName || "未知UP" }} · {{ formatRemovedAt(item.removedAt) }}
            </p>
          </div>
          <button class="trash-restore-button" type="button" @click="$emit('restore', item.dynamicId)">恢复</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue"

import type { TrashItem } from "../services/storage"
import { maskFadeIn, maskFadeOut, scaleFadeIn, scaleFadeOut, staggerIn } from "../utils/motion"

const props = defineProps<{
  open: boolean
  items: TrashItem[]
}>()

const emit = defineEmits<{
  (event: "close"): void
  (event: "restore", dynamicId: string): void
  (event: "restore-all"): void
  (event: "clear-all"): void
}>()

const visible = ref(false)
const closing = ref(false)
const maskRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

async function animateOpen(): Promise<void> {
  closing.value = false
  visible.value = true
  await nextTick()
  if (maskRef.value) {
    maskFadeIn(maskRef.value)
  }
  if (panelRef.value) {
    scaleFadeIn(panelRef.value)
  }
  await nextTick()
  if (listRef.value) {
    const rows = listRef.value.querySelectorAll(".trash-item")
    if (rows.length > 0) {
      staggerIn(rows, { y: 6, stagger: 0.025, duration: 0.22, maxItems: 8 })
    }
  }
}

function animateClose(): void {
  if (!visible.value || closing.value) {
    return
  }
  closing.value = true
  const panel = panelRef.value
  const mask = maskRef.value
  if (!panel || !mask) {
    visible.value = false
    closing.value = false
    return
  }
  scaleFadeOut(panel, { duration: 0.18 })
  maskFadeOut(mask, {
    duration: 0.18,
    onComplete: () => {
      visible.value = false
      closing.value = false
    },
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      void animateOpen()
      return
    }
    animateClose()
  },
  { immediate: true },
)

function close(): void {
  emit("close")
}

function formatRemovedAt(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${month}-${day} ${hour}:${minute}`
}
</script>
