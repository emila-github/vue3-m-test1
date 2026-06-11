<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface CartItem {
  id: number
  title: string
  price: number
  count: number
  selected: boolean
}

const cartList = ref<CartItem[]>([
  { id: 1, title: '商品名称示例 1 - 高品质精选好物', price: 99.9, count: 1, selected: true },
  { id: 2, title: '商品名称示例 2 - 限时优惠', price: 199.0, count: 2, selected: true },
  { id: 3, title: '商品名称示例 3', price: 59.5, count: 1, selected: false },
])

const editMode = ref(false)

const allSelected = computed({
  get: () => cartList.value.length > 0 && cartList.value.every((item) => item.selected),
  set: (val: boolean) => {
    cartList.value.forEach((item) => {
      item.selected = val
    })
  },
})

const totalPrice = computed(() => {
  return cartList.value
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.price * item.count, 0)
    .toFixed(1)
})

const selectedCount = computed(() => {
  return cartList.value
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.count, 0)
})

function toggleSelect(item: CartItem) {
  item.selected = !item.selected
}

function decrease(item: CartItem) {
  if (item.count > 1) {
    item.count--
  }
}

function increase(item: CartItem) {
  item.count++
}

function removeItem(id: number) {
  cartList.value = cartList.value.filter((item) => item.id !== id)
}
</script>

<template>
  <div class="page-container">
    <!-- 顶部导航 -->
    <div class="nav-bar hairline-border">
      <h2 class="nav-bar__title">购物车</h2>
      <span class="nav-bar__action" @click="editMode = !editMode">
        {{ editMode ? '完成' : '编辑' }}
      </span>
    </div>

    <div class="page-content">
      <!-- 空状态 -->
      <div v-if="cartList.length === 0" class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p class="empty-state__text">购物车还是空的</p>
        <button class="empty-state__btn" @click="router.push('/')">去逛逛</button>
      </div>

      <!-- 购物车列表 -->
      <template v-else>
        <div class="cart-list">
          <div
            v-for="item in cartList"
            :key="item.id"
            class="cart-item hairline-border"
          >
            <div
              class="cart-item__check"
              :class="{ 'cart-item__check--active': item.selected }"
              @click="toggleSelect(item)"
            >
              <svg v-if="item.selected" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="cart-item__img">
              <svg class="cart-item__img-placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="36" height="36">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div class="cart-item__info">
              <p class="cart-item__title text-ellipsis-2">{{ item.title }}</p>
              <div class="cart-item__bottom">
                <span class="cart-item__price">¥{{ item.price }}</span>
                <div class="cart-item__counter">
                  <span class="counter__btn" @click="decrease(item)">−</span>
                  <span class="counter__num">{{ item.count }}</span>
                  <span class="counter__btn counter__btn--plus" @click="increase(item)">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部结算栏 -->
        <div class="settle-bar safe-area-bottom">
          <div class="settle-bar__left" @click="allSelected = !allSelected">
            <div class="settle-bar__check" :class="{ 'settle-bar__check--active': allSelected }">
              <svg v-if="allSelected" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <span class="settle-bar__all">全选</span>
          </div>
          <div class="settle-bar__right">
            <div class="settle-bar__total" v-if="!editMode">
              <span>合计：</span>
              <span class="settle-bar__price">¥{{ totalPrice }}</span>
            </div>
            <button v-if="!editMode" class="settle-bar__btn">
              结算({{ selectedCount }})
            </button>
            <button v-else class="settle-bar__btn settle-bar__btn--danger" @click="removeItem(1)">
              删除
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  background: var(--color-bg-card);
  padding: 0 16px;
  flex-shrink: 0;
  position: relative;
}

.nav-bar__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.nav-bar__action {
  position: absolute;
  right: 16px;
  font-size: var(--font-size-md);
  color: var(--color-primary);
  cursor: pointer;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
}

.empty-state__icon {
  color: var(--color-text-placeholder);
  opacity: 0.4;
}

.empty-state__text {
  color: var(--color-text-secondary);
  margin: 16px 0 24px;
  font-size: var(--font-size-md);
}

.empty-state__btn {
  padding: 10px 40px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 20px;
  font-size: var(--font-size-md);
  font-weight: 500;
}

.cart-list {
  background: var(--color-bg-card);
  margin-top: 8px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
}

.cart-item__check {
  cursor: pointer;
  flex-shrink: 0;
  color: var(--color-text-placeholder);
  transition: color 0.2s ease;
}

.cart-item__check--active {
  color: var(--color-primary);
}

.cart-item__img {
  width: 80px;
  height: 80px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--color-border-light);
}

.cart-item__img-placeholder {
  opacity: 0.15;
}

.cart-item__info {
  flex: 1;
  overflow: hidden;
}

.cart-item__title {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
  line-height: 1.4;
}

.cart-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.cart-item__price {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-danger);
}

.cart-item__counter {
  display: flex;
  align-items: center;
}

.counter__btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  background: var(--color-bg);
  color: var(--color-text-regular);
  transition: all 0.2s ease;
}

.counter__btn:active {
  background: var(--color-bg-elevated);
}

.counter__btn:first-child {
  border-radius: 4px 0 0 4px;
}

.counter__btn--plus {
  border-radius: 0 4px 4px 0;
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.counter__num {
  width: 36px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  background: var(--color-bg-card);
}

.settle-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  height: 50px;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
  backdrop-filter: blur(20px);
}

.settle-bar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.settle-bar__check {
  color: var(--color-text-placeholder);
  transition: color 0.2s ease;
}

.settle-bar__check--active {
  color: var(--color-primary);
}

.settle-bar__all {
  font-size: var(--font-size-md);
  color: var(--color-text-regular);
}

.settle-bar__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.settle-bar__total {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.settle-bar__price {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-danger);
}

.settle-bar__btn {
  padding: 10px 28px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 22px;
  font-size: var(--font-size-md);
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.settle-bar__btn:active {
  opacity: 0.8;
}

.settle-bar__btn--danger {
  background: var(--color-danger);
}
</style>
