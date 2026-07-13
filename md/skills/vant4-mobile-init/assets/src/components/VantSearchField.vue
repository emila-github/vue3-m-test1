<script setup lang="ts">
/**
 * VantSearchField —— 通用 Vant4 表单内动态搜索选择组件
 *
 * 基于 van-field（只读触发，作为 van-form 表单项）+ van-popup（底部弹出）+
 * van-search（弹层内输入）+ 联想列表 封装，适用于表单中「可搜索的下拉选择」。
 *
 * 特性：
 *   - 表单友好：渲染为 van-field，可直接放入 van-cell-group / van-form，支持 label、required、clearable
 *   - 内置防抖（默认 300ms），输入停顿后才发起搜索，避免高频请求
 *   - 内置请求竞态保护（seq），仅采用最新一次请求的结果
 *   - 数据来源二选一：
 *       1) fetch：传入异步函数 (kw) => Promise<OptionItem[]>，远程联想搜索
 *       2) options：传入本地静态数组，按关键词本地过滤
 *   - 数据格式可配置（与 VantSelectField 同约定）：
 *       字符串/数字数组 | 默认 {text,value} | 自定义 labelKey/valueKey | format()
 *   - 键盘上下 + 回车选择；选中项显示勾选图标
 *
 * 用法：
 *   <VantSearchField v-model="form.insurer" :fetch="searchApi" label="保险公司"
 *                    placeholder="选择承保公司" title="选择保险公司" clearable />
 *   <VantSearchField v-model="form.city" :options="cityList" label="城市" />
 */
import { ref, computed, watch, onUnmounted } from 'vue'

type OptionItem = string | number | Record<string, any>

export interface NormalizedOption {
  text: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    /** 远程搜索函数：接收关键词，返回结果数组（Promise）。与 options 二选一 */
    fetch?: (keyword: string) => Promise<OptionItem[]>
    /** 本地静态选项：无 fetch 时按关键词过滤 */
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
    /** 防抖延迟（毫秒） */
    debounce?: number
    /** 触发搜索 / 过滤的最小关键词长度 */
    minLength?: number
    /** 最多展示结果条数，0 表示不限制 */
    maxResults?: number
    disabled?: boolean
    readonly?: boolean
    clearable?: boolean
    required?: boolean
    leftIcon?: string
  }>(),
  {
    modelValue: '',
    fetch: undefined,
    options: () => [],
    label: '',
    placeholder: '请选择',
    title: '请选择',
    valueKey: 'value',
    labelKey: 'text',
    format: undefined,
    debounce: 300,
    minLength: 1,
    maxResults: 0,
    disabled: false,
    readonly: false,
    clearable: false,
    required: false,
    leftIcon: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  change: [value: string | number, option: NormalizedOption | null]
  select: [value: string | number, option: NormalizedOption]
}>()

const show = ref(false)
const keyword = ref('')
const results = ref<NormalizedOption[]>([])
const loading = ref(false)
const error = ref('')
const activeIndex = ref(-1)

// 本地选项的归一化
const localOptions = computed<NormalizedOption[]>(() => normalize(props.options))

function normalize(list: OptionItem[]): NormalizedOption[] {
  const max = props.maxResults > 0 ? props.maxResults : list.length
  return list.slice(0, max).map((opt) => {
    if (props.format) return props.format(opt)
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { text: String(opt), value: opt }
    }
    const item = opt as Record<string, any>
    return { text: String(item[props.labelKey]), value: item[props.valueKey] }
  })
}

// 字段展示文本：优先从已选值匹配，其次从当前结果匹配
const displayText = computed(() => {
  if (props.modelValue === '' || props.modelValue == null) return ''
  const inLocal = localOptions.value.find((o) => o.value === props.modelValue)
  if (inLocal) return inLocal.text
  const inResult = results.value.find((o) => o.value === props.modelValue)
  return inResult ? inResult.text : String(props.modelValue)
})

const showClear = computed(
  () => props.clearable && props.modelValue !== '' && props.modelValue != null,
)

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

// 执行一次搜索 / 过滤
function runSearch(kw: string) {
  if (props.fetch) {
    if (!kw || kw.length < props.minLength) {
      results.value = []
      loading.value = false
      error.value = ''
      return
    }
    const mySeq = ++seq
    error.value = ''
    loading.value = true
    props
      .fetch(kw)
      .then((raw) => {
        if (mySeq !== seq) return // 竞态保护：丢弃过期响应
        results.value = normalize(raw)
        loading.value = false
        activeIndex.value = -1
      })
      .catch((e: unknown) => {
        if (mySeq !== seq) return
        error.value = e instanceof Error ? e.message : '搜索失败'
        results.value = []
        loading.value = false
      })
    return
  }
  // 本地过滤
  if (!kw || kw.length < props.minLength) {
    results.value =
      props.maxResults > 0 ? localOptions.value.slice(0, props.maxResults) : localOptions.value
    loading.value = false
    return
  }
  const lower = kw.toLowerCase()
  results.value = localOptions.value.filter((o) => o.text.toLowerCase().includes(lower))
  loading.value = false
}

