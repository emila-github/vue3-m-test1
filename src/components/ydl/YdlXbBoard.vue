<script setup lang="ts">
/**
 * YdlXbBoard —— 续保管理（非车）通用看板（§6 我的续保 / 问题项目 / 项目终止 共用）
 *
 * 通过 props 区分三类的「状态字段 + 状态枚举 + 反馈接口 + 反馈表单」，并通过 `queryFields`
 * 声明式配置各自的查询条件（严格对齐需求文档 §6.x）：
 *   - 我的续保 renewedList     → 状态 renewedStatus / RENEWED_STATUS / 续保反馈
 *   - 问题项目 questionList    → 状态 questionStatus / QUESTION_STATUS / 问题反馈（含是否解决）
 *   - 项目终止 endList         → 状态 endStatus / END_STATUS / 终止反馈
 *
 * 查询条件（更多查询面板）由各视图通过 `:query-fields` 传入，点击行进入详情 → 反馈提交。
 */
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showLoadingToast, closeToast } from 'vant'
import VantList from '@/components/VantList.vue'
import type { CrudApi } from '@/composables/useCrudList'
import VantSelectField from '@/components/VantSelectField.vue'
import VantCalendarField from '@/components/VantCalendarField.vue'
import VantTreeSelectField from '@/components/VantTreeSelectField.vue'
import { useYdlDict } from '@/composables/ydl/useYdlDict'
import { postYdlXbFeedback, type YdlXbRow } from '@/api/modules/ydl/ydl-xb'
import type { XbQueryField } from './xb-types'

/** 默认查询条件（兼容未传 queryFields 的旧调用）：分支公司 / 到期时间 / 状态 / 保单号 */
const DEFAULT_QUERY_FIELDS: XbQueryField[] = [
  { type: 'org', key: 'comcode', label: '分支公司' },
  { type: 'dateRange', key: 'enddate', label: '到期时间' },
  { type: 'status', key: 'renewedStatus', label: '续保' },
  { type: 'text', key: 'policyno', label: '上年保单号' },
]

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
  /** 顶部搜索框占位文案（默认「搜索保单号」） */
  searchPlaceholder?: string
  /** 顶部搜索关键字字段名（默认 policyno，问题项目用 appliname） */
  keywordKey?: string
  /**
   * 列表项字段声明式配置（对齐需求「列表字段」）。不传则使用默认卡片布局。
   * 例（问题项目 §6.2）：投保人(title) / 问题状态(status) / 问题逾期状态(tag) /
   *  地市·支公司·上年保单号·产品·到期·团队类型·服务经理·预审核意见·剩余反馈时间·问题内容·问题反馈(text) /
   *  上年保费(money) / 问题类型(tag)。
   */
  listFields?: XbListField[]
  /**
   * 查询条件声明式配置（决定「更多查询」面板渲染哪些筛选，并按需求决定参数名）。
   * 不传则用默认四件套。各视图应严格按需求文档 §6.x 传入，例如：
   *  问题项目(§6.2)：comcode / enddate(range→begin,end) / feeRange(FEE_RANGE) / appliname
   *  我的续保(§6.1)：comcode / enddate(range) / renewedStatus / policyno
   */
  queryFields?: XbQueryField[]
}>()

const router = useRouter()
const { loadDeptTree, loadDictItems } = useYdlDict()

/**
 * query 包装：把 dateRange 类型的 [起,止] 数组拆成 `${key}_begin` / `${key}_end`，
 * 以匹配后端参数命名（如 enddate → enddate_begin / enddate_end）。其余字段透传。
 */
function transformQuery(q: Record<string, any>): Record<string, any> {
  const fields = props.queryFields ?? DEFAULT_QUERY_FIELDS
  const p: Record<string, any> = {}
  for (const [k, v] of Object.entries(q)) {
    const f = fields.find((x) => x.key === k && x.type === 'dateRange')
    if (f && Array.isArray(v) && v.length === 2) {
      p[`${k}_begin`] = v[0]
      p[`${k}_end`] = v[1]
    } else {
      p[k] = v
    }
  }
  return p
}

