<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Banner {
  id: number
  title: string
  color: string
}

const banners = ref<Banner[]>([
  { id: 1, title: '新品首发', color: '#1989fa' },
  { id: 2, title: '限时特惠', color: '#07c160' },
  { id: 3, title: '爆款推荐', color: '#ff976a' },
])

const currentBanner = ref(0)

function goDetail(id: number) {
  router.push(`/detail/${id}`)
}

const hotList = ref(
  Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    title: `热门商品 ${i + 1}`,
    desc: '品质好物，限时特惠',
    price: (99.9 + i * 10).toFixed(1),
  })),
)
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

      <!-- 轮播图 -->
      <div class="banner">
        <div
          class="banner__inner"
          :style="{
            transform: `translateX(-${currentBanner * 100}%)`,
            background: banners[currentBanner]?.color,
          }"
        >
          <div v-for="item in banners" :key="item.id" class="banner__item">
            <h2>{{ item.title }}</h2>
          </div>
        </div>
        <div class="banner__dots">
          <span
            v-for="(item, index) in banners"
            :key="item.id"
            class="banner__dot"
            :class="{ 'banner__dot--active': index === currentBanner }"
            @click="currentBanner = index"
          ></span>
        </div>
      </div>

      <!-- 功能入口 -->
      <div class="grid-nav">
        <div class="grid-nav__item" v-for="i in 4" :key="i">
          <div class="grid-nav__icon" :style="{ background: `hsl(${i * 60}, 70%, 55%)` }">
            {{ ['🔥', '⭐', '💎', '🎁'][i - 1] }}
          </div>
          <span class="grid-nav__text">{{ ['热销', '精品', '新品', '礼包'][i - 1] }}</span>
        </div>
      </div>

      <!-- 热门推荐 -->
      <div class="section">
        <div class="section__header">
          <h3 class="section__title">🔥 热门推荐</h3>
          <span class="section__more" @click="router.push('/category')">更多 &gt;</span>
        </div>
        <div class="goods-grid">
          <div
            v-for="item in hotList"
            :key="item.id"
            class="goods-card"
            @click="goDetail(item.id)"
          >
            <div class="goods-card__img">
              <span class="goods-card__img-placeholder">📦</span>
            </div>
            <div class="goods-card__info">
              <p class="goods-card__title text-ellipsis">{{ item.title }}</p>
              <p class="goods-card__desc text-ellipsis">{{ item.desc }}</p>
              <p class="goods-card__price">¥{{ item.price }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 搜索栏 */
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

/* 轮播图 */
.banner {
  position: relative;
  margin: 0 16px;
  overflow: hidden;
  border-radius: var(--radius-md);
}

.banner__inner {
  display: flex;
  transition: transform 0.3s ease;
}

.banner__item {
  min-width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.banner__item h2 {
  font-size: 22px;
}

.banner__dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.banner__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.banner__dot--active {
  background: #fff;
  width: 18px;
  border-radius: 3px;
}

/* 功能入口 */
.grid-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px;
  background: var(--color-bg-white);
  margin: 10px 0;
}

.grid-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.grid-nav__icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.grid-nav__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
}

/* 区块 */
.section {
  background: var(--color-bg-white);
  margin-top: 10px;
  padding: 0 16px 16px;
}

.section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 0;
}

.section__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.section__more {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
}

/* 商品网格 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.goods-card {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
}

.goods-card__img {
  width: 100%;
  height: 160px;
  background: linear-gradient(135deg, #f5f7fa, #e4e8ed);
  display: flex;
  align-items: center;
  justify-content: center;
}

.goods-card__img-placeholder {
  font-size: 48px;
  opacity: 0.5;
}

.goods-card__info {
  padding: 10px;
}

.goods-card__title {
  font-size: var(--font-size-md);
  font-weight: 500;
  color: var(--color-text-primary);
}

.goods-card__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 4px 0;
}

.goods-card__price {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-danger);
}
</style>
