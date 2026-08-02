<template>
  <header class="bewly-topbar">
    <div class="bewly-topbar-left">
      <a class="bewly-logo" href="https://www.bilibili.com/" title="首页"><Icon icon="mingcute:bilibili-line" /></a>
    </div>
    <form class="bewly-topbar-search" @submit.prevent="search">
      <input v-model="searchText" type="search" placeholder="搜索视频、番剧或 UP 主" />
      <button type="submit" title="搜索"><Icon icon="mingcute:search-2-line" /></button>
    </form>
    <div class="bewly-topbar-right">
      <a class="bewly-user-avatar" :href="userMid ? 'https://space.bilibili.com/' + userMid : 'https://account.bilibili.com/'" title="个人空间">
        <img v-if="userAvatar" :src="userAvatar" alt="用户头像" /><Icon v-else icon="mingcute:user-3-line" />
      </a>
      <div class="bewly-topbar-action-pill">
        <a href="https://message.bilibili.com/" title="消息"><Icon icon="tabler:bell" /></a>
        <a href="https://t.bilibili.com/" title="动态"><Icon :icon="active === 'moments' ? 'tabler:windmill-filled' : 'tabler:windmill'" /></a>
        <a href="https://www.bilibili.com/?readflow=favorites" title="收藏" @click.prevent="$emit('navigate-library', 'favorites')"><Icon :icon="active === 'favorites' ? 'mingcute:star-fill' : 'mingcute:star-line'" /></a>
        <a href="https://www.bilibili.com/?readflow=history" title="历史" @click.prevent="$emit('navigate-library', 'history')"><Icon :icon="active === 'history' ? 'mingcute:time-fill' : 'mingcute:time-line'" /></a>
        <a href="https://www.bilibili.com/?readflow=watchlater" title="稍后再看" @click.prevent="$emit('navigate-library', 'watchlater')"><Icon :icon="active === 'watchlater' ? 'mingcute:carplay-fill' : 'mingcute:carplay-line'" /></a>
        <a class="bewly-upload" href="https://member.bilibili.com/platform/upload/video/frame" title="投稿"><Icon icon="mingcute:upload-line" /></a>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue"
import { onMounted, ref } from "vue"
import { fetchLoggedInUser } from "../services/bilibili-api"
import type { LibraryKind } from "../domain/types"
defineProps<{ active: "home" | "moments" | "favorites" | "history" | "watchlater"; trashCount: number }>()
defineEmits<{ (event: "open-trash"): void; (event: "navigate-library", kind: LibraryKind): void }>()
const searchText = ref("")
const userAvatar = ref("")
const userMid = ref("")
function search(): void {
  const value = searchText.value.trim()
  if (value) window.open("https://search.bilibili.com/all?keyword=" + encodeURIComponent(value), "_blank", "noopener,noreferrer")
}
onMounted(() => {
  void fetchLoggedInUser().then((user) => {
    userAvatar.value = user.face
    userMid.value = user.mid
  }).catch(() => undefined)
})
</script>
