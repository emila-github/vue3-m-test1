<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const count = ref(1)
const selected = ref(false)
const activeSpec = ref(0)

function goBack() {
  router.back()
}
</script>

<template>
  <div class="page-container">
    <!-- Sub Nav — frosted -->
    <div class="sub-nav">
      <span class="sub-nav__back" @click="goBack">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </span>
      <h2 class="sub-nav__title">商品详情</h2>
      <span class="sub-nav__share">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </span>
    </div>

    <div class="page-content--full">
      <!-- 商品图片 — Parchment 底 -->
      <section class="img-tile">
        <div class="detail-img">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="80" height="80">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
        <div class="detail-img__dots">
          <span class="dot dot--active"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </section>

      <!-- 商品信息 — 白色 -->
      <section class="info-tile">
        <div class="detail-info">
          <div class="detail-info__header">
            <h1 class="detail-info__title">商品名称 - 商品 ID: {{ route.params.id }}</h1>
            <span class="detail-info__badge">自营</span>
          </div>
          <div class="detail-info__price-row">
            <span class="detail-info__price">¥99.90</span>
            <span class="detail-info__original">¥199.00</span>
          </div>
          <p class="detail-info__desc">
            品质保障，专业优选好物。这是一段商品描述文案，用于展示商品的基本信息和卖点。
          </p>
        </div>
      </section>

      <!-- 规格选择 — 白色 -->
      <section class="spec-tile">
        <h3 class="spec-tile__title">选择规格</h3>
        <div class="spec-tile__chips">
          <span
            v-for="(spec, i) in ['标准版', '升级版', '豪华版']"
            :key="i"
            class="spec-chip"
            :class="{ 'spec-chip--active': activeSpec === i }"
            @click="activeSpec = i"
          >{{ spec }}</span>
        </div>
      </section>

      <!-- 数量 — 白色 -->
      <section class="qty-tile">
        <span class="qty-tile__label">数量</span>
        <div class="qty-tile__counter">
          <span class="counter__btn" @click="count > 1 && count--">−</span>
          <span class="counter__num">{{ count }}</span>
          <span class="counter__btn counter__btn--plus" @click="count++">+</span>
        </div>
      </section>

      <!-- Floating Sticky Bar -->
      <div class="sticky-bar safe-area-bottom">
        <div class="sticky-bar__icons">
          <div class="sticky-bar__icon-item" @click="router.push('/cart')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span class="sticky-bar__icon-label">购物车</span>
          </div>
          <div
            class="sticky-bar__icon-item"
            :class="{ 'sticky-bar__icon-item--active': selected }"
            @click="selected = !selected"
          >
            <svg viewBox="0 0 24 24" :fill="selected ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" width="22" height="22">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="sticky-bar__icon-label">收藏</span>
          </div>
        </div>
        <button class="btn-pill btn-pill--secondary" @click="router.push('/cart')">加入购物车</button>
        <button class="btn-pill">立即购买</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== Sub Nav ===== */
.sub-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  background: var(--color-canvas-parchment);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  position: relative;
  padding: 0 var(--spacing-lg);
}

.sub-nav__back {
  position: absolute;
  left: var(--spacing-sm);
  cursor: pointer;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  width: 44px;
  height: 44px;
  justify-content: center;
}

.sub-nav__title {
  font-family: var(--font-family-display);
  font-size: var(--text-tagline);
  font-weight: 600;
  line-height: 1.19;
  letter-spacing: 0.231px;
  color: var(--color-ink);
}

.sub-nav__share {
  position: absolute;
  right: var(--spacing-lg);
  cursor: pointer;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  width: 44px;
  height: 44px;
  justify-content: center;
}

/* ===== 图片 Tile ===== */
.img-tile {
  background: var(--color-canvas-parchment);
  width: 100%;
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.detail-img {
  color: var(--color-ink-muted-48);
  opacity: 0.2;
}

.detail-img__dots {
  position: absolute;
  bottom: var(--spacing-lg);
  display: flex;
  gap: 8px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-ink-muted-48);
  opacity: 0.25;
}

.dot--active {
  opacity: 1;
  background: var(--color-ink-muted-80);
}

/* ===== 信息 Tile ===== */
.info-tile {
  background: var(--color-canvas);
  padding: 0;
}

.detail-info {
  padding: var(--spacing-lg);
}

.detail-info__header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
}

.detail-info__title {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 600;
  line-height: 1.24;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  flex: 1;
}

.detail-info__badge {
  padding: 2px var(--spacing-xs);
  color: var(--color-primary);
  font-family: var(--font-family-body);
  font-size: var(--text-fine-print);
  font-weight: 600;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-xs);
  flex-shrink: 0;
}

.detail-info__price-row {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.detail-info__price {
  font-family: var(--font-family-display);
  font-size: var(--text-display-md);
  font-weight: 600;
  line-height: 1.47;
  letter-spacing: -0.374px;
  color: var(--color-ink);
}

.detail-info__original {
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-48);
  text-decoration: line-through;
}

.detail-info__desc {
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  line-height: 1.43;
  letter-spacing: -0.224px;
  color: var(--color-ink-muted-80);
  margin-top: var(--spacing-md);
}

/* ===== 规格 Tile ===== */
.spec-tile {
  background: var(--color-canvas);
  padding: 0 var(--spacing-lg) var(--spacing-lg);
}

.spec-tile__title {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 600;
  letter-spacing: -0.374px;
  color: var(--color-ink);
  margin-bottom: var(--spacing-sm);
}

.spec-tile__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.spec-chip {
  padding: var(--spacing-sm) 16px;
  border-radius: var(--radius-pill);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  letter-spacing: -0.224px;
  color: var(--color-ink);
  cursor: pointer;
  transition: all 0.15s ease;
}

.spec-chip--active {
  border-color: var(--color-primary-focus);
  outline: 1px solid var(--color-primary-focus);
  outline-offset: -2px;
}

/* ===== 数量 Tile ===== */
.qty-tile {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  background: var(--color-canvas);
}

.qty-tile__label {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 600;
  letter-spacing: -0.374px;
  color: var(--color-ink);
}

.qty-tile__counter {
  display: flex;
  align-items: center;
}

.counter__btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline);
  font-size: 18px;
  cursor: pointer;
  user-select: none;
  background: var(--color-canvas);
  color: var(--color-ink-muted-80);
  border-radius: var(--radius-xs);
  transition: background 0.15s ease;
}

.counter__btn:active {
  background: var(--color-canvas-parchment);
}

.counter__btn--plus {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.counter__num {
  width: 48px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--color-hairline);
  border-bottom: 1px solid var(--color-hairline);
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-ink);
}

/* ===== Floating Sticky Bar ===== */
.sticky-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: var(--color-canvas-parchment);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-sm);
  gap: var(--spacing-xs);
  z-index: 10;
}

.sticky-bar__icons {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.sticky-bar__icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  cursor: pointer;
  color: var(--color-ink-muted-48);
  transition: color 0.15s ease;
  padding: 0 var(--spacing-xs);
  min-width: 48px;
}

.sticky-bar__icon-item--active {
  color: var(--color-primary);
}

.sticky-bar__icon-label {
  font-family: var(--font-family-body);
  font-size: var(--text-nav-link);
  font-weight: 400;
  letter-spacing: -0.12px;
}

/* sticky bar 内按钮收窄 */
.sticky-bar .btn-pill {
  flex: 1;
  padding: 8px 12px;
  font-size: var(--text-caption);
  letter-spacing: -0.224px;
  min-height: 36px;
}
</style>
