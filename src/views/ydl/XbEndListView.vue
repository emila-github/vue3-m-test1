<script setup lang="ts">
/**
 * 项目终止（需求文档 §6.3 `/xb/endList`）
 * 查询条件（§6.3）：分支公司 comcode / 到期时间 enddate_begin~enddate_end / 上年保费规模 feeRange(FEE_RANGE) / 投保人名称 appliname
 * 终止项目列表 → 详情 → 终止反馈。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import type { XbQueryField } from '@/components/ydl/xb-types'
import { getYdlXbEndList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

const endTypeOptions = [
  { text: '客户原因', value: '1' },
  { text: '公司原因', value: '2' },
  { text: '其他原因', value: '3' },
]

// 项目终止查询条件（需求 §6.3）
const queryFields: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'dict', key: 'feeRange', label: '上年保费规模', dict: 'FEE_RANGE' },
  { type: 'text', key: 'appliname', label: '投保人名称' },
]
</script>

<template>
  <YdlXbBoard
    title="项目终止"
    :api-fn="getYdlXbEndList"
    status-field="endStatus"
    status-dict="END_STATUS"
    :feedback-url="XB_FEEDBACK_API.end"
    :feedback-type-options="endTypeOptions"
    feedback-type-field="endType"
    feedback-type-label="终止原因"
    :query-fields="queryFields"
  />
</template>
