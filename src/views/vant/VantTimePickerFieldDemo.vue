<script setup lang="ts">
import { ref } from 'vue'
import VantTimePickerField from '@/components/VantTimePickerField.vue'

// ① change 事件回显（置顶，操作实时记录）
const lastChange = ref('')
function onChange(v: string) {
  lastChange.value = v
}

// ② 时间选择
const time = ref('09:30')
// ③ 日期选择
const date = ref('')
// ④ 年月
const yearMonth = ref('')
// ⑤ 可清空
const clearableVal = ref('14:00')
// ⑥ 范围限制（time 限制小时/分钟；date 限制日期区间）
const limitedTime = ref('')
const limitedDate = ref('')
const minDate = new Date(2026, 0, 1)
const maxDate = new Date(2026, 11, 31)
// ⑦ 禁用 / 只读
const disabledVal = ref('08:00')
const readonlyVal = ref('20:30')
// ⑧ 必填 + 图标
const requiredVal = ref('')
// ⑨ 日期时间（type=datetime）—— van-picker-group 单工具栏
const dateTime = ref('')
</script>

<template>
  <div class="tp-demo">
    <van-nav-bar
      title="VantTimePickerField 示例"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <!-- ① change 事件回显（操作实时记录，置顶）-->
    <div class="section-title">① change 事件回显</div>
    <div class="card">
      <p class="hint">
        最近一次 change：<code>{{ lastChange || '（空）' }}</code>
      </p>
    </div>

    <!-- ② 时间选择（type=time）-->
    <div class="section-title">② 时间选择（type=time）</div>
    <div class="card">
      <VantTimePickerField
        v-model="time"
        type="time"
        label="起保时间"
        title="选择起保时间"
        placeholder="请选择时间"
        left-icon="clock-o"
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ time || '（空）' }}</code>
      </p>
    </div>

    <!-- ③ 日期选择（type=date）-->
    <div class="section-title">③ 日期选择（type=date）</div>
    <div class="card">
      <VantTimePickerField
        v-model="date"
        type="date"
        label="投保日期"
        title="选择日期"
        placeholder="请选择日期"
        clearable
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ date || '（空）' }}</code>
      </p>
    </div>

    <!-- ④ 年月（type=year-month）-->
    <div class="section-title">④ 年月（type=year-month）</div>
    <div class="card">
      <VantTimePickerField
        v-model="yearMonth"
        type="year-month"
        label="账期"
        title="选择年月"
        placeholder="请选择年月"
        clearable
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ yearMonth || '（空）' }}</code>
      </p>
    </div>

    <!-- ⑤ 可清空（clearable）-->
    <div class="section-title">⑤ 可清空（clearable）</div>
    <div class="card">
      <VantTimePickerField
        v-model="clearableVal"
        type="time"
        label="可清空示例"
        title="可清空"
        clearable
      />
      <p class="hint">右侧清除图标点击即清空。</p>
    </div>

    <!-- ⑥ 范围限制-->
    <div class="section-title">⑥ 范围限制</div>
    <div class="card">
      <VantTimePickerField
        v-model="limitedTime"
        type="time"
        label="工作时段"
        title="仅 9-18 点"
        :min-hour="9"
        :max-hour="18"
        clearable
      />
      <VantTimePickerField
        v-model="limitedDate"
        type="date"
        label="2026 年内"
        title="仅 2026 年"
        :min-date="minDate"
        :max-date="maxDate"
        clearable
      />
    </div>

    <!-- ⑦ 禁用 / 只读-->
    <div class="section-title">⑦ 禁用 / 只读</div>
    <div class="card">
      <VantTimePickerField v-model="disabledVal" type="time" label="禁用" disabled />
      <VantTimePickerField v-model="readonlyVal" type="time" label="只读" readonly />
    </div>

    <!-- ⑧ 必填 + 图标-->
    <div class="section-title">⑧ 必填 + 图标</div>
    <div class="card">
      <VantTimePickerField
        v-model="requiredVal"
        type="time"
        label="必填项"
        title="请选择"
        placeholder="此项为必填"
        left-icon="star"
        required
        clearable
      />
    </div>

    <!-- ⑨ 日期时间（type=datetime）：van-picker-group 单工具栏，日期/时间标签切换 -->
    <div class="section-title">⑨ 日期时间（type=datetime）</div>
    <div class="card">
      <VantTimePickerField
        v-model="dateTime"
        type="datetime"
        label="拜访时间"
        title="选择拜访时间"
        placeholder="请选择日期与时间"
        clearable
        @change="onChange"
      />
      <p class="hint">
        当前值：<code>{{ dateTime || '（空）' }}</code
        ><br />
        弹出层内通过「日期 / 时间」标签页切换，仅一条确认/取消工具栏（不再重复）。
      </p>
    </div>
  </div>

  <div class="usage-page">
    <div class="section-title">使用说明</div>
    <div class="card" style="margin: 0 12px 16px">
      <p class="hint">
        <b>基础用法</b><br />
        <code>&lt;VantTimePickerField v-model="t" type="time" label="起保时间" /&gt;</code><br />
        <code>&lt;VantTimePickerField v-model="day" type="date" label="投保日期" /&gt;</code><br />
        <code>&lt;VantTimePickerField v-model="ym" type="year-month" label="账期" /&gt;</code>
      </p>
      <p class="hint">
        <b>主要 Props</b><br />
        type：time（HH:mm）/ date（YYYY-MM-DD）/ year-month（YYYY-MM）/ datetime（YYYY-MM-DD
        HH:mm:ss）<br />
        format：自定义输出格式 · minDate / maxDate · minHour / maxHour / minMinute / maxMinute<br />
        clearable / disabled / readonly / required
      </p>
      <p class="hint"><b>事件</b>：update:modelValue · change(value)</p>
    </div>
  </div>
</template>

<style scoped>
.tp-demo {
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
