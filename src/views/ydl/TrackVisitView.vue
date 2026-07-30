<script setup lang="ts">
/**
 * 拜访汇总（需求文档 §4.3 `/monitor/track/visit`）
 * 拜访汇总统计 + 结果推送页：按机构/时间/标签/渠道筛选的拜访列表，支持「结果推送」（后端导出）。
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
  getYdlVisitTrackList,
  exportYdlVisitTracksWx,
  type YdlVisitTrackRow,
} from '@/api/modules/ydl/ydl-statistics'

const router = useRouter()
const { loadDeptTree, loadDictItems, loadLabelNode } = useYdlDict()

const api: CrudApi<YdlVisitTrackRow, any, any> = {
  list: getYdlVisitTrackList,
}

const initialQuery = reactive({
  orgCode: '',
  visitTimeRange: [] as string[],
  labelName: '',
  sourceChannel: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptTreeData = ref<DeptNode[]>([])
const channelOptions = ref<{ text: string; value: string }[]>([])
const labelOptions = ref<{ text: string; value: string }[]>([])

// ==================== 枚举字典（列表/详情映射） ====================
// 拜访类型 / 拜访进程 属拜访数据域共享枚举（需求 §1.6、§3.4），需映射为文案
const dictMaps = reactive<Record<string, Record<string, string>>>({})
async function loadDictMap(type: string) {
  if (dictMaps[type]) return
  try {
    const items = await loadDictItems(type)
    dictMaps[type] = Object.fromEntries(items.map((i) => [String(i.value), i.text]))
  } catch {
    dictMaps[type] = {}
  }
}
function dmap(type: string, v: any): string {
  if (v == null || v === '') return '-'
  return dictMaps[type]?.[String(v)] ?? String(v)
}

// 统计时间必选：未选区间时拦截搜索（由 VantList 的 beforeSearch 钩子调用）
function beforeSearch(q: Record<string, any>): boolean {
  const range = q.visitTimeRange as string[] | undefined
  return !!(range && Array.isArray(range) && range.length === 2)
}
// VantList 因 beforeSearch 拦截搜索时回调，给出提示
function onSearchBlocked() {
  showToast('请先选择统计时间')
}

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
  // 预载拜访类型 / 拜访进程枚举字典
  await Promise.all([loadDictMap('VISIT_TYPE'), loadDictMap('VISIT_PROCESS_STATUS')])
})

function summary(item: YdlVisitTrackRow): { label: string; value: string }[] {
  return [
    { label: '客户', value: item.customerName },
    { label: '业务员', value: item.realName },
    { label: '机构', value: item.createOrg },
    { label: '拜访时间', value: item.visitTime },
    { label: '拜访类型', value: dmap('VISIT_TYPE', item.visitTypeCode) },
    { label: '拜访进程', value: dmap('VISIT_PROCESS_STATUS', item.visitProcess) },
  ]
}

async function onPush(q: Record<string, any>) {
  const range = q.visitTimeRange as string[] | undefined
  // 统计时间必选：未选区间禁止推送
  if (!range || range.length !== 2) {
    showToast('请先选择统计时间')
    return
  }
  const p = { ...q }
  delete p.visitTimeRange
  const [b, e] = range
  if (b) p.visitTime_begin = b
  if (e) p.visitTime_end = e
  showLoadingToast({ message: '推送中…', forbidClick: true })
  try {
    const r = await exportYdlVisitTracksWx(p)
    showToast(r?.message || '已提交推送')
  } catch {
    // 文档提示：原「添加失败」误写，统一改为「推送失败」
    showToast('推送失败')
  } finally {
    closeToast()
  }
}
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar
      title="拜访汇总"
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
      :before-search="beforeSearch"
      @search-blocked="onSearchBlocked"
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
            v-model="query.visitTimeRange"
            type="range"
            label="统计时间"
            title="选择统计时间区间"
            placeholder="选择时间区间"
            required
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
          <van-button size="small" type="primary" icon="share" @click="onPush(query)">
            结果推送
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
        <van-cell-group inset title="拜访信息" class="picc-card">
          <van-cell v-for="c in summary(item)" :key="c.label" :title="c.label" :value="c.value" />
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
