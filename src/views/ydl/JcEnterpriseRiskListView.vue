<script setup lang="ts">
/**
 * 新续企业增量保费（需求文档 §5.2 `/JcEnterpriseRiskList`）
 * 分支公司维度新续企业增量保费报表（一次全量，横向滚动）。
 */
import YdlJcDecision from '@/components/ydl/YdlJcDecision.vue'
import { getYdlJcEnterpriseRisk } from '@/api/modules/ydl/ydl-jc'

const columns = [
  { label: '新保企业数', key: 'newEnterCount' },
  { label: '续保企业数', key: 'renewEnterCount' },
  { label: '新保保费', key: 'newPolicyFee', money: true },
  { label: '续保保费', key: 'renewPolicyFee', money: true },
  { label: '增量保费', key: 'incrementFee', money: true },
]
</script>

<template>
  <YdlJcDecision title="新续企业增量保费" :api-fn="getYdlJcEnterpriseRisk" :columns="columns" />
</template>
