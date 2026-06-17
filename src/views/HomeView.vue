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
  { id: 1, title: '品质生活', subtitle: '专业保险 · 品质商城', bg: '#272729' },
  { id: 2, title: '限时特惠', subtitle: '全场低至 5 折', bg: '#1d1d1f' },
  { id: 3, title: '新款上市', subtitle: '精选品质好物', bg: '#2a2a2c' },
])

const currentBanner = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    currentBanner.value = (currentBanner.value + 1) % banners.value.length
  }, 4000)
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

      <!-- Hero Tile — 暗色全幅 -->
      <section class="hero-tile">
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
                :style="{ background: item.bg }"
              >
                <h2 class="banner__title">{{ item.title }}</h2>
                <p class="banner__tagline">{{ item.subtitle }}</p>
                <div class="banner__actions">
                  <a class="btn-pill btn-pill--secondary" href="#">了解详情</a>
                  <a class="btn-pill" href="#">立即选购</a>
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
      </section>

      <!-- 功能入口 — 浅色 Tile -->
      <section class="nav-tile">
        <div class="grid-nav">
          <div class="grid-nav__item" v-for="(item, i) in [
            { label: '热销', icon: 'hot', stroke: '#ff6b6b' },
            { label: '精品', icon: 'star', stroke: '#ffa726' },
            { label: '新品', icon: 'diamond', stroke: '#0066cc' },
            { label: '礼包', icon: 'gift', stroke: '#66bb6a' },
          ]" :key="i">
            <div class="grid-nav__icon">
              <svg v-if="item.icon === 'hot'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
              <svg v-if="item.icon === 'star'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <svg v-if="item.icon === 'diamond'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                <path d="M6 2h12l4 8-10 12L2 10l4-8z"/><path d="M2 10h20"/>
              </svg>
              <svg v-if="item.icon === 'gift'" viewBox="0 0 24 24" fill="none" :stroke="item.stroke" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
                <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/>
                <line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
              </svg>
            </div>
            <span class="grid-nav__text">{{ item.label }}</span>
          </div>
        </div>
      </section>

      <!-- 热门推荐 — Parchment Tile -->
      <section class="goods-tile">
        <div class="goods-section">
          <div class="goods-section__header">
            <h3 class="goods-section__title">
              热门推荐
            </h3>
            <a class="text-link" @click="router.push('/category')">查看全部 &rarr;</a>
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
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div class="goods-card__info">
                <p class="goods-card__title text-ellipsis">{{ item.title }}</p>
                <p class="goods-card__price">¥{{ item.price }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* ===== Hero Tile (暗色全幅) ===== */
.hero-tile {
  background: var(--color-surface-tile-1);
  padding: 0 0 var(--spacing-md);
}

.banner-wrapper {
  width: 100%;
}

.banner {
  position: relative;
  overflow: hidden;
}

.banner__inner {
  display: flex;
  transition: transform 0.6s cubic-bezier(0.42, 0, 0.58, 1);
}

.banner__item {
  min-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xxl) var(--spacing-lg) var(--spacing-xl);
  min-height: 240px;
  text-align: center;
}

.banner__title {
  font-family: var(--font-family-display);
  font-size: var(--text-display-lg);
  font-weight: 600;
  line-height: 1.1;
  color: var(--color-body-on-dark);
}

.banner__tagline {
  font-family: var(--font-family-display);
  font-size: var(--text-lead);
  font-weight: 400;
  line-height: 1.14;
  letter-spacing: 0.196px;
  color: var(--color-body-on-dark);
  opacity: 0.8;
  margin-top: var(--spacing-xs);
}

.banner__actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.banner__actions .btn-pill--secondary {
  color: var(--color-primary-on-dark);
  border-color: var(--color-primary-on-dark);
}

.banner__dots {
  position: absolute;
  bottom: var(--spacing-md);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.banner__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.banner__dot--active {
  background: var(--color-primary-on-dark);
}

/* ===== Nav Tile (白色) ===== */
.nav-tile {
  background: var(--color-canvas);
  padding: var(--spacing-md) 0 var(--spacing-lg);
}

.grid-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 0 var(--spacing-lg);
}

.grid-nav__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xxs);
  cursor: pointer;
}

.grid-nav__icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--color-canvas-parchment);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;
}

.grid-nav__item:active .grid-nav__icon {
  transform: scale(0.92);
}

.grid-nav__text {
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-ink-muted-80);
  letter-spacing: -0.224px;
}

/* ===== Goods Tile (Parchment) ===== */
.goods-tile {
  background: var(--color-canvas-parchment);
  padding-top: var(--spacing-md);
}

.goods-section {
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.goods-section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) 0;
}

.goods-section__title {
  font-family: var(--font-family-display);
  font-size: var(--text-tagline);
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: var(--color-ink);
}

.text-link {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 400;
  color: var(--color-primary);
  cursor: pointer;
  letter-spacing: -0.374px;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-sm);
}

.goods-card {
  background: var(--color-canvas);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-hairline);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.goods-card:active {
  border-color: var(--color-primary);
}

.goods-card__img {
  width: 100%;
  height: 140px;
  background: var(--color-canvas-parchment);
  display: flex;
  align-items: center;
  justify-content: center;
}

.goods-card__img-placeholder {
  color: var(--color-ink-muted-48);
  opacity: 0.15;
}

.goods-card__info {
  padding: var(--spacing-sm);
}

.goods-card__title {
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 600;
  line-height: 1.29;
  letter-spacing: -0.224px;
  color: var(--color-ink);
  margin-bottom: var(--spacing-xxs);
}

.goods-card__price {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.24;
  letter-spacing: -0.374px;
  color: var(--color-ink);
}
</style>
