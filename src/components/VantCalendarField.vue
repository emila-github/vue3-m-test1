<script setup lang="ts">
/**
 * VantCalendarField —— 通用 Vant4 下拉日历选择组件
 *
 * 基于 van-field（只读触发）+ van-calendar（底部弹出）封装。
 * 支持三种模式：single（单选）/ range（区间）/ multiple（多选）。
 * v-model 统一对外输出字符串，便于表单绑定：
 *   - single  : 'YYYY-MM-DD'
 *   - range   : ['YYYY-MM-DD', 'YYYY-MM-DD']
 *   - multiple: ['YYYY-MM-DD', ...]
 * 字段右侧提供清空「x」，可编辑且有值即显示。
 *
 * 用法：
 *   <VantCalendarField v-model="date" label="日期" title="选择日期" />
 *   <VantCalendarField v-model="range" type="range" label="区间" />
 *   <VantCalendarField v-model="days" type="multiple" label="日期（可多选）" />
 */
import { ref, computed } from 'vue'

type DateStr = string
type ModelValue = DateStr | DateStr[]

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmt(date: Date): DateStr {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function toDate(v: DateStr | Date | undefined): Date | undefined {
  if (!v) return undefined
  return v instanceof Date ? v : new Date(v)
}

const props = withDefaults(
  defineProps<{
    modelValue?: ModelValue
    /** 选择模式：single 单选 / range 区间 / multiple 多选 */
    type?: 'single' | 'range' | 'multiple'
    label?: string
    /** label 文本对齐方式（透传 van-field label-align）：left / center / right */
    labelAlign?: 'left' | 'center' | 'right'
    /** 值文本对齐方式（透传 van-field input-align）：left / center / right */
    inputAlign?: 'left' | 'center' | 'right'
    placeholder?: string
    title?: string
    /** 最小可选日期（Date 或 'YYYY-MM-DD'） */
    minDate?: Date | DateStr
    /** 最大可选日期（Date 或 'YYYY-MM-DD'） */
    maxDate?: Date | DateStr
    /** 打开时默认定位到的日期（Date 或 'YYYY-MM-DD'），缺省取当前选中或今天 */
    defaultDate?: Date | DateStr
    /** 区间模式下最少选择天数 */
    minDays?: number
    /** 区间模式下最多选择天数 */
    maxDays?: number
    /** 一周起始日：0 周日 ~ 6 周六 */
    firstDayOfWeek?: number
    /** 是否显示底部确认栏，false 时单选点选即确定 */
    showConfirm?: boolean
    /** 确认按钮文案 */
    confirmText?: string
    /** 是否允许起止同一天（区间模式） */
    allowSameDay?: boolean
    /** 主题色：默认不传，套用 PICC 皮肤（品牌红）；如需自定义可传任意颜色值 */
    color?: string
    disabled?: boolean
    readonly?: boolean
    leftIcon?: string
    required?: boolean
    /** 是否显示字段底边线（默认显示，与 van-field 列表 UI 一致） */
    border?: boolean
  }>(),
  {
    modelValue: '',
    type: 'single',
    label: '',
    labelAlign: 'left',
    inputAlign: 'left',
    placeholder: '请选择',
    title: '请选择日期',
    minDate: undefined,
    maxDate: undefined,
    defaultDate: undefined,
    minDays: 0,
    maxDays: 0,
    firstDayOfWeek: 0,
    showConfirm: true,
    confirmText: '确定',
    allowSameDay: false,
    color: undefined,
    disabled: false,
    readonly: false,
    leftIcon: '',
    required: false,
    border: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: ModelValue]
  /** 选中确认后回传：格式化后的字符串值 + 原始 Date/对象 */
  change: [value: ModelValue, raw: unknown]
}>()

const show = ref(false)
// van-calendar 内部的临时值（Date / { start, end } / Date[]）
const innerValue = ref<any>(null)

const hasValue = computed(() => {
  if (props.type === 'single') return !!props.modelValue
  return Array.isArray(props.modelValue) && props.modelValue.length > 0
})

const showClear = computed(() => hasValue.value && !props.disabled && !props.readonly)

// 字段展示文本
const displayText = computed(() => {
  if (!hasValue.value) return ''
  if (props.type === 'single') return props.modelValue as DateStr
  const arr = props.modelValue as DateStr[]
  if (props.type === 'range') {
    return arr.length === 2 ? `${arr[0]} 至 ${arr[1]}` : ''
  }
  return `已选 ${arr.length} 个日期`
})

const minDateVal = computed(() => {
  if (props.minDate) return toDate(props.minDate)
  // 默认最早可选：一年前的今天
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return d
})
const maxDateVal = computed(() => (props.maxDate ? toDate(props.maxDate) : undefined))

// 打开时定位日期
// 注意：range 模式下 van-calendar 期望 default-date 为数组 [Date]，且受控 modelValue 也必须是数组；
// 传单 Date 对象会被 reset 直接赋给 currentDate，导致点击时数组解构报错。
const defaultDateVal = computed<Date | Date[] | undefined>(() => {
  if (props.defaultDate) {
    const d = toDate(props.defaultDate)
    if (!d) return undefined
    return props.type === 'range' ? [d] : d
  }
  const mv = props.modelValue
  if (props.type === 'single' && mv) return toDate(mv as DateStr)
  if (props.type === 'multiple' && Array.isArray(mv) && mv.length) {
    return toDate(mv[0])
  }
  if (props.type === 'range' && Array.isArray(mv) && mv.length === 2) {
    const a = toDate(mv[0])
    const b = toDate(mv[1])
    if (!a || !b) return undefined
    return [a, b]
  }
  return undefined
})

// 将外部 modelValue 转换为 van-calendar 所需的内部值
function syncInnerFromModel() {
  if (props.type === 'single') {
    innerValue.value = props.modelValue ? toDate(props.modelValue as DateStr) : undefined
  } else if (props.type === 'range') {
    const arr = props.modelValue as DateStr[]
    innerValue.value =
      Array.isArray(arr) && arr.length === 2 ? [toDate(arr[0]), toDate(arr[1])] : undefined
  } else {
    const arr = props.modelValue as DateStr[]
    innerValue.value = Array.isArray(arr) ? arr.map((s) => toDate(s)) : []
  }
}

function open() {
  if (props.disabled || props.readonly) return
  syncInnerFromModel()
  show.value = true
}

// 确认回调：将内部 Date/对象转回字符串并对外 emit
// 注意 Vant4 各模式 confirm 实参格式：
//   single  → Date
//   range   → [start, end] 数组（非 {start,end} 对象）
//   multiple→ Date[]
function onConfirm(val: any) {
  if (!val) return
  let out: ModelValue
  if (props.type === 'single') {
    if (!(val instanceof Date)) return
    out = fmt(val)
    emit('change', out, val)
  } else if (props.type === 'range') {
    // val 为 [start, end] 数组；部分选择（仅一端）时忽略，等选齐再确认
    const arr: Date[] = Array.isArray(val) ? val : [val?.start, val?.end]
    const [start, end] = arr
    if (!start || !end) return
    out = [fmt(start), fmt(end)]
    emit('change', out, val)
  } else {
    if (!Array.isArray(val)) return
    out = val.map((d: Date) => fmt(d))
    emit('change', out, val)
  }
  emit('update:modelValue', out)
  show.value = false
}

function onClear() {
  const empty: ModelValue = props.type === 'single' ? '' : []
  emit('update:modelValue', empty)
  emit('change', empty, null)
}
</script>

<template>
  <div class="vant-calendar">
    <van-field
      :model-value="displayText"
      :label="label"
      :label-align="labelAlign"
      :input-align="inputAlign"
      :placeholder="placeholder"
      :left-icon="leftIcon"
      :required="required"
      :disabled="disabled"
      :border="border"
      is-link
      readonly
      class="vant-calendar__field"
      @click="open"
    >
      <template v-if="showClear" #right-icon>
        <van-icon
          name="clear"
          class="vant-field-clear-icon"
          role="button"
          aria-label="清空"
          @click.stop="onClear"
        />
      </template>
    </van-field>

    <van-calendar
      v-model:show="show"
      v-model="innerValue"
      teleport="body"
      :type="type"
      :title="title"
      :min-date="minDateVal"
      :max-date="maxDateVal"
      :default-date="defaultDateVal"
      :min-days="minDays || undefined"
      :max-days="maxDays || undefined"
      :first-day-of-week="firstDayOfWeek"
      :show-confirm="showConfirm"
      :confirm-text="confirmText"
      :allow-same-day="allowSameDay"
      :round="true"
      @confirm="onConfirm"
    />
  </div>
</template>

<style scoped>
/* ===== 核心目标：label / 值文本 / x清空按钮 / 右箭头 四者严格同一水平线 ===== */

/* 第1层：van-cell 主容器 —— 保证 title(label)、value(含body+x)、right-icon(箭头) 垂直居中 */
.vant-calendar__field :deep(.van-cell) {
  align-items: center;
}

/* 组件外裹了一层 div，导致内部 van-cell 成为该 div 的 :last-child，
   Vant 的 `.van-cell:last-child:after{display:none}` 会据此隐藏底边线。
   这里按 border 状态显式补回底边线，与 van-cell-group 内其余裸 van-field 保持一致；
   当 border=false（内部 van-cell 带 van-cell--borderless 类）时不补，维持隐藏。 */
.vant-calendar :deep(.van-cell:not(.van-cell--borderless))::after {
  display: block;
}

/* 第2层：value 容器 —— 保证内部的 body 不把整列撑高 */
.vant-calendar__field :deep(.van-cell__value) {
  display: flex;
  align-items: center;
  overflow: hidden;
}

/* 第3层：body —— input + right-icon(x) 的直接父级，必须 flex 居中 */
.vant-calendar__field :deep(.van-field__body) {
  display: flex;
  align-items: center;
}

/* 值输入框：占满中间、单行省略、line-height 锁死避免文字差异撑高 */
.vant-calendar__field :deep(.van-field__control) {
  flex: 1;
  min-width: 0;
  color: #1a1a1a;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 24px;
}

/* ===== 清空图标：与右侧 is-link 箭头严格同一水平线、尺寸/颜色一致 ===== */
.vant-calendar__field :deep(.van-field__right-icon),
.vant-calendar__field :deep(.van-cell__right-icon) {
  display: flex;
  align-items: center;
}
.vant-calendar__field .vant-field-clear-icon {
  display: block;
  font-size: 16px;
  line-height: inherit;
  color: #8a8a8a;
  cursor: pointer;
}
.vant-calendar__field .vant-field-clear-icon:active {
  color: #323233;
}
</style>

<!-- 弹窗层级：非 scoped（van-calendar 通过 Teleport 挂到 body，scoped 样式无法命中）。
     抬升 z-index 并强制挂到 body，避免被列表页悬浮「新增」按钮（z-index:999）遮挡。 -->
<style>
.van-calendar__popup {
  z-index: 3000 !important;
}
</style>
