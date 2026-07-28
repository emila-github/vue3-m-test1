<script setup lang="ts">
/**
 * 数据汇总（需求文档 §3.1 `/analysis`）
 * 机构维度综合看板，首行为合计；查询条件：分支公司 / 统计时间 / 归属渠道（不含标签）。
 */
import YdlStatBoard from '@/components/ydl/YdlStatBoard.vue'
import { getYdlAnalysis } from '@/api/modules/ydl/ydl-statistics'

const columns = [
  { label: '新增保源数', key: 'newCount' },
  { label: '拜访数', key: 'visitCount' },
  { label: '上门拜访数', key: 'doorVisitCount' },
  { label: '已点评数', key: 'commentCount' },
  { label: '点评率', key: 'commentCountPercent' },
  { label: '签单数', key: 'successCount' },
  { label: '签单保费', key: 'policyFee', money: true },
  { label: '无新增天数', key: 'noAddDay' },
  { label: '总保源数', key: 'totalCount' },
  { label: '已认领数', key: 'distributeCount' },
  { label: '已认领占比', key: 'distributeCountPercent' },
  { label: '已拜访保源数', key: 'visitSourceCount' },
  { label: '已拜访占比', key: 'visitSourceCountPercent' },
  { label: '跟踪中保源数', key: 'trackCount' },
]
</script>

<template>
  <YdlStatBoard title="数据汇总" :api-fn="getYdlAnalysis" :columns="columns" :show-label="false" />
</template>
