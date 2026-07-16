<script setup lang="ts">
import { ref } from 'vue'
import type { FieldRule } from 'vant'
import VantCheckin from './VantCheckin.vue'
import type { CheckinResult } from './VantCheckin.vue'

const props = withDefaults(
  defineProps<{
    /** v-model：打卡结果（含经纬度/地址/时间）。传入上次打卡数据可在弹窗内预览地图 */
    modelValue?: CheckinResult | null
    /** 腾讯地图 Key（缺省读取 VITE_TMAP_KEY） */
    mapKey?: string
    /** 打卡限制：'once'=仅一次，'multiple'=可多次 */
    mode?: 'once' | 'multiple'
    disabled?: boolean
    /** 是否显示「重新定位」按钮 */
    relocateable?: boolean
    /** 是否启用微信定位通道 */
    useWxLocation?: boolean
    /** 微信 JS-SDK 配置加载器（企业微信需后端下发签名） */
    wxConfigLoader?: () => Promise<{
      appId: string
      timestamp: number
      nonceStr: string
      signature: string
      jsApiList?: string[]
    } | null>
    /** 弹窗内标题 */
    title?: string
    /** 字段标签 */
    label?: string
    /** van-form 校验所需的字段名 */
    name?: string
    /** 透传给 van-field 的校验规则（默认不验证） */
    rules?: FieldRule[]
    /** 占位提示文案 */
    placeholder?: string
    /** 是否显示必填星号（透传给 van-field 的 required） */
    required?: boolean
    /** 是否显示字段底边线（默认显示，与 van-field 列表 UI 一致） */
    border?: boolean
  }>(),
  {
    modelValue: null,
    mapKey: (import.meta.env.VITE_TMAP_KEY as string) || '',
    mode: 'once',
    disabled: false,
    relocateable: true,
    useWxLocation: true,
    title: '外出定位打卡',
    label: '外出打卡',
    name: 'checkin',
    rules: () => [],
    placeholder: '点击右侧图标打卡',
    required: false,
    border: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: CheckinResult | null]
  checkin: [result: CheckinResult]
}>()

const show = ref(false)

/** 打开打卡弹窗 */
function open() {
  if (props.disabled) return
  show.value = true
}

/** 弹窗内打卡成功：回填 v-model 并关闭弹窗 */
function onCheckin(r: CheckinResult) {
  emit('update:modelValue', r)
  emit('checkin', r)
  show.value = false
}
</script>

<template>
  <van-cell-group inset>
    <van-field
      :model-value="modelValue?.address || ''"
      :label="label"
      :name="name"
      :rules="rules"
      :placeholder="placeholder"
      :required="required"
      :border="border"
      readonly
    >
      <template #button>
        <div
          class="vcf-checkin"
          :class="{ 'is-disabled': disabled, 'is-checked': !!modelValue }"
          @click="open"
        >
          <van-icon name="map-marked" size="22" class="vcf-checkin__camera" />
        </div>
      </template>
    </van-field>
  </van-cell-group>

  <van-popup
    v-model:show="show"
    position="bottom"
    closeable
    :style="{ height: '100%' }"
  >
    <VantCheckin
      v-if="show"
      :map-key="mapKey"
      :mode="mode"
      :disabled="disabled"
      :relocateable="relocateable"
      :use-wx-location="useWxLocation"
      :wx-config-loader="wxConfigLoader"
      :model-value="modelValue"
      :title="title"
      @checkin="onCheckin"
    />
  </van-popup>
</template>

<style scoped>
/* 地址字段右侧打卡入口：地图图标，带闪动提示可点击 */
.vcf-checkin {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.vcf-checkin.is-disabled {
  cursor: not-allowed;
}
.vcf-checkin__camera {
  color: var(--van-primary-color);
  padding: 4px;
  animation: vcf-pulse 1.4s ease-in-out infinite;
}
/* 已打卡（有地址数据）或禁用时停止闪动，避免干扰 */
.vcf-checkin.is-checked .vcf-checkin__camera,
.vcf-checkin.is-disabled .vcf-checkin__camera {
  animation: none;
  color: var(--van-gray-5);
}
@keyframes vcf-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.55;
  }
}
</style>

