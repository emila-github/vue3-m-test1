<script setup lang="ts">
import { ref, reactive } from 'vue'
import VantSelectField from '@/components/VantSelectField.vue'
import type { NormalizedOption } from '@/components/VantSelectField.vue'

// 1) 字符串数组
const brand = ref('')
const brandOptions = ['宝马', '奔驰', '奥迪', '丰田', '本田', '大众', '比亚迪', '蔚来']

// 2) Vant 默认对象数组 { text, value }
const city = ref('')
const cityOptions = [
  { text: '北京', value: 'bj' },
  { text: '上海', value: 'sh' },
  { text: '广州', value: 'gz' },
  { text: '深圳', value: 'sz' },
]

// 3) 自定义字段（valueKey / labelKey）
const channel = ref('')
const channelOptions = [
  { id: 'agent', name: '保险代理人' },
  { id: 'online', name: '官网直营' },
  { id: 'phone', name: '电话投保' },
  { id: 'app', name: '手机 App' },
]

// 4) 完全自定义 format 函数
const raw = ref<number | string>('')
const rawOptions = [
  { code: 'A', label: '方案 A（基础版）' },
  { code: 'B', label: '方案 B（标准版）' },
  { code: 'C', label: '方案 C（尊享版）' },
]

// 5) 可清空
const clearableVal = ref('宝马')

// 6) 禁用 / 只读
const disabledVal = ref('只读预填值')
const readonlyVal = ref('已锁定值')

// 7) 必填 + 图标
const requiredVal = ref('')

// 当前选中回显（演示 change 事件）
const log = reactive<{ value: string | number | null; text: string }>({
  value: '',
  text: '',
})
function onChange(value: string | number, option: NormalizedOption | null) {
  log.value = value
  log.text = option?.text ?? ''
}
</script>

<template>
  <div class="sel-demo">
    <van-nav-bar
      title="VantSelectField 示例"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="section-title">① 字符串数组（最简单）</div>
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

    <div class="section-title">② 默认对象数组 { text, value }</div>
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

    <div class="section-title">③ 自定义字段（value-key / label-key）</div>
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

    <div class="section-title">④ 完全自定义（format 函数）</div>
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

    <div class="section-title">⑤ 可清空（clearable）</div>
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

    <div class="section-title">⑥ 禁用 / 只读</div>
    <div class="card">
      <VantSelectField v-model="disabledVal" :options="brandOptions" label="禁用" disabled />
      <VantSelectField v-model="readonlyVal" :options="brandOptions" label="只读" readonly />
    </div>

    <div class="section-title">⑦ 必填 + 图标</div>
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

    <div class="section-title">⑧ change 事件回显</div>
    <div class="card">
      <p class="hint">
        最近一次 change：<br />
        值 = <code>{{ log.value || '（空）' }}</code> ，文本 =
        <code>{{ log.text || '（空）' }}</code>
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
