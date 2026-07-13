<script setup lang="ts">
/**
 * VantSelectMultipleField —— 通用 Vant4 下拉多选组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部弹出）+ van-checkbox-group（勾选列表）封装。
 * 数据格式可配置（与 VantSelectField 一致）：
 *   1) 字符串 / 数字数组：['玻璃', '自燃'] / [1, 2]
 *   2) Vant 默认对象数组：[{ text: '玻璃', value: 'glass' }]
 *   3) 自定义对象数组：通过 valueKey / labelKey 指定取值字段
 *   4) 完全自定义：通过 format(opt) => { text, value } 归一化
 *
 * 用法：
 *   <VantSelectMultipleField v-model="form.extraInsurance" :options="extraOptions" label="附加险种" />
 *   <VantSelectMultipleField v-model="cats" :options="cats" value-key="id" label-key="name" />
 *   <VantSelectMultipleField v-model="x" :options="raw" :format="(o) => ({ text: o.label, value: o.code })" />
 */
import { ref, computed } from 'vue'

type OptionItem = string | number | Record<string, any>

export interface NormalizedOption {
  text: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: Array<string | number>
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
    /** 最多可选数量，0 表示不限制 */
    max?: number
  }>(),
  {
    modelValue: () => [],
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
    max: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Array<string | number>]
  change: [value: Array<string | number>, options: NormalizedOption[]]
}>()

const show = ref(false)
// 弹层内临时勾选结果，确认后再写回 modelValue
const temp = ref<Array<string | number>>([])

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
  const texts = normalized.value
    .filter((o) => props.modelValue.includes(o.value))
    .map((o) => o.text)
  return texts.join('、')
})

const showClear = computed(() => props.clearable && props.modelValue.length > 0)

const reachedMax = computed(() => props.max > 0 && temp.value.length >= props.max)

function open() {
  if (props.disabled || props.readonly) return
  temp.value = [...props.modelValue]
  show.value = true
}

function onConfirm() {
  emit('update:modelValue', [...temp.value])
  const picked = normalized.value.filter((o) => temp.value.includes(o.value))
  emit('change', [...temp.value], picked)
  show.value = false
}

function onClear() {
  emit('update:modelValue', [])
  emit('change', [], [])
}

// 勾选/取消时处理 max 限制
function onToggle(value: string | number) {
  if (props.max <= 0) return
  const idx = temp.value.indexOf(value)
  if (idx >= 0) {
    temp.value.splice(idx, 1)
  } else if (!reachedMax.value) {
    temp.value.push(value)
  }
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
    class="vant-select-multiple"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-select-multiple__clear" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round class="vsm-popup">
    <div class="vsm-header">
      <span class="vsm-cancel" @click="show = false">取消</span>
      <span class="vsm-title">{{ title }}</span>
      <span class="vsm-confirm" @click="onConfirm">确定</span>
    </div>

    <div v-if="max > 0" class="vsm-counter">已选 {{ temp.length }} / {{ max }}</div>

    <van-checkbox-group v-model="temp" class="vsm-list">
      <van-cell
        v-for="opt in normalized"
        :key="opt.value"
        :title="opt.text"
        clickable
        @click="onToggle(opt.value)"
      >
        <template #right-icon>
          <van-checkbox
            :name="opt.value"
            :disabled="max > 0 && !temp.includes(opt.value) && reachedMax"
            @click.stop
          />
        </template>
      </van-cell>
    </van-checkbox-group>
  </van-popup>
</template>

<style scoped>
.vant-select-multiple :deep(.van-field__control) {
  color: #1a1a1a;
}
.vant-select-multiple__clear {
  color: #8a8a8a;
  font-size: 16px;
}
.vsm-popup {
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}
.vsm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f2f3f5;
}
.vsm-title {
  font-size: 15px;
  font-weight: 500;
  color: #323233;
}
.vsm-cancel {
  font-size: 14px;
  color: #969799;
}
.vsm-confirm {
  font-size: 14px;
  color: #1989fa;
  font-weight: 500;
}
.vsm-counter {
  font-size: 12px;
  color: #969799;
  padding: 8px 16px 0;
}
.vsm-list {
  flex: 1;
  overflow-y: auto;
}
</style>
