<script setup lang="ts">
/**
 * VantList —— 通用 Vant4 列表控件（带查询 / 更多查询 / 增删改 / 扩展操作 / 权限控制）
 *
 * 内部复用 useCrudList 通用 Hook，外覆一层「搜索 + 更多查询 + 列表 + 操作按钮 +
 * 新增/编辑弹层 + 详情弹层 + 删除确认 + 更多(ActionSheet) + 权限门禁」的通用 UI，
 * 业务页只需通过 props 配置 api / 筛选 / 操作，并通过插槽提供列表行与表单内容即可。
 *
 * Props:
 *   api            — CRUD 接口集合（list 必填，create/update/remove 缺省则对应功能不可用）
 *   permissionPrefix / permissionActions — 权限前缀与自定义操作码
 *   title          — 顶部导航栏标题（不传则不渲染导航栏）
 *   searchPlaceholder / showSearch / showAdd — 搜索框与悬浮新增按钮
 *   keywordKey      — 搜索关键字发送到后端的参数名，默认 'keyword'（可改为 q / search 等）
 *   filters        — 筛选配置数组，统一进入「更多查询」面板
 *   actions        — 自定义扩展操作（ActionSheet 内），可带 perm 进行权限门禁
 *   initialQuery / pageSize / enableLog
 *   rowPermission   — 行级自定义权限：在角色权限(v-permission)之上，再按 item 自身
 *                     标记决定 详情/编辑/删除 是否可用。返回对象中**未指定的项**沿用角色
 *                     权限结果；指定项与角色权限做「与」运算（两者皆通过才显示）。
 *                     函数签名： (item) => ({ view?, edit?, delete? })
 *                     例：仅当 item.status !== '已续保' 才允许编辑；标记为不可删时隐藏删除
 *                       rowPermission = (item) => ({
 *                         edit:   item.status !== '已续保',
 *                         delete: item.editable !== false,
 *                         view:   true,   // 不指定也可，缺省沿用角色权限
 *                       })
 *
 * Slots:
 *   #item(item,index)  — 列表行内容（必填）
 *   #filters(query)    — 「更多查询」面板内的自定义筛选字段（绑定到 query）
 *   #form(form,isEdit) — 新增/编辑弹层内的表单字段
 *   #detail(item)      — 详情弹层内容
 *   #row-actions(item) — 行内额外操作按钮
 *
 * Events: create / edit(item) / detail(item) / action({key,item})
 *
 * 使用示例（行级权限）：
 *   <VantList
 *     :api="api"
 *     permission-prefix="renewal"
 *     :row-permission="(item) => ({
 *       edit:   item.status !== '已续保',
 *       delete: item.editable !== false,
 *     })"
 *   />
 */
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useCrudList } from '@/composables/useCrudList'
import type { CrudApi, CrudAction } from '@/composables/useCrudList'

export interface ListFilterOption {
  text: string
  value: any
}
export interface ListFilter {
  /** 绑定到 query 的字段名 */
  key: string
  /** 展示标签 */
  label: string
  /** select 下拉 / radio 单选 / date 日期 / text 文本 / number 数字 */
  type: 'select' | 'radio' | 'date' | 'text' | 'number'
  /** select / radio 的可选项 */
  options?: ListFilterOption[]
  min?: number
  max?: number
  placeholder?: string
}
export interface ListAction {
  key: string
  name: string
  icon?: string
  danger?: boolean
  /** 权限码或权限码数组，缺省表示不限制（始终可见） */
  perm?: string | string[]
}