const api: CrudApi<YdlXbRow, any, any> = { list: (q) => props.apiFn(transformQuery(q)) }

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

// 按 queryFields 动态构建初始查询（dateRange 初始为空数组，其余为空串），并保留顶部关键字 policyno
const initialQuery = reactive<Record<string, any>>(
  Object.fromEntries([
    ...(props.queryFields ?? DEFAULT_QUERY_FIELDS).map((f) => [
      f.key,
      f.type === 'dateRange' ? [] : '',
    ]),
    ['policyno', ''],
  ]),
)

const responseMap = { list: 'records', total: 'total', pageSize: 'size' }

const deptTree = ref<any[]>([])
const statusOptions = ref<{ text: string; value: string }[]>([])
const statusMap = reactive<Record<string, Record<string, string>>>({})
// dict 类型筛选的字典选项（key = 字典编码，如 FEE_RANGE）
const dictOptionsMap = reactive<Record<string, { text: string; value: string }[]>>({})
// 列表项 tag/status 字段所需的字典映射（dict → value→text）
const labelMap = reactive<Record<string, Record<string, string>>>({})

onMounted(async () => {
  try {
    const [tree, status] = await Promise.all([loadDeptTree(), loadDictItems(props.statusDict)])
    deptTree.value = tree
    statusOptions.value = status.map((c) => ({ text: c.text, value: c.value }))
    statusMap[props.statusDict] = Object.fromEntries(status.map((c) => [String(c.value), c.text]))
  } catch {
    /* 下拉加载失败不阻塞 */
  }
  // 加载 dict 类型筛选所需的字典（如 上年保费规模 FEE_RANGE）
  const dictFields = (props.queryFields ?? DEFAULT_QUERY_FIELDS).filter(
    (f) => f.type === 'dict' && f.dict,
  )
  await Promise.all(
    dictFields.map(async (f) => {
      try {
        const items = await loadDictItems(f.dict!)
        dictOptionsMap[f.dict!] = items.map((c) => ({ text: c.text, value: c.value }))
      } catch {
        dictOptionsMap[f.dict!] = []
      }
    }),
  )
  // 加载列表项 tag/status 字段所需字典（去重）
  const listDicts = [
    ...new Set(
      (props.listFields ?? [])
        .filter((f) => (f.kind === 'status' || f.kind === 'tag') && f.dict)
        .map((f) => (f as { dict: string }).dict),
    ),
  ]
  await Promise.all(
    listDicts.map(async (d) => {
      try {
        const items = await loadDictItems(d)
        labelMap[d] = Object.fromEntries(items.map((c) => [String(c.value), c.text]))
      } catch {
        labelMap[d] = {}
      }
    }),
  )
})

/** 列表项 tag/status 字段文案：dict 映射，缺失则返回原值 */
function dictText(dict: string | undefined, value: any): string {
  if (value == null) return '-'
  if (dict && labelMap[dict]?.[String(value)]) return labelMap[dict][String(value)]
  return String(value)
}

