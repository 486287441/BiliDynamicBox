<template>
  <article class="group-block">
    <h2>{{ group.label }}（{{ displayCount }}）</h2>
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
import { computed } from "vue"

import type { DateGroup, VideoDynamicCard } from "../domain/types"
import VideoCard from "./VideoCard.vue"

const props = defineProps<{
  group: DateGroup
  pendingMap: Record<string, boolean>
  finalCountMap: Record<string, number>
}>()

const displayCount = computed(() => {
  const finalCount = props.finalCountMap[props.group.key]
  return typeof finalCount === "number" ? finalCount : props.group.items.length
})

defineEmits<{
  (event: "want-watch", card: VideoDynamicCard): void
  (event: "dislike", card: VideoDynamicCard): void
}>()
</script>
