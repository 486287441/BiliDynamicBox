<template>
  <section class="up-filter-view">
    <header class="up-filter-header">
      <div class="up-filter-sort" role="radiogroup" aria-label="关注排序">
        <button
          class="up-filter-sort-button"
          :class="{ 'is-active': upFilter.sort === 'recent' }"
          type="button"
          role="radio"
          :aria-checked="upFilter.sort === 'recent'"
          :disabled="upFilter.loading"
          @click="upFilter.setSort('recent')"
        >
          最新关注
        </button>
        <button
          class="up-filter-sort-button"
          :class="{ 'is-active': upFilter.sort === 'frequent' }"
          type="button"
          role="radio"
          :aria-checked="upFilter.sort === 'frequent'"
          :disabled="upFilter.loading"
          @click="upFilter.setSort('frequent')"
        >
          最常观看
        </button>
      </div>
      <p v-if="upFilter.total > 0" class="up-filter-summary">
        展示前 3 位关注（共 {{ upFilter.total }} 位）
      </p>
    </header>

    <div v-if="upFilter.error" class="up-filter-error">
      {{ upFilter.error }}
    </div>

    <div v-else-if="upFilter.loading && upFilter.creators.length === 0" class="up-filter-placeholder">
      <p class="up-filter-placeholder-title">正在加载关注列表...</p>
    </div>

    <div v-else-if="upFilter.creators.length === 0" class="up-filter-placeholder">
      <p class="up-filter-placeholder-title">还没有关注任何 UP 主</p>
      <p class="up-filter-placeholder-desc">去 B 站关注感兴趣的博主后，再回到这里浏览。</p>
    </div>

    <div v-else class="up-filter-list">
      <UpCreatorRow
        v-for="creator in upFilter.creators"
        :key="creator.mid"
        :creator="creator"
        :unfollowing="upFilter.unfollowingMid === creator.mid"
        @unfollow="onUnfollow"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useUpFilterStore } from "../store/up-filter"
import { showToast } from "../services/toast"
import UpCreatorRow from "./UpCreatorRow.vue"

const upFilter = useUpFilterStore()

async function onUnfollow(mid: string): Promise<void> {
  const creator = upFilter.creators.find((row) => row.mid === mid)
  if (!creator) {
    return
  }

  const confirmed = window.confirm(`确认取消关注 ${creator.name}？`)
  if (!confirmed) {
    return
  }

  try {
    await upFilter.unfollow(mid)
    showToast("已取关")
  } catch (error) {
    const message = error instanceof Error ? error.message : "取消关注失败"
    showToast(message, "error")
  }
}
</script>
