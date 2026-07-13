<script setup lang="ts">
/**
 * VantTimePickerField —— 通用 Vant4 下拉时间/日期选择组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部）+ van-time-picker / van-date-picker 封装。
 * 通过 type 支持多种模式：
 *   - 'time'       时分选择，返回 "HH:mm"
 *   - 'date'       日期选择，返回 format 格式化字符串（默认 YYYY-MM-DD）
 *   - 'year-month' 年月，返回默认 YYYY-MM
 *
 * 用法：
 *   <VantTimePickerField v-model="form.startTime" type="time" label="起保时间" />
 *   <VantTimePickerField v-model="day" type="date" label="投保日期" />
 *   <VantTimePickerField v-model="ym" type="year-month" label="账期" />
 *
 * 注：Vant 4.9 已将原 van-datetime-picker 拆分为 van-time-picker 与 van-date-picker，
 *     本组件对内自动选择对应底层组件，对外仍保持统一的字符串 v-model。
 */
import { ref, computed } from 'vue'

export type TimePickerType = 'time' | 'date' | 'year-month'

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    /** 选择模式，默认 time */
    type?: TimePickerType
    label?: string
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
// van-time-picker / van-date-picker 的 v-model 均为 string[]（如 ['09','30'] / ['2026','07','10']）
const pickerValue = ref<string[]>([])

const isTime = computed(() => props.type === 'time')

const defaultFormatMap: Record<TimePickerType, string> = {
  time: 'HH:mm',
  date: 'YYYY-MM-DD',
  'year-month': 'YYYY-MM',
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
}

const displayText = computed(() => (props.modelValue ? props.modelValue : ''))

const showClear = computed(() => props.clearable && !!props.modelValue)

function open() {
  if (props.disabled || props.readonly) return
  if (isTime.value) {
    pickerValue.value = props.modelValue ? props.modelValue.split(':') : ['00', '00']
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

function onConfirm(payload: any) {
  // van-time-picker / van-date-picker 的 confirm 事件载荷为对象 { selectedValues, selectedOptions, selectedIndexes }
  const val: string[] = Array.isArray(payload) ? payload : (payload?.selectedValues ?? [])
  let out = ''
  if (isTime.value) {
    out = `${pad(val[0] ?? 0)}:${pad(val[1] ?? 0)}`
  } else {
    const y = Number(val[0])
    const m = Number(val[1])
    const d = props.type === 'year-month' ? 1 : Number(val[2] ?? 1)
    out = formatDate(new Date(y, m - 1, d), outFormat.value)
  }
  emit('update:modelValue', out)
  emit('change', out)
  show.value = false
}

function onClear() {
  emit('update:modelValue', '')
  emit('change', '')
}
</script>

<template>
  <van-field
    :model-value="displayText"
    :label="label"
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
      <van-icon name="clear" class="vant-time-picker__clear" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round>
    <van-time-picker
      v-if="isTime"
      v-model="pickerValue"
      :title="title"
      :min-hour="minHour"
      :max-hour="maxHour"
      :min-minute="minMinute"
      :max-minute="maxMinute"
      :columns-type="['hour', 'minute']"
      @confirm="onConfirm"
      @cancel="show = false"
    />
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
  color: #1a1a1a;
}
.vant-time-picker__clear {
  color: #8a8a8a;
  font-size: 16px;
}
</style>
