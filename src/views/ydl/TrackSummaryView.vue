<script setup lang="ts">
/**
 * 跟踪统计（需求文档 §3.2 `/track-summary`）
 * 机构维度跟踪统计，首行为合计；查询条件含保源标签 / 归属渠道。
 */
import YdlStatBoard from '@/components/ydl/YdlStatBoard.vue'
import { getYdlTrackSummary } from '@/api/modules/ydl/ydl-statistics'

const columns = [
  { label: '新增保源数', key: 'newCount' },
  { label: '拜访数', key: 'visitCount' },
  { label: '上门拜访数', key: 'doorVisitCount' },
  { label: '已点评数', key: 'commentCount' },
  { label: '点评率', key: 'commentCountPercent' },
  { label: '签单数', key: 'successCount' },
  { label: '签单保费', key: 'policyFee', money: true },
]
</script>

<template>
  <YdlStatBoard title="跟踪统计" :api-fn="getYdlTrackSummary" :columns="columns" :show-label="true" />
</template>
