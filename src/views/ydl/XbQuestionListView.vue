<script setup lang="ts">
/**
 * 问题项目（需求文档 §6.2 `/xb/questionList`）
 * 查询条件（§6.2）：分支公司 comcode / 到期时间 enddate_begin~enddate_end / 上年保费规模 feeRange(FEE_RANGE) / 投保人名称 appliname
 * 问题项目列表 → 详情 → 问题反馈（含是否解决）。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import type { XbQueryField } from '@/components/ydl/xb-types'
import { getYdlXbQuestionList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

const questionTypeOptions = [
  { text: '承保条件', value: '1' },
  { text: '价格因素', value: '2' },
  { text: '同业竞争', value: '3' },
  { text: '客户流失', value: '4' },
]

// 问题项目查询条件（需求 §6.2）
const queryFields: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'dict', key: 'feeRange', label: '上年保费规模', dict: 'FEE_RANGE' },
  { type: 'text', key: 'appliname', label: '投保人名称' },
]
</script>

<template>
  <YdlXbBoard
    title="问题项目"
    :api-fn="getYdlXbQuestionList"
    status-field="questionStatus"
    status-dict="QUESTION_STATUS"
    :feedback-url="XB_FEEDBACK_API.question"
    :feedback-type-options="questionTypeOptions"
    feedback-type-field="type"
    feedback-type-label="问题类型"
    :show-resolve="true"
    :query-fields="queryFields"
  />
</template>
