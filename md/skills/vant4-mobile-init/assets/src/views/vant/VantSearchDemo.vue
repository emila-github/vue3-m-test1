<script setup lang="ts">
/**
 * VantSearch 示例页
 * 演示：基础动态搜索 / 自定义字段 / 防抖+最小长度 / 禁用只读 / 键盘导航
 */
import { ref } from 'vue'
import VantSearch from '../../components/VantSearch.vue'
import type { NormalizedOption } from '../../components/VantSearch.vue'

// 模拟远程数据源（默认 text/value 结构，适配 ① ③ 基础用法）
const INSURERS = [
  { text: '中国人民财产保险', value: 'PICC' },
  { text: '中国平安财产保险', value: 'PA' },
  { text: '中国太平洋财产保险', value: 'CPIC' },
  { text: '中国大地财产保险', value: 'CCIC' },
  { text: '阳光财产保险', value: 'YDC' },
  { text: '太平财产保险', value: 'TAIPING' },
  { text: '华泰财产保险', value: 'HUATAI' },
  { text: '英大泰和财产保险', value: 'YDTH' },
  { text: '富德财产保险', value: 'FD' },
  { text: '众安在线财产保险', value: 'ZA' },
]

// 模拟异步接口：过滤 + 延迟，体现 loading 与防抖
function mockFetch(kw: string): Promise<Record<string, any>[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const upper = kw.toUpperCase()
      resolve(INSURERS.filter((x) => x.text.includes(kw) || x.value.includes(upper)))
    }, 600)
  })
}

// ② 自定义字段用的数据集（name/code 结构，演示 label-key / value-key 映射）
const INSURERS_CUSTOM = [
  { name: '中国人民财产保险', code: 'PICC' },
  { name: '中国平安财产保险', code: 'PA' },
  { name: '中国太平洋财产保险', code: 'CPIC' },
  { name: '中国大地财产保险', code: 'CCIC' },
  { name: '阳光财产保险', code: 'YDC' },
  { name: '太平财产保险', code: 'TAIPING' },
  { name: '华泰财产保险', code: 'HUATAI' },
  { name: '英大泰和财产保险', code: 'YDTH' },
  { name: '富德财产保险', code: 'FD' },
  { name: '众安在线财产保险', code: 'ZA' },
]

// ② 专用：返回 name/code 对象，配合 label-key / value-key 使用
function mockFetchCustom(kw: string): Promise<Record<string, any>[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const upper = kw.toUpperCase()
      resolve(INSURERS_CUSTOM.filter((x) => x.name.includes(kw) || x.code.includes(upper)))
    }, 600)
  })
}

// ① 基础动态搜索
const kw1 = ref('')
const sel1 = ref<NormalizedOption | null>(null)
function onSelect1(_v: string | number, opt: NormalizedOption) {
  sel1.value = opt
}

// ② 自定义字段（labelKey/valueKey 映射到对象）
const kw2 = ref('')
const sel2 = ref<NormalizedOption | null>(null)
function onSelect2(_v: string | number, opt: NormalizedOption) {
  sel2.value = opt
}

// ③ 防抖 + 最小长度（更慢的防抖、至少输入 2 字）
const kw3 = ref('')
const sel3 = ref<NormalizedOption | null>(null)
function onSelect3(_v: string | number, opt: NormalizedOption) {
  sel3.value = opt
}

// ④ 禁用 / 只读
const kwDisabled = ref('中国平安财产保险')
const kwReadonly = ref('众安在线财产保险')
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantSearch 动态搜索"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="container">
      <div class="section-title">① 基础动态搜索（默认防抖 300ms）</div>
      <div class="card">
        <VantSearch
          v-model="kw1"
          :fetch="mockFetch"
          placeholder="搜索保险公司"
          @select="onSelect1"
        />
        <p class="hint">
          已选：<code v-if="sel1">{{ sel1.text }}（value: {{ sel1.value }}）</code>
          <code v-else>（空）</code>
        </p>
      </div>

      <div class="section-title">② 自定义字段（label-key="name" value-key="id"）</div>
      <div class="card">
        <VantSearch
          v-model="kw2"
          :fetch="mockFetchCustom"
          label-key="name"
          value-key="code"
          placeholder="对象数据自定义字段"
          @select="onSelect2"
        />
        <p class="hint">
          已选：<code v-if="sel2">{{ sel2.text }}（value: {{ sel2.value }}）</code>
          <code v-else>（空）</code>
        </p>
      </div>

      <div class="section-title">③ 防抖 500ms + 最少输入 2 字</div>
      <div class="card">
        <VantSearch
          v-model="kw3"
          :fetch="mockFetch"
          :debounce="500"
          :min-length="2"
          placeholder="输入至少 2 个字符"
          @select="onSelect3"
        />
        <p class="hint">
          已选：<code v-if="sel3">{{ sel3.text }}（value: {{ sel3.value }}）</code>
          <code v-else>（空）</code>
        </p>
      </div>

      <div class="section-title">④ 禁用 / 只读</div>
      <div class="card">
        <VantSearch v-model="kwDisabled" :fetch="mockFetch" disabled />
        <VantSearch v-model="kwReadonly" :fetch="mockFetch" readonly />
      </div>

      <div class="section-title">使用说明</div>
      <div class="card">
        <p class="hint">
          · 输入即触发，停顿 <code>debounce</code> 毫秒后才发起搜索（默认 300ms）。
        </p>
        <p class="hint">· 下拉面板支持 loading / 错误 / 空态；鼠标点击或键盘 ↑↓ + 回车选择。</p>
        <p class="hint">
          · 通过 <code>fetch</code> 传入异步函数，数据格式支持字符串 / 对象 / 自定义字段。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  min-height: 100vh;
  background: #f7f8fa;
}
.container {
  padding: 12px 12px 40px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #323233;
  margin: 18px 4px 8px;
}
.card {
  background: #fff;
  border-radius: 12px;
  padding: 4px 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.hint {
  font-size: 12px;
  color: #969799;
  margin: 8px 4px 12px;
}
.hint code {
  color: #07c160;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
</style>
