<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { showToast } from 'vant'
import VantCheckinField from '../../components/VantCheckinField.vue'
import type { CheckinResult } from '../../components/VantCheckin.vue'

// 腾讯地图 Key（缺省读取 .env 的 VITE_TMAP_KEY）
const tmapKey = ref(import.meta.env.VITE_TMAP_KEY || '')

/**
 * 微信 JS-SDK 配置加载器（企业微信需后端下发签名）。
 * 后端实现：GET /api/wx/jssdk-config?url=<当前页URL，去#>
 * 返回 { appId, timestamp, nonceStr, signature }
 * 不实现时组件回退 HTML5 定位（微信内会超时）。
 */
const wxConfigLoader = async () => {
  try {
    const url = location.href.split('#')[0] || location.href
    const res = await fetch(`/api/wx/jssdk-config?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return (await res.json()) as {
      appId: string
      timestamp: number
      nonceStr: string
      signature: string
    }
  } catch {
    return null
  }
}

const form = reactive<{
  reason: string
  backTime: string
  checkin: CheckinResult | null
}>({ reason: '', backTime: '', checkin: null })

const formMulti = ref(false)
const formMode = computed<'once' | 'multiple'>(() => (formMulti.value ? 'multiple' : 'once'))

function onSubmit() {
  showToast('表单提交成功')
}

/** 回填示例：已打卡的模拟数据（上线后从后端取回的上次打卡记录） */
const sampleCheckedIn = ref<CheckinResult>({
  lat: 39.98412,
  lng: 116.30748,
  address: '北京市朝阳区建国路 88 号 SOHO 现代城',
  timestamp: '2026-07-16T14:30:00+08:00',
  time: '2026-07-16 14:30:00',
  isFirst: true,
  firstTime: '2026-07-16 14:30:00',
})
/** 回填示例：未打卡（空） */
const sampleEmpty = ref<CheckinResult | null>(null)
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantCheckinField 表单内打卡"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="section-title">VantCheckinField · 表单内打卡</div>
    <div class="card">
      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="form.reason"
            name="reason"
            label="外出事由"
            placeholder="请输入外出事由"
            required
            :rules="[{ required: true, message: '请填写外出事由' }]"
          />
          <van-field
            v-model="form.backTime"
            name="backTime"
            label="预计返回"
            placeholder="如 18:00"
            required
            :rules="[{ required: true, message: '请填写预计返回时间' }]"
          />
        </van-cell-group>

        <!-- 打卡字段组件：自带 cell-group，直接放入表单 -->
        <VantCheckinField
          v-model="form.checkin"
          :map-key="tmapKey"
          :mode="formMode"
          :wx-config-loader="wxConfigLoader"
          required
          :rules="[{ required: true, message: '请先进行定位打卡' }]"
        />

        <!-- 经纬度 / 打卡时间：由 VantCheckinField 的 v-model 回填到独立字段 -->
        <van-cell-group inset v-if="form.checkin">
          <van-field
            :model-value="`${form.checkin.lng}, ${form.checkin.lat}`"
            label="经纬度"
            readonly
          />
          <van-field :model-value="form.checkin.time" label="打卡时间" readonly />
        </van-cell-group>

        <van-cell title="打卡模式" label="一次性 / 可多次">
          <template #value>
            <van-switch v-model="formMulti" />
          </template>
        </van-cell>

        <div class="form-btn">
          <van-button round block type="primary" native-type="submit"> 提交 </van-button>
        </div>
      </van-form>
    </div>

    <div class="section-title">回填示例</div>
    <div class="card">
      <div class="sub-title">① 已打卡回填（modelValue 有值）</div>
      <VantCheckinField
        v-model="sampleCheckedIn"
        :map-key="tmapKey"
        mode="once"
        :wx-config-loader="wxConfigLoader"
      />
      <van-cell-group inset v-if="sampleCheckedIn">
        <van-field
          :model-value="`${sampleCheckedIn.lng}, ${sampleCheckedIn.lat}`"
          label="经纬度"
          readonly
        />
        <van-field :model-value="sampleCheckedIn.time" label="打卡时间" readonly />
      </van-cell-group>
    </div>

    <div class="card">
      <div class="sub-title">② 未打卡回填（modelValue 为空）</div>
      <VantCheckinField
        v-model="sampleEmpty"
        :map-key="tmapKey"
        mode="once"
        :wx-config-loader="wxConfigLoader"
      />
      <van-cell-group inset v-if="sampleEmpty">
        <van-field
          :model-value="`${sampleEmpty.lng}, ${sampleEmpty.lat}`"
          label="经纬度"
          readonly
        />
        <van-field :model-value="sampleEmpty.time" label="打卡时间" readonly />
      </van-cell-group>
    </div>

    <div class="section-title">使用说明</div>
    <div class="card">
      <p class="hint">
        <code>VantCheckinField</code> 将定位打卡封装为表单字段：组件内置「地址」只读项，
        地址项右侧的「打卡」按钮会弹出 <code>VantCheckin</code> 满屏定位页，打卡成功后通过
        <code>v-model</code> 回填结果。<br />
        「经纬度 / 打卡时间」由外部 demo 从
        <code>v-model</code> 取值后渲染为独立字段（组件中不再内置）。<br />
        通过
        <code>:mode="'once' | 'multiple'"</code>
        控制一次或多次打卡；再次打开弹窗会用上次打卡数据预览地图。<br />
        校验默认关闭，需通过
        <code>:rules="[{ required: true, message: '请先进行定位打卡' }]"</code>
        传入 <code>van-field</code> 原生规则（需置于 <code>van-form</code> 内，且字段带
        <code>name</code>）。
      </p>
    </div>
  </div>
</template>

<style scoped>
.demo-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 24px;
}
.section-title {
  font-size: 14px;
  color: #969799;
  padding: 16px 16px 8px;
}
.sub-title {
  font-size: 13px;
  font-weight: 600;
  color: #323233;
  padding: 8px 16px 4px;
}
.card {
  background: #fff;
  margin: 0 12px 12px;
  border-radius: 12px;
  padding: 8px 0;
}
.form-btn {
  padding: 12px 16px 4px;
}
.hint {
  font-size: 13px;
  color: #646566;
  line-height: 1.7;
  padding: 4px 14px 8px;
}
.hint code {
  background: #f0f0f0;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
  color: #1989fa;
}
</style>
