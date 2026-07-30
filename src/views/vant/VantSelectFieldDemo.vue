<script setup lang="ts">
import { ref, reactive } from 'vue'
import VantSelectField from '@/components/VantSelectField.vue'
import type { NormalizedOption } from '@/components/VantSelectField.vue'

// ① change 事件回显（置顶，操作实时记录）
const log = reactive<{ value: string | number | null; text: string }>({
  value: '',
  text: '',
})
function onChange(value: string | number, option: NormalizedOption | null) {
  log.value = value
  log.text = option?.text ?? ''
}

// ② 字符串数组
const brand = ref('')
const brandOptions = ['宝马', '奔驰', '奥迪', '丰田', '本田', '大众', '比亚迪', '蔚来']

// ③ Vant 默认对象数组 { text, value }
const city = ref('')
const cityOptions = [
  { text: '北京', value: 'bj' },
  { text: '上海', value: 'sh' },
  { text: '广州', value: 'gz' },
  { text: '深圳', value: 'sz' },
]

// ④ 自定义字段（valueKey / labelKey）
const channel = ref('')
const channelOptions = [
  { id: 'agent', name: '保险代理人' },
  { id: 'online', name: '官网直营' },
  { id: 'phone', name: '电话投保' },
  { id: 'app', name: '手机 App' },
]

// ⑤ 完全自定义 format 函数
const raw = ref<number | string>('')
const rawOptions = [
  { code: 'A', label: '方案 A（基础版）' },
  { code: 'B', label: '方案 B（标准版）' },
  { code: 'C', label: '方案 C（尊享版）' },
]

// ⑥ 可清空
const clearableVal = ref('宝马')

// ⑦ 禁用 / 只读
const disabledVal = ref('只读预填值')
const readonlyVal = ref('已锁定值')

// ⑧ 必填 + 图标
const requiredVal = ref('')
</script>

<template>
  <div class="sel-demo">
    <van-nav-bar
      title="VantSelectField 示例"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <!-- ① change 事件回显（操作实时记录，置顶）-->
    <div class="section-title">① change 事件回显</div>
    <div class="card">
      <p class="hint">
        最近一次 change：<br />
        值 = <code>{{ log.value || '（空）' }}</code> ，文本 =
        <code>{{ log.text || '（空）' }}</code>
      </p>
    </div>

    <!-- ② 字符串数组（最简单）-->
    <div class="section-title">② 字符串数组（最简单）</div>
    <div class="card">
      <VantSelectField
        v-model="brand"
        :options="brandOptions"
        label="车辆品牌"
        title="选择品牌"
        placeholder="请选择品牌"
        left-icon="label-o"
        clearable
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ brand || '（空）' }}</code>
      </p>
    </div>

    <!-- ③ 默认对象数组 { text, value }-->
    <div class="section-title">③ 默认对象数组 { text, value }</div>
    <div class="card">
      <VantSelectField
        v-model="city"
        :options="cityOptions"
        label="投保城市"
        title="选择城市"
        placeholder="请选择城市"
        clearable
      />
      <p class="hint">
        当前值：<code>{{ city || '（空）' }}</code>
      </p>
    </div>

    <!-- ④ 自定义字段（value-key / label-key）-->
    <div class="section-title">④ 自定义字段（value-key / label-key）</div>
    <div class="card">
      <VantSelectField
        v-model="channel"
        :options="channelOptions"
        value-key="id"
        label-key="name"
        label="投保渠道"
        title="选择渠道"
        placeholder="请选择渠道"
        clearable
      />
      <p class="hint">
        当前值（取 id）：<code>{{ channel || '（空）' }}</code>
      </p>
    </div>

    <!-- ⑤ 完全自定义（format 函数）-->
    <div class="section-title">⑤ 完全自定义（format 函数）</div>
    <div class="card">
      <VantSelectField
        v-model="raw"
        :options="rawOptions"
        :format="(o: any) => ({ text: o.label, value: o.code })"
        label="保险方案"
        title="选择方案"
        placeholder="请选择方案"
        clearable
      />
      <p class="hint">
        当前值（取 code）：<code>{{ raw || '（空）' }}</code>
      </p>
    </div>

    <!-- ⑥ 可清空（clearable）-->
    <div class="section-title">⑥ 可清空（clearable）</div>
    <div class="card">
      <VantSelectField
        v-model="clearableVal"
        :options="brandOptions"
        label="可清空示例"
        title="可清空"
        clearable
      />
      <p class="hint">右侧出现清除图标，点击即清空。</p>
    </div>

    <!-- ⑦ 禁用 / 只读-->
    <div class="section-title">⑦ 禁用 / 只读</div>
    <div class="card">
      <VantSelectField v-model="disabledVal" :options="brandOptions" label="禁用" disabled />
      <VantSelectField v-model="readonlyVal" :options="brandOptions" label="只读" readonly />
    </div>

    <!-- ⑧ 必填 + 图标-->
    <div class="section-title">⑧ 必填 + 图标</div>
    <div class="card">
      <VantSelectField
        v-model="requiredVal"
        :options="brandOptions"
        label="必填项"
        title="请选择"
        placeholder="此项为必填"
        left-icon="star"
        required
        clearable
      />
    </div>
  </div>

  <div class="usage-page">
    <div class="section-title">使用说明</div>
    <div class="card" style="margin: 0 12px 16px">
      <p class="hint">
        <b>基础用法</b><br />
        <code>&lt;VantSelectField v-model="form.brand" :options="options" label="品牌" /&gt;</code
        ><br />
        <code
          >&lt;VantSelectField v-model="x" :options="raw" :format="o =&gt; ({ text: o.label, value:
          o.code })" /&gt;</code
        >
      </p>
      <p class="hint">
        <b>主要 Props</b><br />
        options：字符串[] / {text,value}[] / 自定义对象（配 valueKey/labelKey 或 format）<br />
        clearable / disabled / readonly / required / leftIcon
      </p>
      <p class="hint"><b>事件</b>：update:modelValue · change(value, option)</p>
    </div>
  </div>
</template>

<style scoped>
.sel-demo {
  min-height: 100vh;
  background: var(--app-bg);
  padding-bottom: 24px;
}
.section-title {
  font-size: 13px;
  color: var(--app-text-3);
  padding: 16px 16px 8px;
  font-weight: 500;
}
.card {
  background: var(--app-surface);
  margin: 0 12px 4px;
  border-radius: 8px;
  padding: 4px 12px;
}
.hint {
  font-size: 12px;
  color: var(--app-text-3);
  margin: 4px 0 12px;
  line-height: 1.6;
}
.hint code {
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
  color: #1989fa;
}

.usage-page {
  background: var(--app-bg);
  padding-bottom: 24px;
}
</style>
