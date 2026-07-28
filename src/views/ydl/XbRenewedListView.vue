<script setup lang="ts">
/**
 * 我的续保（需求文档 §6.1 `/xb/renewedList`）
 * 续保保单列表 → 详情 → 续保反馈。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import { getYdlXbRenewedList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'
</script>

<template>
  <YdlXbBoard
    title="我的续保"
    :api-fn="getYdlXbRenewedList"
    status-field="renewedStatus"
    status-dict="RENEWED_STATUS"
    :feedback-url="XB_FEEDBACK_API.renewed"
  />
</template>
