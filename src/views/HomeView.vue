<script setup lang="ts">
/**
 * HomeView（模块总入口）—— 业务模块选择菜单
 *
 * 项目按「子目录模块」组织（如 vant/、ydl/），每个模块拥有各自的
 * HomeView.vue 与 MainLayout。本页作为统一入口，列出所有模块，
 * 点击后进入对应模块的独立首页（含该模块自己的 tabbar 框架）。
 */
import { useRouter } from 'vue-router'

const router = useRouter()

// 环境标识（来自 VITE_APP_TITLE，如 "Vue3 Demo"、"Vue3 Demo (DEV)"），用于区分当前联调/构建环境
const envTitle = (import.meta.env.VITE_APP_TITLE as string) || ''

interface ModuleItem {
  key: string
  title: string
  desc: string
  to: string
  icon: string
  color: string
}

// 新增模块时，在此追加一项即可（to 指向该模块的首页路由）
const modules: ModuleItem[] = [
  {
    key: 'vant',
    title: 'Vant 移动端',
    desc: 'Vant4 组件演示、登录、表单、列表等示例业务页',
    to: '/vant',
    icon: '🧩',
    color: '#1989fa',
  },
  {
    key: 'ydl',
    title: '福建源动力平台',
    desc: '源动力业务平台（子目录模块首页）',
    to: '/ydl',
    icon: '源',
    color: 'var(--van-primary-color)',
  },
]

function open(m: ModuleItem) {
  router.push(m.to)
}
</script>

<template>
  <div class="mod-home">
    <!-- ==================== 头部 ==================== -->
    <header class="mod-header">
      <div class="mod-header-top">
        <div class="mod-brand">中国人保</div>
        <div v-if="envTitle" class="mod-env">{{ envTitle }}</div>
      </div>
      <div class="mod-title">请选择业务模块</div>
      <div class="mod-sub">不同模块拥有独立的首页与「我的」</div>
    </header>

    <!-- ==================== 模块卡片列表 ==================== -->
    <main class="mod-body">
      <button v-for="m in modules" :key="m.key" class="mod-card" @click="open(m)">
        <div class="mod-icon" :style="{ background: m.color }">{{ m.icon }}</div>
        <div class="mod-info">
          <div class="mod-name">{{ m.title }}</div>
          <div class="mod-desc">{{ m.desc }}</div>
        </div>
        <van-icon name="arrow" class="mod-arrow" />
      </button>

      <div class="mod-tip">点击卡片进入对应模块首页</div>
    </main>
  </div>
</template>

<style scoped>
.mod-home {
  min-height: 100vh;
  background: var(--app-bg);
}
.mod-header {
  background: linear-gradient(135deg, var(--van-primary-color), var(--app-primary-deep));
  padding: 28px 20px 36px;
  color: #fff;
  border-radius: 0 0 24px 24px;
}
.mod-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mod-env {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}
.mod-brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
}
.mod-title {
  margin-top: 14px;
  font-size: 22px;
  font-weight: 700;
}
.mod-sub {
  margin-top: 6px;
  font-size: 13px;
  opacity: 0.85;
}
.mod-body {
  padding: 18px 16px 0;
  margin-top: -20px;
}
.mod-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--app-surface);
  border: none;
  border-radius: 14px;
  padding: 16px 16px;
  margin-bottom: 14px;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 1px 10px rgba(0, 0, 0, 0.05);
  transition: transform 0.12s ease;
}
.mod-card:active {
  transform: scale(0.98);
}
.mod-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.mod-info {
  flex: 1;
  min-width: 0;
}
.mod-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text);
}
.mod-desc {
  margin-top: 4px;
  font-size: 12.5px;
  color: var(--app-text-3);
  line-height: 1.4;
}
.mod-arrow {
  color: var(--app-text-3);
  font-size: 18px;
  flex-shrink: 0;
}
.mod-tip {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #bbb;
}
</style>
