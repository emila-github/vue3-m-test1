<script setup lang="ts">
/**
 * YdlXbBoard —— 续保管理（非车）通用看板（§6 我的续保 / 问题项目 / 项目终止 共用）
 *
 * 通过 props 区分三类的「状态字段 + 状态枚举 + 反馈接口 + 反馈表单」：
 *   - 我的续保 renewedList     → 状态 renewedStatus / RENEWED_STATUS / 续保反馈
 *   - 问题项目 questionList    → 状态 questionStatus / QUESTION_STATUS / 问题反馈（含是否解决）
 *   - 项目终止 endList         → 状态 endStatus / END_STATUS / 终止反馈
 *
 * 列表筛选：分支公司(树) + 到期时间 range + 状态 + 保单号；点击行进入详情 → 反馈提交。
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import VantSelectField from '@/components/VantSelectField.vue'
import VantCalendarField from '@/components/VantCalendarField.vue'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import { postYdlXbFeedback, type YdlXbRow } from '@/api/modules/ydl/ydl-xb'

const props = defineProps<{
  title: string
  apiFn: (q: Record<string, any>) => Promise<{ records: YdlXbRow[]; total: number; size: number }>
  /** 状态字段名（renewedStatus / questionStatus / endStatus） */
  statusField: string
  /** 状态枚举字典 type */
  statusDict: string
  /** 反馈提交接口 URL */
  feedbackUrl: string
  /** 反馈类型下拉（问题类型 / 终止原因 / 续保反馈类型） */
  feedbackTypeOptions?: { text: string; value: string }[]
  /** 反馈类型字段名（type / endType） */
  feedbackTypeField?: string
  /** 反馈类型标签 */
  feedbackTypeLabel?: string
  /** 是否显示「是否解决」开关（问题项目） */
  showResolve?: boolean
}>()

const router = useRouter()
const { loadDeptTree, loadDictItems } = useYdlDict()

const api: CrudApi<YdlXbRow, any, any> = { list: props.apiFn }

// 到期时间默认 上月月初 ~ 昨天
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
  status: '',
  policyno: '',
})

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptOptions = ref<{ text: string; value: string }[]>([])
const statusOptions = ref<{ text: string; value: string }[]>([])
const statusMap = reactive<Record<string, Record<string, string>>>({})

function flattenDept(nodes: any[], prefix = ''): { text: string; value: string }[] {
  const out: { text: string; value: string }[] = []
  for (const n of nodes) {
    out.push({ text: prefix + n.title, value: n.orgCode })
    if (n.children?.length) out.push(...flattenDept(n.children, prefix + n.title + ' / '))
  }
  return out
}

