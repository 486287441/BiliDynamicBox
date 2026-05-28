<template>
  <main class="inbox-shell">
    <TopToolbar
      :trash-count="trash.count"
      :search-query="searchQuery"
      @open-trash="trash.setOpen(true)"
      @update:search-query="searchQuery = $event"
    />

    <section v-if="inbox.error" class="inbox-error">
      {{ inbox.error }}
    </section>

    <section v-else class="inbox-content">
      <InboxGroup
        v-for="group in displayGroups"
        :key="group.key"
        :group="group"
        :pending-map="decision.pendingMap"
        :final-count-map="searchQuery.trim() ? {} : inbox.finalGroupCounts"
        @want-watch="onWantWatch"
        @dislike="onDislike"
      />
      <p v-if="!inbox.loading && displayGroups.length === 0">
        {{ searchQuery.trim() ? "没有匹配到相关视频或UP主。" : "暂无可展示的视频动态。" }}
      </p>
      <p v-if="inbox.loadingMore" class="inbox-load-more-tip">正在加载更多...</p>
      <p v-else-if="!inbox.hasMore && displayGroups.length > 0" class="inbox-load-more-tip">已经到底了</p>
    </section>

    <TrashModal :open="trash.open" :items="trash.items" @close="trash.setOpen(false)" @restore="onRestore" />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"

import TopToolbar from "../components/TopToolbar.vue"
import TrashModal from "../components/TrashModal.vue"
import type { DateGroup, VideoDynamicCard } from "../domain/types"
import InboxGroup from "../components/InboxGroup.vue"
import { useDecisionStore } from "../store/decision"
import { useInboxStore } from "../store/inbox"
import { useTrashStore } from "../store/trash"
import { showToast } from "../services/toast"

const inbox = useInboxStore()
const decision = useDecisionStore()
const trash = useTrashStore()
const searchQuery = ref("")
let scrollRoot: HTMLElement | null = null
let onScrollHandler: (() => void) | null = null

const normalizedQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase())

const displayGroups = computed<DateGroup[]>(() => {
  if (!normalizedQuery.value) {
    return inbox.groups
  }
  return inbox.groups
    .map((group) => {
      const items = group.items.filter((item) => {
        const title = item.title.toLocaleLowerCase()
        const upName = item.upName.toLocaleLowerCase()
        return title.includes(normalizedQuery.value) || upName.includes(normalizedQuery.value)
      })
      return {
        ...group,
        items,
      }
    })
    .filter((group) => group.items.length > 0)
})

async function onWantWatch(card: VideoDynamicCard): Promise<void> {
  await decision.markWantWatch(card)
}

function onDislike(card: VideoDynamicCard): void {
  decision.markDislike(card)
}

function onRestore(dynamicId: string): void {
  const item = trash.items.find((row) => row.dynamicId === dynamicId)
  if (!item) {
    return
  }
  decision.restoreDisliked(item.card)
  inbox.restoreCard(dynamicId)
  showToast("已恢复到收件箱")
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
