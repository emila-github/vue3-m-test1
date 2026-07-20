<script setup lang="ts">
import { ref } from 'vue'

const user = ref({
  name: '测试用户',
  dept: '展业一部',
  role: '展业员',
  avatar: '',
})

const cells = ref([
  { icon: 'contact', title: '个人资料', to: '' },
  { icon: 'balance-o', title: '权限与角色', to: '' },
  { icon: 'setting-o', title: '设置', to: '' },
  { icon: 'info-o', title: '关于中国人保', to: '' },
])
</script>

<template>
  <div class="mine">
    <header class="mine-header">
      <div class="mine-user">
        <div class="avatar">
          {{ user.name.slice(0, 1) }}
        </div>
        <div class="mine-meta">
          <div class="mine-name">{{ user.name }}</div>
          <div class="mine-sub">{{ user.dept }} · {{ user.role }}</div>
        </div>
      </div>
    </header>

    <van-cell-group inset class="mine-cells">
      <van-cell
        v-for="c in cells"
        :key="c.title"
        :icon="c.icon"
        :title="c.title"
        is-link
      />
    </van-cell-group>

    <div class="mine-logout">
      <van-button block round type="primary" plain>退出登录</van-button>
    </div>
  </div>
</template>

<style scoped>
.mine {
  min-height: 100vh;
  background: #f5f6f8;
}
.mine-header {
  background: linear-gradient(135deg, #d71920, #b31319);
  padding: 36px 20px 28px;
}
.mine-user {
  display: flex;
  align-items: center;
  gap: 14px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mine-meta {
  color: #fff;
}
.mine-name {
  font-size: 18px;
  font-weight: 600;
}
.mine-sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.85;
}
.mine-cells {
  margin-top: 16px !important;
}
.mine-logout {
  padding: 24px 16px;
}
</style>
