<script setup lang="ts">
/**
 * 拜访明细（需求文档 §3.4 `/visit`）
 * 分页大表（VantList 触底加载）；更多查询：机构 / 统计时间 / 标签 / 渠道 / 工程项目 / 最后拜访；
 * 行「更多 → 详情」展示全部字段；更多查询面板内置「导出推送」（后端企业微信推送）。
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
  exportYdlVisitTracks,
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
  projectFlag: '',
  isLastRecord: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

// ==================== 下拉选项 ====================
const deptTreeData = ref<DeptNode[]>([])
const channelOptions = ref<{ text: string; value: string }[]>([])
const labelOptions = ref<{ text: string; value: string }[]>([])
const projectOptions = ref<{ text: string; value: string }[]>([])
const lastRecordOptions = [
  { text: '全部', value: '' },
  { text: '是', value: '1' },
  { text: '否', value: '0' },
]

// ==================== 枚举字典（详情映射） ====================
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

onMounted(async () => {
  try {
    const [tree, channel, labels, pf] = await Promise.all([
      loadDeptTree(),
      loadDictItems('source_channel'),
      loadLabelNode(),
      loadDictItems('PROJECT_FLAG'),
    ])
    deptTreeData.value = tree
    channelOptions.value = channel.map((c) => ({ text: c.text, value: c.value }))
    labelOptions.value = labels.map((l) => ({ text: l.name, value: l.id }))
    projectOptions.value = pf.map((c) => ({ text: c.text, value: c.value }))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
  // 预载详情枚举字典
  await Promise.all([
    loadDictMap('VISIT_TYPE'),
    loadDictMap('VISIT_PROCESS_STATUS'),
    loadDictMap('LEADER_COMMENT_LEVEL'),
    loadDictMap('UP_FLAG'),
    loadDictMap('PROJECT_LEVEL'),
  ])
})

// ==================== 列表行（摘要） ====================
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

// ==================== 详情字段（全部） ====================
const visitDetailFields: { label: string; key: string; dict?: string; map?: Record<string, string> }[] = [
  { label: '上级机构', key: 'parentOrg' },
  { label: '保源机构', key: 'createOrg' },
  { label: '客户名称', key: 'customerName' },
  { label: '客户地址', key: 'customerAddress' },
  { label: '联系人', key: 'contactsName' },
  { label: '联系人电话', key: 'contactsPhone' },
  { label: '行业类型', key: 'industryName' },
  { label: '保源推送时间', key: 'distributeTime' },
  { label: '认领业务员', key: 'realName' },
  { label: '目标险种', key: 'mriskTypeName' },
  { label: '已保险种', key: 'yriskTypeName' },
  { label: '拜访时间', key: 'visitTime' },
  { label: '打卡时间', key: 'createTime' },
  { label: '拜访类型', key: 'visitTypeCode', dict: 'VISIT_TYPE' },
  { label: '拜访进程', key: 'visitProcess', dict: 'VISIT_PROCESS_STATUS' },
  { label: '项目名称', key: 'customerProjectName' },
  { label: '预计签单时间', key: 'planDate' },
  { label: '预估保费', key: 'planAmount', map: {} },
  { label: '拜访情况', key: 'remark' },
  { label: '点评人', key: 'reviewer' },
  { label: '分管经理点评', key: 'comments' },
  { label: '领导评价', key: 'commentsLv', dict: 'LEADER_COMMENT_LEVEL' },
  { label: '是否上级支持', key: 'upFlag', dict: 'UP_FLAG' },
  { label: '支持内容', key: 'upContent' },
  { label: '预计下次拜访', key: 'nextVisitTime' },
  { label: '更新时间', key: 'updateTime' },
  { label: '保源标签', key: 'labelName' },
]
// 工程项目列（仅当 projectFlag 命中时显示）
const projectDetailFields: { label: string; key: string }[] = [
  { label: '项目区域', key: 'projectArea' },
  { label: '项目内容', key: 'projectContent' },
  { label: '项目进度', key: 'projectProgress' },
  { label: '建设单位', key: 'projectUnit' },
  { label: '上级单位', key: 'projectParentUnit' },
  { label: '项目级别', key: 'projectLevel', },
]
function detailValue(f: { key: string; dict?: string; map?: Record<string, string> }, item: YdlVisitTrackRow): string {
  const v = (item as any)[f.key]
  if (v == null || v === '') return '-'
  if (f.dict) return dmap(f.dict, v)
  if (f.key === 'planAmount') return '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return String(v)
}

// ==================== 导出推送 ====================
async function onExport(q: Record<string, any>) {
  const p = { ...q }
  const range = p.visitTimeRange as string[] | undefined
  delete p.visitTimeRange
  const [b, e] = range || []
  if (b) p.visitTime_begin = b
  if (e) p.visitTime_end = e
  showLoadingToast({ message: '提交导出…', forbidClick: true })
  try {
    const r = await exportYdlVisitTracks(p)
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
    <van-nav-bar title="拜访明细" class="van-nav-bar--picc-primary" left-text="返回" left-arrow @click-left="router.back()" />

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
      <!-- 更多查询 -->
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
            v-model="query.visitTimeRange"
            type="range"
            label="统计时间"
            title="选择统计时间区间"
            placeholder="选择时间区间"
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
          <VantSelectField
            v-model="query.projectFlag"
            :options="projectOptions"
            label="工程项目"
            title="选择工程项目"
            placeholder="全部"
            clearable
          />
          <VantSelectField
            v-model="query.isLastRecord"
            :options="lastRecordOptions"
            label="最后拜访"
            title="是否最后拜访"
            placeholder="全部"
          />
        </van-cell-group>
        <div class="f-export">
          <van-button size="small" type="primary" icon="down" @click="onExport(query)">
            导出推送
          </van-button>
        </div>
      </template>

      <!-- 列表行摘要 -->
      <template #item="{ item }">
        <div class="r-title">{{ item.customerName }}</div>
        <div class="r-grid">
          <div v-for="c in summary(item)" :key="c.label" class="r-cell">
            <span class="r-cell-label">{{ c.label }}</span>
            <span class="r-cell-value">{{ c.value }}</span>
          </div>
        </div>
      </template>

      <!-- 详情（全部字段） -->
      <template #detail="{ item }">
        <van-cell-group inset title="基础信息" class="picc-card">
          <van-cell
            v-for="f in visitDetailFields"
            :key="f.key"
            :title="f.label"
            :value="detailValue(f, item)"
          />
        </van-cell-group>
        <van-cell-group v-if="item.projectArea || item.projectContent" inset title="工程项目" class="picc-card">
          <van-cell
            v-for="f in projectDetailFields"
            :key="f.key"
            :title="f.label"
            :value="(item as any)[f.key] || '-'"
          />
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
.f-export {
  padding: 0 12px 12px;
  text-align: right;
}
.r-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a1a;
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
  color: #969799;
}
.r-cell-value {
  font-size: 13px;
  color: #323233;
  margin-top: 2px;
}
</style>
