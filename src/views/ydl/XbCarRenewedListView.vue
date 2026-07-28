<script setup lang="ts">
/**
 * 车险我的续保（需求文档 §7.1 `/xbCar/renewedList`）
 * 车险续保保单列表 → 详情（基本信息）→ 续保反馈。
 */
import { ref, reactive, onMounted } from 'vue'
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
  type YdlXbCarRow,
} from '@/api/modules/ydl/ydl-xb-car'
import { postYdlXbFeedback, XB_FEEDBACK_API } from '@/api/modules/ydl/ydl-xb'

const router = useRouter()
const { loadDeptTree, loadDictItems } = useYdlDict()

const api: CrudApi<YdlXbCarRow, any, any> = {
  list: getYdlXbCarRenewedList,
}

function lastMonthFirst(): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}
function yesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
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

const showStatusMap = reactive<Record<string, Record<string, string>>>({})
const energyMap = reactive<Record<string, Record<string, string>>>({})
const renewedStatusMap = reactive<Record<string, Record<string, string>>>({})

onMounted(async () => {
  try {
    const [tree, en, rs, ss] = await Promise.all([
      loadDeptTree(),
      loadDictItems('YN_FLAG'),
      loadDictItems('RENEWED_STATUS2'),
      loadDictItems('SHOW_STATUS'),
    ])
    deptTreeData.value = tree
    energyOptions.value = en.map((c) => ({ text: c.text, value: c.value }))
    renewedStatusOptions.value = rs.map((c) => ({ text: c.text, value: c.value }))
    showStatusOptions.value = ss.map((c) => ({ text: c.text, value: c.value }))
    energyMap['YN_FLAG'] = Object.fromEntries(en.map((c) => [String(c.value), c.text]))
    renewedStatusMap['RENEWED_STATUS2'] = Object.fromEntries(rs.map((c) => [String(c.value), c.text]))
    showStatusMap['SHOW_STATUS'] = Object.fromEntries(ss.map((c) => [String(c.value), c.text]))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

// ==================== 详情 + 反馈 ====================
const detailItem = ref<YdlXbCarRow | null>(null)
const fbContent = ref('')
const fbSubmitting = ref(false)

async function onDetail(item: YdlXbCarRow) {
  detailItem.value = item
  fbContent.value = ''
}

async function onSubmitFeedback() {
  if (!fbContent.value || fbContent.value.trim().length < 5) {
    showToast('反馈内容至少 5 个字')
    return
  }
  if (!detailItem.value) return
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbFeedback(XB_FEEDBACK_API.renewed, {
      id: detailItem.value.id,
      content: fbContent.value,
    } as any)
    showToast('反馈提交成功')
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
  { label: '新能源', value: energyMap['YN_FLAG']?.[String(row.energyflag)] ?? String(row.energyflag) },
  { label: '我方净保费', value: '¥' + Number(row.coinsnetpremium).toLocaleString('zh-CN') },
  { label: '起保', value: row.startdate },
  { label: '终保', value: row.enddate },
  { label: '保单号', value: row.policyno },
  { label: '服务经理', value: row.dutyName },
  { label: '地市', value: row.comdname },
  { label: '支公司', value: row.comzname },
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
// 列表项字段（对齐需求 §7.1 列表字段）
function carItemMeta(item: YdlXbCarRow) {
  return [
    { label: '地市', value: item.comdname },
    { label: '支公司', value: item.comzname },
    { label: '服务经理', value: item.dutyName },
    { label: '车牌号', value: item.licenseno },
    { label: '车架号', value: item.frameno },
    { label: '新能源', value: energyMap['YN_FLAG']?.[String(item.energyflag)] ?? String(item.energyflag) },
    { label: '被保险人', value: item.insuredname },
    { label: '我方净保费', value: '¥' + Number(item.coinsnetpremium).toLocaleString('zh-CN') },
    { label: '起保', value: item.startdate },
    { label: '终保', value: item.enddate },
    { label: '保单号', value: item.policyno },
    { label: '终止按钮状态', value: endBtnText(item.endBtnStatus) },
  ]
}
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar title="车险我的续保" class="van-nav-bar--picc-primary" left-text="返回" left-arrow @click-left="router.back()" />

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
      show-more
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
          <van-field v-model="query.licenseno" label="车牌号" placeholder="输入车牌号" input-align="right" />
          <van-field v-model="query.frameno" label="车架号" placeholder="输入车架号" input-align="right" />
          <van-field v-model="query.policyno" label="保单号" placeholder="输入保单号" input-align="right" />
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
        <div v-for="m in carItemMeta(item)" :key="m.label" class="r-meta">
          <span class="r-label">{{ m.label }}：</span>{{ m.value }}
        </div>
      </template>

      <template #detail="{ item }">
        <van-cell-group inset title="保单信息" class="picc-card">
          <van-cell v-for="c in baseInfo(item)" :key="c.label" :title="c.label" :value="c.value" />
          <van-cell title="保单状态">
            <van-tag :color="statusColor(item.showStatus)" text-color="#fff">{{ statusText(item.showStatus) }}</van-tag>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="续保反馈" class="picc-card">
          <van-field
            v-model="fbContent"
            label="反馈内容"
            type="textarea"
            rows="2"
            autosize
            placeholder="请输入反馈内容（≥5字）"
          />
          <div class="fb-submit">
            <van-button type="primary" block round :loading="fbSubmitting" @click="onSubmitFeedback">
              提交反馈
            </van-button>
          </div>
        </van-cell-group>
      </template>
    </VantList>
  </div>
</template>

<style scoped>
.ydl-detail-page {
  min-height: 100vh;
  background: #f5f6f8;
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
  color: #1a1a1a;
}
.r-meta {
  font-size: 13px;
  color: #666;
  margin-top: 3px;
}
.r-label {
  color: #999;
}
.fb-submit {
  padding: 14px 4px 4px;
}
</style>
