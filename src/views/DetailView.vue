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

      <!-- 商品信息 -->
      <div class="detail-info">
        <div class="detail-info__header">
          <h1 class="detail-info__title">商品名称 - 商品 ID: {{ route.params.id }}</h1>
          <div class="detail-info__badge">PICC自营</div>
        </div>
        <div class="detail-info__price-row">
          <span class="detail-info__symbol">¥</span>
          <span class="detail-info__price">99.90</span>
          <span class="detail-info__original">¥199.00</span>
          <span class="detail-info__discount">5折</span>
        </div>
        <p class="detail-info__desc">
          PICC品质保障，专业优选好物。这是一段商品描述文案，用于展示商品的基本信息和卖点。
        </p>
      </div>

      <!-- 规格选择 -->
      <div class="detail-spec">
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
        <button class="detail-action__cart" @click="router.push('/cart')">加入购物车</button>
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
  height: 48px;
  background: var(--color-bg-white);
  padding: 0 var(--spacing-xl);
  flex-shrink: 0;
  position: relative;
}

.nav-bar__back {
  position: absolute;
  left: var(--spacing-lg);
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
}

.nav-bar__title {
  font-size: var(--font-size-xl);
  font-weight: 900;
  color: var(--color-text-primary);
}

.nav-bar__share {
  position: absolute;
  right: var(--spacing-xl);
  cursor: pointer;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
}

/* 商品图片 */
.detail-img {
  width: 100%;
  height: 320px;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.detail-img__placeholder {
  color: var(--color-text-secondary);
  opacity: 0.2;
}

.detail-img__dots {
  position: absolute;
  bottom: var(--spacing-lg);
  display: flex;
  gap: var(--spacing-sm);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  opacity: 0.3;
}

.dot--active {
  opacity: 1;
  background: var(--color-primary);
  width: 24px;
  border-radius: 4px;
}

/* 商品信息 */
.detail-info {
  background: var(--color-bg-white);
  padding: var(--spacing-xl);
  margin-top: var(--spacing-sm);
}

.detail-info__header {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.detail-info__title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1.5;
  flex: 1;
}

.detail-info__badge {
  padding: var(--spacing-xs) var(--spacing-md);
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  font-weight: 700;
}

.detail-info__price-row {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-lg);
}

.detail-info__symbol {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: 700;
}

.detail-info__price {
  font-size: 32px;
  font-weight: 900;
  color: var(--color-text-primary);
  letter-spacing: -1px;
}

.detail-info__original {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  text-decoration: line-through;
}

.detail-info__discount {
  font-size: var(--font-size-xs);
  color: var(--color-on-primary);
  background: var(--color-primary);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.detail-info__desc {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-lg);
  line-height: 1.6;
}

/* 规格 */
.detail-spec {
  background: var(--color-bg-white);
  padding: var(--spacing-xl);
  margin-top: var(--spacing-sm);
}

.detail-spec__title {
  font-size: var(--font-size-md);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.detail-spec__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.detail-spec__tag {
  padding: var(--spacing-sm) var(--spacing-xl);
  border-radius: var(--radius-lg);
  background: var(--color-bg);
  font-size: var(--font-size-md);
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.15s ease;
}

.detail-spec__tag--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-weight: 700;
}

/* 数量 */
.detail-quantity {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  background: var(--color-bg-white);
  margin-top: var(--spacing-sm);
}

.detail-quantity__label {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: 700;
}

.detail-quantity__counter {
  display: flex;
  align-items: center;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
}

.counter__btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  user-select: none;
  color: var(--color-text-regular);
  transition: color 0.15s ease;
}

.counter__btn:active {
  color: var(--color-primary);
}

.counter__btn--plus {
  color: var(--color-primary);
  font-weight: 700;
}

.counter__num {
  width: 48px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  font-weight: 700;
  border-left: 1px solid var(--color-border-light);
  border-right: 1px solid var(--color-border-light);
}

/* 底部操作栏 */
.detail-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--color-bg-white);
  display: flex;
  align-items: center;
  padding: 0 var(--spacing-xl);
  gap: var(--spacing-md);
  z-index: 10;
  box-shadow: 0 -2px 8px rgba(14, 15, 12, 0.05);
}

.detail-action__icons {
  display: flex;
  gap: var(--spacing-md);
  flex-shrink: 0;
}

.detail-action__icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.15s ease;
  padding: 0 var(--spacing-sm);
}

.detail-action__icon-item--active {
  color: var(--color-primary);
}

.detail-action__icon-label {
  font-size: var(--font-size-xs);
}

.detail-action__cart {
  flex: 1;
  height: 40px;
  background: var(--color-gold);
  color: var(--color-text-primary);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.detail-action__cart:active {
  opacity: 0.9;
}

.detail-action__buy {
  flex: 1;
  height: 40px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-xl);
  font-size: var(--font-size-md);
  font-weight: 700;
}

.detail-action__buy:active {
  opacity: 0.9;
}
</style>
