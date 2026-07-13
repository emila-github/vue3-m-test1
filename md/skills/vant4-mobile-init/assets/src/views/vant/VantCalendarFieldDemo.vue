<script setup lang="ts">
/**
 * VantCalendarField 示例页
 * 演示：单选 / 区间 / 多选 / 限制范围 / 默认选中 / 快速选择 / 禁用只读 / 必填图标 / change 回显
 */
import { ref, nextTick } from 'vue'
import VantCalendarField from '../../components/VantCalendarField.vue'

function pad(n: number) {
  return String(n).padStart(2, '0')
}
function fmt(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const today = new Date()
const todayStr = fmt(today)
const maxStr = fmt(new Date(today.getTime() + 30 * 24 * 3600 * 1000))
const defaultStr = fmt(new Date(today.getTime() - 3 * 24 * 3600 * 1000))

// ① 单选
const single = ref<string>('')

// ② 区间
const range = ref<string[]>([])

// ③ 多选
const multiple = ref<string[]>([])

// ④ 限制可选范围
const limited = ref<string>('')

// ⑤ 默认选中（打开定位到 defaultStr）
const withDefault = ref<string>('')

// ⑥ 快速选择（点选即确定）
const quick = ref<string>('')

// ⑦ 禁用 / 只读
const disabledVal = ref<string>(todayStr)
const readonlyVal = ref<string>(todayStr)

// ⑧ 必填 + 图标
const requiredVal = ref<string>('')

// ⑨ change 回显（自动滚动到末尾）
const lastList = ref<string[]>([])
const lastCount = ref(0)
const echoBox = ref<HTMLElement>()

function scrollToEnd() {
  const el = echoBox.value
  if (el) el.scrollTop = el.scrollHeight
}
function onChange(value: any, raw: unknown) {
  const arr = Array.isArray(value) ? value : value ? [value] : []
  lastList.value = [...arr]
  lastCount.value = arr.length
  nextTick(scrollToEnd)
}
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantCalendarField 下拉日历"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="container">
      <div class="section-title">① 单选日期（single）</div>
      <div class="card">
        <VantCalendarField
          v-model="single"
          label="日期"
          title="选择日期"
          placeholder="请选择日期"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ single || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">② 日期区间（range）</div>
      <div class="card">
        <VantCalendarField
          v-model="range"
          type="range"
          label="区间"
          title="选择日期区间"
          placeholder="请选择起止日期"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ range.length ? range.join(' ~ ') : '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">③ 多选日期（multiple）</div>
      <div class="card">
        <VantCalendarField
          v-model="multiple"
          type="multiple"
          label="日期"
          title="选择多个日期"
          placeholder="可多选日期"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ multiple.length ? multiple.join('、') : '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">④ 限制可选范围（min ~ max 30 天）</div>
      <div class="card">
        <VantCalendarField
          v-model="limited"
          label="日期"
          title="仅可选近 30 天"
          placeholder="今天起 30 天内"
          :min-date="todayStr"
          :max-date="maxStr"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ limited || '（空）' }}</code
          >（范围 {{ todayStr }} ~ {{ maxStr }}）
        </p>
      </div>

      <div class="section-title">⑤ 默认选中 / 打开定位（default-date）</div>
      <div class="card">
        <VantCalendarField
          v-model="withDefault"
          label="日期"
          title="打开定位到指定日期"
          placeholder="打开自动定位"
          :default-date="defaultStr"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ withDefault || '（空）' }}</code
          >（定位到 {{ defaultStr }}）
        </p>
      </div>

      <div class="section-title">⑥ 快速选择（show-confirm=false，点选即确定）</div>
      <div class="card">
        <VantCalendarField
          v-model="quick"
          label="日期"
          title="点选即确定"
          placeholder="单击日期立即生效"
          :show-confirm="false"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ quick || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑦ 禁用 / 只读</div>
      <div class="card">
        <VantCalendarField v-model="disabledVal" label="禁用" title="选择日期" disabled />
        <VantCalendarField v-model="readonlyVal" label="只读" title="选择日期" readonly />
      </div>

      <div class="section-title">⑧ 必填 + 图标（required + left-icon）</div>
      <div class="card">
        <VantCalendarField
          v-model="requiredVal"
          label="日期"
          title="选择日期"
          placeholder="请选择日期"
          required
          left-icon="calendar-o"
          @change="onChange"
        />
        <p class="hint">
          已选：<code>{{ requiredVal || '（空）' }}</code>
        </p>
      </div>

      <div class="section-title">⑨ change 事件回显（自动滚动到末尾）</div>
      <div class="card">
        <p class="hint">
          数量：<code>{{ lastCount }}</code>
        </p>
        <div ref="echoBox" class="echo-box">
          <code v-for="(v, i) in lastList" :key="i" class="echo-item">{{ v }}</code>
          <span v-if="!lastList.length" class="echo-empty">（未选择）</span>
        </div>
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
.echo-box {
  max-height: 140px;
  overflow-y: auto;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0 4px 12px;
}
.echo-item {
  display: inline-block;
  color: #07c160;
  background: #fff;
  border: 1px solid #ebedf0;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0 6px 6px 0;
  font-size: 12px;
  word-break: break-all;
}
.echo-empty {
  color: #969799;
  font-size: 12px;
}
</style>
