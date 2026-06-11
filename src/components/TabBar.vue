<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface Tab {
  name: string
  path: string
  icon: string
  activeIcon: string
  title: string
}

const tabs: Tab[] = [
  {
    name: 'home',
    path: '/',
    icon: '🏠',
    activeIcon: '🏠',
    title: '首页',
  },
  {
    name: 'category',
    path: '/category',
    icon: '📂',
    activeIcon: '📂',
    title: '分类',
  },
  {
    name: 'cart',
    path: '/cart',
    icon: '🛒',
    activeIcon: '🛒',
    title: '购物车',
  },
  {
    name: 'mine',
    path: '/mine',
    icon: '👤',
    activeIcon: '👤',
    title: '我的',
  },
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
        {{ currentPath === tab.path ? tab.activeIcon : tab.icon }}
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
  height: 50px;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: color 0.2s;
  color: var(--color-text-secondary);
}

.tab-bar__item--active {
  color: var(--color-primary);
}

.tab-bar__icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 2px;
}

.tab-bar__title {
  font-size: var(--font-size-xs);
  line-height: 1;
}
</style>
