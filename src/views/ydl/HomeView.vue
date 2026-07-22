<script setup lang="ts">
/**
 * HomeView（ydl 模块）—— 学幼专区首页（示例子目录模块）
 */
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import MenuIcon, { type IconStyle } from '../../components/MenuIcon.vue'

const router = useRouter()

interface MenuItem {
  key: string
  title: string
  to: string
  style?: IconStyle
  badge?: string
}

const items = ref<MenuItem[]>([
  {
    key: 'ydl-list-demo',
    title: '列表示例',
    to: '/ydl/ydl-list-demo',
    style: 'default',
    badge: 'DEMO',
  },
  { key: 'ydl-class', title: '班级管理', to: '/ydl/class', style: 'default' },
  { key: 'ydl-student', title: '学生档案', to: '/ydl/student', style: 'default' },
  { key: 'ydl-notice', title: '通知公告', to: '/ydl/notice', style: 'default', badge: 'NEW' },
  { key: 'ydl-homework', title: '作业打卡', to: '/ydl/homework', style: 'default' },
  { key: 'ydl-health', title: '健康台账', to: '/ydl/health', style: 'default' },
])

function go(it: MenuItem) {
  router.push(it.to)
}
</script>

<template>
  <div class="ydl-home">
    <header class="ydl-header">
      <div class="ydl-title">学幼专区</div>
      <div class="ydl-sub">校园 / 幼教业务工作台</div>
    </header>

    <main class="ydl-body">
      <div class="ydl-grid">
        <button v-for="it in items" :key="it.key" class="ydl-item" @click="go(it)">
          <MenuIcon :name="it.key" :style="it.style ?? 'default'" :size="44" :badge="it.badge" />
          <span class="ydl-label">{{ it.title }}</span>
        </button>
      </div>

      <div class="bottom-spacer"></div>
    </main>
  </div>
</template>

<style scoped>
.ydl-home {
  min-height: 100vh;
  background: #f5f6f8;
}
.ydl-header {
  background: linear-gradient(135deg, #07c160, #05a050);
  padding: 28px 20px 26px;
  color: #fff;
  border-radius: 0 0 24px 24px;
}
.ydl-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
}
.ydl-sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.9;
}
.ydl-body {
  padding: 16px 12px 0;
}
.ydl-grid {
  background: #fff;
  border-radius: 14px;
  padding: 20px 6px 14px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  row-gap: 18px;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
}
.ydl-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
}
.ydl-item:active {
  opacity: 0.7;
}
.ydl-label {
  font-size: 12.5px;
  color: #333;
  text-align: center;
  line-height: 1.3;
}
.bottom-spacer {
  height: 70px;
}
</style>
