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
  { id: 1, title: '商品名称示例 1 - 品质精选好物', price: 99.9, count: 1, selected: true },
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
  if (item.count > 1) item.count--
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
    <!-- Sub Nav — 暖奶油，无 blur -->
    <div class="sub-nav">
      <h2 class="sub-nav__title">购物车</h2>
      <span class="sub-nav__action" @click="editMode = !editMode">
        {{ editMode ? '完成' : '编辑' }}
      </span>
    </div>

    <div class="page-content">
      <!-- 空状态 -->
      <div v-if="cartList.length === 0" class="empty-state">
        <svg class="empty-state__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="72" height="72">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p class="empty-state__text">购物车还是空的</p>
        <button class="btn-pill" @click="router.push('/')">去逛逛</button>
      </div>

      <!-- 购物车列表 -->
      <template v-else>
        <div class="cart-list">
          <div v-for="item in cartList" :key="item.id" class="cart-item">
            <div
              class="cart-item__check"
              :class="{ 'cart-item__check--active': item.selected }"
              @click="toggleSelect(item)"
            >
              <svg v-if="item.selected" viewBox="0 0 24 24" fill="var(--color-primary)" width="22" height="22">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <div class="cart-item__img">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" width="32" height="32">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
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

        <!-- Bottom Bar — 暖奶油，无 blur -->
        <div class="sticky-bar safe-area-bottom">
          <div class="sticky-bar__left" @click="allSelected = !allSelected">
            <div class="sticky-bar__check" :class="{ 'sticky-bar__check--active': allSelected }">
              <svg v-if="allSelected" viewBox="0 0 24 24" fill="var(--color-primary)" width="22" height="22">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="22" height="22">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <span class="sticky-bar__all">全选</span>
          </div>
          <div class="sticky-bar__right">
            <div class="sticky-bar__total" v-if="!editMode">
              <span class="sticky-bar__total-label">合计 </span>
              <span class="sticky-bar__price">¥{{ totalPrice }}</span>
            </div>
            <button v-if="!editMode" class="btn-pill">结算({{ selectedCount }})</button>
            <button v-else class="btn-pill btn-pill--danger" @click="removeItem(1)">删除</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ===== Sub Nav — 暖奶油，无 blur ===== */
.sub-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  flex-shrink: 0;
  position: relative;
  padding: 0 var(--spacing-lg);
}

.sub-nav__title {
  font-family: var(--font-family-display);
  font-size: var(--text-title-sm);
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
  color: var(--color-ink);
}

.sub-nav__action {
  position: absolute;
  right: var(--spacing-lg);
  font-family: var(--font-family-body);
  font-size: var(--text-body-sm);
  font-weight: 500;
  color: var(--color-primary);
  cursor: pointer;
  letter-spacing: 0;
}

/* ===== Empty State ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120px;
}

.empty-state__icon {
  color: var(--color-ink-muted-48);
  opacity: 0.3;
}

.empty-state__text {
  font-family: var(--font-family-body);
  font-size: var(--text-body);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-body);
  margin: var(--spacing-lg) 0 var(--spacing-xl);
}

/* ===== Cart List ===== */
.cart-list {
  background: var(--color-canvas);
}

.cart-item {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm) var(--spacing-lg);
  gap: var(--spacing-sm);
  border-bottom: 1px solid var(--color-divider-soft);
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item__check {
  cursor: pointer;
  flex-shrink: 0;
  color: var(--color-hairline);
  display: flex;
  align-items: center;
  width: 44px;
  height: 44px;
  justify-content: center;
  transition: color 0.15s ease;
}

.cart-item__check--active {
  color: var(--color-primary);
}

.cart-item__img {
  width: 80px;
  height: 80px;
  background: var(--color-canvas);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-ink-muted-48);
  opacity: 0.15;
}

.cart-item__info {
  flex: 1;
  overflow: hidden;
}

.cart-item__title {
  font-family: var(--font-family-body);
  font-size: var(--text-body-sm);
  font-weight: 400;
  line-height: 1.5;
  letter-spacing: 0;
  color: var(--color-ink);
}

.cart-item__bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--spacing-xs);
}

.cart-item__price {
  font-family: var(--font-family-body);
  font-size: var(--text-title-sm);
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-primary);
}

.cart-item__counter {
  display: flex;
  align-items: center;
}

.counter__btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-hairline);
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  background: var(--color-surface-card);
  color: var(--color-body);
  border-radius: var(--radius-xs);
  transition: background 0.15s ease;
}

.counter__btn:active {
  background: var(--color-canvas);
}

.counter__btn--plus {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.counter__num {
  width: 40px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--color-hairline);
  border-bottom: 1px solid var(--color-hairline);
  font-family: var(--font-family-body);
  font-size: var(--text-caption);
  font-weight: 400;
  color: var(--color-ink);
  background: var(--color-surface-card);
}

/* ===== Bottom Bar — 暖奶油，无 blur ===== */
.sticky-bar {
  position: fixed;
  bottom: 50px;
  left: 0;
  right: 0;
  height: 60px;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  z-index: 10;
}

.sticky-bar__left {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: pointer;
}

.sticky-bar__check {
  color: var(--color-hairline);
  display: flex;
  align-items: center;
  width: 44px;
  height: 44px;
  justify-content: center;
  transition: color 0.15s ease;
}

.sticky-bar__check--active {
  color: var(--color-primary);
}

.sticky-bar__all {
  font-family: var(--font-family-body);
  font-size: var(--text-body-sm);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-body);
}

.sticky-bar__right {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.sticky-bar__total-label {
  font-family: var(--font-family-body);
  font-size: var(--text-body-sm);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-body);
}

.sticky-bar__price {
  font-family: var(--font-family-body);
  font-size: var(--text-title-sm);
  font-weight: 600;
  letter-spacing: 0;
  color: var(--color-primary);
}

.btn-pill--danger {
  background: #cf2d56;
  color: #fff;
}
</style>
