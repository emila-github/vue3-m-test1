<script setup lang="ts">
/**
 * VantCheckin 外出定位打卡 示例
 *
 * 功能：
 *  - 自动定位并展示腾讯地图（优先），返回经纬度
 *  - 逆地理编码返回地址
 *  - 点击打卡记录时间，并维护打卡历史
 *  - 微信/企业微信环境自动走 wx.getLocation（需后端下发签名）
 */
import { ref, reactive, computed } from 'vue'
import { showToast } from 'vant'
import VantCheckin from '../../components/VantCheckin.vue'
import type { CheckinResult } from '../../components/VantCheckin.vue'

// 最近一次打卡回显
const log = reactive<{
  lat: number
  lng: number
  address: string
  time: string
}>({ lat: 0, lng: 0, address: '', time: '' })

function onCheckin(r: CheckinResult) {
  log.lat = r.lat
  log.lng = r.lng
  log.address = r.address
  log.time = r.time
}

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

const checkinRef = ref<InstanceType<typeof VantCheckin> | null>(null)

// ==================== 示例③：表单中触发打卡弹窗 ====================
const form = reactive<{
  reason: string
  backTime: string
  checkin: CheckinResult | null
}>({ reason: '', backTime: '', checkin: null })

const showCheckin = ref(false)

/** 表单校验通过后弹出打卡定位 */
function openCheckin() {
  showCheckin.value = true
}

/** 弹窗内打卡成功：回填表单并关闭弹窗 */
function onFormCheckin(r: CheckinResult) {
  form.checkin = r
  showCheckin.value = false
  showToast(`表单打卡成功 ${r.time}`)
}

/** 经纬度合并成一行展示 */
const coordText = computed(() => (form.checkin ? `${form.checkin.lng}, ${form.checkin.lat}` : ''))

/** 表单提交（校验通过后触发） */
function onSubmit() {
  showToast('表单提交成功')
}

/** 打卡模式开关：false=一次性，true=可多次 */
const formMulti = ref(false)
const formMode = computed<'once' | 'multiple'>(() => (formMulti.value ? 'multiple' : 'once'))
</script>

<template>
  <div class="demo-page">
    <van-nav-bar
      title="VantCheckin 外出定位打卡"
      left-text="返回"
      left-arrow
      @click-left="$router.back()"
    />

    <div class="container">
      <!-- 回显 -->
      <div class="section-title">① 最近一次打卡数据（@checkin）</div>
      <div class="card">
        <div class="echo-box">
          <code class="echo-item">经度: {{ log.lng || '—' }}</code>
          <code class="echo-item">纬度: {{ log.lat || '—' }}</code>
          <code class="echo-item">地址: {{ log.address || '—' }}</code>
          <code class="echo-item">时间: {{ log.time || '—' }}</code>
        </div>
      </div>

      <!-- 示例：完整外出打卡 -->
      <div class="section-title">② 外出定位打卡（腾讯地图 + 微信定位）</div>
      <div class="card">
        <VantCheckin
          ref="checkinRef"
          :map-key="tmapKey"
          :wx-config-loader="wxConfigLoader"
          title="外出定位打卡"
          @checkin="onCheckin"
        />
        <p class="hint">
          当前 VITE_TMAP_KEY：
          <code>{{ tmapKey || '（未配置，地图区域降级为纯坐标）' }}</code>
          <br />
          地图 Key 需在
          <a href="https://lbs.qq.com/" target="_blank" rel="noreferrer">腾讯位置服务</a>
          申请「JavaScript API GL」类型；企业微信内会自动调用 wx.getLocation。
        </p>
      </div>

      <!-- 示例③：表单中触发打卡弹窗 -->
      <div class="section-title">③ 表单中触发打卡（弹窗示例）</div>
      <div class="card">
        <van-form @submit="onSubmit">
          <van-cell-group inset>
            <van-cell title="打卡模式" label="一次性 / 可多次">
              <template #value>
                <van-switch v-model="formMulti" />
              </template>
            </van-cell>
            <van-field
              v-model="form.reason"
              name="reason"
              label="外出事由"
              placeholder="请输入外出事由"
              :rules="[{ required: true, message: '请填写外出事由' }]"
            />
            <van-field
              v-model="form.backTime"
              name="backTime"
              label="预计返回"
              placeholder="如 18:00"
              :rules="[{ required: true, message: '请填写预计返回时间' }]"
            />
            <!-- 经纬度合并一行 -->
            <van-field :model-value="coordText" label="经纬度" readonly />
            <!-- 地址（右侧打卡按钮） -->
            <van-field :model-value="form.checkin?.address || ''" label="地址" readonly>
              <template #button>
                <van-button size="small" type="primary" @click="openCheckin"> 打卡 </van-button>
              </template>
            </van-field>
            <van-field :model-value="form.checkin?.time || ''" label="打卡时间" readonly />
          </van-cell-group>
          <div class="form-btn">
            <van-button round block type="primary" native-type="submit"> 提交 </van-button>
          </div>
        </van-form>

        <!-- 打卡弹窗 -->
        <van-popup
          v-model:show="showCheckin"
          position="bottom"
          closeable
          :style="{ height: '100%' }"
        >
          <VantCheckin
            v-if="showCheckin"
            :map-key="tmapKey"
            :wx-config-loader="wxConfigLoader"
            :model-value="form.checkin"
            :mode="formMode"
            title="外出定位打卡"
            @checkin="onFormCheckin"
          />
        </van-popup>
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
  line-height: 1.6;
}
.hint code {
  color: #07c160;
  background: #f2f3f5;
  padding: 1px 6px;
  border-radius: 4px;
  word-break: break-all;
}
.echo-box {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 10px;
  margin: 8px 4px 12px;
}
.form-btn {
  padding: 12px 16px 4px;
}
</style>
