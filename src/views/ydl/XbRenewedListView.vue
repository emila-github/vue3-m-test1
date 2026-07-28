<script setup lang="ts">
/**
 * 我的续保（需求文档 §6.1 `/xb/renewedList`）
 * 查询条件（§6.1）：分支公司 comcode / 到期时间 enddate_begin~end / 续保状态 renewedStatus / 上年保单号 policyno
 * 续保保单列表 → 详情 → 续保反馈。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import type { XbQueryField } from '@/components/ydl/xb-types'
import { getYdlXbRenewedList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

// 我的续保查询条件（需求 §6.1）
const queryFields: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'status', key: 'renewedStatus', label: '续保' },
  { type: 'text', key: 'policyno', label: '上年保单号' },
]
</script>

<template>
  <YdlXbBoard
    title="我的续保"
    :api-fn="getYdlXbRenewedList"
    status-field="renewedStatus"
    status-dict="RENEWED_STATUS"
    :feedback-url="XB_FEEDBACK_API.renewed"
    :query-fields="queryFields"
  />
</template>
