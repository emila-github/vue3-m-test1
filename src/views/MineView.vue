<script setup lang="ts">
const menuList = [
  { id: 1, title: '我的订单', icon: 'orders', desc: '全部订单' },
  { id: 2, title: '我的收藏', icon: 'heart', desc: '收藏的商品' },
  { id: 3, title: '收货地址', icon: 'location', desc: '管理地址' },
  { id: 4, title: '优惠券', icon: 'coupon', desc: '3张可用' },
  { id: 5, title: '客服中心', icon: 'service', desc: '在线客服' },
  { id: 6, title: '设置', icon: 'settings', desc: '账号设置' },
]
</script>

<template>
  <div class="page-container">
    <div class="page-content">
      <!-- 用户信息 - Dark surface hero 风格 -->
      <div class="user-card">
        <div class="user-card__avatar">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path
              d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z"
            />
          </svg>
        </div>
        <div class="user-card__info">
          <span class="user-card__eyebrow">PROFILE</span>
          <h3 class="user-card__name">用户昵称</h3>
          <p class="user-card__desc">品质生活，守护每一刻</p>
        </div>
        <div class="user-card__arrow">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="18"
            height="18"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </div>

      <!-- 订单状态 - research-card 风格 -->
      <div class="order-panel">
        <div class="order-panel__header">
          <span class="order-panel__eyebrow">MY ORDERS</span>
          <span class="order-panel__title">我的订单</span>
          <span class="order-panel__more">
            全部订单
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              width="14"
              height="14"
              style="vertical-align: middle"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </div>
        <div class="order-panel__grid">
          <div
            class="order-panel__item"
            v-for="(item, i) in [
              { label: '待付款', icon: 'wallet', badge: 2 },
              { label: '待发货', icon: 'package', badge: 0 },
              { label: '待收货', icon: 'truck', badge: 1 },
              { label: '待评价', icon: 'comment', badge: 3 },
            ]"
            :key="i"
          >
            <div class="order-panel__icon-wrapper">
              <span class="order-panel__icon">
                <svg
                  v-if="item.icon === 'wallet'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="24"
                  height="24"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 11H17a3 3 0 0 0 0 6h5" />
                </svg>
                <svg
                  v-if="item.icon === 'package'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="24"
                  height="24"
                >
                  <path
                    d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                  />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <svg
                  v-if="item.icon === 'truck'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="24"
                  height="24"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <svg
                  v-if="item.icon === 'comment'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  width="24"
                  height="24"
                >
                  <path
                    d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
                  />
                </svg>
              </span>
              <span v-if="item.badge > 0" class="order-panel__badge">{{ item.badge }}</span>
            </div>
            <span class="order-panel__label">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <!-- 菜单列表 - 使用 hairline 分割 -->
      <div class="menu-section">
        <div class="menu-list">
          <div v-for="item in menuList" :key="item.id" class="menu-item">
            <span class="menu-item__icon">
              <svg
                v-if="item.icon === 'orders'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <svg
                v-if="item.icon === 'heart'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                />
              </svg>
              <svg
                v-if="item.icon === 'location'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <svg
                v-if="item.icon === 'coupon'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <path d="M20 12V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6" />
                <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                <line x1="12" y1="12" x2="12" y2="4" />
              </svg>
              <svg
                v-if="item.icon === 'service'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <svg
                v-if="item.icon === 'settings'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                width="20"
                height="20"
              >
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
              </svg>
            </span>
            <div class="menu-item__info">
              <span class="menu-item__title">{{ item.title }}</span>
            </div>
            <span class="menu-item__desc">{{ item.desc }}</span>
            <span class="menu-item__arrow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                width="14"
                height="14"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 用户卡 - Dark surface hero 风格 */
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 28px 16px;
  background: var(--color-canvas-dark);
  color: var(--color-on-dark);
}

.user-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--color-on-dark);
}

.user-card__info {
  flex: 1;
}

.user-card__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-accent-mint);
  display: block;
  margin-bottom: 4px;
}

.user-card__name {
  font: var(--typo-display-md);
  color: var(--color-on-dark);
}

.user-card__desc {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

.user-card__arrow {
  opacity: 0.6;
  display: flex;
  align-items: center;
  color: var(--color-on-dark);
}

/* 订单面板 - 白色表面 hairline 边框 */
.order-panel {
  background: var(--color-bg-white);
  margin: 8px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.order-panel__header {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
}

.order-panel__eyebrow {
  font: var(--typo-mono-eyebrow);
  letter-spacing: 0.55px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.order-panel__title {
  font: var(--typo-display-md);
  color: var(--color-text-primary);
  flex: 1;
}

.order-panel__more {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.order-panel__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 16px 0;
}

.order-panel__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.order-panel__icon-wrapper {
  position: relative;
}

.order-panel__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-regular);
}

.order-panel__badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 16px;
  height: 16px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 10px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  font-weight: 500;
}

.order-panel__label {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
}

/* 菜单列表 */
.menu-section {
  margin-top: 8px;
}

.menu-list {
  background: var(--color-bg-white);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.15s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: var(--color-bg);
}

.menu-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

.menu-item__info {
  flex: 1;
}

.menu-item__title {
  font: var(--typo-body-md);
  font-weight: 500;
  color: var(--color-text-primary);
}

.menu-item__desc {
  font: var(--typo-body-md);
  color: var(--color-text-secondary);
}

.menu-item__arrow {
  color: var(--color-text-placeholder);
}
</style>
