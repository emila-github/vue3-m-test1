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

function summary(item: YdlVisitTrackRow): { label: string; value: string }[] {
  return [
    { label: '客户', value: item.customerName },
    { label: '业务员', value: item.realName },
    { label: '机构', value: item.createOrg },
    { label: '拜访时间', value: item.visitTime },
    { label: '拜访类型', value: String(item.visitTypeCode) },
    { label: '拜访进程', value: String(item.visitProcess) },
  ]
}

async function onPush(q: Record<string, any>) {
  const p = { ...q }
  const range = p.visitTimeRange as string[] | undefined
  delete p.visitTimeRange
  const [b, e] = range || []
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
    <van-nav-bar title="拜访汇总" class="van-nav-bar--picc-primary" left-text="返回" left-arrow @click-left="router.back()" />

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
