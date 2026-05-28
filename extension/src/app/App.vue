<template>
  <main class="inbox-shell">
    <section v-if="inbox.error" class="inbox-error">
      {{ inbox.error }}
    </section>

    <section v-else class="inbox-content">
      <InboxGroup
        v-for="group in inbox.groups"
        :key="group.key"
        :group="group"
        :pending-map="decision.pendingMap"
        :final-count-map="inbox.finalGroupCounts"
        @want-watch="onWantWatch"
        @dislike="onDislike"
      />
      <p v-if="!inbox.loading && inbox.groups.length === 0">暂无可展示的视频动态。</p>
      <p v-if="inbox.loadingMore" class="inbox-load-more-tip">正在加载更多...</p>
      <p v-else-if="!inbox.hasMore && inbox.groups.length > 0" class="inbox-load-more-tip">已经到底了</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"

import type { VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"

const inbox = useInboxStore()
const decision = useDecisionStore()
let scrollRoot: HTMLElement | null = null
let onScrollHandler: (() => void) | null = null

async function onWantWatch(card: VideoDynamicCard): Promise<void> {
  await decision.markWantWatch(card)
}

function onDislike(card: VideoDynamicCard): void {
  decision.markDislike(card)
}

onMounted(() => {
  void inbox.load(true)

  const root = document.getElementById("bewly-inbox-root")
  if (!(root instanceof HTMLElement)) {
    return
  }

  scrollRoot = root
  onScrollHandler = () => {
    const distanceToBottom = root.scrollHeight - root.scrollTop - root.clientHeight
    if (distanceToBottom < 600) {
      void inbox.loadMore()
    }
  }

  root.addEventListener("scroll", onScrollHandler, { passive: true })
})

onUnmounted(() => {
  if (scrollRoot && onScrollHandler) {
    scrollRoot.removeEventListener("scroll", onScrollHandler)
  }
})
</script>
