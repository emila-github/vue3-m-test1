<script setup lang="ts">
/**
 * VantTimePickerField —— 通用 Vant4 下拉时间/日期选择组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部）+ van-time-picker / van-date-picker 封装。
 * 通过 type 支持多种模式：
 *   - 'time'       时分选择，返回 "HH:mm"
 *   - 'date'       日期选择，返回 format 格式化字符串（默认 YYYY-MM-DD）
 *   - 'year-month' 年月，返回默认 YYYY-MM
 *   - 'datetime'   日期 + 时分选择，返回 "YYYY-MM-DD HH:mm:ss"
 *
 * 用法：
 *   <VantTimePickerField v-model="form.startTime" type="time" label="起保时间" />
 *   <VantTimePickerField v-model="day" type="date" label="投保日期" />
 *   <VantTimePickerField v-model="ym" type="year-month" label="账期" />
 *   <VantTimePickerField v-model="ts" type="datetime" label="拜访时间" />
 *
 * 注：Vant 4.9 已将原 van-datetime-picker 拆分为 van-time-picker 与 van-date-picker，
 *     本组件对内自动选择对应底层组件，对外仍保持统一的字符串 v-model。
 */
import { ref, computed } from 'vue'

// 组件含 van-field + van-popup 两个根节点，属多根片段组件；
// 关闭自动属性继承，把透传属性（如 id / data-track-anchor）显式绑到触发元素 van-field 上，
// 既消除「Extraneous non-props attributes」告警，又让录制锚点落到正确的业务元素上。
defineOptions({ inheritAttrs: false })

export type TimePickerType = 'time' | 'date' | 'year-month' | 'datetime'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** 选择模式，默认 time */
    type?: TimePickerType
    label?: string
    /** label 文本对齐方式（透传 van-field label-align）：left / center / right */
    labelAlign?: 'left' | 'center' | 'right'
    /** 值文本对齐方式（透传 van-field input-align）：left / center / right */
    inputAlign?: 'left' | 'center' | 'right'
    placeholder?: string
    title?: string
    /** 非 time 模式下的输出格式（默认 YYYY-MM-DD / YYYY-MM） */
    format?: string
    /** date / year-month 模式的最小日期 */
    minDate?: Date
    /** date / year-month 模式的最大日期 */
    maxDate?: Date
    /** time 模式最小小时 */
    minHour?: number
    /** time 模式最大小时 */
    maxHour?: number
    /** time 模式最小分钟 */
    minMinute?: number
    /** time 模式最大分钟 */
    maxMinute?: number
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    leftIcon?: string
    required?: boolean
  }>(),
  {
    modelValue: '',
    type: 'time',
    label: '',
    labelAlign: 'left',
    inputAlign: 'left',
    placeholder: '请选择',
    title: '请选择',
    format: '',
    minDate: undefined,
    maxDate: undefined,
    minHour: 0,
    maxHour: 23,
    minMinute: 0,
    maxMinute: 59,
    disabled: false,
    readonly: false,
    clearable: false,
    leftIcon: '',
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  change: [value: string]
}>()

const show = ref(false)
// van-date-picker 的 v-model（日期部分）：['2026','07','10']
const pickerValue = ref<string[]>([])
// van-time-picker 的 v-model（时间部分）：['09','30']
const timeValue = ref<string[]>([])

const isTime = computed(() => props.type === 'time')
const isDateTime = computed(() => props.type === 'datetime')

const defaultFormatMap: Record<TimePickerType, string> = {
  time: 'HH:mm',
  date: 'YYYY-MM-DD',
  'year-month': 'YYYY-MM',
  datetime: 'YYYY-MM-DD HH:mm:ss',
}
const outFormat = computed(() => props.format || defaultFormatMap[props.type])

// date / year-month 模式下的列类型
const columnsType = computed<Array<'year' | 'month' | 'day'>>(() =>
  props.type === 'year-month' ? ['year', 'month'] : ['year', 'month', 'day'],
)

function pad(n: string | number) {
  return String(n).padStart(2, '0')
}

function formatDate(d: Date, fmt: string): string {
  return fmt
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, pad(d.getMonth() + 1))
    .replace(/DD/g, pad(d.getDate()))
    .replace(/HH/g, pad(d.getHours()))
    .replace(/mm/g, pad(d.getMinutes()))
    .replace(/ss/g, pad(d.getSeconds()))
}

const displayText = computed(() => (props.modelValue ? props.modelValue : ''))

const showClear = computed(() => props.clearable && !!props.modelValue)