const props = withDefaults(
  defineProps<{
    api: CrudApi<any, any, any>
    rowKey?: string
    title?: string
    permissionPrefix?: string
    permissionActions?: Partial<Record<CrudAction, string>>
    searchPlaceholder?: string
    /** 搜索关键字发送到后端的参数名，默认 'keyword'（可改为 q / search 等） */
    keywordKey?: string
    showSearch?: boolean
    showAdd?: boolean
    enableLog?: boolean
    pageSize?: number
    initialQuery?: Record<string, any>
    /** 新增表单初始值（用于新增时重置表单） */
    initialForm?: Record<string, any>
    filters?: ListFilter[]
    actions?: ListAction[]
    moreFilterTitle?: string
    finishedText?: string
    /**
     * 行级自定义权限：在 v-permission（角色权限）基础上，再根据 item 自身的标记
     * 决定 详情/编辑/删除 是否可用。返回对象中未指定的项沿用角色权限结果。
     * 例：(item) => ({ edit: item.status !== '已续保', delete: item.editable })
     */
    rowPermission?: (item: any) => { view?: boolean; edit?: boolean; delete?: boolean }
    /**
     * 骨架屏：首次加载且无数据时展示（>0 启用，值为骨架条目数）。
     * 仅 loading && 列表为空 时显示，下拉刷新/加载更多时不覆盖已有列表。
     * 可用 #skeleton 插槽自定义（否则用默认 van-skeleton 卡片）。
     */
    skeletonCount?: number
    /**
     * 提交前自定义校验钩子（业务页强校验门禁，独立于 van-form 内置 :rules）。
     * 入参为当前表单对象与是否编辑态；返回 false / 抛出 则阻断提交。
     * 用于「投保人未填写 / 未核验」等业务强约束，避免依赖 Vant 字段注册而漏校验。
     */
    beforeSubmit?: (form: any, isEdit: boolean) => boolean | Promise<boolean>
  }>(),
  {
    rowKey: 'id',
    title: '',
    permissionPrefix: '',
    searchPlaceholder: '搜索',
    keywordKey: 'keyword',
    showSearch: true,
    showAdd: true,
    enableLog: false,
    pageSize: 10,
    initialQuery: () => ({}),
    initialForm: () => ({}),
    filters: () => [],
    actions: () => [],
    moreFilterTitle: '更多查询',
    finishedText: '没有更多了',
    skeletonCount: 8,
  },
)

const emit = defineEmits<{
  create: []
  edit: [item: any]
  detail: [item: any]
  action: [payload: { key: string; item: any }]
}>()

const router = useRouter()

// ==================== 复用通用 CRUD Hook ====================
const crud = useCrudList<any, any, any>({
  api: props.api,
  initialForm: props.initialForm,
  initialQuery: props.initialQuery,
  pageSize: props.pageSize,
  permissionPrefix: props.permissionPrefix,
  permissionActions: props.permissionActions,
  enableLog: props.enableLog,
})
const {
  loading,
  refreshing,
  finished,
  list,
  query,
  onSearch,
  onLoad,
  onRefresh,
  isEdit,
  form,
  formVisible,
  submitting,
  openCreate,
  openEdit,
  submit,
  detailVisible,
  detailItem,
  openDetail,
  showDeleteDialog,
  confirmDelete,
  doDelete,
  permTick,
  permCodes,
  hasPerm,
  logs,
  addLog,
} = crud

// ==================== 筛选配置 ====================
const panelFilters = computed(() => props.filters)

// 行级按钮权限：角色权限(v-permission) 与 item 自定义标记(rolePermission) 做「与」运算
function rowCan(item: any, action: 'view' | 'edit' | 'delete'): boolean {
  const base = hasPerm(permCodes.value[action])
  const custom = props.rowPermission?.(item)
  // 未提供自定义标记时，仅按角色权限决定
  if (!custom || custom[action] === undefined) return base
  return base && !!custom[action]
}

const showMoreFilter = ref(false)
// 激活筛选计数：统计 query 中非保留字段的有效值（同时覆盖 config 筛选与 #filters 插槽字段）
const RESERVED_QUERY_KEYS = computed(() => [props.keywordKey, 'page', 'pageSize'])
const activeFilterCount = computed(() => {
  let n = 0
  const reserved = RESERVED_QUERY_KEYS.value
  for (const [k, v] of Object.entries(query as Record<string, any>)) {
    if (reserved.includes(k)) continue
    if (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '') n++
  }
  return n
})

