<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <van-nav-bar
    :title="(route.meta.title as string) || 'Vant 移动端'"
    fixed
    placeholder
    safe-area-inset-top
  />
  <router-view v-slot="{ Component }">
    <van-config-provider>
      <component :is="Component" />
    </van-config-provider>
  </router-view>
</template>

<style>
body {
  margin: 0;
  background: #f5f6f8;
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, sans-serif;
}
</style>
