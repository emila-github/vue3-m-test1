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
    <!-- 顶部导航 -->
    <div class="nav-bar">
      <span class="nav-bar__back" @click="goBack">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          width="20"
          height="20"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </span>
      <span class="nav-bar__eyebrow">DETAIL</span>
      <h2 class="nav-bar__title">商品详情</h2>
      <span class="nav-bar__share">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          width="18"
          height="18"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      </span>
    </div>

    <!-- 品牌渐变装饰条 -->
    <div class="brand-stripe"></div>

    <div class="page-content--full">
      <!-- 商品图片 -->
      <div class="detail-img">
        <div class="detail-img__placeholder">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            width="80"
            height="80"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>
        <div class="detail-img__dots">
          <span class="dot dot--active"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>

      <!-- 商品信息 - research-card 风格 -->
      <div class="detail-info">
        <div class="detail-info__header">
          <span class="detail-info__badge badge-subtle-on-dark">品质自营</span>
          <h1 class="detail-info__title">商品名称 - 商品 ID: {{ route.params.id }}</h1>
        </div>
        <div class="detail-info__price-row">
          <span class="detail-info__price">¥99.90</span>
          <span class="detail-info__original">¥199.00</span>
          <span class="detail-info__discount">5折</span>
        </div>
        <p class="detail-info__desc">
          品质保障，专业优选好物。这是一段商品描述文案，用于展示商品的基本信息和卖点。
        </p>
      </div>

      <!-- 规格选择 -->
      <div class="detail-spec">
        <span class="detail-spec__eyebrow">SPECIFICATION</span>
        <h3 class="detail-spec__title">规格选择</h3>
        <div class="detail-spec__tags">
          <span
            v-for="(spec, i) in ['标准版', '升级版', '豪华版']"
            :key="i"
            class="detail-spec__tag"
            :class="{ 'detail-spec__tag--active': activeSpec === i }"
            @click="activeSpec = i"
            >{{ spec }}</span
          >
        </div>
      </div>

      <!-- 数量选择 -->
      <div class="detail-quantity">
        <span class="detail-quantity__label">数量</span>
        <div class="detail-quantity__counter">
          <span class="counter__btn" @click="count > 1 && count--">−</span>
          <span class="counter__num">{{ count }}</span>
          <span class="counter__btn counter__btn--plus" @click="count++">+</span>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="detail-action safe-area-bottom">
        <div class="detail-action__icons">
          <div class="detail-action__icon-item" @click="router.push('/cart')">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="22"
              height="22"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <span class="detail-action__icon-label">购物车</span>
          </div>
          <div
            class="detail-action__icon-item"
            :class="{ 'detail-action__icon-item--active': selected }"
            @click="selected = !selected"
          >
            <svg
              viewBox="0 0 24 24"
              :fill="selected ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="2"
              width="22"
              height="22"
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              />
            </svg>
            <span class="detail-action__icon-label">收藏</span>
          </div>
        </div>
        <button class="detail-action__cart">加入购物车</button>
        <button class="detail-action__buy">立即购买</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  background: var(--color-bg-white);
  padding: 0 16px;
  flex-shrink: 0;
  position: relative;
  border-bottom: 1px solid var(--color-border);
  flex-direction: column;
  gap: 2px;
}

.nav-bar__back {
  position: absolute;
  left: 12px;
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  top: 50%;
  transform: translateY(-50%);
}

.nav-bar__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.nav-bar__title {
  font: var(--typo-display-md);
  color: var(--color-text-primary);
}

.nav-bar__share {
  position: absolute;
  right: 16px;
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  top: 50%;
  transform: translateY(-50%);
}

/* 品牌渐变装饰条 */
.brand-stripe {
  height: 3px;
  background: var(--gradient-brand);
}

/* 商品图片 */
.detail-img {
  width: 100%;
  height: 300px;
  background: var(--color-bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.detail-img__placeholder {
  color: var(--color-text-placeholder);
  opacity: 0.25;
}

.detail-img__dots {
  position: absolute;
  bottom: 16px;
  display: flex;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background: var(--color-text-placeholder);
  opacity: 0.3;
}

.dot--active {
  opacity: 1;
  background: var(--color-primary);
  width: 18px;
}

/* 商品信息 */
.detail-info {
  background: var(--color-bg-white);
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.detail-info__header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-info__title {
  font: var(--typo-display-md);
  color: var(--color-text-primary);
  line-height: 1.4;
}

.badge-subtle-on-dark {
  display: inline-flex;
  padding: 2px 8px;
  background: var(--color-canvas-dark);
  color: var(--color-on-dark);
  font: var(--typo-body-md);
  border-radius: var(--radius-sm);
  align-self: flex-start;
}

.detail-info__price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 12px;
}

.detail-info__price {
  font: var(--typo-display-xxl);
  color: var(--color-primary);
  letter-spacing: -0.42px;
}

.detail-info__original {
  font: var(--typo-body-md);
  color: var(--color-text-placeholder);
  text-decoration: line-through;
}

.detail-info__discount {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.detail-info__desc {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
  margin-top: 12px;
  line-height: 1.6;
}

/* 规格 */
.detail-spec {
  background: var(--color-bg-white);
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.detail-spec__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  display: block;
  margin-bottom: 4px;
}

.detail-spec__title {
  font: var(--typo-display-md);
  color: var(--color-text-primary);
  margin-bottom: 10px;
}

.detail-spec__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-spec__tag {
  padding: 8px 18px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-input);
  font: var(--typo-body-md);
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.15s ease;
}

.detail-spec__tag--active {
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 500;
}

/* 数量 */
.detail-quantity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-bg-white);
}

.detail-quantity__label {
  font: var(--typo-body-md);
  color: var(--color-text-primary);
  font-weight: 500;
}

.detail-quantity__counter {
  display: flex;
  align-items: center;
}

.counter__btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  font-size: 18px;
  cursor: pointer;
  user-select: none;
  background: var(--color-bg-white);
  color: var(--color-text-regular);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  transition: background 0.15s ease;
}

.counter__btn:active {
  background: var(--color-bg-input);
}

.counter__btn--plus {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}

.counter__num {
  width: 44px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font: var(--typo-body-md);
  color: var(--color-text-primary);
  font-weight: 500;
}

/* 底部操作栏 */
.detail-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 52px;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  z-index: 10;
}

.detail-action__icons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.detail-action__icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.15s ease;
  padding: 0 6px;
}

.detail-action__icon-item--active {
  color: var(--color-primary);
}

.detail-action__icon-label {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
}

.detail-action__cart {
  flex: 1;
  height: 38px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-sm);
  font: var(--typo-mono-button);
  letter-spacing: 0.08px;
  text-transform: uppercase;
  opacity: 0.8;
}

.detail-action__cart:active {
  opacity: 1;
}

.detail-action__buy {
  flex: 1;
  height: 38px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-sm);
  font: var(--typo-mono-button);
  letter-spacing: 0.08px;
  text-transform: uppercase;
}

.detail-action__buy:active {
  opacity: 0.9;
}
</style>