// ==================== 更多查询面板内的 下拉/日期 弹层 ====================
const selectVisible = ref(false)
const selectFilter = ref<ListFilter | null>(null)
function openSelectFilter(f: ListFilter) {
  selectFilter.value = f
  selectVisible.value = true
}
function onSelectConfirm({ selectedValues }: { selectedValues: any[] }) {
  if (selectFilter.value) (query as Record<string, any>)[selectFilter.value.key] = selectedValues[0]
  selectVisible.value = false
}

const dateVisible = ref(false)
const dateFilter = ref<ListFilter | null>(null)
function openDateFilter(f: ListFilter) {
  dateFilter.value = f
  dateVisible.value = true
}
function onDateConfirm({ selectedValues }: { selectedValues: any[] }) {
  if (dateFilter.value)
    (query as Record<string, any>)[dateFilter.value.key] = selectedValues.join('-')
  dateVisible.value = false
}

function filterDisplay(f: ListFilter): string {
  const v = (query as Record<string, any>)[f.key]
  if (v === undefined || v === null || v === '') return f.placeholder || `请选择${f.label}`
  const opt = f.options?.find((o) => o.value === v)
  return opt ? opt.text : String(v)
}

function onMoreFilterApply() {
  showMoreFilter.value = false
  onSearch()
}
function onMoreFilterReset() {
  Object.assign(query, props.initialQuery)
  onSearch()
}

// ==================== 操作按钮 + ActionSheet 扩展操作 ====================
const showActionSheet = ref(false)
const sheetItem = ref<any>(null)
const sheetActions = computed(() => {
  const base = [
    { name: '查看详情', value: 'view', perm: permCodes.value.view, icon: 'eye-o' },
    { name: '编辑', value: 'edit', perm: permCodes.value.edit, icon: 'edit' },
    { name: '删除', value: 'delete', perm: permCodes.value.delete, icon: 'delete-o' },
  ].filter((a) => hasPerm(a.perm))
  const custom = props.actions
    .filter((a) => !a.perm || hasPerm(a.perm))
    .map((a) => ({
      name: a.name,
      value: `act:${a.key}`,
      icon: a.icon || 'ellipsis',
      danger: a.danger,
    }))
  return [...base, ...custom]
})
const showMore = computed(() => sheetActions.value.length > 0)

function onCreate() {
  emit('create')
  openCreate()
}
function onEdit(item: any) {
  emit('edit', item)
  openEdit(item)
}
function onDetail(item: any) {
  emit('detail', item)
  openDetail(item)
}
function openActionSheet(item: any) {
  sheetItem.value = item
  showActionSheet.value = true
}
function onActionSelect(action: { name: string; value: string }) {
  showActionSheet.value = false
  const item = sheetItem.value
  if (!item) return
  if (action.value === 'view') openDetail(item)
  else if (action.value === 'edit') onEdit(item)
  else if (action.value === 'delete') confirmDelete(item)
  else if (action.value.startsWith('act:')) emit('action', { key: action.value.slice(4), item })
}

function onBack() {
  router.back()
}

// ==================== 表单校验：提交前先校验 #form 内配置了 :rules 的字段 ====================
const formRef = ref()
async function onFormSubmit() {
  try {
    // van-form.validate()：任一带 :rules 的字段校验不通过则 reject，此时中断提交
    await formRef.value?.validate()
  } catch {
    // 校验失败：等待错误提示渲染后滚动到第一个出错字段
    await nextTick()
    scrollToFirstError()
    return
  }
  // 业务强校验钩子（独立于 Vant 字段注册，保证「投保人未填写/未核验」必被拦截）
  if (props.beforeSubmit) {
    try {
      const ok = await props.beforeSubmit(form, isEdit.value)
      if (ok === false) {
        await nextTick()
        scrollToFirstError()
        return
      }
    } catch {
      await nextTick()
      scrollToFirstError()
      return
    }
  }
  submit()
}

