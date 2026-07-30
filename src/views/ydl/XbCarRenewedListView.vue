<script setup lang="ts">
/**
 * 车险我的续保（需求文档 §7.1 `/xbCar/renewedList`）
 * 车险续保保单列表 → 详情（renewedSearchByPolicyNo 基本信息 / 反馈回显）→ 行内操作：
 * 续保反馈 / 项目终止 / 取消终止 / 退回业务（均按需求 §7.1 按钮权限与操作）。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import VantSelectField from '@/components/VantSelectField.vue'
import VantTreeSelectField from '@/components/VantTreeSelectField.vue'
import VantCalendarField from '@/components/VantCalendarField.vue'
import type { DeptNode } from '@/api/modules/ydl/dict'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import {
  getYdlXbCarRenewedList,
  getYdlXbCarCurrentFeedback,
  getYdlXbCarRenewedSearchByPolicyNo,
  postYdlXbCarEndInput,
  postYdlXbCarEndPass,
  postYdlXbCarBack,
  postYdlXbCarRenewedInput,
  type YdlXbCarRow,
} from '@/api/modules/ydl/ydl-xb-car'

const router = useRouter()
const { loadDeptTree, loadDictItems } = useYdlDict()

const api: CrudApi<YdlXbCarRow, any, any> = {
  list: getYdlXbCarRenewedList,
}

const initialQuery = reactive({
  orgCode: '',
  enddateRange: [] as string[],
  licenseno: '',
  frameno: '',
  policyno: '',
  energyflag: '',
  renewedStatus: '',
  showStatus: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptTreeData = ref<DeptNode[]>([])
const energyOptions = ref<{ text: string; value: string }[]>([])
const renewedStatusOptions = ref<{ text: string; value: string }[]>([])
const showStatusOptions = ref<{ text: string; value: string }[]>([])
const endTypeOptions = ref<{ text: string; value: string }[]>([])

const showStatusMap = reactive<Record<string, Record<string, string>>>({})
const energyMap = reactive<Record<string, Record<string, string>>>({})
const renewedStatusMap = reactive<Record<string, Record<string, string>>>({})

onMounted(async () => {
  try {
    const [tree, en, rs, ss, et] = await Promise.all([
      loadDeptTree(),
      loadDictItems('YN_FLAG'),
      loadDictItems('RENEWED_STATUS2'),
      loadDictItems('SHOW_STATUS'),
      loadDictItems('CAR_RENEWED_END_INPUT_TYPE'),
    ])
    deptTreeData.value = tree
    energyOptions.value = en.map((c) => ({ text: c.text, value: c.value }))
    renewedStatusOptions.value = rs.map((c) => ({ text: c.text, value: c.value }))
    showStatusOptions.value = ss.map((c) => ({ text: c.text, value: c.value }))
    endTypeOptions.value = et.map((c) => ({ text: c.text, value: c.value }))
    energyMap['YN_FLAG'] = Object.fromEntries(en.map((c) => [String(c.value), c.text]))
    renewedStatusMap['RENEWED_STATUS2'] = Object.fromEntries(
      rs.map((c) => [String(c.value), c.text]),
    )
    showStatusMap['SHOW_STATUS'] = Object.fromEntries(ss.map((c) => [String(c.value), c.text]))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

// ==================== 详情（renewedSearchByPolicyNo 基本信息 + 反馈回显） ====================
const detailItem = ref<YdlXbCarRow | null>(null)
const detailData = ref<YdlXbCarRow | null>(null)
const detailLoading = ref(false)
const detailEcho = ref('')
async function onDetail(item: YdlXbCarRow) {
  detailItem.value = item
  detailData.value = null
  detailEcho.value = '加载中...'
  detailLoading.value = true
  try {
    const [info, fb] = await Promise.all([
      getYdlXbCarRenewedSearchByPolicyNo({ policyNo: item.policyno }),
      getYdlXbCarCurrentFeedback({ policyNo: item.policyno }),
    ])
    detailData.value = info || null
    detailEcho.value = fb?.feedbackContent || '暂无反馈'
  } catch {
    detailEcho.value = '暂无反馈'
  } finally {
    detailLoading.value = false
  }
}

// ==================== 续保反馈（权限 Feedback，EditModalFeedback，带回显） ====================
// 表单字段（需求 §7.1 源码提取）：renewedStart(预计签单时间,日历) + feedback(文本域)，均必填
const fbVisible = ref(false)
const fbEcho = ref('')
const fbDayFlag = ref<number | ''>('')
const fbRenewedStart = ref('')
const fbFeedback = ref('')
const fbItem = ref<YdlXbCarRow | null>(null)
const fbSubmitting = ref(false)
async function openFeedback(item: YdlXbCarRow) {
  fbItem.value = item
  fbRenewedStart.value = ''
  fbFeedback.value = ''
  fbEcho.value = '加载中...'
  fbDayFlag.value = ''
  fbVisible.value = true
  try {
    const res = await getYdlXbCarCurrentFeedback({ policyNo: item.policyno })
    fbEcho.value = res?.feedbackContent || '暂无历史反馈'
    fbDayFlag.value = res?.dayFlag ?? ''
  } catch {
    fbEcho.value = '暂无历史反馈'
  }
}
// 标题随回显 dayFlag 动态显示：dayFlag>=0 脱保，否则到期前 |dayFlag| 天续保反馈
const fbTitle = computed(() => {
  const d = fbDayFlag.value
  if (d === '') return '续保反馈'
  const n = Number(d)
  return n >= 0 ? '脱保' : `到期前${Math.abs(n)}天续保反馈`
})
async function onSubmitFeedback() {
  if (!fbRenewedStart.value) {
    showToast('请选择预计签单时间')
    return
  }
  if (!fbFeedback.value || fbFeedback.value.trim().length < 10) {
    showToast('反馈内容至少 10 个字')
    return
  }
  if (!fbItem.value) return
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbCarRenewedInput({
      id: fbItem.value.id,
      renewedStart: fbRenewedStart.value,
      feedback: fbFeedback.value,
      dayFlag: fbDayFlag.value === '' ? 0 : Number(fbDayFlag.value),
    })
    showToast('反馈提交成功')
    fbVisible.value = false
  } catch {
    showToast('提交失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

// ==================== 项目终止（权限 RenewedEndInput & endBtnStatus===1） ====================
const endVisible = ref(false)
const endForm = reactive({ type: '', content: '' })
const endItem = ref<YdlXbCarRow | null>(null)
function openEnd(item: YdlXbCarRow) {
  endItem.value = item
  Object.assign(endForm, { type: '', content: '' })
  endVisible.value = true
}
async function onSubmitEnd() {
  if (!endForm.type) {
    showToast('请选择终止原因')
    return
  }
  if (!endForm.content || endForm.content.trim().length < 10) {
    showToast('说明至少 10 个字')
    return
  }
  if (!endItem.value) return
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbCarEndInput({
      id: endItem.value.id,
      type: endForm.type,
      content: endForm.content,
    })
    showToast('项目终止提交成功')
    endVisible.value = false
  } catch {
    showToast('提交失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

// ==================== 取消终止（权限 RenewedEndInput & endBtnStatus===2，直接调用） ====================
async function onCancelEnd(item: YdlXbCarRow) {
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbCarEndPass({ pass: 3, id: item.id })
    showToast('已取消终止')
  } catch {
    showToast('操作失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

// ==================== 退回业务（权限 RenewedBack） ====================
const backVisible = ref(false)
const backContent = ref('')
const backItem = ref<YdlXbCarRow | null>(null)
function openBack(item: YdlXbCarRow) {
  backItem.value = item
  backContent.value = ''
  backVisible.value = true
}
async function onSubmitBack() {
  if (!backContent.value || backContent.value.trim().length < 10) {
    showToast('退回原因至少 10 个字')
    return
  }
  if (!backItem.value) return
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbCarBack({ id: backItem.value.id, content: backContent.value })
    showToast('退回业务提交成功')
    backVisible.value = false
  } catch {
    showToast('提交失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

const baseInfo = (row: YdlXbCarRow) => [
  { label: '投保人', value: row.appliname },
  { label: '被保险人', value: row.insuredname },
  { label: '车牌号', value: row.licenseno },
  { label: '车架号', value: row.frameno },
  {
    label: '新能源',
    value: energyMap['YN_FLAG']?.[String(row.energyflag)] ?? String(row.energyflag),
  },
  { label: '我方净保费', value: '¥' + Number(row.coinsnetpremium).toLocaleString('zh-CN') },
  { label: '起保', value: row.startdate },
  { label: '终保', value: row.enddate },
  { label: '保单号', value: row.policyno },
  { label: '服务经理', value: row.dutyName },
  { label: '地市', value: row.comdname },
  { label: '支公司', value: row.comzname },
  { label: '保监会分类', value: row.usenature },
]
function statusText(v: any): string {
  return showStatusMap['SHOW_STATUS']?.[String(v)] ?? String(v)
}
function statusColor(v: any): string {
  const n = Number(v)
  if (n === 2) return '#07c160'
  if (n === 3 || n === 4) return '#ee0a24'
  return '#ff976a'
}
function endBtnText(v: any): string {
  const n = Number(v)
  if (n === 1) return '可终止'
  if (n === 2) return '可取消终止'
  return '-'
}
// 列表项字段（对齐需求 §7.1 列表字段）；full 字段独占整行，其余两列网格
function carItemMeta(item: YdlXbCarRow) {
  return [
    { label: '地市', value: item.comdname },
    { label: '支公司', value: item.comzname },
    { label: '服务经理', value: item.dutyName },
    { label: '终止', value: endBtnText(item.endBtnStatus) },
    { label: '车牌号', value: item.licenseno },
    { label: '车架号', value: item.frameno },
    { label: '被保险人', value: item.insuredname },
    {
      label: '新能源',
      value: energyMap['YN_FLAG']?.[String(item.energyflag)] ?? String(item.energyflag),
    },
    { label: '起保', value: item.startdate },
    { label: '终保', value: item.enddate },
    { label: '保单号', value: item.policyno, full: true },
    {
      label: '我方净保费',
      value: '¥' + Number(item.coinsnetpremium).toLocaleString('zh-CN'),
      full: true,
    },
  ]
}
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar
      title="车险我的续保"
      class="van-nav-bar--picc-primary"
      left-text="返回"
      left-arrow
      @click-left="router.back()"
    />

    <VantList
      :api="api"
      :title="''"
      :initial-query="initialQuery"
      :response-map="responseMap"
      search-placeholder="搜索车牌号"
      keyword-key="licenseno"
      :show-add="false"
      :show-edit="false"
      :show-delete="false"
      :free-actions="['view']"
      @detail="onDetail"
    >
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <VantTreeSelectField
            v-model="query.orgCode"
            :options="deptTreeData"
            value-key="orgCode"
            label-key="title"
            children-key="children"
            select-parent
            label="分支公司"
            title="选择分支公司"
            placeholder="全部机构"
            clearable
          />
          <VantCalendarField
            v-model="query.enddateRange"
            type="range"
            label="终保日期"
            title="选择终保日期区间"
            placeholder="选择时间区间"
          />
          <van-field
            v-model="query.licenseno"
            label="车牌号"
            placeholder="输入车牌号"
            input-align="right"
          />
          <van-field
            v-model="query.frameno"
            label="车架号"
            placeholder="输入车架号"
            input-align="right"
          />
          <van-field
            v-model="query.policyno"
            label="保单号"
            placeholder="输入保单号"
            input-align="right"
          />
          <VantSelectField
            v-model="query.energyflag"
            :options="energyOptions"
            label="新能源"
            title="是否新能源"
            placeholder="全部"
            clearable
          />
          <VantSelectField
            v-model="query.renewedStatus"
            :options="renewedStatusOptions"
            label="续保状态"
            title="选择续保状态"
            placeholder="全部"
            clearable
          />
          <VantSelectField
            v-model="query.showStatus"
            :options="showStatusOptions"
            label="保单状态"
            title="选择保单状态"
            placeholder="全部"
            clearable
          />
        </van-cell-group>
      </template>

      <template #item="{ item }">
        <div class="r-head">
          <span class="r-name">{{ item.appliname }}</span>
          <van-tag :color="statusColor(item.showStatus)" text-color="#fff" size="medium">
            {{ statusText(item.showStatus) }}
          </van-tag>
        </div>
        <div class="r-grid">
          <div
            v-for="m in carItemMeta(item)"
            :key="m.label"
            class="r-cell"
            :class="{ 'r-cell--full': m.full }"
          >
            <span class="r-label">{{ m.label }}</span>
            <span class="r-value">{{ m.value }}</span>
          </div>
        </div>
      </template>

      <!-- 行内操作按钮：权限 + endBtnStatus 双重门禁 -->
      <template #row-actions="{ item }">
        <van-button
          v-permission="'xbCarRenewedList:Feedback'"
          size="small"
          type="primary"
          @click="openFeedback(item)"
          >续保反馈</van-button
        >
        <van-button
          v-permission="'xbCarRenewedList:RenewedEndInput'"
          v-if="item.endBtnStatus === 1"
          size="small"
          type="danger"
          @click="openEnd(item)"
          >项目终止</van-button
        >
        <van-button
          v-permission="'xbCarRenewedList:RenewedEndInput'"
          v-if="item.endBtnStatus === 2"
          size="small"
          @click="onCancelEnd(item)"
          >取消终止</van-button
        >
        <van-button
          v-permission="'xbCarRenewedList:RenewedBack'"
          size="small"
          @click="openBack(item)"
          >退回业务</van-button
        >
      </template>

      <template #detail="{ item }">
        <van-tabs>
          <van-tab title="基本信息">
            <van-cell-group inset title="保单信息" class="picc-card">
              <van-cell v-if="detailLoading" title="加载中..." />
              <template v-else>
                <van-cell
                  v-for="c in baseInfo(detailData || item)"
                  :key="c.label"
                  :title="c.label"
                  :value="c.value"
                />
                <van-cell title="保单状态">
                  <van-tag
                    :color="statusColor((detailData || item).showStatus)"
                    text-color="#fff"
                    >{{ statusText((detailData || item).showStatus) }}</van-tag
                  >
                </van-cell>
              </template>
            </van-cell-group>
          </van-tab>
          <van-tab title="反馈">
            <van-cell-group inset title="反馈" class="picc-card">
              <van-cell title="历史反馈" :label="detailEcho" />
            </van-cell-group>
          </van-tab>
        </van-tabs>
      </template>
    </VantList>

    <!-- 续保反馈弹层（EditModalFeedback：预计签单时间 + 反馈内容，回显 dayFlag 标题） -->
    <van-popup
      v-model:show="fbVisible"
      position="bottom"
      round
      :style="{ height: '75%' }"
      closeable
    >
      <div class="op-popup">
        <h3 class="op-title">{{ fbTitle }}</h3>
        <van-cell-group inset>
          <van-cell title="历史反馈" :label="fbEcho" />
          <VantCalendarField
            v-model="fbRenewedStart"
            type="single"
            label="预计签单时间"
            title="选择预计签单时间"
            placeholder="请选择"
          />
          <van-field
            v-model="fbFeedback"
            label="反馈内容"
            type="textarea"
            rows="3"
            autosize
            placeholder="请输入反馈内容（≥10字）"
          />
        </van-cell-group>
        <div class="fb-submit">
          <van-button type="primary" block round :loading="fbSubmitting" @click="onSubmitFeedback">
            提交反馈
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 项目终止弹层 -->
    <van-popup
      v-model:show="endVisible"
      position="bottom"
      round
      :style="{ height: '70%' }"
      closeable
    >
      <div class="op-popup">
        <h3 class="op-title">项目终止</h3>
        <van-cell-group inset>
          <VantSelectField
            v-model="endForm.type"
            :options="endTypeOptions"
            label="终止原因"
            title="选择终止原因"
            placeholder="请选择"
            required
          />
          <van-field
            v-model="endForm.content"
            label="说明"
            type="textarea"
            rows="3"
            autosize
            required
            placeholder="请输入说明（≥10字）"
          />
        </van-cell-group>
        <div class="fb-submit">
          <van-button type="danger" block round :loading="fbSubmitting" @click="onSubmitEnd">
            提交终止
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 退回业务弹层 -->
    <van-popup
      v-model:show="backVisible"
      position="bottom"
      round
      :style="{ height: '60%' }"
      closeable
    >
      <div class="op-popup">
        <h3 class="op-title">退回业务</h3>
        <van-cell-group inset>
          <van-field
            v-model="backContent"
            label="退回原因"
            type="textarea"
            rows="3"
            autosize
            required
            placeholder="请输入退回原因（≥10字）"
          />
        </van-cell-group>
        <div class="fb-submit">
          <van-button type="primary" block round :loading="fbSubmitting" @click="onSubmitBack">
            提交退回
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.ydl-detail-page {
  min-height: 100vh;
  background: var(--app-bg);
}
.f-group {
  margin: 8px 12px;
}
.r-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.r-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
}
.r-meta {
  font-size: 13px;
  color: var(--app-text-2);
  margin-top: 3px;
}
.r-label {
  color: var(--app-text-3);
}
.r-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 4px;
}
.r-cell {
  width: 50%;
  display: flex;
  align-items: baseline;
  font-size: 12px;
  line-height: 18px;
  padding: 1px 0;
}
.r-cell--full {
  width: 100%;
}
.r-cell .r-label {
  color: var(--app-text-3);
  flex-shrink: 0;
  margin-right: 2px;
}
.r-cell .r-value {
  color: var(--app-text);
  word-break: break-all;
}
.fb-submit {
  padding: 14px 4px 4px;
}
.op-popup {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0 40px;
  box-sizing: border-box;
}
.op-title {
  text-align: center;
  font-size: 17px;
  margin: 0 0 12px;
  color: var(--app-text);
}
.op-popup :deep(.van-cell-group) {
  flex: 1;
  overflow-y: auto;
}
</style>
