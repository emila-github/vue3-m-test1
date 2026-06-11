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
    icon: 'home',
    activeIcon: 'home-active',
    title: '首页',
  },
  {
    name: 'category',
    path: '/category',
    icon: 'category',
    activeIcon: 'category-active',
    title: '分类',
  },
  {
    name: 'cart',
    path: '/cart',
    icon: 'cart',
    activeIcon: 'cart-active',
    title: '购物车',
  },
  {
    name: 'mine',
    path: '/mine',
    icon: 'mine',
    activeIcon: 'mine-active',
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
        <!-- 首页 -->
        <svg v-if="tab.icon === 'home' && currentPath !== tab.path" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <svg v-if="tab.icon === 'home' && currentPath === tab.path" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="var(--color-bg-card)" stroke-width="2"/>
        </svg>
        <!-- 分类 -->
        <svg v-if="tab.icon === 'category' && currentPath !== tab.path" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <svg v-if="tab.icon === 'category' && currentPath === tab.path" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <!-- 购物车 -->
        <svg v-if="tab.icon === 'cart' && currentPath !== tab.path" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <svg v-if="tab.icon === 'cart' && currentPath === tab.path" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
          <circle cx="9" cy="21" r="1"/>
          <circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        <!-- 我的 -->
        <svg v-if="tab.icon === 'mine' && currentPath !== tab.path" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <svg v-if="tab.icon === 'mine' && currentPath === tab.path" viewBox="0 0 24 24" fill="currentColor" stroke="none" width="24" height="24">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"/>
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
  height: 50px;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  backdrop-filter: blur(20px);
}

.tab-bar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 100%;
  cursor: pointer;
  transition: all 0.25s ease;
  color: var(--color-text-placeholder);
  position: relative;
}

.tab-bar__item--active {
  color: var(--color-primary);
}

.tab-bar__item--active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 0 0 2px 2px;
}

.tab-bar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
  transition: color 0.25s ease;
}

.tab-bar__title {
  font-size: var(--font-size-xs);
  line-height: 1;
}
</style>
