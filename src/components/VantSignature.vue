<script setup lang="ts">
/**
 * VantSignature —— 电子签名（手写板）表单字段组件
 *
 * 能力：
 *   - 在表单内以「签字区域」呈现（van-field 形态，可直接放进 van-form 参与校验/提交）；
 *   - 点击签字区域后，横向全屏打开签名屏（尝试锁定横屏 + 全屏，退化时给出横屏提示）；
 *   - 签名屏背景默认提示「书写正楷」；若传入 signatureName（如投保人姓名），则以姓名作为签字版背景水印；
 *   - 支持手指 / 鼠标 / 触控笔书写（Pointer Events 统一处理）；
 *   - 未书写（空白面板）时「确认」按钮禁用，无法提交签名；
 *   - 确认后将签名图（默认 PNG）上传，回写图片地址到 v-model；支持自定义上传函数与回写字段。
 *
 * Props:
 *   modelValue      — v-model：签名图片地址（string）
 *   label           — 字段标签
 *   name            — van-form 提交字段名
 *   required        — 是否显示必填星号
 *   rules           — van-field 校验规则
 *   disabled        — 是否禁用
 *   watermark       — 背景默认提示文案（默认「书写正楷」）
 *   signatureName   — 指定签名人姓名；传入后以姓名作为签字版背景（优先级高于 watermark）
 *   upload          — 自定义上传函数 (blob) => Promise<Record<string,any>>；不传则用默认 demo 上传
 *   resultField     — 上传成功后回写字段（默认 'url'）
 *   imageType       — 导出图片类型（默认 'image/png'）
 *   bakeWatermark   — 是否将水印烘焙进导出图片（默认 true，便于签名图自带姓名/提示上下文）
 *   title           — 签名屏标题
 *   placeholder     — 表单未签名时的占位文案
 *   border          — 是否显示字段底边线
 *
 * 事件：
 *   update:modelValue(value: string) — 双向绑定回写图片地址
 *   confirm(value: string)           — 签名确认并上传成功后触发
 *   change(value: string)            — 值变化时触发（同 confirm 回传）
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { showToast } from 'vant'
import type { FieldRule } from 'vant'
import { uploadDemoFile } from '@/api/modules/demo-upload'

/**
 * 签名文字校验结果。
 * 浏览器端无内置手写识别，组件把「识别 + 比对」做成可插拔钩子，
 * 由调用方提供（通常对接后端手写识别 / OCR 服务）。
 */
export interface SignatureVerifyResult {
  /** 手写文字与期望姓名（signatureName）是否一致 */
  match: boolean
  /** 识别出的文字（可选，用于提示用户） */
  recognized?: string
  /** 不一致时的提示文案 */
  message?: string
}

// 组件含 van-field + van-popup 两个根节点；关闭自动属性继承，
// 把透传属性（如 id / data-track-anchor）显式绑到 van-field 上，避免非 props 告警。
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    name?: string
    required?: boolean
    rules?: FieldRule[]
    disabled?: boolean
    /** 背景默认提示文案 */
    watermark?: string
    /** 指定签名人姓名；传入后以姓名作为签字版背景（优先级高于 watermark） */
    signatureName?: string
    /** 自定义上传函数：(blob) => Promise<Record<string,any>>；不传则用默认 demo 上传 */
    upload?: (blob: Blob) => Promise<Record<string, any>>
    /** 上传成功后回写字段（默认 'url'） */
    resultField?: string
    /** 导出图片类型（默认 image/png） */
    imageType?: string
    /** 是否将水印烘焙进导出图片（默认 false，上传图仅含签名笔迹） */
    bakeWatermark?: boolean
    /** 签名屏内背景文字默认显示度（0~1）；仅当传入 signatureName 时提供滑块调节，便于看清姓名照着签 */
    watermarkOpacity?: number
    /**
     * 签名文字校验钩子：传入则在「确认」时校验手写文字与姓名是否一致，防止签错名字。
     * 接收签名图 blob 与期望姓名，返回是否一致（及识别文本/提示）。
     * 不传则不校验。真实环境通常对接后端手写识别 / OCR 服务。
     */
    verifySignature?: (blob: Blob, expectedName: string) => Promise<SignatureVerifyResult>
    /** 签名屏标题 */
    title?: string
    /** 表单未签名时的占位文案 */
    placeholder?: string
    /** 是否显示字段底边线 */
    border?: boolean
  }>(),
  {
    modelValue: '',
    label: '签名',
    name: 'signature',
    required: false,
    rules: () => [],
    disabled: false,
    watermark: '书写正楷',
    signatureName: '',
    resultField: 'url',
    imageType: 'image/png',
    bakeWatermark: false,
    watermarkOpacity: 0.12,
    title: '电子签名',
    placeholder: '点击此处签名',
    border: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  confirm: [value: string]
  change: [value: string]
}>()

