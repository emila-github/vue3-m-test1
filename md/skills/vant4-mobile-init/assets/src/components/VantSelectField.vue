<script setup lang="ts">
/**
 * VantSelectField —— 通用 Vant4 下拉单选组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部弹出）+ van-picker（滚轮单选）封装。
 * 数据格式可配置：
 *   1) 字符串 / 数字数组：['宝马', '奔驰'] / [1, 2]
 *   2) Vant 默认对象数组：[{ text: '宝马', value: '宝马' }]
 *   3) 自定义对象数组：通过 valueKey / labelKey 指定取值字段
 *   4) 完全自定义：通过 format(opt) => { text, value } 归一化
 *
 * 用法：
 *   <VantSelectField v-model="form.carBrand" :options="carBrandOptions" label="车辆品牌" title="选择品牌" />
 *   <VantSelectField v-model="cat" :options="cats" value-key="id" label-key="name" />
 *   <VantSelectField v-model="x" :options="raw" :format="(o) => ({ text: o.label, value: o.code })" />
 */
import { ref, computed } from 'vue'

type OptionItem = string | number | Record<string, any>

export interface NormalizedOption {
  text: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    options?: OptionItem[]
    label?: string
    placeholder?: string
    title?: string
    /** 自定义对象中取值字段（默认 value） */
    valueKey?: string
    /** 自定义对象中取文本字段（默认 text） */
    labelKey?: string
    /** 完全自定义归一化函数，优先级高于 valueKey / labelKey */
    format?: (opt: OptionItem) => NormalizedOption
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    leftIcon?: string
    required?: boolean
  }>(),
  {
    modelValue: '',
    options: () => [],
    label: '',
    placeholder: '请选择',
    title: '请选择',
    valueKey: 'value',
    labelKey: 'text',
    format: undefined,
    disabled: false,
    readonly: false,
    clearable: false,
    leftIcon: '',
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number, option: NormalizedOption | null]
}>()

const show = ref(false)
// van-picker 的 v-model 为选中值数组，用于打开时定位当前选项
const pickerValue = ref<Array<string | number>>([])

const normalized = computed<NormalizedOption[]>(() =>
  props.options.map((opt) => {
    if (props.format) return props.format(opt)
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { text: String(opt), value: opt }
    }
    const item = opt as Record<string, any>
    return {
      text: String(item[props.labelKey]),
      value: item[props.valueKey],
    }
  }),
)

const displayText = computed(() => {
  const found = normalized.value.find((o) => o.value === props.modelValue)
  return found ? found.text : ''
})

const showClear = computed(
  () => props.clearable && props.modelValue !== '' && props.modelValue != null,
)

function open() {
  if (props.disabled || props.readonly) return
  pickerValue.value =
    props.modelValue === '' || props.modelValue == null ? [] : [props.modelValue as string | number]
  show.value = true
}

function onConfirm(val: any) {
  const opt = val?.selectedOptions?.[0] as NormalizedOption | undefined
  if (opt) {
    emit('update:modelValue', opt.value)
    emit('change', opt.value, opt)
  }
  show.value = false
}

function onClear() {
  emit('update:modelValue', '')
  emit('change', '', null)
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
    class="vant-select"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-select__clear" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round>
    <van-picker
      v-model="pickerValue"
      :columns="normalized"
      :title="title"
      @confirm="onConfirm"
      @cancel="show = false"
    />
  </van-popup>
</template>

<style scoped>
.vant-select :deep(.van-field__control) {
  color: #1a1a1a;
}
.vant-select__clear {
  color: #8a8a8a;
  font-size: 16px;
}
</style>
