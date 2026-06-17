<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface Tab {
  name: string
  path: string
  icon: string
  title: string
}

const tabs: Tab[] = [
  { name: 'home', path: '/', icon: 'home', title: '首页' },
  { name: 'category', path: '/category', icon: 'category', title: '分类' },
  { name: 'cart', path: '/cart', icon: 'cart', title: '购物车' },
  { name: 'mine', path: '/mine', icon: 'mine', title: '我的' },
]

const currentPath = computed(() => route.path)

function switchTab(tab: Tab) {
  if (currentPath.value !== tab.path) {
    router.push(tab.path)
  }
}
</script>

<template>
  <div class="tab-bar safe-area-bottom">
    <div
      v-for="tab in tabs"
      :key="tab.name"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--active': currentPath === tab.path }"
      @click="switchTab(tab)"
    >
      <span class="tab-bar__icon">
        <!-- 首页 -->
        <svg
          v-if="tab.icon === 'home'"
          viewBox="0 0 24 24"
          :fill="currentPath === tab.path ? 'currentColor' : 'none'"
          :stroke="currentPath === tab.path ? 'none' : 'currentColor'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <!-- 分类 -->
        <svg
          v-if="tab.icon === 'category'"
          viewBox="0 0 24 24"
          :fill="currentPath === tab.path ? 'currentColor' : 'none'"
          :stroke="currentPath === tab.path ? 'none' : 'currentColor'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <!-- 购物车 -->
        <svg
          v-if="tab.icon === 'cart'"
          viewBox="0 0 24 24"
          :fill="currentPath === tab.path ? 'currentColor' : 'none'"
          :stroke="currentPath === tab.path ? 'none' : 'currentColor'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <!-- 我的 -->
        <svg
          v-if="tab.icon === 'mine'"
          viewBox="0 0 24 24"
          :fill="currentPath === tab.path ? 'currentColor' : 'none'"
          :stroke="currentPath === tab.path ? 'none' : 'currentColor'"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          width="24"
          height="24"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <span class="tab-bar__title">{{ tab.title }}</span>
    </div>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 56px;
  background: var(--color-bg-white);
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-shadow: 0 -2px 8px rgba(14, 15, 12, 0.05);
}

.tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: color 0.2s ease;
  color: var(--color-text-secondary);
  gap: 2px;
}

.tab-bar__item--active {
  color: var(--color-primary);
}

.tab-bar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: color 0.2s ease;
}

.tab-bar__title {
  font-size: var(--font-size-xs);
  line-height: 1;
  font-weight: 600;
}
</style>
