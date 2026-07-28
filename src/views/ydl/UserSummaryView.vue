<script setup lang="ts">
/**
 * 劳效统计（需求文档 §3.3 `/user-summary`）
 * 机构维度人效统计，首行为合计；查询条件含保源标签 / 归属渠道。
 */
import YdlStatBoard from '@/components/ydl/YdlStatBoard.vue'
import { getYdlUserSummary } from '@/api/modules/ydl/ydl-statistics'

const columns = [
  { label: '拜访数', key: 'visitCount' },
  { label: '业务员总人数', key: 'memberCount' },
  { label: '有拜访业务员', key: 'visitMemberCount' },
  { label: '有拜访占比', key: 'memberVisitCountPercent' },
  { label: '人均拜访数', key: 'visitPerUser' },
  { label: '拜访保源数', key: 'visitSourceCount' },
  { label: '拜访签单保源数', key: 'successCount' },
  { label: '拜访成功率', key: 'visitSuccessPercent' },
  { label: '签单数', key: 'policyCount' },
  { label: '人均签单数', key: 'policyCountPerUser' },
  { label: '签单保费', key: 'policyFee', money: true },
  { label: '人均签单保费', key: 'policyFeePerUser', money: true },
]
</script>

<template>
  <YdlStatBoard title="劳效统计" :api-fn="getYdlUserSummary" :columns="columns" :show-label="true" />
</template>
