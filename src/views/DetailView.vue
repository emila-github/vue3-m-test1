<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const count = ref(1)
const selected = ref(false)

function goBack() {
  router.back()
}
</script>

<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <div class="nav-bar hairline-border">
      <span class="nav-bar__back" @click="goBack">← 返回</span>
      <h2 class="nav-bar__title">商品详情</h2>
      <span class="nav-bar__share">🔗</span>
    </div>

    <div class="page-content--full">
      <!-- 商品图片 -->
      <div class="detail-img">
        <span class="detail-img__placeholder">📦</span>
      </div>

      <!-- 商品信息 -->
      <div class="detail-info">
        <h1 class="detail-info__title">商品名称 - 商品 ID: {{ route.params.id }}</h1>
        <div class="detail-info__price-row">
          <span class="detail-info__price">¥99.90</span>
          <span class="detail-info__original">¥199.00</span>
        </div>
        <p class="detail-info__desc">
          这是一段商品描述文案，用于展示商品的基本信息和卖点。
        </p>
      </div>

      <!-- 规格选择 -->
      <div class="detail-spec">
        <h3 class="detail-spec__title">规格选择</h3>
        <div class="detail-spec__tags">
          <span class="detail-spec__tag detail-spec__tag--active">标准版</span>
          <span class="detail-spec__tag">升级版</span>
          <span class="detail-spec__tag">豪华版</span>
        </div>
      </div>

      <!-- 底部操作栏 -->
      <div class="detail-action safe-area-bottom">
        <div class="detail-action__icons">
          <span class="detail-action__icon" @click="router.push('/cart')">🛒</span>
          <span
            class="detail-action__icon"
            :class="{ 'detail-action__icon--active': selected }"
            @click="selected = !selected"
          >
            {{ selected ? '❤️' : '🤍' }}
          </span>
        </div>
        <button class="detail-action__cart" @click="router.push('/cart')">
          加入购物车
        </button>
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
}

.nav-bar__back {
  position: absolute;
  left: 16px;
  font-size: var(--font-size-md);
  color: var(--color-primary);
  cursor: pointer;
}

.nav-bar__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.nav-bar__share {
  position: absolute;
  right: 16px;
  font-size: 18px;
  cursor: pointer;
}

.detail-img {
  width: 100%;
  height: 300px;
  background: linear-gradient(135deg, #f5f7fa, #e4e8ed);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-img__placeholder {
  font-size: 80px;
  opacity: 0.3;
}

.detail-info {
  background: var(--color-bg-white);
  padding: 16px;
  margin-top: 10px;
}

.detail-info__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.detail-info__price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.detail-info__price {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-danger);
}

.detail-info__original {
  font-size: var(--font-size-sm);
  color: var(--color-text-placeholder);
  text-decoration: line-through;
}

.detail-info__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: 10px;
  line-height: 1.6;
}

.detail-spec {
  background: var(--color-bg-white);
  padding: 16px;
  margin-top: 10px;
}

.detail-spec__title {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: 10px;
}

.detail-spec__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-spec__tag {
  padding: 6px 14px;
  border-radius: 4px;
  background: var(--color-bg);
  font-size: var(--font-size-sm);
  color: var(--color-text-regular);
  cursor: pointer;
}

.detail-spec__tag--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.detail-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
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
  gap: 16px;
  flex-shrink: 0;
}

.detail-action__icon {
  font-size: 22px;
  cursor: pointer;
}

.detail-action__cart {
  flex: 1;
  height: 36px;
  background: linear-gradient(135deg, #ff976a, #ff6a3d);
  color: #fff;
  border-radius: 18px;
  font-size: var(--font-size-md);
  font-weight: 500;
}

.detail-action__buy {
  flex: 1;
  height: 36px;
  background: linear-gradient(135deg, #ee0a24, #d9001b);
  color: #fff;
  border-radius: 18px;
  font-size: var(--font-size-md);
  font-weight: 500;
}
</style>