// 输入实时防抖
watch(keyword, (kw) => {
  clearTimeout(timer)
  if (props.fetch) {
    if (!kw || kw.length < props.minLength) {
      results.value = []
      loading.value = false
      error.value = ''
      return
    }
  } else if (!kw) {
    results.value = localOptions.value
    return
  }
  timer = setTimeout(() => runSearch(kw), props.debounce)
})

function open() {
  if (props.disabled || props.readonly) return
  keyword.value = ''
  results.value = props.fetch ? [] : localOptions.value
  loading.value = false
  error.value = ''
  activeIndex.value = -1
  show.value = true
}

function onSelect(opt: NormalizedOption) {
  emit('update:modelValue', opt.value)
  emit('change', opt.value, opt)
  emit('select', opt.value, opt)
  show.value = false
}

function onClear() {
  emit('update:modelValue', '')
  emit('change', '', null)
}

function onKeydown(e: KeyboardEvent) {
  if (!results.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % results.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + results.value.length) % results.value.length
  } else if (e.key === 'Enter') {
    if (activeIndex.value >= 0 && results.value[activeIndex.value]) {
      onSelect(results.value[activeIndex.value])
    }
  }
}

onUnmounted(() => clearTimeout(timer))
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
    class="vant-search-field"
    @click="open"
  >
    <template v-if="showClear" #right-icon>
      <van-icon name="clear" class="vant-search-field__clear" @click.stop="onClear" />
    </template>
  </van-field>

  <van-popup v-model:show="show" position="bottom" round class="vant-search-field__popup">
    <div class="vant-search-field__header">
      <span class="vant-search-field__title">{{ title }}</span>
      <van-icon name="cross" class="vant-search-field__close" @click="show = false" />
    </div>

    <div class="vant-search-field__search">
      <van-search
        v-model="keyword"
        placeholder="输入关键词搜索"
        :debounce="0"
        shape="round"
        @keydown="onKeydown"
      />
    </div>

    <div class="vant-search-field__body">
      <ul v-if="!error && results.length" class="vant-search-field__list">
        <li
          v-for="(opt, i) in results"
          :key="opt.value + '-' + i"
          class="vant-search-field__item"
          :class="{
            'is-active': i === activeIndex,
            'is-selected': opt.value === modelValue,
          }"
          @mouseenter="activeIndex = i"
          @click="onSelect(opt)"
        >
          <span class="vant-search-field__item-text">{{ opt.text }}</span>
          <van-icon
            v-if="opt.value === modelValue"
            name="success"
            class="vant-search-field__item-icon"
          />
        </li>
      </ul>
      <div v-else-if="error" class="vant-search-field__state vant-search-field__state--error">
        {{ error }}
      </div>
      <div v-else-if="loading" class="vant-search-field__state">搜索中…</div>
      <div v-else-if="keyword && keyword.length >= minLength" class="vant-search-field__state">
        无匹配结果
      </div>
      <div v-else class="vant-search-field__state">请输入关键词搜索</div>
    </div>
  </van-popup>
</template>

<style scoped>
.vant-search-field :deep(.van-field__control) {
  color: #1a1a1a;
}
.vant-search-field__clear {
  color: #8a8a8a;
  font-size: 16px;
}

.vant-search-field__popup {
  display: flex;
  flex-direction: column;
  max-height: 75vh;
}
.vant-search-field__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
}
.vant-search-field__title {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}
.vant-search-field__close {
  font-size: 20px;
  color: #969799;
}
.vant-search-field__body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.vant-search-field__list {
  list-style: none;
  margin: 0;
  padding: 4px 0 8px;
}
.vant-search-field__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 15px;
  color: #323233;
  cursor: pointer;
}
.vant-search-field__item.is-active {
  background: #f5f6f8;
}
.vant-search-field__item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.vant-search-field__item-icon {
  color: var(--van-primary-color, #1989fa);
  font-size: 16px;
  flex-shrink: 0;
}
.vant-search-field__state {
  padding: 28px 16px;
  text-align: center;
  font-size: 13px;
  color: #969799;
}
.vant-search-field__state--error {
  color: #ee0a24;
}
</style>
