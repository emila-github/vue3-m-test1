<script setup lang="ts">
import { ref } from 'vue'

const categories = ref([
  { id: 1, name: '手机数码', icon: '📱' },
  { id: 2, name: '电脑办公', icon: '💻' },
  { id: 3, name: '家用电器', icon: '🏠' },
  { id: 4, name: '服饰鞋包', icon: '👗' },
  { id: 5, name: '食品生鲜', icon: '🍎' },
  { id: 6, name: '美妆护肤', icon: '💄' },
  { id: 7, name: '运动户外', icon: '⚽' },
  { id: 8, name: '图书文娱', icon: '📚' },
])

const activeCategory = ref(0)
</script>

<template>
  <div class="page-container">
    <div class="page-content">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-bar__inner">
          <span class="search-bar__icon">🔍</span>
          <span class="search-bar__placeholder">搜索你想要的商品</span>
        </div>
      </div>

      <!-- 分类内容 -->
      <div class="category-wrapper">
        <div class="category-sidebar">
          <div
            v-for="(item, index) in categories"
            :key="item.id"
            class="category-sidebar__item"
            :class="{ 'category-sidebar__item--active': activeCategory === index }"
            @click="activeCategory = index"
          >
            {{ item.name }}
          </div>
        </div>
        <div class="category-content">
          <div class="category-content__banner">
            {{ categories[activeCategory]?.icon }}
            {{ categories[activeCategory]?.name }}
          </div>
          <div class="category-content__grid">
            <div class="category-content__grid-item" v-for="i in 6" :key="i">
              <div class="grid-item__icon">📦</div>
              <span class="grid-item__text">子分类 {{ i }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  padding: 10px 16px;
  background: var(--color-bg-white);
}

.search-bar__inner {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--color-bg);
  border-radius: 18px;
  padding: 0 14px;
}

.search-bar__icon {
  font-size: 14px;
  margin-right: 6px;
}

.search-bar__placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

.category-wrapper {
  display: flex;
  height: calc(100% - 56px);
  margin-top: 10px;
}

.category-sidebar {
  width: 90px;
  background: var(--color-bg);
  overflow-y: auto;
  flex-shrink: 0;
}

.category-sidebar__item {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
  position: relative;
  cursor: pointer;
}

.category-sidebar__item--active {
  background: var(--color-bg-white);
  color: var(--color-primary);
  font-weight: 600;
}

.category-sidebar__item--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

.category-content {
  flex: 1;
  padding: 0 16px;
  overflow-y: auto;
  background: var(--color-bg-white);
}

.category-content__banner {
  height: 80px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: var(--font-size-lg);
  gap: 6px;
  margin: 10px 0;
}

.category-content__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.category-content__grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
}

.grid-item__icon {
  font-size: 32px;
  margin-bottom: 6px;
}

.grid-item__text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}
</style>
