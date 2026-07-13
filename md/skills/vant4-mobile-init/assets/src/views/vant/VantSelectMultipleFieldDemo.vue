<script setup lang="ts">
import { ref, reactive } from 'vue'
import VantSelectMultipleField from '@/components/VantSelectMultipleField.vue'
import type { NormalizedOption } from '@/components/VantSelectMultipleField.vue'

// 1) 字符串数组
const extra = ref<string[]>(['玻璃', '自燃'])
const extraOptions = ['玻璃破碎险', '自燃损失险', '涉水险', '划痕险', '不计免赔', '车上人员']

// 2) 默认对象数组 { text, value }
const city = ref<string[]>([])
const cityOptions = [
  { text: '北京', value: 'bj' },
  { text: '上海', value: 'sh' },
  { text: '广州', value: 'gz' },
  { text: '深圳', value: 'sz' },
]

// 3) 自定义字段（valueKey / labelKey）
const channel = ref<string[]>([])
const channelOptions = [
  { id: 'agent', name: '保险代理人' },
  { id: 'online', name: '官网直营' },
  { id: 'phone', name: '电话投保' },
  { id: 'app', name: '手机 App' },
]

// 4) 完全自定义 format 函数
const raw = ref<Array<string | number>>([])
const rawOptions = [
  { code: 'A', label: '方案 A（基础版）' },
  { code: 'B', label: '方案 B（标准版）' },
  { code: 'C', label: '方案 C（尊享版）' },
]

// 5) 可清空
const clearableVal = ref<string[]>(['玻璃破碎险'])

// 6) 限制最多可选数量（max=2）
const limited = ref<string[]>([])

// 7) 禁用 / 只读
const disabledVal = ref<string[]>(['划痕险'])
const readonlyVal = ref<string[]>(['涉水险'])

// 8) 必填 + 图标
const requiredVal = ref<string[]>([])

// change 事件回显
const log = reactive<{ value: Array<string | number>; text: string }>({
  value: [],
  text: '',
})
function onChange(value: Array<string | number>, options: NormalizedOption[]) {
  log.value = value
  log.text = options.map((o) => o.text).join('、')
}
</script>

<template>
  <div class="sel-demo">
    <van-nav-bar
      title="VantSelectMultipleField 示例"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="section-title">① 字符串数组</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="extra"
        :options="extraOptions"
        label="附加险种"
        title="选择险种"
        placeholder="请选择附加险种"
        left-icon="label-o"
        clearable
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ extra.join(', ') || '（空）' }}</code>
      </p>
    </div>

    <div class="section-title">② 默认对象数组 { text, value }</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="city"
        :options="cityOptions"
        label="投保城市"
        title="选择城市"
        placeholder="可多选城市"
        clearable
      />
      <p class="hint">
        当前值（取 value）：<code>{{ city.join(', ') || '（空）' }}</code>
      </p>
    </div>

    <div class="section-title">③ 自定义字段（value-key / label-key）</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="channel"
        :options="channelOptions"
        value-key="id"
        label-key="name"
        label="投保渠道"
        title="选择渠道"
        placeholder="可多渠道"
        clearable
      />
      <p class="hint">
        当前值（取 id）：<code>{{ channel.join(', ') || '（空）' }}</code>
      </p>
    </div>

    <div class="section-title">④ 完全自定义（format 函数）</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="raw"
        :options="rawOptions"
        :format="(o: any) => ({ text: o.label, value: o.code })"
        label="保险方案"
        title="选择方案"
        placeholder="可多选方案"
        clearable
      />
      <p class="hint">
        当前值（取 code）：<code>{{ raw.join(', ') || '（空）' }}</code>
      </p>
    </div>

    <div class="section-title">⑤ 可清空（clearable）</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="clearableVal"
        :options="extraOptions"
        label="可清空示例"
        title="可清空"
        clearable
      />
      <p class="hint">右侧出现清除图标，点击即清空全部。</p>
    </div>

    <div class="section-title">⑥ 限制最多可选（max=2）</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="limited"
        :options="extraOptions"
        label="最多选 2 项"
        title="最多选 2 项"
        :max="2"
        clearable
      />
      <p class="hint">达到上限后其余项自动禁用，顶部显示「已选 x / 2」。</p>
    </div>

    <div class="section-title">⑦ 禁用 / 只读</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="disabledVal"
        :options="extraOptions"
        label="禁用"
        disabled
      />
      <VantSelectMultipleField
        v-model="readonlyVal"
        :options="extraOptions"
        label="只读"
        readonly
      />
    </div>

    <div class="section-title">⑧ 必填 + 图标</div>
    <div class="card">
      <VantSelectMultipleField
        v-model="requiredVal"
        :options="extraOptions"
        label="必填项"
        title="请选择"
        placeholder="此项为必填"
        left-icon="star"
        required
        clearable
      />
    </div>

    <div class="section-title">⑨ change 事件回显</div>
    <div class="card">
      <p class="hint">
        最近一次 change：<br />
        值 = <code>{{ log.value.join(', ') || '（空）' }}</code
        ><br />
        文本 = <code>{{ log.text || '（空）' }}</code>
      </p>
    </div>
  </div>
</template>

<style scoped>
.sel-demo {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 24px;
}
.section-title {
  font-size: 13px;
  color: #969799;
  padding: 16px 16px 8px;
  font-weight: 500;
}
.card {
  background: #fff;
  margin: 0 12px 4px;
  border-radius: 8px;
  padding: 4px 12px;
}
.hint {
  font-size: 12px;
  color: #969799;
  margin: 4px 0 12px;
  line-height: 1.6;
}
.hint code {
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 3px;
  color: #1989fa;
}
</style>
