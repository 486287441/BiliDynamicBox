<template>
  <article class="group-block" ref="groupRef">
    <h2 ref="titleRef">{{ group.label }}（{{ displayCount }}）</h2>
    <TransitionGroup
      class="group-list"
      tag="div"
      :css="false"
      @leave="onLeave"
    >
      <VideoCard
        v-for="item in group.items"
        :key="item.dynamicId"
        :card="item"
        :pending-map="pendingMap"
        :want-watch-map="wantWatchMap"
        :open-video-on-want-watch="openVideoOnWantWatch"
        :unfollowing-up-mid="unfollowingUpMid"
        @want-watch="$emit('want-watch', item)"
        @dislike="$emit('dislike', item)"
        @unfollow="$emit('unfollow', item)"
      />
    </TransitionGroup>
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import gsap from "gsap"

import type { DateGroup, VideoDynamicCard } from "../domain/types"
import {
  animateGridReflow,
  captureCardRects,
  cardLeave,
  fadeSlideIn,
  motionEnabled,
  prepareCardLeave,
  resetCardLeaveStyles,
  type CardLeaveVariant,
} from "../utils/motion"
import VideoCard from "./VideoCard.vue"

const props = defineProps<{
  group: DateGroup
  pendingMap: Record<string, boolean>
  wantWatchMap: Record<string, boolean>
  openVideoOnWantWatch: boolean
  unfollowingUpMid: string
  finalCountMap: Record<string, number>
  leaveReasonMap: Record<string, CardLeaveVariant>
  enterCardIds: string[]
}>()

const emit = defineEmits<{
  (event: "want-watch", card: VideoDynamicCard): void
  (event: "dislike", card: VideoDynamicCard): void
  (event: "unfollow", card: VideoDynamicCard): void
  (event: "leave-complete", payload: { dynamicId: string; groupKey: string }): void
  (event: "enter-complete", dynamicId: string): void
}>()

const groupRef = ref<HTMLElement | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const knownCardIds = ref<string[]>([])
let motionCtx: gsap.Context | null = null

const enterCardIdSet = computed(() => new Set(props.enterCardIds))

const displayCount = computed(() => {
  const finalCount = props.finalCountMap[props.group.key]
  return typeof finalCount === "number" ? finalCount : props.group.items.length
})

function finishLeave(htmlEl: HTMLElement, dynamicId: string, done: () => void): void {
  const listEl = htmlEl.parentElement
  const beforeRects = listEl ? captureCardRects(listEl, htmlEl) : null

  resetCardLeaveStyles(htmlEl)
  done()

  const notifyComplete = (): void => {
    if (dynamicId) {
      emit("leave-complete", { dynamicId, groupKey: props.group.key })
    }
  }

  if (listEl && beforeRects && beforeRects.size > 0) {
    void nextTick(() => {
      animateGridReflow(listEl, beforeRects, notifyComplete)
    })
    return
  }

  notifyComplete()
}

function onLeave(el: Element, done: () => void): void {
  const htmlEl = el as HTMLElement
  const dynamicId = htmlEl.dataset.dynamicId ?? ""
  const variant = props.leaveReasonMap[dynamicId] ?? "default"

  if (!motionEnabled()) {
    resetCardLeaveStyles(htmlEl)
    if (dynamicId) {
      emit("leave-complete", { dynamicId, groupKey: props.group.key })
    }
    done()
    return
  }

  prepareCardLeave(htmlEl)

  cardLeave(
    htmlEl,
    () => {
      finishLeave(htmlEl, dynamicId, done)
    },
    variant,
  )
}

function animateFillInCards(items: VideoDynamicCard[]): void {
  if (!motionEnabled() || items.length === 0 || !groupRef.value) {
    for (const item of items) {
      emit("enter-complete", item.dynamicId)
    }
    return
  }

  void nextTick(() => {
    if (!groupRef.value) {
      return
    }
    let pending = items.length
    const finishOne = (dynamicId: string): void => {
      emit("enter-complete", dynamicId)
      pending -= 1
    }

    for (const [index, item] of items.entries()) {
      const cardEl = groupRef.value.querySelector<HTMLElement>(`[data-dynamic-id="${item.dynamicId}"]`)
      if (!cardEl) {
        finishOne(item.dynamicId)
        continue
      }
      fadeSlideIn(cardEl, {
        y: 10,
        duration: 0.26,
        delay: Math.min(index, 3) * 0.04,
        onComplete: () => finishOne(item.dynamicId),
      })
    }
  })
}

watch(
  () => props.group.items,
  (items) => {
    const known = new Set(knownCardIds.value)
    const fillInItems = items.filter(
      (item) => !known.has(item.dynamicId) && enterCardIdSet.value.has(item.dynamicId),
    )
    knownCardIds.value = items.map((item) => item.dynamicId)

    if (fillInItems.length > 0) {
      animateFillInCards(fillInItems)
    }
  },
  { flush: "post" },
)

onMounted(async () => {
  knownCardIds.value = props.group.items.map((item) => item.dynamicId)
  await nextTick()
  if (!groupRef.value) {
    return
  }
  motionCtx = gsap.context(() => {
    if (titleRef.value) {
      fadeSlideIn(titleRef.value, { y: 6, duration: 0.22 })
    }
  }, groupRef.value)
})

onUnmounted(() => {
  motionCtx?.revert()
  motionCtx = null
})
</script>
