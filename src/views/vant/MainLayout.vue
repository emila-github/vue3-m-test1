<script setup lang="ts">
/**
 * MainLayout（vant 模块）—— 移动端主框架
 * 底部 tabbar 仅含「首页 / 我的」两项（参考企业微信首页操作条）。
 * 内容区渲染子路由（首页、我的）。
 */
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="main-layout">
    <div class="layout-body">
      <RouterView />
    </div>

    <van-tabbar route fixed safe-area-inset-bottom>
      <van-tabbar-item :to="{ name: 'vant-home' }" icon="wap-home-o">首页</van-tabbar-item>
      <van-tabbar-item :to="{ name: 'vant-index' }" icon="apps-o">组件</van-tabbar-item>
      <van-tabbar-item :to="{ name: 'vant-mine' }" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.main-layout {
  min-height: 100vh;
  background: var(--app-bg);
}
.layout-body {
  /* 预留底部 tabbar 高度，避免内容被遮挡 */
  padding-bottom: 60px;
}
</style>