const show = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewUrl = ref(props.modelValue || '')
const hasDrawn = ref(false)
const uploading = ref(false)
/** 签名屏内背景文字显示度（仅传入 signatureName 时可调），用于看清姓名照着签 */
const watermarkOpacity = ref(props.watermarkOpacity)
// 仅在模板中通过 v-model 使用，此处引用以避免未使用告警
void watermarkOpacity

/** 背景水印：优先用签名人姓名，否则用默认提示文案 */
const watermarkText = computed(() => props.signatureName || props.watermark)

let ctx: CanvasRenderingContext2D | null = null
let drawing = false
let lastX = 0
let lastY = 0
let dpr = 1

// ==================== 全屏 / 横屏锁定 ====================
async function enterFullscreen() {
  try {
    const el = document.documentElement
    if (el.requestFullscreen) await el.requestFullscreen()
  } catch {
    /* 部分浏览器/iOS 不支持，忽略 */
  }
  try {
    const so = (screen as any).orientation
    if (so && so.lock) await so.lock('landscape').catch(() => {})
  } catch {
    /* 不支持则退化 */
  }
}

async function exitFullscreen() {
  try {
    const so = (screen as any).orientation
    if (so && so.unlock) so.unlock()
  } catch {
    /* ignore */
  }
  try {
    if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen()
  } catch {
    /* ignore */
  }
}

// ==================== 画布初始化 ====================
function open() {
  if (props.disabled) return
  show.value = true
  // 在用户手势内触发全屏/横屏锁定
  enterFullscreen()
  nextTick(() => {
    // 等待横屏布局稳定后再初始化画布尺寸
    initPad()
  })
}

function initPad() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  dpr = window.devicePixelRatio || 1
  // 按显示尺寸 * dpr 设置位图分辨率，保证线条清晰
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111111'
  }
  hasDrawn.value = false
}

function getPos(e: PointerEvent) {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  // 上下文已按 dpr 缩放，绘制坐标直接用 CSS 像素
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled || !ctx) return
  drawing = true
  const { x, y } = getPos(e)
  lastX = x
  lastY = y
  ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!drawing || !ctx) return
  const { x, y } = getPos(e)
  ctx.beginPath()
  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  lastX = x
  lastY = y
  hasDrawn.value = true
}

function onPointerUp() {
  drawing = false
}

function clearPad() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
  hasDrawn.value = false
}

function close() {
  show.value = false
  exitFullscreen()
}

// ==================== 导出 / 上传 ====================
function exportBlob(): Promise<Blob> {
  const canvas = canvasRef.value!
  return new Promise((resolve) => {
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = canvas.width
    exportCanvas.height = canvas.height
    const ectx = exportCanvas.getContext('2d')!
    // 白底
    ectx.fillStyle = '#ffffff'
    ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)
    // 可选：将水印烘焙进导出图
    if (props.bakeWatermark) {
      ectx.save()
      ectx.globalAlpha = 0.08
      ectx.fillStyle = '#000000'
      const size = Math.min(exportCanvas.width, exportCanvas.height) * 0.32
      ectx.font = `${size}px "KaiTi","STKaiti","SimSun",serif`
      ectx.textAlign = 'center'
      ectx.textBaseline = 'middle'
      ectx.fillText(watermarkText.value, exportCanvas.width / 2, exportCanvas.height / 2)
      ectx.restore()
    }
    ectx.drawImage(canvas, 0, 0)
    exportCanvas.toBlob((b) => resolve(b as Blob), props.imageType, 0.92)
  })
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function doUpload(blob: Blob): Promise<Record<string, any>> {
  if (props.upload) return props.upload(blob)
  // 默认 demo 上传：转 base64 后调用通用图片上传接口
  const base64 = await blobToDataURL(blob)
  return uploadDemoFile({
    fileName: `signature-${Date.now()}.png`,
    base64,
    type: 'image',
  }) as Promise<Record<string, any>>
}

