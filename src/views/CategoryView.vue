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
      <!-- Search bar -->
      <div class="search-bar">
        <div class="search-bar__inner">
          <svg class="search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="search-bar__placeholder">搜索你想要的商品</span>
        </div>
      </div>

      <!-- Category split: sidebar + content -->
      <div class="category-wrapper">
        <!-- Sidebar: surface-1, hairline right -->
        <div class="category-sidebar">
          <div
            v-for="(item, index) in categories"
            :key="item.id"
            class="category-sidebar__item"
            :class="{ 'category-sidebar__item--active': activeCategory === index }"
            @click="activeCategory = index"
          >
            <span class="category-sidebar__item-icon">
              <svg v-if="item.icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              <svg v-if="item.icon === 'laptop'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <svg v-if="item.icon === 'tshirt'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
              </svg>
              <svg v-if="item.icon === 'food'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                <line x1="6" y1="1" x2="6" y2="4"/>
                <line x1="10" y1="1" x2="10" y2="4"/>
                <line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
              <svg v-if="item.icon === 'cosmetic'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <svg v-if="item.icon === 'sport'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
              <svg v-if="item.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span>{{ item.name }}</span>
          </div>
        </div>

        <!-- Content area -->
        <div class="category-content">
          <!-- Category banner: product-color accent -->
          <div class="category-content__banner">
            <span class="banner-icon">
              <svg v-if="categories[activeCategory]?.icon === 'phone'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'laptop'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'tshirt'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'food'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'cosmetic'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'sport'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
              <svg v-if="categories[activeCategory]?.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </span>
            <span>{{ categories[activeCategory]?.name }} 专区</span>
          </div>

          <!-- Sub-category grid -->
          <div class="category-content__grid">
            <div class="category-content__grid-item" v-for="i in 6" :key="i">
              <svg class="grid-item__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" width="24" height="24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <span class="grid-item__text">子分类 {{ i }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Search bar ── */
.search-bar {
  padding: 10px 16px;
  background: #000000;
  flex-shrink: 0;
}

.search-bar__inner {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--color-surface-1);
  border: 1px solid var(--color-hairline);
  border-radius: 8px;
  padding: 0 14px;
}

.search-bar__icon {
  margin-right: 6px;
  color: var(--color-ink-subtle);
  flex-shrink: 0;
}

.search-bar__placeholder {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink-subtle);
}

/* ── Category layout ── */
.category-wrapper {
  display: flex;
  height: calc(100% - 56px);
}

/* ── Sidebar ── */
.category-sidebar {
  width: 90px;
  background: var(--color-surface-1);
  overflow-y: auto;
  flex-shrink: 0;
  border-right: 1px solid var(--color-hairline-soft);
}

.category-sidebar__item {
  height: 50px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-ink-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-sidebar__item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.category-sidebar__item--active {
  color: var(--color-accent-blue);
  font-weight: 600;
  background: var(--color-surface-2);
}

/* ── Content area ── */
.category-content {
  flex: 1;
  padding: 0 12px;
  overflow-y: auto;
  background: #000000;
}

.category-content__banner {
  height: 72px;
  background: var(--color-terraform);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  gap: 8px;
  margin: 12px 0;
}

.banner-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-content__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.category-content__grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 0;
  cursor: pointer;
  background: var(--color-surface-1);
  border: 1px solid var(--color-hairline-soft);
  border-radius: 8px;
  transition: background 0.15s ease;
}

.category-content__grid-item:active {
  background: var(--color-surface-2);
}

.grid-item__icon {
  margin-bottom: 4px;
  opacity: 0.25;
  color: var(--color-ink-muted);
}

.grid-item__text {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-ink-muted);
}
</style>