// ===== 列表项按 listFields 配置渲染的辅助函数 =====
function titleValue(item: Record<string, any>): string {
  const t = (props.listFields ?? []).find((f) => f.kind === 'title')
  return t ? (item[t.key] ?? '') : (item.appliname ?? '')
}
function tagFields(item: Record<string, any>) {
  return (props.listFields ?? [])
    .filter((f) => f.kind === 'status' || f.kind === 'tag')
    .map((f) => {
      const raw = (item as any)[f.key]
      const color = f.kind === 'status' ? statusColor(raw) : '#1989fa'
      return { key: f.key, text: dictText(f.dict, raw), color }
    })
}
function metaFields(item: Record<string, any>) {
  return (props.listFields ?? [])
    .filter((f) => f.kind === 'text' || f.kind === 'money')
    .map((f) => {
      let value: any = (item as any)[f.key]
      if (f.kind === 'money') value = '¥' + Number(value || 0).toLocaleString('zh-CN')
      return { key: f.key, label: f.label || f.key, value }
    })
}
const hasListFields = computed(() => (props.listFields?.length ?? 0) > 0)

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
    <van-nav-bar
      :title="title"
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
      :search-placeholder="searchPlaceholder || '搜索保单号'"
      :keyword-key="keywordKey || 'policyno'"
      :show-add="false"
      :show-edit="false"
      :show-delete="false"
      show-more
      :free-actions="['view']"
      @detail="onDetail"
    >
      <template #filters="{ query }">
        <van-cell-group inset class="f-group">
          <template v-for="f in queryFields ?? DEFAULT_QUERY_FIELDS" :key="f.key">
            <VantTreeSelectField
              v-if="f.type === 'org'"
              v-model="query[f.key]"
              :options="deptTree"
              value-key="orgCode"
              label-key="title"
              :label="f.label"
              :title="'选择' + f.label"
              placeholder="全部机构"
              clearable
              only-selected-label
            />
            <VantCalendarField
              v-else-if="f.type === 'dateRange'"
              v-model="query[f.key]"
              type="range"
              :label="f.label"
              :title="'选择' + f.label + '区间'"
              placeholder="选择时间区间"
            />
            <VantSelectField
              v-else-if="f.type === 'dict'"
              v-model="query[f.key]"
              :options="(f.dict && dictOptionsMap[f.dict]) || []"
              :label="f.label"
              :title="'选择' + f.label"
              :placeholder="'全部' + f.label"
              clearable
            />
            <VantSelectField
              v-else-if="f.type === 'status'"
              v-model="query[f.key]"
              :options="statusOptions"
              :label="(f.label || title) + '状态'"
              :title="'选择' + (f.label || title) + '状态'"
              placeholder="全部"
              clearable
            />
            <van-field
              v-else-if="f.type === 'text'"
              v-model="query[f.key]"
              :label="f.label"
              :placeholder="'输入' + f.label"
              input-align="right"
            />
          </template>
        </van-cell-group>
      </template>

      <template #item="{ item }">
        <div v-if="hasListFields" class="r-card">
          <div class="r-head">
            <span class="r-name">{{ titleValue(item) }}</span>
            <span class="r-tags">
              <van-tag
                v-for="t in tagFields(item)"
                :key="t.key"
                :color="t.color"
                text-color="#fff"
                size="medium"
                class="r-tag"
                >{{ t.text }}</van-tag
              >
            </span>
          </div>
          <div v-for="m in metaFields(item)" :key="m.key" class="r-meta">
            <span class="r-label">{{ m.label }}：</span>{{ m.value }}
          </div>
        </div>
        <div v-else class="r-card">
          <div class="r-head">
            <span class="r-name">{{ item.appliname }}</span>
            <van-tag
              :color="statusColor((item as any)[statusField])"
              text-color="#fff"
              size="medium"
            >
              {{ statusText((item as any)[statusField]) }}
            </van-tag>
          </div>
          <div class="r-meta">保单号：{{ item.policyno }}</div>
          <div class="r-meta">险种：{{ item.riskcname }} ｜ 到期：{{ item.enddate }}</div>
          <div class="r-meta">
            上年保费：¥{{ Number(item.coinsnetpremium).toLocaleString('zh-CN') }}
          </div>
        </div>
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
              <van-switch
                v-model="fbForm.resolve"
                :active-value="1"
                :inactive-value="0"
                size="20"
              />
            </template>
          </van-field>
          <div class="fb-submit">
            <van-button
              type="primary"
              block
              round
              :loading="fbSubmitting"
              @click="onSubmitFeedback"
            >
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
.r-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}
.r-tag {
  margin-left: 0;
}
.r-label {
  color: #999;
}
.fb-submit {
  padding: 14px 4px 4px;
}
</style>
