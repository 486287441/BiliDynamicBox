<template>
  <article class="group-block">
    <h2>{{ group.label }}（{{ group.items.length }}）</h2>
    <div class="group-list">
      <VideoCard
        v-for="item in group.items"
        :key="item.dynamicId"
        :card="item"
        :pending-map="pendingMap"
        @want-watch="$emit('want-watch', item)"
        @dislike="$emit('dislike', item)"
      />
    </div>
  </article>
</template>

<script setup lang="ts">
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import VideoCard from "./VideoCard.vue"

defineProps<{
  group: DateGroup
  pendingMap: Record<string, boolean>
}>()

defineEmits<{
  (event: "want-watch", card: VideoDynamicCard): void
  (event: "dislike", card: VideoDynamicCard): void
}>()
</script>
