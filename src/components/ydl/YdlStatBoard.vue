<script setup lang="ts">
/**
 * YdlStatBoard —— 数据统计模块通用看板（数据汇总 / 跟踪统计 / 劳效统计 共用）
 *
 * 对应需求文档 §3：顶部筛选（分支公司 / 统计时间区间 / 归属渠道 / 保源标签），
 * 下方按机构维度渲染统计卡片；后端返回**数组**，首行 departName='合计' 高亮。
 * 统计类接口无分页，一次全量返回。
 *
 * 用法：传入 title / apiFn（返回 row[]）/ columns（列定义）/ showLabel（是否显示标签筛选）。
 */
import { ref, onMounted } from 'vue'
import { showLoadingToast, closeToast, showToast } from 'vant'
import VantSelectField from '../VantSelectField.vue'
import VantTreeSelectField from '../VantTreeSelectField.vue'
import VantCalendarField from '../VantCalendarField.vue'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import type { DeptNode } from '@/api/modules/ydl/dict'

export interface StatColumn {
  label: string
  key: string
  /** 金额列：toLocaleString 千分位 + 保留两位小数 */
  money?: boolean
}

const props = defineProps<{
  title: string
  /** 返回 row 数组的统计接口（如 getYdlAnalysis） */
  apiFn: (q: Record<string, any>) => Promise<Record<string, any>[]>
  columns: StatColumn[]
  /** 是否显示保源标签筛选（跟踪/劳效统计需要），默认 true */
  showLabel?: boolean
}>()

const { loadDeptTree, loadDictItems, loadLabelNode } = useYdlDict()

// ==================== 筛选条件 ====================
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

const query = ref<Record<string, any>>({
  orgCode: '',
  begin: lastMonthFirst(),
  end: yesterday(),
  sourceChannel: '',
  labelName: '',
})

// 统计时间区间（range）→ query.begin / query.end
const statTimeRange = ref<string[]>([lastMonthFirst(), yesterday()])
function onStatTimeChange(val: string[] | string) {
  if (Array.isArray(val) && val.length === 2) {
    query.value.begin = val[0]
    query.value.end = val[1]
  } else {
    query.value.begin = ''
    query.value.end = ''
  }
}

// 分支公司树（sys/sysDepart/queryTreeListAll 原始树，直接喂给 VantTreeSelectField）
const deptTreeData = ref<DeptNode[]>([])
const channelOptions = ref<{ text: string; value: string }[]>([])
const labelOptions = ref<{ text: string; value: string }[]>([])

const rows = ref<Record<string, any>[]>([])
const loading = ref(false)

async function onSearch() {
  loading.value = true
  showLoadingToast({ message: '加载中', forbidClick: true, duration: 0 })
  try {
    const data = await props.apiFn({
      orgCode: query.value.orgCode || undefined,
      begin: query.value.begin,
      end: query.value.end,
      sourceChannel: query.value.sourceChannel || undefined,
      labelName: query.value.labelName || undefined,
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

function fmt(col: StatColumn, row: Record<string, any>): string {
  const v = row[col.key]
  if (v == null || v === '') return '-'
  if (col.money) {
    const n = Number(v)
    return (
      '¥' +
      (isNaN(n)
        ? v
        : n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    )
  }
  return String(v)
}

onMounted(async () => {
  try {
    const [tree, channel, labels] = await Promise.all([
      loadDeptTree(),
      loadDictItems('source_channel'),
      props.showLabel === false ? Promise.resolve([]) : loadLabelNode(),
    ])
    deptTreeData.value = tree
    channelOptions.value = (channel || []).map((c) => ({ text: c.text, value: c.value }))
    labelOptions.value = (labels || []).map((l) => ({ text: l.name, value: l.id }))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
  onSearch()
})
</script>

<template>
  <div class="ydl-stat picc-page">
    <van-nav-bar
      :title="title"
      class="van-nav-bar--picc-primary"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <!-- 筛选 -->
    <van-cell-group inset class="picc-card s-filter">
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
        @change="onSearch"
      />
      <VantCalendarField
        v-model="statTimeRange"
        type="range"
        label="统计时间"
        title="统计时间区间"
        placeholder="开始 ~ 结束"
        clearable
        @change="onStatTimeChange"
      />
      <VantSelectField
        v-model="query.sourceChannel"
        :options="channelOptions"
        label="归属渠道"
        title="选择归属渠道"
        placeholder="全部渠道"
        clearable
        @change="onSearch"
      />
      <VantSelectField
        v-if="showLabel !== false"
        v-model="query.labelName"
        :options="labelOptions"
        label="保源标签"
        title="选择保源标签"
        placeholder="全部标签"
        clearable
        @change="onSearch"
      />
    </van-cell-group>

    <!-- 结果：按机构渲染卡片，首行=合计 高亮 -->
    <div v-if="loading" class="s-loading"><van-loading size="24">加载中…</van-loading></div>
    <template v-else>
      <div
        v-for="(row, i) in rows"
        :key="i"
        class="picc-card s-row"
        :class="{ 's-total': i === 0 }"
      >
        <div class="s-org">{{ row.departName }}</div>
        <div class="s-grid">
          <div v-for="col in columns" :key="col.key" class="s-cell">
            <span class="s-cell-label">{{ col.label }}</span>
            <span class="s-cell-value" :class="{ 'is-money': col.money }">{{ fmt(col, row) }}</span>
          </div>
        </div>
      </div>
      <van-empty v-if="!rows.length" description="暂无数据" />
    </template>

    <div class="bottom-spacer" />
  </div>
</template>

<style scoped>
.ydl-stat {
  min-height: 100vh;
  box-sizing: border-box;
  padding-bottom: 20px;
}
.s-filter {
  margin: 12px;
}
.s-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.s-row {
  margin: 12px;
  padding: 12px 14px;
}
.s-total {
  border-left: 4px solid var(--van-primary-color);
}
/* 合计行（首行=合计）的淡红渐变底为 PICC 品牌样式，见 vant-picc.css 的
   html.picc-skin .s-total；Vant 皮肤下不显示渐变底（避免蓝色调不搭）。 */
.s-org {
  font-size: 15px;
  font-weight: 700;
  color: var(--app-text);
  margin-bottom: 10px;
}
.s-total .s-org {
  color: var(--van-primary-color);
}
.s-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px 8px;
}
.s-cell {
  display: flex;
  flex-direction: column;
}
.s-cell-label {
  font-size: 11px;
  color: var(--app-text-3);
}
.s-cell-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
  margin-top: 2px;
}
.s-cell-value.is-money {
  color: var(--van-primary-color);
}
.bottom-spacer {
  height: 40px;
}
</style>
