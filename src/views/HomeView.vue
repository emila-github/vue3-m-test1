<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface Banner {
  id: number
  title: string
  subtitle: string
  gradient: string
}

const banners = ref<Banner[]>([
  { id: 1, title: '新品首发', subtitle: '2024 春季新品上市', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
  { id: 2, title: '限时特惠', subtitle: '全场低至 5 折', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)' },
  { id: 3, title: '爆款推荐', subtitle: '精选品质好物', gradient: 'linear-gradient(135deg, #1a1a2e 0%, #1a1a3e 100%)' },
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
          <svg class="search-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <span class="search-bar__placeholder">搜索你想要的商品</span>
        </div>
      </div>

      <!-- 轮播图 -->
      <div class="banner-wrapper">
        <div class="banner">
          <div
            class="banner__inner"
            :style="{ transform: `translateX(-${currentBanner * 100}%)` }"
          >
            <div
              v-for="item in banners"
              :key="item.id"
              class="banner__item"
              :style="{ background: item.gradient }"
            >
              <div class="banner__content">
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

      <!-- 功能入口 -->
      <div class="grid-nav">
        <div class="grid-nav__item" v-for="(item, i) in [
          { label: '热销', icon: 'hot', color: 'rgba(255,107,107,0.15)', stroke: '#ff6b6b' },
          { label: '精品', icon: 'star', color: 'rgba(255,212,59,0.15)', stroke: '#ffd43b' },
          { label: '新品', icon: 'diamond', color: 'rgba(77,171,247,0.15)', stroke: '#4dabf7' },
          { label: '礼包', icon: 'gift', color: 'rgba(81,207,102,0.15)', stroke: '#51cf66' },
        ]" :key="i">
          <div class="grid-nav__icon" :style="{ background: item.color }">
            <!-- 热销 -->
            <svg v-if="item.icon === 'hot'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            <!-- 精品 -->
            <svg v-if="item.icon === 'star'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <!-- 新品 -->
            <svg v-if="item.icon === 'diamond'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
              <path d="M6 2h12l4 8-10 12L2 10l4-8z"/>
              <path d="M2 10h20"/>
            </svg>
            <!-- 礼包 -->
            <svg v-if="item.icon === 'gift'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="24" height="24">
              <polyline points="20 12 20 22 4 22 4 12"/>
              <rect x="2" y="7" width="20" height="5"/>
              <line x1="12" y1="22" x2="12" y2="7"/>
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
            </svg>
          </div>
          <span class="grid-nav__text">{{ item.label }}</span>
        </div>
      </div>

      <!-- 热门推荐 -->
      <div class="section">
        <div class="section__header">
          <h3 class="section__title">
            <svg class="section__title-icon" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
            热门推荐
          </h3>
          <span class="section__more" @click="router.push('/category')">更多 →</span>
        </div>
        <div class="goods-grid">
          <div
            v-for="item in hotList"
            :key="item.id"
            class="goods-card"
            @click="goDetail(item.id)"
          >
            <div class="goods-card__img">
              <svg class="goods-card__img-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="48" height="48">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              <div class="goods-card__tag">热卖</div>
            </div>
            <div class="goods-card__info">
              <p class="goods-card__title text-ellipsis">{{ item.title }}</p>
              <p class="goods-card__desc text-ellipsis">{{ item.desc }}</p>
              <div class="goods-card__bottom">
                <p class="goods-card__price">¥{{ item.price }}</p>
                <span class="goods-card__cart-btn">+</span>
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
  background: var(--color-bg-card);
}

.search-bar__inner {
  display: flex;
  align-items: center;
  height: 36px;
  background: var(--color-bg-input);
  border-radius: 18px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
}

.search-bar__icon {
  margin-right: 6px;
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.search-bar__placeholder {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
}

/* 轮播图 */
.banner-wrapper {
  padding: 12px 16px;
  background: var(--color-bg-card);
}

.banner {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
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
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.banner__content {
  text-align: center;
}

.banner__title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 1px;
}

.banner__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 6px;
}

.banner__dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.banner__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.banner__dot--active {
  background: var(--color-primary);
  width: 20px;
  border-radius: 3px;
}

/* 功能入口 */
.grid-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px;
  background: var(--color-bg-card);
  margin-top: 1px;
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
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.grid-nav__item:active .grid-nav__icon {
  transform: scale(0.9);
}

.grid-nav__text {
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
}

/* 区块 */
.section {
  background: var(--color-bg-card);
  margin-top: 8px;
  padding: 0 16px 16px;
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
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
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.section__title-icon {
  flex-shrink: 0;
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
  border: 1px solid var(--color-border-light);
  transition: transform 0.2s ease;
}

.goods-card:active {
  transform: scale(0.97);
}

.goods-card__img {
  width: 100%;
  height: 160px;
  background: var(--color-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.goods-card__img-placeholder {
  opacity: 0.15;
}

.goods-card__tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  background: var(--color-danger);
  color: #fff;
  font-size: var(--font-size-xs);
  border-radius: 4px;
  font-weight: 500;
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
  margin: 4px 0 8px;
}

.goods-card__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.goods-card__price {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-danger);
}

.goods-card__cart-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
}
</style>
