<script setup lang="ts">
/**
 * 问题项目（需求文档 §6.2 `/xb/questionList`）
 * 查询条件（§6.2）：分支公司 comcode / 到期时间 enddate_begin~enddate_end / 上年保费规模 feeRange(FEE_RANGE) / 投保人名称 appliname
 * 问题项目列表 → 详情 → 问题反馈（含是否解决）。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import type { XbQueryField, XbListField } from '@/components/ydl/xb-types'
import { getYdlXbQuestionList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

const questionTypeOptions = [
  { text: '承保条件', value: '1' },
  { text: '价格因素', value: '2' },
  { text: '同业竞争', value: '3' },
  { text: '客户流失', value: '4' },
]

// 问题项目查询条件（需求 §6.2）：投保人名称已作为顶部关键字搜索，更多查询不再重复
const queryFields: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'dict', key: 'feeRange', label: '上年保费规模', dict: 'FEE_RANGE' },
]

// 问题项目列表项字段（需求 §6.2 列表字段）
const listFields: XbListField[] = [
  { kind: 'title', key: 'appliname' },
  { kind: 'status', key: 'questionStatus', dict: 'QUESTION_STATUS' },
  { kind: 'tag', key: 'questionDelayStatus', dict: 'QUESTION_DELAY_STATUS' },
  { kind: 'text', key: 'comdname', label: '地市' },
  { kind: 'text', key: 'comzname', label: '支公司' },
  { kind: 'text', key: 'policyno', label: '上年保单号' },
  { kind: 'text', key: 'riskcname', label: '产品名称' },
  { kind: 'text', key: 'enddate', label: '保单到期时间' },
  { kind: 'money', key: 'coinsnetpremium', label: '上年保费' },
  { kind: 'text', key: 'teamFlag', label: '团队类型' },
  { kind: 'text', key: 'dutyName', label: '服务经理' },
  { kind: 'text', key: 'auditContent', label: '预审核意见' },
  { kind: 'tag', key: 'questionType', dict: 'QUESTION_TYPE' },
  { kind: 'text', key: 'remainDay', label: '剩余反馈时间' },
  { kind: 'text', key: 'questionContent', label: '问题内容' },
  { kind: 'text', key: 'questionFeedback', label: '问题项目反馈' },
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
    :list-fields="listFields"
    search-placeholder="搜索投保人名称"
    keyword-key="appliname"
  />
</template>