function open() {
  if (props.disabled || props.readonly) return
  if (isTime.value) {
    timeValue.value = props.modelValue ? props.modelValue.split(':') : ['00', '00']
  } else if (isDateTime.value) {
    const parts = props.modelValue ? props.modelValue.split(' ') : []
    const d = parts[0] ? parts[0].split('-') : ['2026', '01', '01']
    const t = parts[1] ? parts[1].split(':') : ['00', '00']
    pickerValue.value = d.slice(0, 3).length === 3 ? d.slice(0, 3) : ['2026', '01', '01']
    timeValue.value = t.slice(0, 2).length === 2 ? t.slice(0, 2) : ['00', '00']
  } else {
    const arr = props.modelValue ? props.modelValue.split('-') : null
    if (props.type === 'year-month') {
      pickerValue.value = arr && arr.length >= 2 ? arr.slice(0, 2) : ['2026', '01']
    } else {
      pickerValue.value = arr && arr.length >= 3 ? arr.slice(0, 3) : ['2026', '01', '01']
    }
  }
  show.value = true
}

function emitValue(out: string) {
  emit('update:modelValue', out)
  emit('change', out)
  show.value = false
}

function onConfirm(payload: any) {
  // van-time-picker / van-date-picker 的 confirm 事件载荷为对象 { selectedValues, selectedOptions, selectedIndexes }
  const val: string[] = Array.isArray(payload) ? payload : (payload?.selectedValues ?? [])
  if (isTime.value) {
    emitValue(`${pad(val[0] ?? 0)}:${pad(val[1] ?? 0)}`)
    return
  }
  const y = Number(val[0])
  const m = Number(val[1])
  const d = props.type === 'year-month' ? 1 : Number(val[2] ?? 1)
  emitValue(formatDate(new Date(y, m - 1, d), outFormat.value))
}

// datetime：日期 + 时间两个选择器组合确认
function onDateTimeConfirm() {
  const y = Number(pickerValue.value[0] ?? 2026)
  const m = Number(pickerValue.value[1] ?? 1)
  const d = Number(pickerValue.value[2] ?? 1)
  const hh = Number(timeValue.value[0] ?? 0)
  const mm = Number(timeValue.value[1] ?? 0)
  emitValue(formatDate(new Date(y, m - 1, d, hh, mm), outFormat.value))
}

function onClear() {
  emit('update:modelValue', '')
  emit('change', '')
}
</script>

<template>
  <van-field
    v-bind="$attrs"
    :model-value="displayText"
    :label="label"
    :label-align="labelAlign"
    :input-align="inputAlign"
    :placeholder="placeholder"
    :left-icon="leftIcon"
    :required="required"
    :disabled="disabled"
    is-link
    readonly
    class="vant-time-picker"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-field-clear-icon" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round>
    <van-time-picker
      v-if="isTime"
      v-model="timeValue"
      :title="title"
      :min-hour="minHour"
      :max-hour="maxHour"
      :min-minute="minMinute"
      :max-minute="maxMinute"
      :columns-type="['hour', 'minute']"
      @confirm="onConfirm"
      @cancel="show = false"
    />
    <van-picker-group
      v-else-if="isDateTime"
      :tabs="['选择日期', '选择时间']"
      :title="title"
      @confirm="onDateTimeConfirm"
      @cancel="show = false"
    >
      <van-date-picker
        v-model="pickerValue"
        :columns-type="['year', 'month', 'day']"
        :min-date="minDate"
        :max-date="maxDate"
      />
      <van-time-picker
        v-model="timeValue"
        :columns-type="['hour', 'minute']"
        :min-hour="minHour"
        :max-hour="maxHour"
        :min-minute="minMinute"
        :max-minute="maxMinute"
      />
    </van-picker-group>
    <van-date-picker
      v-else
      v-model="pickerValue"
      :title="title"
      :columns-type="columnsType"
      :min-date="minDate"
      :max-date="maxDate"
      @confirm="onConfirm"
      @cancel="show = false"
    />
  </van-popup>
</template>

<style scoped>
.vant-time-picker :deep(.van-field__control) {
  color: var(--app-text);
}

/* ===== 清空图标：与右侧 is-link 箭头严格同一水平线、尺寸/颜色一致 ===== */
.vant-time-picker :deep(.van-field__right-icon),
.vant-time-picker :deep(.van-cell__right-icon) {
  display: flex;
  align-items: center;
}
.vant-time-picker .vant-field-clear-icon {
  display: block;
  font-size: 16px;
  line-height: inherit;
  color: var(--app-text-3);
  cursor: pointer;
}
.vant-time-picker .vant-field-clear-icon:active {
  color: var(--app-text);
}
</style>
