<script setup lang="ts">
/**
 * 客户渗透率（需求文档 §5.1 `/JcEnterpriseItemList`）
 * 分支公司维度渗透率报表（一次全量，横向滚动）。
 */
import YdlJcDecision from '@/components/ydl/YdlJcDecision.vue'
import { getYdlJcEnterpriseItem } from '@/api/modules/ydl/ydl-jc'

const columns = [
  { label: '企业数量', key: 'enterCount' },
  { label: '标的渗透率(全险)', key: 'enterRateHasbf', percent: true },
  { label: '标的渗透率(不含车险)', key: 'enterRateHasbfFc', percent: true },
  { label: '产品渗透率(全险)', key: 'enterRateHasbfTwo', percent: true },
  { label: '产品渗透率(不含车险)', key: 'enterRateHasbfTwoFc', percent: true },
  { label: '公司承保客户数(全险)', key: 'enterCountHasbf' },
]
</script>

<template>
  <YdlJcDecision title="客户渗透率" :api-fn="getYdlJcEnterpriseItem" :columns="columns" />
</template>
