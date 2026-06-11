<script setup lang="ts">
import { ref } from 'vue'

interface CartItem {
  id: number
  title: string
  price: number
  count: number
  selected: boolean
}

const cartList = ref<CartItem[]>([
  { id: 1, title: '商品名称示例 1', price: 99.9, count: 1, selected: true },
  { id: 2, title: '商品名称示例 2', price: 199.0, count: 2, selected: true },
  { id: 3, title: '商品名称示例 3', price: 59.5, count: 1, selected: false },
])

const allSelected = ref(false)
const editMode = ref(false)

function toggleSelect(item: CartItem) {
  item.selected = !item.selected
}

function toggleAll() {
  allSelected.value = !allSelected.value
  cartList.value.forEach((item) => {
    item.selected = allSelected.value
  })
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
        <span class="empty-state__icon">🛒</span>
        <p class="empty-state__text">购物车还是空的</p>
        <button class="empty-state__btn">去逛逛</button>
      </div>

      <!-- 购物车列表 -->
      <template v-else>
        <div class="cart-list">
          <div
            v-for="item in cartList"
            :key="item.id"
            class="cart-item hairline-border"
          >
            <span
              class="cart-item__check"
              :class="{ 'cart-item__check--active': item.selected }"
              @click="toggleSelect(item)"
            >
              {{ item.selected ? '✅' : '⭕' }}
            </span>
            <div class="cart-item__img">
              <span class="cart-item__img-placeholder">📦</span>
            </div>
            <div class="cart-item__info">
              <p class="cart-item__title text-ellipsis-2">{{ item.title }}</p>
              <div class="cart-item__bottom">
                <span class="cart-item__price">¥{{ item.price }}</span>
                <div class="cart-item__counter">
                  <span class="counter__btn" @click="decrease(item)">−</span>
                  <span class="counter__num">{{ item.count }}</span>
                  <span class="counter__btn" @click="increase(item)">+</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部结算栏 -->
        <div class="settle-bar safe-area-bottom">
          <div class="settle-bar__left" @click="toggleAll">
            <span :class="{ 'settle-bar__check--active': allSelected }">
              {{ allSelected ? '✅' : '⭕' }}
            </span>
            <span class="settle-bar__all">全选</span>
          </div>
          <div class="settle-bar__right">
            <div class="settle-bar__total">
              <span>合计：</span>
              <span class="settle-bar__price">¥99.9</span>
            </div>
            <button class="settle-bar__btn">
              {{ editMode ? '删除' : '结算(2)' }}
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
  background: var(--color-bg-white);
  padding: 0 16px;
  flex-shrink: 0;
  position: relative;
}

.nav-bar__title {
  font-size: var(--font-size-xl);
  font-weight: 600;
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
  padding-top: 100px;
}

.empty-state__icon {
  font-size: 60px;
  opacity: 0.3;
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
}

.cart-list {
  background: var(--color-bg-white);
  margin-top: 10px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 10px;
}

.cart-item__check {
  font-size: 18px;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.3;
}

.cart-item__check--active {
  opacity: 1;
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
}

.cart-item__img-placeholder {
  font-size: 36px;
  opacity: 0.4;
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
  font-weight: 600;
  color: var(--color-danger);
}

.cart-item__counter {
  display: flex;
  align-items: center;
  gap: 0;
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
}

.counter__btn:first-child {
  border-radius: 4px 0 0 4px;
}

.counter__btn:last-child {
  border-radius: 0 4px 4px 0;
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
}

.settle-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  height: 50px;
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
}

.settle-bar__left {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 18px;
}

.settle-bar__left span:first-child {
  opacity: 0.3;
}

.settle-bar__check--active {
  opacity: 1 !important;
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
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-danger);
}

.settle-bar__btn {
  padding: 8px 24px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 20px;
  font-size: var(--font-size-md);
  font-weight: 500;
}
</style>
