<script setup lang="ts">
const menuList = [
  { id: 1, title: '我的订单', icon: '📋', desc: '全部订单' },
  { id: 2, title: '我的收藏', icon: '❤️', desc: '收藏的商品' },
  { id: 3, title: '收货地址', icon: '📍', desc: '管理地址' },
  { id: 4, title: '优惠券', icon: '🎫', desc: '3张可用' },
  { id: 5, title: '客服中心', icon: '💬', desc: '在线客服' },
  { id: 6, title: '设置', icon: '⚙️', desc: '账号设置' },
]
</script>

<template>
  <div class="page-container">
    <div class="page-content">
      <!-- 用户信息 -->
      <div class="user-card">
        <div class="user-card__avatar">👤</div>
        <div class="user-card__info">
          <h3 class="user-card__name">用户名</h3>
          <p class="user-card__desc">欢迎来到移动端商城</p>
        </div>
      </div>

      <!-- 订单状态 -->
      <div class="order-panel">
        <div class="order-panel__header">
          <span class="order-panel__title">我的订单</span>
          <span class="order-panel__more">全部 &gt;</span>
        </div>
        <div class="order-panel__grid">
          <div class="order-panel__item" v-for="(item, i) in ['待付款', '待发货', '待收货', '待评价']" :key="i">
            <span class="order-panel__icon">{{ ['💰', '📦', '🚚', '✍️'][i] }}</span>
            <span class="order-panel__label">{{ item }}</span>
          </div>
        </div>
      </div>

      <!-- 菜单列表 -->
      <div class="menu-list">
        <div
          v-for="item in menuList"
          :key="item.id"
          class="menu-item hairline-border"
        >
          <span class="menu-item__icon">{{ item.icon }}</span>
          <div class="menu-item__info">
            <span class="menu-item__title">{{ item.title }}</span>
          </div>
          <span class="menu-item__desc">{{ item.desc }}</span>
          <span class="menu-item__arrow">&gt;</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
}

.user-card__avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

.user-card__name {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.user-card__desc {
  font-size: var(--font-size-sm);
  opacity: 0.8;
  margin-top: 4px;
}

.order-panel {
  background: var(--color-bg-white);
  margin: 10px 0;
}

.order-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.order-panel__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.order-panel__more {
  font-size: var(--font-size-sm);
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
  gap: 6px;
}

.order-panel__icon {
  font-size: 24px;
}

.order-panel__label {
  font-size: var(--font-size-xs);
  color: var(--color-text-regular);
}

.menu-list {
  background: var(--color-bg-white);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 12px;
  cursor: pointer;
}

.menu-item__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.menu-item__info {
  flex: 1;
}

.menu-item__title {
  font-size: var(--font-size-md);
  color: var(--color-text-primary);
}

.menu-item__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.menu-item__arrow {
  color: var(--color-text-placeholder);
  font-size: var(--font-size-sm);
}
</style>
