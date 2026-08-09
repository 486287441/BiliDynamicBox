<template>
  <main ref="shellRef" class="inbox-shell home-shell" :class="{ 'detail-open': selectedCard, 'sidebar-collapsed': sidebarCollapsed }">
    <AppNav active="moments" :trash-count="0" :collapsed="sidebarCollapsed" @update:collapsed="updateSidebar" @navigate-tab="() => undefined" @navigate-library="() => undefined" @open-tools="showPreviewToast('筛选设置已打开')" />
    <WorkspaceToolbar :category="category" scope="dynamics" min-duration-minutes="" publish-after-date="" @update:category="updateCategory" />

    <section class="inbox-content">
      <article class="group-block">
        <h2><span>今天</span><small>40</small></h2>
        <div class="group-list">
          <VideoCard
            v-for="card in visibleCards"
            :key="card.dynamicId"
            :card="card"
            :pending-map="{}"
            :want-watch-map="wantWatchMap"
            :open-video-on-want-watch="false"
            :following-up-map="followingMap"
            relation-pending-mid=""
            :selected="selectedCard?.dynamicId === card.dynamicId"
            @select="openCard(card)"
            @want-watch="markWant(card)"
            @help-read="startReading(card)"
            @dislike="hideCard(card)"
            @toggle-follow="() => undefined"
          />
        </div>
      </article>
    </section>

    <VideoDetailPanel
      :card="selectedCard"
      :transcriber-state="selectedCard?.dynamicId === readingId ? previewTranscriberState : undefined"
      :pending="false"
      :want-watched="Boolean(selectedCard && wantWatchMap[selectedCard.dynamicId])"
      @close="closeCard"
      @want-watch="selectedCard && markWant(selectedCard)"
      @help-read="selectedCard && startReading(selectedCard)"
      @dislike="selectedCard && hideCard(selectedCard)"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import AppNav from "../components/AppNav.vue"
import VideoCard from "../components/VideoCard.vue"
import VideoDetailPanel from "../components/VideoDetailPanel.vue"
import WorkspaceToolbar from "../components/WorkspaceToolbar.vue"
import type { ContentCategoryFilter } from "../domain/content-category"
import type { VideoDynamicCard } from "../domain/types"
import { showToast } from "../services/toast"
import { animateGridReflow, captureCardRects } from "../utils/motion"

const imageUrls = [
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1484417894907-623942c8ee29?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=640&h=360&q=84",
  "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=640&h=360&q=84",
]
const titles = [
  "总决赛遇到外挂狙击，演都不演专杀选手",
  "为什么在 AI 上付费是极其值得的投资",
  "从底层理解模型能力：一次讲清上下文",
  "马斯克的大学室友，想用空气造石油",
  "知名律师讲杀人犯七年多潜逃出狱",
  "怀旧服这波 DNA 动了，老玩家到底香不香",
  "从佩服到文化，创伤受害者并不能成为理由",
  "总决赛 1v13 成功吃鸡，最后压力拉满",
  "导演把真相藏在片尾曲后？万字拆解",
  "空调移机这几天就不制冷了，原因很简单",
  "冷知识：系统设置里最容易忽略的五个功能",
  "做产品六年后，我重新理解了信息密度",
  "桌面效率工作流：把碎片时间重新收回来",
  "这一期把视觉层级和留白讲透",
  "一小时学会现代前端的关键布局思路",
]
const cards = ref<VideoDynamicCard[]>(titles.map((title, index) => ({
  dynamicId: String(index + 1),
  videoAid: String(1000 + index),
  videoBvid: "BV1xx411c7m" + index,
  title,
  cover: imageUrls[index],
  durationText: ["03:44", "19:04", "23:40", "06:20", "33:29"][index % 5],
  durationSeconds: 224 + index * 83,
  playCount: 13000 + index * 12700,
  danmakuCount: 7 + index * 31,
  upMid: String(9000 + index),
  upName: ["艺术家阿克曼", "小Lin说", "哔哩哔哩番剧", "通俗解馋", "迷案追踪"][index % 5],
  upAvatar: `https://i.pravatar.cc/96?img=${(index % 45) + 1}`,
  publishAt: 1785715200 - index * 1800,
  tag: ["娱乐", "知识", "娱乐", "知识", "知识"][index % 5],
})))

const category = ref<ContentCategoryFilter>("all")
const sidebarCollapsed = ref(false)
const shellRef = ref<HTMLElement | null>(null)
const selectedCard = ref<VideoDynamicCard | null>(cards.value[1])
const wantWatchMap = ref<Record<string, boolean>>({})
const followingMap = Object.fromEntries(cards.value.map((card) => [card.upMid, true]))
const readingId = ref("")
const previewTranscriberState = computed(() => ({
  state: "transcribing" as const,
  updatedAt: Date.now(),
}))
const visibleCards = computed(() => cards.value.filter((card) => {
  if (category.value === "all") return true
  return category.value === "work" ? card.tag === "知识" : card.tag === "娱乐"
}))
function transitionCardLayout(update: () => void): void {
  const shell = shellRef.value
  const before = shell ? captureCardRects(shell) : new Map<HTMLElement, DOMRect>()
  update()
  void nextTick(() => {
    if (shell) animateGridReflow(shell, before)
  })
}
function openCard(card: VideoDynamicCard): void { transitionCardLayout(() => { selectedCard.value = card }) }
function closeCard(): void { transitionCardLayout(() => { selectedCard.value = null }) }
function updateCategory(value: ContentCategoryFilter): void { transitionCardLayout(() => { category.value = value }) }
function updateSidebar(value: boolean): void { transitionCardLayout(() => { sidebarCollapsed.value = value }) }
function showPreviewToast(message: string): void { showToast(message) }
function markWant(card: VideoDynamicCard): void {
  wantWatchMap.value = { ...wantWatchMap.value, [card.dynamicId]: true }
  showToast("已标记为“想看”")
}
function startReading(card: VideoDynamicCard): void {
  readingId.value = card.dynamicId
  selectedCard.value = card
  showToast("已开始生成帮读摘要")
}
function hideCard(card: VideoDynamicCard): void {
  cards.value = cards.value.filter((item) => item.dynamicId !== card.dynamicId)
  if (selectedCard.value?.dynamicId === card.dynamicId) selectedCard.value = null
  showToast("已移入不想看")
}
</script>
