<script setup lang="ts">
/**
 * 项目终止（需求文档 §6.3 `/xb/endList`）
 * 终止项目列表 → 详情 → 终止反馈。
 */
import YdlXbBoard from '@/components/ydl/YdlXbBoard.vue'
import { getYdlXbEndList, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

const endTypeOptions = [
  { text: '客户原因', value: '1' },
  { text: '公司原因', value: '2' },
  { text: '其他原因', value: '3' },
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
  />
</template>
