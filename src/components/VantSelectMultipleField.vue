<script setup lang="ts">
/**
 * VantSelectMultipleField —— 通用 Vant4 下拉多选组件
 *
 * 基于 van-field（只读触发）+ van-popup（底部弹出）+ van-cell 勾选列表（纯展示型勾选图标）封装。
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
import { ref, computed, useAttrs } from 'vue'

// 组件含 van-field + van-popup 两个根节点，属多根片段组件；
// 关闭自动属性继承，把透传属性（如 id / data-track-anchor）显式绑到触发元素 van-field 上，
// 既消除「Extraneous non-props attributes」告警，又让录制锚点落到正确的业务元素上。
defineOptions({ inheritAttrs: false })

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
    /** label 文本对齐方式（透传 van-field label-align）：left / center / right */
    labelAlign?: 'left' | 'center' | 'right'
    /** 值文本对齐方式（透传 van-field input-align）：left / center / right */
    inputAlign?: 'left' | 'center' | 'right'
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
    labelAlign: 'left',
    inputAlign: 'left',
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

const attrs = useAttrs()
// 业务锚点基名：优先取调用方传入的 data-track-anchor（如 extraCoverage），否则回退到 label；
// 用于为弹层内每个选项生成「与选中态无关」的稳定唯一锚点，例如
// [data-track-anchor="extraCoverage-opt-<value>"]，保证回放时可稳定定位，
// 不再依赖脆弱的 vsm-check--on/off 状态类或 nth-child（否则状态不符即回放失败）。
const anchorBase = computed(() => String(attrs['data-track-anchor'] ?? props.label ?? 'multi-select'))

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

// 勾选/取消时处理 max 限制；max<=0 表示不限制
function isOptionDisabled(value: string | number) {
  return props.max > 0 && !temp.value.includes(value) && reachedMax.value
}

function onToggle(value: string | number) {
  const idx = temp.value.indexOf(value)
  if (idx >= 0) {
    temp.value.splice(idx, 1)
  } else if (props.max <= 0 || !reachedMax.value) {
    temp.value.push(value)
  }
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
    class="vant-select-multiple"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-field-clear-icon" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round class="vsm-popup">
    <div class="vsm-header">
      <span class="vsm-cancel" :data-track-anchor="`${anchorBase}-cancel`" @click="show = false">取消</span>
      <span class="vsm-title">{{ title }}</span>
      <span class="vsm-confirm" :data-track-anchor="`${anchorBase}-confirm`" @click="onConfirm">确定</span>
    </div>

    <div v-if="max > 0" class="vsm-counter">已选 {{ temp.length }} / {{ max }}</div>

    <div class="vsm-list">
      <van-cell
        v-for="opt in normalized"
        :key="opt.value"
        :title="opt.text"
        :data-track-anchor="`${anchorBase}-opt-${opt.value}`"
        clickable
        :class="{ 'vsm-option--disabled': isOptionDisabled(opt.value) }"
        @click="onToggle(opt.value)"
      >
        <template #right-icon>
          <!-- 纯展示型勾选图标：不拦截点击事件，保证整行点击冒泡到 document 被录制器捕获。
               同时把「与勾选态无关」的稳定锚点直接打在图标 <i> 上：录制时 buildSelector
               会从被点的 <i> 立即以 data-track-anchor 收口，不再带上 vsm-check--on/off 这种
               随勾选态变化的类；否则回放时该选项初始状态（off）与录制时（on）不符，
               `> i.vsm-check--on` 永远匹配不上 → 走兜底。 -->
          <van-icon
            class="vsm-check"
            :name="temp.includes(opt.value) ? 'checked' : 'circle'"
            :class="temp.includes(opt.value) ? 'vsm-check--on' : 'vsm-check--off'"
            :data-track-anchor="`${anchorBase}-opt-${opt.value}`"
          />
        </template>
      </van-cell>
    </div>
  </van-popup>
</template>

<style scoped>
.vant-select-multiple :deep(.van-field__control) {
  color: var(--app-text);
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
  border-bottom: 1px solid var(--app-border);
}
.vsm-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--app-text);
}
.vsm-cancel {
  font-size: 14px;
  color: var(--app-text-3);
}
.vsm-confirm {
  font-size: 14px;
  color: #1989fa;
  font-weight: 500;
}
.vsm-counter {
  font-size: 12px;
  color: var(--app-text-3);
  padding: 8px 16px 0;
}
.vsm-list {
  flex: 1;
  overflow-y: auto;
}
.vsm-check {
  font-size: 18px;
}
.vsm-check--on {
  color: #1989fa;
}
.vsm-check--off {
  color: var(--app-text-3);
}
.vsm-option--disabled {
  opacity: 0.5;
}

/* ===== 清空图标：与右侧 is-link 箭头严格同一水平线、尺寸/颜色一致 ===== */
.vant-select-multiple :deep(.van-field__right-icon),
.vant-select-multiple :deep(.van-cell__right-icon) {
  display: flex;
  align-items: center;
}
.vant-select-multiple .vant-field-clear-icon {
  display: block;
  font-size: 16px;
  line-height: inherit;
  color: var(--app-text-3);
  cursor: pointer;
}
.vant-select-multiple .vant-field-clear-icon:active {
  color: var(--app-text);
}
</style>
