<script setup lang="ts">
/**
 * VantSearch —— 通用 Vant4 动态搜索（联想）组件
 *
 * 基于 van-search（输入）+ 下拉联想面板 封装：
 *   - 内置防抖（默认 300ms），输入停顿后才发起搜索，避免高频请求
 *   - 内置请求竞态保护（seq），仅采用最新一次请求的结果
 *   - 结果以下拉面板展示：loading / 错误 / 空态 / 列表
 *   - 支持鼠标点击与键盘上下 + 回车选择
 *
 * 数据格式可配置（与 VantSelectField 同约定）：
 *   1) 字符串 / 数字数组：['北京','上海']
 *   2) 默认对象数组：[{ text:'北京', value:'bj' }]
 *   3) 自定义对象：通过 labelKey / valueKey 指定字段
 *   4) 完全自定义：format(opt) => { text, value }
 *
 * 用法：
 *   <VantSearch v-model="kw" :fetch="searchApi" @select="onSelect" />
 *   <VantSearch v-model="kw" :fetch="searchApi" label-key="name" value-key="id"
 *               :debounce="400" :min-length="2" placeholder="搜索用户" />
 */
import { ref, computed, watch, onUnmounted } from 'vue'

type OptionItem = string | number | Record<string, any>

export interface NormalizedOption {
  text: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    modelValue?: string
    /** 异步搜索函数：接收关键词，返回结果数组（Promise） */
    fetch?: (keyword: string) => Promise<OptionItem[]>
    placeholder?: string
    /** 自定义对象中取文本字段（默认 text） */
    labelKey?: string
    /** 自定义对象中取值字段（默认 value） */
    valueKey?: string
    /** 完全自定义归一化函数，优先级高于 labelKey / valueKey */
    format?: (opt: OptionItem) => NormalizedOption
    /** 防抖延迟（毫秒） */
    debounce?: number
    /** 触发搜索的最小关键词长度 */
    minLength?: number
    clearable?: boolean
    disabled?: boolean
    readonly?: boolean
    /** 最多展示结果条数，0 表示不限制 */
    maxResults?: number
  }>(),
  {
    modelValue: '',
    fetch: undefined,
    placeholder: '请输入关键词搜索',
    labelKey: 'text',
    valueKey: 'value',
    format: undefined,
    debounce: 300,
    minLength: 1,
    clearable: true,
    disabled: false,
    readonly: false,
    maxResults: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  /** 选中某条结果 */
  select: [value: string | number, option: NormalizedOption]
  /** 实际发起搜索时（防抖结束后） */
  search: [keyword: string]
  /** 结果变化 */
  'update:results': [results: NormalizedOption[]]
}>()

const keyword = ref<string>(props.modelValue ?? '')
const results = ref<NormalizedOption[]>([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)
const focused = ref(false)
const activeIndex = ref(-1)

// 同步外部 v-model -> 内部
watch(
  () => props.modelValue,
  (v) => {
    if (v !== keyword.value) keyword.value = v ?? ''
  },
)

const showPanel = computed(
  () =>
    focused.value &&
    !props.disabled &&
    !props.readonly &&
    keyword.value.length >= props.minLength &&
    (loading.value || !!error.value || searched.value),
)

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

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0

function doSearch(kw: string) {
  if (!props.fetch) return
  const mySeq = ++seq
  error.value = ''
  props
    .fetch(kw)
    .then((raw) => {
      if (mySeq !== seq) return // 已被更新的请求取代，丢弃旧结果
      results.value = normalize(raw)
      searched.value = true
      activeIndex.value = -1
      emit('update:results', results.value)
    })
    .catch((e: unknown) => {
      if (mySeq !== seq) return
      error.value = e instanceof Error ? e.message : '搜索失败'
      results.value = []
      searched.value = true
    })
    .finally(() => {
      if (mySeq === seq) loading.value = false
    })
}

// 输入实时防抖搜索
watch(keyword, (kw) => {
  emit('update:modelValue', kw)
  clearTimeout(timer)
  if (props.disabled || props.readonly) return
  if (!kw || kw.length < props.minLength || !props.fetch) {
    results.value = []
    loading.value = false
    error.value = ''
    searched.value = false
    return
  }
  loading.value = true
  timer = setTimeout(() => {
    emit('search', kw)
    doSearch(kw)
  }, props.debounce)
})

// 回车 / 点搜索按钮：立即搜索（忽略防抖）
function onSearch() {
  clearTimeout(timer)
  if (keyword.value && keyword.value.length >= props.minLength && props.fetch) {
    loading.value = true
    searched.value = false
    emit('search', keyword.value)
    doSearch(keyword.value)
  }
}

function onFocus() {
  focused.value = true
}
function onBlur() {
  focused.value = false
}

function onSelect(opt: NormalizedOption) {
  keyword.value = opt.text
  focused.value = false
  emit('update:modelValue', opt.text)
  emit('select', opt.value, opt)
}

function onKeydown(e: KeyboardEvent) {
  if (!showPanel.value || !results.value.length) return
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
  } else if (e.key === 'Escape') {
    focused.value = false
  }
}

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="vant-search">
    <van-search
      v-model="keyword"
      :placeholder="placeholder"
      :clearable="clearable"
      :disabled="disabled"
      :readonly="readonly"
      :loading="loading"
      shape="round"
      @focus="onFocus"
      @blur="onBlur"
      @search="onSearch"
      @keydown="onKeydown"
    />

    <transition name="vant-search-fade">
      <div v-if="showPanel" class="vant-search__panel" @mousedown.prevent>
        <ul v-if="!error && results.length" class="vant-search__list">
          <li
            v-for="(opt, i) in results"
            :key="opt.value + '-' + i"
            class="vant-search__item"
            :class="{ 'is-active': i === activeIndex }"
            @mouseenter="activeIndex = i"
            @mousedown.prevent="onSelect(opt)"
          >
            <span class="vant-search__item-text">{{ opt.text }}</span>
            <van-icon v-if="i === activeIndex" name="success" class="vant-search__item-icon" />
          </li>
        </ul>
        <div v-else-if="error" class="vant-search__state vant-search__state--error">
          {{ error }}
        </div>
        <div v-else-if="loading" class="vant-search__state">搜索中…</div>
        <div v-else class="vant-search__state">无匹配结果</div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.vant-search {
  position: relative;
}
.vant-search__panel {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  z-index: 20;
  margin-top: 4px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  max-height: 264px;
  overflow-y: auto;
}
.vant-search__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}
.vant-search__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 14px;
  color: #323233;
  cursor: pointer;
}
.vant-search__item.is-active {
  background: #f5f6f8;
}
.vant-search__item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.vant-search__item-icon {
  color: var(--van-primary-color, #1989fa);
  font-size: 16px;
  flex-shrink: 0;
}
.vant-search__state {
  padding: 18px 14px;
  text-align: center;
  font-size: 13px;
  color: #969799;
}
.vant-search__state--error {
  color: #ee0a24;
}

.vant-search-fade-enter-active,
.vant-search-fade-leave-active {
  transition: opacity 0.18s ease;
}
.vant-search-fade-enter-from,
.vant-search-fade-leave-to {
  opacity: 0;
}
</style>
