<script setup lang="ts">
import { ref } from 'vue'

const categories = ref([
  { id: 1, name: '手机数码', icon: 'phone' },
  { id: 2, name: '电脑办公', icon: 'laptop' },
  { id: 3, name: '家用电器', icon: 'home' },
  { id: 4, name: '服饰鞋包', icon: 'tshirt' },
  { id: 5, name: '食品生鲜', icon: 'food' },
  { id: 6, name: '美妆护肤', icon: 'cosmetic' },
  { id: 7, name: '运动户外', icon: 'sport' },
  { id: 8, name: '图书文娱', icon: 'book' },
])

const activeCategory = ref(0)
</script>

<template>
  <div class="page-container">
    <div class="page-content">
      <!-- Sub Nav — 暖奶油底，无 blur -->
      <div class="sub-nav">
        <div class="sub-nav__inner">
          <span class="sub-nav__title">全部分类</span>
          <div class="sub-nav__search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- 分类内容 -->
      <div class="category-wrapper">
        <!-- 左侧边栏 — 暖奶油底 + 细线 -->
        <div class="category-sidebar">
          <div
            v-for="(item, index) in categories"
            :key="item.id"
            class="category-sidebar__item"
            :class="{ 'category-sidebar__item--active': activeCategory === index }"
            @click="activeCategory = index"
          >
            <span class="category-sidebar__item-icon">
              <svg v-if="item.icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              <svg v-if="item.icon === 'laptop'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <svg v-if="item.icon === 'tshirt'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              </svg>
              <svg v-if="item.icon === 'food'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
              <svg v-if="item.icon === 'cosmetic'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <svg v-if="item.icon === 'sport'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
              <svg v-if="item.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span class="category-sidebar__item-text">{{ item.name }}</span>
          </div>
        </div>

        <!-- 右侧内容 — 暖奶油底 + 白卡网格 -->
        <div class="category-content">
          <div class="category-content__banner">
            <span class="banner-text">{{ categories[activeCategory]?.name }}</span>
          </div>
          <div class="category-content__grid">
            <div class="store-card" v-for="i in 6" :key="i">
              <div class="store-card__img">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="36" height="36">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <span class="store-card__title">子分类 {{ i }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Sub Nav — 暖奶油，无 blur ===== */
.sub-nav {
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  flex-shrink: 0;
}

.sub-nav__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--spacing-lg);
}

.sub-nav__title {
  font-family: var(--font-family-display);
  font-size: var(--text-title-sm);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--color-ink);
}

.sub-nav__search {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink-muted-48);
  cursor: pointer;
}

/* ===== 分类主体 ===== */
.category-wrapper {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.category-sidebar {
  width: 94px;
  background: var(--color-canvas);
  border-right: 1px solid var(--color-hairline);
  overflow-y: auto;
  flex-shrink: 0;
}

.category-sidebar__item {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xxs);
  cursor: pointer;
  color: var(--color-ink-muted-48);
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.category-sidebar__item--active {
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-surface-card);
  border-left-color: var(--color-primary);
}

.category-sidebar__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.category-sidebar__item-text {
  font-family: var(--font-family-body);
  font-size: var(--text-fine-print);
  font-weight: 400;
  letter-spacing: 0;
}

.category-content {
  flex: 1;
  overflow-y: auto;
  background: var(--color-canvas);
  padding: 0 var(--spacing-sm);
}

.category-content__banner {
  height: 64px;
  background: var(--color-surface-card);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--spacing-sm) 0;
}

.banner-text {
  font-family: var(--font-family-display);
  font-size: var(--text-title-md);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--color-ink);
}

.category-content__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-xs);
  padding-bottom: var(--spacing-md);
}

.store-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-md) 0;
  cursor: pointer;
  background: var(--color-surface-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  transition: border-color 0.15s ease;
}

.store-card:active {
  border-color: var(--color-primary);
}

.store-card__img {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ink-muted-48);
  opacity: 0.2;
  margin-bottom: var(--spacing-xxs);
}

.store-card__title {
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-body);
}
</style>
