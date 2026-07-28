<script setup lang="ts">
/**
 * YdlJcDecision —— 千万级企业决策通用看板（§5 客户渗透率 / 新续企业增量保费 共用）
 *
 * 筛选：分支公司（机构树）→ comdcode、报告日期（下拉 reportdate，默认最后一项）、
 * 产品线（reporttype 全量/商团，默认全量）。结果一次全量返回，横向滚动表格，
 * 首列（分支公司）吸左；比例字段（0~1）前端 *100 + '%'。
 */
import { ref, onMounted } from 'vue'
import { showLoadingToast, closeToast, showToast } from 'vant'
import VantSelectField from '../VantSelectField.vue'
import VantTreeSelectField from '../VantTreeSelectField.vue'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import type { DeptNode } from '@/api/modules/ydl/dict'
import { getYdlJcEnterpriseItemSelectDates } from '@/api/modules/ydl/dict'

export interface JcColumn {
  label: string
  key: string
  /** 比例字段（0~1）→ *100 + '%' */
  percent?: boolean
  /** 金额字段 → 千分位 */
  money?: boolean
}

const props = defineProps<{
  title: string
  apiFn: (q: Record<string, any>) => Promise<Record<string, any>[]>
  columns: JcColumn[]
}>()

const { loadDeptTree } = useYdlDict()

const query = ref<Record<string, any>>({
  comdcode: '',
  reportdate: '',
  reporttype: '全量',
})

// 分支公司树（sys/sysDepart/queryTreeListAll 原始树，直接喂给 VantTreeSelectField）
const deptTreeData = ref<DeptNode[]>([])
const dateOptions = ref<{ text: string; value: string }[]>([])
const typeOptions = [
  { text: '全量', value: '全量' },
  { text: '商团', value: '商团' },
]

const rows = ref<Record<string, any>[]>([])
const loading = ref(false)

async function onSearch() {
  loading.value = true
  showLoadingToast({ message: '加载中', forbidClick: true, duration: 0 })
  try {
    const data = await props.apiFn({
      comdcode: query.value.comdcode || undefined,
      reportdate: query.value.reportdate || undefined,
      reporttype: query.value.reporttype || undefined,
    })
    rows.value = Array.isArray(data) ? data : []
  } catch {
    showToast('加载失败')
    rows.value = []
  } finally {
    loading.value = false
    closeToast()
  }
}

function fmt(col: JcColumn, row: Record<string, any>): string {
  const v = row[col.key]
  if (v == null || v === '') return '-'
  if (col.percent) return (Number(v) * 100).toFixed(1) + '%'
  if (col.money) return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return String(v)
}

onMounted(async () => {
  try {
    const [tree, dates] = await Promise.all([loadDeptTree(), getYdlJcEnterpriseItemSelectDates()])
    deptTreeData.value = tree
    const ds = dates?.dates || []
    dateOptions.value = ds.map((d: string) => ({ text: d, value: d }))
    if (ds.length) query.value.reportdate = ds[ds.length - 1] // 默认最后一项
  } catch {
    /* 下拉加载失败不阻塞 */
  }
  onSearch()
})
</script>

<template>
  <div class="ydl-jc picc-page">
    <van-nav-bar :title="title" class="van-nav-bar--picc-primary" left-text="返回" left-arrow @click-left="$router.back()" />

    <van-cell-group inset class="picc-card s-filter">
      <VantTreeSelectField
        v-model="query.comdcode"
        :options="deptTreeData"
        value-key="orgCode"
        label-key="title"
        children-key="children"
        select-parent
        label="分支公司"
        title="选择分支公司"
        placeholder="全部机构"
        clearable
        @change="onSearch"
      />
      <VantSelectField
        v-model="query.reportdate"
        :options="dateOptions"
        label="报告日期"
        title="选择报告日期"
        placeholder="请选择"
        @change="onSearch"
      />
      <VantSelectField
        v-model="query.reporttype"
        :options="typeOptions"
        label="产品线"
        title="选择产品线"
        @change="onSearch"
      />
    </van-cell-group>

    <div v-if="loading" class="s-loading"><van-loading size="24">加载中…</van-loading></div>
    <div v-else class="s-table-wrap">
      <table class="s-table">
        <thead>
          <tr>
            <th class="s-sticky">分支公司</th>
            <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in rows" :key="i">
            <td class="s-sticky s-branch">{{ row.comzname }}</td>
            <td v-for="col in columns" :key="col.key" :class="{ 'is-pct': col.percent, 'is-money': col.money }">
              {{ fmt(col, row) }}
            </td>
          </tr>
        </tbody>
      </table>
      <van-empty v-if="!rows.length" description="暂无数据" />
    </div>
    <div class="bottom-spacer" />
  </div>
</template>

<style scoped>
.ydl-jc {
  min-height: 100vh;
  background: #f5f6f8;
}
.s-filter {
  margin: 12px;
}
.s-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.s-table-wrap {
  margin: 0 12px;
  overflow-x: auto;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.s-table {
  border-collapse: collapse;
  font-size: 12px;
  width: max-content;
  min-width: 100%;
}
.s-table th,
.s-table td {
  border: 1px solid #f0f0f0;
  padding: 8px 10px;
  white-space: nowrap;
  text-align: center;
  color: #323233;
}
.s-table thead th {
  background: #fafafa;
  font-weight: 700;
  position: sticky;
  top: 0;
  z-index: 2;
}
.s-sticky {
  position: sticky;
  left: 0;
  background: #fff;
  font-weight: 600;
  z-index: 1;
}
.s-table thead .s-sticky {
  z-index: 3;
  background: #fafafa;
}
.s-branch {
  text-align: left;
  color: #1a1a1a;
}
.s-table td.is-pct {
  color: #1989fa;
}
.s-table td.is-money {
  color: #d71920;
}
.bottom-spacer {
  height: 40px;
}
</style>