onMounted(async () => {
  try {
    const [tree, status] = await Promise.all([loadDeptTree(), loadDictItems(props.statusDict)])
    deptOptions.value = flattenDept(tree)
    statusOptions.value = status.map((c) => ({ text: c.text, value: c.value }))
    statusMap[props.statusDict] = Object.fromEntries(status.map((c) => [String(c.value), c.text]))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
})

// ==================== 详情 + 反馈 ====================
const detailItem = ref<YdlXbRow | null>(null)
const fbForm = reactive<{ type: string; content: string; resolve: number }>({
  type: '',
  content: '',
  resolve: 1,
})
const fbSubmitting = ref(false)

async function onDetail(item: YdlXbRow) {
  detailItem.value = item
  Object.assign(fbForm, { type: '', content: '', resolve: 1 })
}

async function onSubmitFeedback() {
  if (props.feedbackTypeOptions?.length && !fbForm.type) {
    showToast(`请选择${props.feedbackTypeLabel || '类型'}`)
    return
  }
  if (!fbForm.content || fbForm.content.trim().length < 5) {
    showToast('反馈内容至少 5 个字')
    return
  }
  if (!detailItem.value) return
  const data: Record<string, any> = {
    id: detailItem.value.id,
    content: fbForm.content,
  }
  if (props.feedbackTypeField && fbForm.type) data[props.feedbackTypeField] = fbForm.type
  if (props.showResolve) data.resolve = fbForm.resolve
  fbSubmitting.value = true
  showLoadingToast({ message: '提交中', forbidClick: true })
  try {
    await postYdlXbFeedback(props.feedbackUrl, data as any)
    showToast('反馈提交成功')
  } catch {
    showToast('提交失败')
  } finally {
    fbSubmitting.value = false
    closeToast()
  }
}

function statusText(v: any): string {
  if (v == null) return '-'
  return statusMap[props.statusDict]?.[String(v)] ?? String(v)
}
function statusColor(v: any): string {
  const n = Number(v)
  if (n === 2 || n === 1) return '#07c160'
  if (n === 3) return '#ee0a24'
  return '#ff976a'
}

const baseInfo = (row: YdlXbRow) => [
  { label: '投保人', value: row.appliname },
  { label: '保单号', value: row.policyno },
  { label: '险种', value: row.riskcname },
  { label: '到期时间', value: row.enddate },
  { label: '上年保费', value: '¥' + Number(row.coinsnetpremium).toLocaleString('zh-CN') },
  { label: '地市', value: row.comdname },
  { label: '支公司', value: row.comzname },
]
</script>

<template>
  <div class="ydl-detail-page">
    <van-nav-bar :title="title" class="van-nav-bar--picc-primary" left-text="返回" left-arrow @click-left="router.back()" />

    <VantList
      :api="api"
      :title="''"
      :initial-query="initialQuery"
      :response-map="responseMap"
      search-placeholder="搜索保单号"
      keyword-key="policyno"
      :show-add="false"
      :show-edit="false"
      :show-delete="false"
      show-more
      :free-actions="['view']"
      @detail="onDetail"
    >
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <VantSelectField
            v-model="query.orgCode"
            :options="deptOptions"
            label="分支公司"
            title="选择分支公司"
            placeholder="全部机构"
            clearable
          />
          <VantCalendarField
            v-model="query.enddateRange"
            type="range"
            label="到期时间"
            title="选择到期时间区间"
            placeholder="选择时间区间"
          />
          <VantSelectField
            v-model="query.status"
            :options="statusOptions"
            :label="title + '状态'"
            :title="'选择' + title + '状态'"
            placeholder="全部"
            clearable
          />
          <van-field v-model="query.policyno" label="保单号" placeholder="输入保单号" input-align="right" />
        </van-cell-group>
      </template>

      <template #item="{ item }">
        <div class="r-head">
          <span class="r-name">{{ item.appliname }}</span>
          <van-tag :color="statusColor((item as any)[statusField])" text-color="#fff" size="medium">
            {{ statusText((item as any)[statusField]) }}
          </van-tag>
        </div>
        <div class="r-meta">保单号：{{ item.policyno }}</div>
        <div class="r-meta">险种：{{ item.riskcname }} ｜ 到期：{{ item.enddate }}</div>
        <div class="r-meta">上年保费：¥{{ Number(item.coinsnetpremium).toLocaleString('zh-CN') }}</div>
      </template>

      <template #detail="{ item }">
        <van-cell-group inset title="保单信息" class="picc-card">
          <van-cell v-for="c in baseInfo(item)" :key="c.label" :title="c.label" :value="c.value" />
          <van-cell title="状态">
            <van-tag :color="statusColor((item as any)[statusField])" text-color="#fff">
              {{ statusText((item as any)[statusField]) }}
            </van-tag>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="填写反馈" class="picc-card">
          <VantSelectField
            v-if="feedbackTypeOptions && feedbackTypeOptions.length"
            v-model="fbForm.type"
            :options="feedbackTypeOptions"
            :label="feedbackTypeLabel || '类型'"
            :title="'选择' + (feedbackTypeLabel || '类型')"
            placeholder="请选择"
          />
          <van-field
            v-model="fbForm.content"
            label="反馈内容"
            type="textarea"
            rows="2"
            autosize
            placeholder="请输入反馈内容（≥5字）"
          />
          <van-field v-if="showResolve" label="是否解决">
            <template #input>
              <van-switch v-model="fbForm.resolve" :active-value="1" :inactive-value="0" size="20" />
            </template>
          </van-field>
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
.fb-submit {
  padding: 14px 4px 4px;
}
</style>
