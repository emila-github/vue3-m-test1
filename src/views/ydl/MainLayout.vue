<script setup lang="ts">
/**
 * MainLayout（ydl 模块）—— 移动端主框架
 * 底部 tabbar 仅含「首页 / 我的」两项，路由使用 ydl 模块的具名路由。
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="main-layout">
    <div class="layout-body">
      <RouterView />
    </div>

    <van-tabbar route fixed safe-area-inset-bottom>
      <van-tabbar-item :to="{ name: 'ydl-home' }" icon="wap-home-o">首页</van-tabbar-item>
      <van-tabbar-item :to="{ name: 'ydl-mine' }" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  background: var(--app-bg);
}
.layout-body {
  padding-bottom: 60px;
}
</style>
