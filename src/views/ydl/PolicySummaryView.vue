<script setup lang="ts">
/**
 * 签单明细（需求文档 §3.5 `/policy-summary`）
 * 分页大表；更多查询：机构 / 统计时间 / 标签 / 渠道；行「更多 → 详情」展示全部字段；
 * 更多查询面板内置「导出推送」（后端企业微信推送）。
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
  getYdlPolicySummary,
  exportYdlPolicySummary,
  type YdlPolicySummaryRow,
} from '@/api/modules/ydl/ydl-statistics'

const router = useRouter()
const { loadDeptTree, loadDictItems, loadLabelNode } = useYdlDict()

const api: CrudApi<YdlPolicySummaryRow, any, any> = {
  list: getYdlPolicySummary,
}

// 统计时间默认 上月1号 ~ 昨天
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
  begin: lastMonthFirst(),
  end: yesterday(),
  labelName: '',
  sourceChannel: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptTreeData = ref<DeptNode[]>([])
const channelOptions = ref<{ text: string; value: string }[]>([])
const labelOptions = ref<{ text: string; value: string }[]>([])

const renewMap: Record<string, string> = { '1': '无此单', '2': '续保', '3': '新保' }
const matchMap: Record<string, string> = { '0': '否', '1': '是' }

onMounted(async () => {
  try {
    const [tree, channel, labels] = await Promise.all([
      loadDeptTree(),
      loadDictItems('source_channel'),
      loadLabelNode(),
    ])
    deptTreeData.value = tree
    channelOptions.value = channel.map((c) => ({ text: c.text, value: c.value }))
    labelOptions.value = labels.map((l) => ({ text: l.name, value: l.id }))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

// 统计时间区间（range）→ query.begin / query.end
function onStatTimeChange(val: string[] | string, q: Record<string, any>) {
  if (Array.isArray(val) && val.length === 2) {
    q.begin = val[0]
    q.end = val[1]
  } else {
    q.begin = ''
    q.end = ''
  }
}

function summary(item: YdlPolicySummaryRow): { label: string; value: string }[] {
  return [
    { label: '客户', value: item.customerName },
    { label: '保单号', value: item.policyNo },
    { label: '业务员', value: item.taskUserRealName },
    { label: '续保/新保', value: renewMap[String(item.renewFlag)] || String(item.renewFlag) },
    {
      label: '我方净保费',
      value:
        '¥' +
        Number(item.policyFee).toLocaleString('zh-CN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    { label: '起保时间', value: item.bgnDate },
  ]
}

const policyDetailFields: {
  label: string
  key: string
  map?: Record<string, string>
  money?: boolean
}[] = [
  { label: '上级机构', key: 'parentName' },
  { label: '机构名称', key: 'departName' },
  { label: '业务员', key: 'taskUserRealName' },
  { label: '客户名称', key: 'customerName' },
  { label: '保单号', key: 'policyNo' },
  { label: '续保/新保', key: 'renewFlag', map: renewMap },
  { label: '我方净保费', key: 'policyFee', money: true },
  { label: '保单录入时间', key: 'createTime' },
  { label: '保单起保时间', key: 'bgnDate' },
  { label: '投保人', key: 'applicantName' },
  { label: '被保人', key: 'insuredName' },
  { label: '投/被保一致', key: 'isCustomerMatch', map: matchMap },
]
function detailValue(
  f: { key: string; map?: Record<string, string>; money?: boolean },
  item: YdlPolicySummaryRow,
): string {
  const v = (item as any)[f.key]
  if (v == null || v === '') return '-'
  if (f.map) return f.map[String(v)] ?? String(v)
  if (f.money)
    return (
      '¥' +
      Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    )
  return String(v)
}

async function onExport(q: Record<string, any>) {
  const p = { ...q }
  showLoadingToast({ message: '提交导出…', forbidClick: true })
  try {
    const r = await exportYdlPolicySummary(p)
    showToast(r?.message || '已提交导出')
  } catch {
    showToast('导出失败')
  } finally {
    closeToast()
  }
}
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar
      title="签单明细"
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
      search-placeholder="搜索客户名称"
      keyword-key="customerName"
      :show-add="false"
      :show-edit="false"
      :show-delete="false"
      show-more
      :free-actions="['view']"
      @detail="() => {}"
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
            only-selected-label
            label="分支公司"
            title="选择分支公司"
            placeholder="全部机构"
            clearable
          />
          <VantCalendarField
            :model-value="query.begin && query.end ? [query.begin, query.end] : []"
            type="range"
            label="统计时间"
            title="统计时间区间"
            placeholder="开始 ~ 结束"
            clearable
            @change="(v) => onStatTimeChange(v, query)"
          />
          <VantSelectField
            v-model="query.labelName"
            :options="labelOptions"
            label="标签"
            title="选择标签"
            placeholder="全部标签"
            clearable
          />
          <VantSelectField
            v-model="query.sourceChannel"
            :options="channelOptions"
            label="归属渠道"
            title="选择归属渠道"
            placeholder="全部渠道"
            clearable
          />
        </van-cell-group>
        <div class="f-export">
          <van-button size="small" type="primary" icon="down" @click="onExport(query)">
            导出推送
          </van-button>
        </div>
      </template>

      <template #item="{ item }">
        <div class="r-title">{{ item.customerName }}</div>
        <div class="r-grid">
          <div v-for="c in summary(item)" :key="c.label" class="r-cell">
            <span class="r-cell-label">{{ c.label }}</span>
            <span class="r-cell-value">{{ c.value }}</span>
          </div>
        </div>
      </template>

      <template #detail="{ item }">
        <van-cell-group inset title="签单信息" class="picc-card">
          <van-cell
            v-for="f in policyDetailFields"
            :key="f.key"
            :title="f.label"
            :value="detailValue(f, item)"
          />
        </van-cell-group>
      </template>
    </VantList>
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
.f-export {
  padding: 0 12px 12px;
  text-align: right;
}
.r-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-text);
  margin-bottom: 8px;
}
.r-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 6px;
}
.r-cell {
  display: flex;
  flex-direction: column;
}
.r-cell-label {
  font-size: 11px;
  color: var(--app-text-3);
}
.r-cell-value {
  font-size: 13px;
  color: var(--app-text);
  margin-top: 2px;
}
</style>