async function confirm() {
  // 空白面板无法确认提交
  if (!hasDrawn.value) {
    showToast('请先完成签名')
    return
  }
  const canvas = canvasRef.value
  if (!canvas) return
  uploading.value = true
  try {
    const blob = await exportBlob()

    // 签名文字校验：比对用户手写内容与传入姓名是否一致，防止签错名字
    if (props.verifySignature && props.signatureName) {
      const verify = await props.verifySignature(blob, props.signatureName)
      if (!verify.match) {
        const recognized = verify.recognized ? `（识别为「${verify.recognized}」）` : ''
        showToast(
          verify.message ||
            `签名与姓名「${props.signatureName}」不一致${recognized}，请检查后重新签名`,
        )
        return
      }
    }

    const result = await doUpload(blob)
    const url = String(result[props.resultField] ?? '')
    if (!url) throw new Error('上传未返回图片地址')
    previewUrl.value = url
    emit('update:modelValue', url)
    emit('confirm', url)
    emit('change', url)
    show.value = false
    exitFullscreen()
  } catch (err) {
    console.error('[VantSignature] 上传失败', err)
    showToast('签名上传失败，请重试')
  } finally {
    uploading.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    previewUrl.value = v || ''
  },
)

onBeforeUnmount(() => {
  exitFullscreen()
})
</script>

<template>
  <!-- 表单内签字区域：点击打开全屏签名屏 -->
  <van-field
    v-bind="$attrs"
    class="vsig-field"
    :model-value="modelValue"
    :label="label"
    :name="name"
    :rules="rules"
    :required="required"
    :border="border"
    :placeholder="placeholder"
    readonly
  >
    <template #input>
      <div
        class="vsig-area"
        :class="{ 'is-disabled': disabled, 'is-signed': !!previewUrl }"
        @click="open"
      >
        <img v-if="previewUrl" :src="previewUrl" class="vsig-preview" alt="签名" />
        <span v-else class="vsig-placeholder">{{ placeholder }}</span>
      </div>
    </template>
  </van-field>

  <!-- 横向全屏签名屏 -->
  <van-popup
    v-model:show="show"
    position="bottom"
    :style="{ height: '100%', width: '100%' }"
    class="vsig-popup"
    :close-on-click-overlay="false"
  >
    <div v-if="show" class="vsig-pad">
      <div class="vsig-pad__bar">
        <span class="vsig-pad__title">{{ title }}</span>
        <div class="vsig-pad__actions">
          <van-button size="small" @click="clearPad">重写</van-button>
          <van-button
            size="small"
            type="primary"
            :loading="uploading"
            :disabled="!hasDrawn"
            @click="confirm"
          >
            确认
          </van-button>
        </div>
        <van-icon name="cross" class="vsig-pad__close" @click="close" />
      </div>

      <div class="vsig-pad__canvas-wrap">
        <!-- 背景水印：默认「书写正楷」或签名人姓名 -->
        <div class="vsig-pad__watermark">{{ watermarkText }}</div>
        <canvas
          ref="canvasRef"
          class="vsig-pad__canvas"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointerleave="onPointerUp"
          @pointercancel="onPointerUp"
        ></canvas>
      </div>

      <p class="vsig-pad__tip">
        {{ hasDrawn ? '签名完成，可点击「确认」上传' : '请在上方区域签名；空白无法确认提交' }}
      </p>
    </div>
  </van-popup>
</template>

<style scoped>
/* 表单内签字区域 */
.vsig-area {
  width: 100%;
  min-height: 96px;
  border: 1px dashed var(--van-gray-4);
  border-radius: 8px;
  background: var(--van-gray-1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}
.vsig-area.is-signed {
  border-style: solid;
  border-color: var(--van-primary-color);
  background: #fff;
}
.vsig-area.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.vsig-placeholder {
  color: var(--van-gray-5);
  font-size: 14px;
}
.vsig-preview {
  max-width: 100%;
  max-height: 120px;
  object-fit: contain;
}

/* 全屏签名屏 */
.vsig-popup :deep(.van-popup) {
  background: #f7f8fa;
}
.vsig-pad {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
}
.vsig-pad__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--van-gray-2);
  background: #fff;
}
.vsig-pad__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--app-text, #323233);
}
.vsig-pad__actions {
  display: flex;
  gap: 8px;
}
.vsig-pad__close {
  font-size: 22px;
  color: var(--van-gray-6);
  cursor: pointer;
}
.vsig-pad__canvas-wrap {
  position: relative;
  flex: 1;
  margin: 12px;
  border: 1px solid var(--van-gray-3);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.vsig-pad__watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'KaiTi', 'STKaiti', 'SimSun', serif;
  font-size: 18vw;
  line-height: 1;
  color: rgba(0, 0, 0, 0.08);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}
.vsig-pad__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  user-select: none;
}
.vsig-pad__tip {
  margin: 0;
  padding: 10px 14px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--van-gray-6);
}
</style>
