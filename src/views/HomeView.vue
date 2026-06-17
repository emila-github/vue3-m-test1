<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Banner {
  id: number
  title: string
  subtitle: string
  bg: string
}

const banners = ref<Banner[]>([
  { id: 1, title: '品质保障', subtitle: '专业服务 · 品质商城', bg: '#010120' },
  { id: 2, title: '限时特惠', subtitle: '全场低至 5 折', bg: '#000000' },
  { id: 3, title: '爆款推荐', subtitle: '精选品质好物', bg: '#313641' },
])

const currentBanner = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length
  }, 3000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

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
          <svg
            class="search-bar__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="16"
            height="16"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span class="search-bar__placeholder">搜索你想要的商品</span>
        </div>
      </div>

      <!-- 品牌渐变装饰条 -->
      <div class="brand-stripe"></div>

      <!-- 轮播图 - Dark hero 风格 -->
      <div class="banner-wrapper">
        <div class="banner">
          <div class="banner__inner" :style="{ transform: `translateX(-${currentBanner * 100}%)` }">
            <div
              v-for="item in banners"
              :key="item.id"
              class="banner__item"
              :style="{ background: item.bg }"
            >
              <div class="banner__content">
                <span class="banner__eyebrow">ON-DEMAND</span>
                <h2 class="banner__title">{{ item.title }}</h2>
                <p class="banner__subtitle">{{ item.subtitle }}</p>
              </div>
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
      </div>

      <!-- 功能入口 - Stats-card-tinted 风格 -->
      <div class="grid-nav">
        <div
          class="grid-nav__item"
          v-for="(item, i) in [
            { label: '热销', icon: 'hot', color: '#010120', textColor: '#FFFFFF' },
            { label: '精品', icon: 'star', color: '#010120', textColor: '#FFFFFF' },
            { label: '新品', icon: 'diamond', color: '#010120', textColor: '#FFFFFF' },
            { label: '礼包', icon: 'gift', color: '#010120', textColor: '#FFFFFF' },
          ]"
          :key="i"
        >
          <div class="grid-nav__icon" :style="{ background: item.color, color: item.textColor }">
            <svg
              v-if="item.icon === 'hot'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="22"
              height="22"
            >
              <path
                d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
              />
            </svg>
            <svg
              v-if="item.icon === 'star'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="22"
              height="22"
            >
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
            <svg
              v-if="item.icon === 'diamond'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="22"
              height="22"
            >
              <path d="M6 2h12l4 8-10 12L2 10l4-8z" />
              <path d="M2 10h20" />
            </svg>
            <svg
              v-if="item.icon === 'gift'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              width="22"
              height="22"
            >
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <span class="grid-nav__text">{{ item.label }}</span>
        </div>
      </div>

      <!-- 热门推荐 - 用 section 标题 -->
      <div class="section">
        <div class="section__header">
          <span class="section__eyebrow">FEATURED</span>
          <h3 class="section__title">热门推荐</h3>
          <span class="section__more" @click="router.push('/category')">更多</span>
        </div>
        <div class="goods-grid">
          <div v-for="item in hotList" :key="item.id" class="goods-card" @click="goDetail(item.id)">
            <div class="goods-card__img">
              <svg
                class="goods-card__img-placeholder"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                width="40"
                height="40"
              >
                <path
                  d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span class="badge-subtle-on-dark">热卖</span>
            </div>
            <div class="goods-card__info">
              <p class="goods-card__title text-ellipsis">{{ item.title }}</p>
              <p class="goods-card__desc text-ellipsis">{{ item.desc }}</p>
              <div class="goods-card__bottom">
                <p class="goods-card__price">¥{{ item.price }}</p>
                <button class="btn-primary-icon">+</button>
              </div>
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
  border-bottom: 1px solid var(--color-border);
}

.search-bar__inner {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--color-bg-input);
  border-radius: var(--radius-sm);
  padding: 0 14px;
}

.search-bar__icon {
  margin-right: 6px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-bar__placeholder {
  font: var(--typo-body-md);
  color: var(--color-text-placeholder);
}

/* 品牌渐变装饰条 */
.brand-stripe {
  height: 3px;
  background: var(--gradient-brand);
}

/* 轮播图 - Dark hero 风格 */
.banner-wrapper {
  padding: 0;
  background: var(--color-canvas-dark);
}

.banner {
  position: relative;
  overflow: hidden;
}

.banner__inner {
  display: flex;
  transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1.2);
}

.banner__item {
  min-width: 100%;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner__content {
  text-align: center;
}

.banner__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-accent-mint);
  display: block;
  margin-bottom: 8px;
}

.banner__title {
  font: var(--typo-display-xl);
  color: var(--color-on-dark);
  letter-spacing: -0.8px;
}

.banner__subtitle {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
  margin-top: 6px;
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
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.banner__dot--active {
  background: var(--color-on-dark);
  width: 18px;
}

/* 功能入口 - Dark surface 风格 */
.grid-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px;
  background: var(--color-bg-white);
  gap: 8px;
}

.grid-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.grid-nav__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.grid-nav__item:active .grid-nav__icon {
  transform: scale(0.92);
}

.grid-nav__text {
  font: var(--typo-body-md);
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 区块 */
.section {
  background: var(--color-bg-white);
  padding: 0 16px 16px;
}

.section__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 0;
  gap: 4px;
}

.section__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.section__title {
  font: var(--typo-display-lg);
  color: var(--color-text-primary);
}

.section__more {
  font: var(--typo-body-md);
  color: var(--color-primary);
  font-weight: 500;
  cursor: pointer;
  margin-top: 4px;
}

/* 商品网格 */
.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.goods-card {
  background: var(--color-bg-white);
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--color-border);
  transition: border-color 0.2s ease;
}

.goods-card:active {
  border-color: var(--color-text-secondary);
}

.goods-card__img {
  width: 100%;
  height: 140px;
  background: var(--color-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.goods-card__img-placeholder {
  opacity: 0.15;
  color: var(--color-text-placeholder);
}

.badge-subtle-on-dark {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  background: var(--color-canvas-dark);
  color: var(--color-on-dark);
  font: var(--typo-body-md);
  border-radius: var(--radius-sm);
}

.goods-card__info {
  padding: 10px 12px;
}

.goods-card__title {
  font: var(--typo-body-md);
  font-weight: 500;
  color: var(--color-text-primary);
}

.goods-card__desc {
  font: var(--typo-caption, 12px/16px var(--font-family-display));
  color: var(--color-text-secondary);
  margin: 4px 0 10px;
}

.goods-card__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-card__price {
  font: var(--typo-display-md);
  color: var(--color-primary);
  font-weight: 500;
}

.btn-primary-icon {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font: var(--typo-mono-button);
  font-size: 16px;
  line-height: 1;
}
</style>
