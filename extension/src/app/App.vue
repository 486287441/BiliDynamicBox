<template>
  <main class="inbox-shell">
    <header class="inbox-header">
      <h1>动态收件箱</h1>
      <p>只展示视频动态，支持想看 / 不想看快速决策。</p>
    </header>

    <section class="inbox-stats">
      <p>原始动态：{{ inbox.rawTotal }}</p>
      <p>视频动态：{{ inbox.videoTotal }}</p>
      <button class="refresh-button" type="button" :disabled="inbox.loading" @click="refresh">
        {{ inbox.loading ? "加载中..." : "刷新动态" }}
      </button>
    </section>

    <section v-if="inbox.error" class="inbox-error">
      {{ inbox.error }}
    </section>

    <section v-else class="inbox-content">
      <InboxGroup
        v-for="group in inbox.groups"
        :key="group.key"
        :group="group"
        :pending-map="decision.pendingMap"
        @want-watch="onWantWatch"
        @dislike="onDislike"
      />
      <p v-if="!inbox.loading && inbox.groups.length === 0">暂无可展示的视频动态。</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from "vue"

import type { VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"

const inbox = useInboxStore()
const decision = useDecisionStore()

async function refresh(): Promise<void> {
  await inbox.load()
}

async function onWantWatch(card: VideoDynamicCard): Promise<void> {
  await decision.markWantWatch(card)
}

function onDislike(card: VideoDynamicCard): void {
  decision.markDislike(card)
}

onMounted(() => {
  void refresh()
})
</script>
