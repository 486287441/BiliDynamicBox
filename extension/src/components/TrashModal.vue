<template>
  <div v-if="open" class="trash-modal-mask" @click.self="$emit('close')">
    <section class="trash-modal-panel">
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
          <button class="trash-close-button" type="button" @click="$emit('close')">关闭</button>
        </div>
      </header>

      <p v-if="items.length === 0" class="trash-empty-tip">暂无记录</p>
      <ul v-else class="trash-list">
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
import type { TrashItem } from "../services/storage"

defineProps<{
  open: boolean
  items: TrashItem[]
}>()

defineEmits<{
  (event: "close"): void
  (event: "restore", dynamicId: string): void
  (event: "restore-all"): void
  (event: "clear-all"): void
}>()

function formatRemovedAt(timestamp: number): string {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  return `${month}-${day} ${hour}:${minute}`
}
</script>
