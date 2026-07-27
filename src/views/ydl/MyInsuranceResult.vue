<script setup lang="ts">
/**
 * 销售结果（MyInsuranceResult）—— ydl 模块 / 我的保源详情子功能
 *
 * 对应需求文档：md/v2/Vue3重构需求文档.md §4.1.3 销售结果（原名称不得改）
 * 入口：MyInsuranceSource 列表「更多项 → 销售结果」按 sourceId 跳转（route query: sourceId / name）。
 *
 * 行内「更多」操作（文档 4.1.3 左滑）：
 *   · 编辑   权限 visitTracks:edit，仅本人(isSelfData)可见 → 录入表单
 *   · 删除   权限 visitTracks:delete，仅本人(isSelfData)可见
 * 录入（新增）按钮权限 visitTracks:result。
 * 录入表单（4.1.3）：销售归属 + 保单号（blur 自动带出保费/险种/渠道等） + 保费（只读，自动回填）；
 * saleFlag 恒为 Y（仅成功录入，见文档说明）。
 */
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import VantList from '@/components/VantList.vue'
import VantSelectField from '@/components/VantSelectField.vue'
import type { CrudApi } from '@/composables/useCrudList'
import type {
  YdlSalesResult,
  YdlSalesResultForm,
  YdlSalesResultQuery,
} from '@/api/modules/ydl/ydl-my-insurance-detail'
import {
  getYdlPolicyInfoList,
  addYdlPolicyInfo,
  updateYdlPolicyInfo,
  deleteYdlPolicyInfo,
  getInsureOrderInfo,
  YDL_SALES_RESULT,
  YDL_SALE_TYPE,
  ydlSalesResultColor,
} from '@/api/modules/ydl/ydl-my-insurance-detail'

const route = useRoute()
const sourceId = computed(() => (route.query.sourceId as string) || '')
const custName = computed(() => (route.query.name as string) || '')

// ==================== API 集合（注入固定 sourceId，其余交给 VantList 内置处理） ====================
const api: CrudApi<YdlSalesResult, YdlSalesResultForm, YdlSalesResultQuery> = {
  list: (p) => getYdlPolicyInfoList({ sourceId: sourceId.value, ...p }),
  create: addYdlPolicyInfo,
  update: updateYdlPolicyInfo,
  remove: deleteYdlPolicyInfo,
}

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const initialForm: YdlSalesResultForm = {
  sourceId: sourceId.value,
  saleFlag: 'Y',
  saleType: null,
  policyNo: '',
  policyFee: '',
}

const saleTypeOptions = Object.entries(YDL_SALE_TYPE).map(([value, text]) => ({
  text,
  value: Number(value),
}))

// ==================== 提交前强校验（独立于 van-field :rules） ====================
function beforeSubmit(f: Record<string, any>) {
  f.sourceId = sourceId.value
  if (f.saleFlag === 'Y') {
    if (f.saleType == null) return (showToast('请选择销售归属'), false)
    if (!f.policyNo || !f.policyNo.trim()) return (showToast('请填写保单号'), false)
    if (!f.policyFee || !f.policyFee.trim())
      return (showToast('保费未自动带出，请检查保单号'), false)
  }
  return true
}

// ==================== 保单号 blur → 自动带出保费 / 险种 / 渠道等 ====================
const loadingPolicy = ref(false)
async function onPolicyNoBlur(policyNo: string, form: Record<string, any>) {
  const v = (policyNo || '').trim()
  if (!v) return
  loadingPolicy.value = true
  try {
    const info = await getInsureOrderInfo(v)
    // 仅当保单号仍与当前表单一致时回填（避免异步竞态）
    if ((form.policyNo || '').trim() === v) {
      form.policyFee = String(info.sumnetpremium)
    }
  } catch {
    showToast('保单号查询失败')
  } finally {
    loadingPolicy.value = false
  }
}

function isSuccess(item: YdlSalesResult) {
  return item.saleFlag === 'Y'
}
</script>

<template>
  <div class="ydl-result-page">
    <VantList
      :api="api"
      :title="custName ? `销售结果 - ${custName}` : '销售结果'"
      permission-prefix="visitTracks"
      :permission-actions="{ create: 'result' }"
      :initial-form="initialForm"
      :response-map="responseMap"
      :show-detail="false"
      add-text="录入销售结果"
      :before-submit="beforeSubmit"
      :row-permission="
        (item: YdlSalesResult) => ({ edit: item.isSelfData, delete: item.isSelfData })
      "
    >
      <!-- ==================== 列表行 ==================== -->
      <template #item="{ item }">
        <div class="r-row">
          <span class="r-name">{{ item.realName }}</span>
          <van-tag :color="ydlSalesResultColor(item.saleFlag)">
            {{ YDL_SALES_RESULT[item.saleFlag] }}
          </van-tag>
        </div>
        <template v-if="isSuccess(item)">
          <div class="r-meta">
            <van-icon name="gold-coin-o" />
            <span>销售归属：{{ YDL_SALE_TYPE[item.saleType] }}</span>
          </div>
          <div class="r-meta">
            <van-icon name="description" />
            <span>保单号：{{ item.policyNo }}</span>
          </div>
          <div class="r-meta">
            <van-icon name="balance-o" />
            <span>保费：¥{{ item.policyFee }}</span>
          </div>
        </template>
        <div class="r-meta r-time">
          <van-icon name="clock-o" />
          <span>录入时间 {{ item.createTime }}</span>
        </div>
      </template>

      <!-- ==================== 新增 / 编辑 表单（4.1.3 录入销售结果） ==================== -->
      <template #form="{ form, isEdit }">
        <van-cell-group inset title="销售信息" class="picc-card">
          <VantSelectField
            v-model="form.saleType"
            :options="saleTypeOptions"
            label="销售归属"
            title="选择销售归属"
            placeholder="请选择销售归属"
            required
          />
          <van-field
            v-model="form.policyNo"
            label="保单号"
            placeholder="请输入保单号（失焦自动带出保费）"
            :rules="[{ required: true, message: '请填写保单号' }]"
            :disabled="loadingPolicy"
            @blur="onPolicyNoBlur(form.policyNo, form)"
          />
          <van-field
            v-model="form.policyFee"
            label="保费"
            type="number"
            placeholder="自动带出（只读）"
            readonly
          />
        </van-cell-group>
        <div v-if="!isEdit" class="r-tip">
          说明：销售结果仅支持成功（Y）录入，保费由保单号自动带出。
        </div>
      </template>
    </VantList>
  </div>
</template>

<style scoped>
.r-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.r-name {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
}
.r-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}
.r-time {
  color: #969799;
}
.r-tip {
  padding: 8px 16px;
  font-size: 12px;
  color: #969799;
}
</style>
