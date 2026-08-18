<template>
  <aside class="bewly-dock" aria-label="快捷导航">
    <div class="bewly-dock-inner">
      <a v-for="item in items" :key="item.label" class="bewly-dock-item" :class="{ active: item.active }" :href="item.href" :title="item.label" @click="onItemClick($event, item.libraryKind)">
        <Icon :icon="item.active ? item.iconActivated : item.icon" />
      </a>
      <span class="bewly-dock-divider"></span>
      <button class="bewly-dock-item" type="button" title="深浅模式" @click="toggleDark"><Icon :icon="dark ? 'line-md:sunny-outline-to-moon-loop-transition' : 'line-md:moon-to-sunny-outline-transition'" /></button>
      <button class="bewly-dock-item" type="button" title="工具与设置" @click.stop="$emit('open-tools')"><Icon icon="mingcute:settings-3-line" /></button>
    </div>
    <button class="bewly-dock-float" type="button" :title="atTop ? '刷新' : '回到顶部'" @click="refreshOrTop">
      <Icon :icon="atTop ? 'line-md:rotate-270' : 'line-md:arrow-small-up'" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { computed, onMounted, onUnmounted, ref } from "vue"
import type { LibraryKind } from "../domain/types"
const props = defineProps<{ active: "home" | "moments" | "favorites" | "history" | "watchlater" }>()
const emit = defineEmits<{ (event: "refresh"): void; (event: "open-tools"): void; (event: "navigate-library", kind: LibraryKind): void }>()
const atTop = ref(true)
const dark = ref(false)
const scrollRoot = ref<HTMLElement | null>(null)
const items = computed(() => [
  { label: "首页", icon: "mingcute:home-5-line", iconActivated: "mingcute:home-5-fill", href: "https://www.bilibili.com/", active: props.active === "home", libraryKind: null },
  { label: "搜索", icon: "mingcute:search-2-line", iconActivated: "mingcute:search-2-fill", href: "https://search.bilibili.com/all", active: false, libraryKind: null },
  { label: "收藏", icon: "mingcute:star-line", iconActivated: "mingcute:star-fill", href: "https://www.bilibili.com/?readflow=favorites", active: props.active === "favorites", libraryKind: "favorites" as LibraryKind },
  { label: "历史", icon: "mingcute:time-line", iconActivated: "mingcute:time-fill", href: "https://www.bilibili.com/?readflow=history", active: props.active === "history", libraryKind: "history" as LibraryKind },
  { label: "稍后再看", icon: "mingcute:carplay-line", iconActivated: "mingcute:carplay-fill", href: "https://www.bilibili.com/?readflow=watchlater", active: props.active === "watchlater", libraryKind: "watchlater" as LibraryKind },
  { label: "动态", icon: "tabler:windmill", iconActivated: "tabler:windmill-filled", href: "https://t.bilibili.com/", active: props.active === "moments", libraryKind: null },
])
function onItemClick(event: MouseEvent, kind: LibraryKind | null): void {
  if (!kind) return
  event.preventDefault()
  emit("navigate-library", kind)
}
function onScroll(): void { atTop.value = (scrollRoot.value?.scrollTop ?? 0) < 40 }
function refreshOrTop(): void {
  if (atTop.value) emit("refresh")
  else scrollRoot.value?.scrollTo({ top: 0, behavior: "smooth" })
}
function toggleDark(): void {
  const root = document.getElementById("bewly-inbox-root")
  root?.classList.toggle("is-dark")
  dark.value = Boolean(root?.classList.contains("is-dark"))
  localStorage.setItem("readflow:dark", dark.value ? "1" : "0")
}
onMounted(() => {
  scrollRoot.value = document.getElementById("bewly-inbox-root")
  scrollRoot.value?.addEventListener("scroll", onScroll, { passive: true })
  dark.value = localStorage.getItem("readflow:dark") === "1"
  if (dark.value) scrollRoot.value?.classList.add("is-dark")
})
onUnmounted(() => scrollRoot.value?.removeEventListener("scroll", onScroll))
</script>