/**
 * 校验失败后滚动到第一个出错的字段（在可滚动的表单容器内）。
 * 优先定位带有错误文本提示的 .van-field，找不到时回退到 .van-field--error。
 */
function scrollToFirstError() {
  const formEl = (formRef.value as any)?.$el as HTMLElement | undefined
  if (!formEl) return
  const errorMessages = formEl.querySelectorAll<HTMLElement>('.van-field__error-message')
  const firstErrorMsg = Array.from(errorMessages).find(
    (el) => el.textContent && el.textContent.trim().length > 0,
  )
  const target =
    (firstErrorMsg?.closest('.van-field') as HTMLElement | null) ||
    formEl.querySelector<HTMLElement>('.van-field--error')
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <div class="vant-list picc-page" :data-perm="permTick">
    <!-- 顶部吸顶区：导航栏 + 搜索栏 + 更多查询，随页面滚动时固定在顶部 -->
    <div class="vl-header">
      <!-- 顶部导航栏 -->
      <van-nav-bar
        v-if="title"
        :title="title"
        class="van-nav-bar--picc-primary"
        left-text="返回"
        left-arrow
        @click-left="onBack"
      />

    <!-- 搜索栏 -->
    <div v-if="showSearch" class="vl-search-wrap">
      <van-search
        v-model="query[keywordKey]"
        :placeholder="searchPlaceholder"
        shape="round"
        show-action
        @search="onSearch"
        @clear="onSearch"
      >
        <template #action>
          <span class="vl-search-action" @click="onSearch">搜索</span>
        </template>
      </van-search>
    </div>

    <!-- 更多查询 -->
    <div v-if="panelFilters.length || $slots.filters" class="vl-more">
      <div class="vl-more-bar" @click="showMoreFilter = !showMoreFilter">
        <span>
          <van-icon name="filter-o" size="15" />
          {{ moreFilterTitle }}
          <van-badge
            v-if="activeFilterCount"
            :content="activeFilterCount"
            style="margin-left: 6px"
          />
        </span>
        <van-icon :name="showMoreFilter ? 'arrow-up' : 'arrow-down'" size="14" color="#999" />
      </div>

      <div v-show="showMoreFilter" class="vl-more-body">
        <!-- 自定义筛选字段（绑定 query） -->
        <slot name="filters" :query="query" />

        <div v-for="f in panelFilters" :key="f.key" class="vl-filter-row">
          <span class="vl-filter-label">{{ f.label }}</span>

          <!-- radio 单选 -->
          <van-radio-group
            v-if="f.type === 'radio'"
            v-model="(query as Record<string, any>)[f.key]"
            direction="horizontal"
          >
            <van-radio v-for="opt in f.options" :key="opt.value" :name="opt.value" icon-size="14px">
              {{ opt.text }}
            </van-radio>
          </van-radio-group>

          <!-- select 下拉（点击单元格弹出 Picker） -->
          <div v-else-if="f.type === 'select'" class="vl-cell" @click="openSelectFilter(f)">
            <span :class="{ 'is-placeholder': !(query as Record<string, any>)[f.key] }">{{
              filterDisplay(f)
            }}</span>
            <van-icon name="arrow" color="#c8c9cc" />
          </div>

          <!-- date 日期（点击单元格弹出 DatePicker） -->
          <div v-else-if="f.type === 'date'" class="vl-cell" @click="openDateFilter(f)">
            <span :class="{ 'is-placeholder': !(query as Record<string, any>)[f.key] }">{{
              filterDisplay(f)
            }}</span>
            <van-icon name="arrow" color="#c8c9cc" />
          </div>

          <!-- text / number 输入 -->
          <van-field
            v-else
            v-model="(query as Record<string, any>)[f.key]"
            :type="f.type === 'number' ? 'digit' : 'text'"
            :placeholder="f.placeholder || `请输入${f.label}`"
            :min="f.min"
            :max="f.max"
            input-align="right"
            border
            @blur="onSearch"
          />
        </div>

        <div class="vl-filter-actions">
          <van-button size="small" plain type="default" @click="onMoreFilterReset">重置</van-button>
          <van-button size="small" type="primary" @click="onMoreFilterApply">应用筛选</van-button>
        </div>
      </div>
    </div>
    </div>

    <!-- 列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        :finished-text="finishedText"
        @load="onLoad"
      >
        <!-- 骨架屏：仅首次加载且列表为空时展示，避免覆盖已有列表 -->
        <div v-if="skeletonCount > 0 && loading && !list.length" class="vl-skeleton">
          <slot name="skeleton">
            <div v-for="i in skeletonCount" :key="i" class="vl-skeleton-card picc-card">
              <van-skeleton title :row="3" />
            </div>
          </slot>
        </div>

        <div
          v-for="(item, index) in list"
          :key="(item as Record<string, any>)[rowKey]"
          class="vl-card"
        >
          <slot name="item" :item="item" :index="index" />

          <div class="vl-card-actions">
            <!-- 左侧：更多 -->
            <div class="vl-card-actions-left">
              <van-button
                v-if="showMore"
                size="small"
                icon="ellipsis"
                plain
                type="default"
                @click="openActionSheet(item)"
                >更多</van-button
              >
            </div>
            <!-- 右侧：删除 详情 编辑 -->
            <div class="vl-card-actions-right">
              <van-button
                v-permission="permCodes.delete"
                v-if="rowCan(item, 'delete')"
                size="small"
                icon="delete-o"
                type="danger"
                @click="confirmDelete(item)"
                >删除</van-button
              >
              <van-button
                v-permission="permCodes.view"
                v-if="rowCan(item, 'view')"
                size="small"
                icon="eye-o"
                type="default"
                @click="onDetail(item)"
                >详情</van-button
              >
              <van-button
                v-permission="permCodes.edit"
                v-if="rowCan(item, 'edit')"
                size="small"
                icon="edit"
                color="#18a058"
                @click="onEdit(item)"
                >编辑</van-button
              >
              <slot name="row-actions" :item="item" />
            </div>
          </div>
        </div>

        <div v-if="!list.length && !loading" class="vl-empty">暂无数据</div>
      </van-list>
    </van-pull-refresh>

    <!-- 悬浮新增按钮 -->
    <van-button
      v-if="showAdd && api.create"
      v-permission="permCodes.create"
      class="vl-fab"
      type="primary"
      icon="plus"
      round
      @click="onCreate"
      >新增</van-button
    >

    <!-- 删除确认 -->
    <van-dialog
      v-model:show="showDeleteDialog"
      title="确认删除"
      message="删除后将无法恢复，确定要删除该记录吗？"
      show-cancel-button
      confirm-button-text="删除"
      @confirm="doDelete"
    />

    <!-- 更多操作 ActionSheet -->
    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="sheetActions"
      cancel-text="取消"
      @select="onActionSelect"
    />

    <!-- 新增 / 编辑 弹层 -->
    <van-popup
      v-model:show="formVisible"
      position="right"
      :style="{ width: '100%', height: '100%' }"
    >
      <van-nav-bar :title="isEdit ? '编辑' : '新增'" left-arrow @click-left="formVisible = false">
        <template #right>
          <van-button type="primary" size="small" :loading="submitting" @click="onFormSubmit"
            >提交</van-button
          >
        </template>
      </van-nav-bar>
      <div class="vl-form-scroll picc-page">
        <van-form ref="formRef">
          <slot name="form" :form="form" :is-edit="isEdit" />
          <div class="vl-submit-bar">
            <van-button type="primary" block round :loading="submitting" @click="onFormSubmit">
              {{ isEdit ? '保存修改' : '提交' }}
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 详情 弹层 -->
    <van-popup
      v-model:show="detailVisible"
      position="bottom"
      round
      :style="{ height: '75%' }"
      closeable
    >
      <div class="vl-detail-wrap" v-if="detailItem">
        <h3 class="vl-detail-title">详情</h3>
        <slot name="detail" :item="detailItem" />
      </div>
    </van-popup>

    <!-- 更多查询：select Picker -->
    <van-popup v-model:show="selectVisible" position="bottom" round>
      <van-picker
        :columns="selectFilter?.options || []"
        @confirm="onSelectConfirm"
        @cancel="selectVisible = false"
        :title="selectFilter ? `选择${selectFilter.label}` : ''"
      />
    </van-popup>

    <!-- 更多查询：date Picker -->
    <van-popup v-model:show="dateVisible" position="bottom" round>
      <van-date-picker
        :title="dateFilter ? `选择${dateFilter.label}` : ''"
        @confirm="onDateConfirm"
        @cancel="dateVisible = false"
      />
    </van-popup>

    <!-- 操作日志 -->
    <div v-if="enableLog && logs.length" class="vl-log">
      <h4 class="vl-log-title">操作日志</h4>
      <div class="vl-log-list">
        <div v-for="(log, i) in logs.slice(0, 10)" :key="i" class="vl-log-item">{{ log }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.vant-list {
  padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  min-height: 100vh;
  box-sizing: border-box;
}
/* 顶部吸顶区：导航栏 + 搜索栏 + 更多查询，随列表滚动时固定在顶部 */
.vl-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #f5f6f8;
}
.vl-search-wrap {
  padding: 0 4px;
}
.vl-search-action {
  color: #d71920;
  padding: 0 4px;
}
.vl-more {
  background: #fff;
}
.vl-more-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  font-size: 13px;
  color: #646566;
  cursor: pointer;
  border-top: 1px solid #f5f5f5;
}
.vl-more-body {
  padding: 0 16px 12px;
  border-top: 1px solid #f5f5f5;
}
.vl-filter-row {
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.vl-filter-row:last-of-type {
  border-bottom: none;
}
.vl-filter-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}
.vl-filter-actions {
  display: flex;
  gap: 10px;
  padding-top: 12px;
}
.vl-filter-actions .van-button {
  flex: 1;
}
.vl-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: #323233;
  cursor: pointer;
}
.vl-cell .is-placeholder {
  color: #c8c9cc;
}
.vl-card {
  margin: 8px 12px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.vl-card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #f5f5f5;
}
.vl-card-actions-left,
.vl-card-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.vl-card-actions-right {
  margin-left: auto;
  justify-content: flex-end;
}
.vl-empty {
  text-align: center;
  color: #969799;
  font-size: 13px;
  padding: 40px 0;
}
.vl-skeleton {
  padding: 8px 0;
}
.vl-skeleton-card {
  margin: 8px 0;
}
.vl-fab {
  position: fixed;
  left: 16px;
  right: 16px;
  margin: 0 auto;
  max-width: 480px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  z-index: 999;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  border: none;
  /* 默认中性投影；PICC 品牌红投影由皮肤 CSS（html.picc-skin .vl-fab）在开启皮肤时覆盖 */
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.vl-fab:active {
  transform: scale(0.97);
}
.vl-form-scroll {
  height: calc(100% - 46px);
  overflow-y: auto;
  padding-bottom: 80px;
}
.vl-submit-bar {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  position: sticky;
  bottom: 0;
}
.vl-detail-wrap {
  padding: 16px 0 40px;
}
.vl-detail-title {
  text-align: center;
  font-size: 17px;
  margin: 0 0 12px;
  color: #1a1a1a;
}
.vl-log {
  margin: 16px 12px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}
.vl-log-title {
  margin: 0 0 8px;
  font-size: 14px;
  color: #333;
}
.vl-log-list {
  max-height: 200px;
  overflow-y: auto;
}
.vl-log-item {
  font-size: 11px;
  color: #999;
  padding: 2px 0;
  font-family: monospace;
}
</style>
