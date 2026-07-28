<script setup lang="ts">
/**
 * 我的续保（需求文档 §6.1 `/xb/renewedList`）
 * 查询条件（§6.1）：分支公司 comcode / 到期时间 enddate_begin~end / 续保状态 renewedStatus / 上年保单号 policyno
 * 续保保单列表 → 详情 → 续保反馈。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import type { XbQueryField, XbListField } from '@/components/ydl/xb-types'
import { getYdlXbRenewedList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

// 我的续保查询条件（需求 §6.1）：上年保单号已作为顶部关键字搜索，更多查询不再重复
const queryFields: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'status', key: 'renewedStatus', label: '续保' },
]

// 我的续保列表项字段（需求 §6.1 列表字段）：服务经理字段为 contactsName（区别于问题/终止的 dutyName）
const listFields: XbListField[] = [
  { kind: 'title', key: 'appliname' },
  { kind: 'status', key: 'renewedStatus', dict: 'RENEWED_STATUS' },
  { kind: 'text', key: 'comdname', label: '地市' },
  { kind: 'text', key: 'comzname', label: '支公司' },
  { kind: 'text', key: 'policyno', label: '上年保单号' },
  { kind: 'text', key: 'riskcname', label: '产品名称' },
  { kind: 'text', key: 'enddate', label: '到期时间' },
  { kind: 'money', key: 'coinsnetpremium', label: '上年保费' },
  { kind: 'text', key: 'contactsName', label: '服务经理' },
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
    :list-fields="listFields"
    search-placeholder="搜索上年保单号"
    keyword-key="policyno"
  />
</template>
