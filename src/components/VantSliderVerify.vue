<script setup lang="ts">
/**
 * VantSliderVerify —— 拖动滑块验证组件
 *
 * 通过 v-model 暴露「是否已验证通过」。验证通过前拖动到最右侧，
 * 松手时进度 >= 95% 即视为验证通过并锁定；否则回弹。
 * 用于「获取验证码」前置校验（登录 / 找回密码均可复用）。
 */
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 是否已验证通过（v-model） */
    modelValue: boolean
    /** 禁用拖动（如验证码倒计时中） */
    disabled?: boolean
  }>(),
  { modelValue: false, disabled: false },
)
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const barRef = ref<HTMLElement | null>(null)
const progress = ref(0)
const dragging = ref(false)
const SLIDER_THUMB = 38 // 与样式中滑块宽度一致
const thumbLeft = computed(
  () => `calc(${progress.value}% - ${(progress.value / 100) * SLIDER_THUMB}px)`,
)

// 将指针 X 坐标换算为进度（0~100），基于轨道真实可滑动宽度
function clientXToProgress(clientX: number): number {
  const bar = barRef.value
  if (!bar) return 0
  const rect = bar.getBoundingClientRect()
  const usable = rect.width - SLIDER_THUMB
  if (usable <= 0) return 0
  const p = ((clientX - rect.left - SLIDER_THUMB / 2) / usable) * 100
  return Math.max(0, Math.min(100, p))
}

/** 从 pointer / touch / mouse 事件里取 clientX（兼容微信 WebView 只派发 touch 的情况） */
function getClientX(e: any): number {
  if (e.touches && e.touches[0]) return e.touches[0].clientX
  if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX
  return e.clientX ?? 0
}

function onDown(e: any) {
  if (props.modelValue || props.disabled) return
  e.preventDefault?.()
  if (dragging.value) return
  const bar = barRef.value
  if (!bar) return
  dragging.value = true
  progress.value = clientXToProgress(getClientX(e))

  const move = (cx: number) => {
    progress.value = clientXToProgress(cx)
  }
  let cleanup = () => {}
  const up = () => {
    dragging.value = false
    cleanup()
    if (progress.value >= 95) {
      emit('update:modelValue', true)
      progress.value = 100
    } else {
      progress.value = 0
    }
  }
  const onTouchMove = (ev: TouchEvent) => {
    if (ev.cancelable) ev.preventDefault() // 阻止页面滚动
    const t = ev.touches[0]
    if (t) move(t.clientX)
  }
  const onPointerMove = (ev: PointerEvent) => {
    if (ev.cancelable) ev.preventDefault()
    move(ev.clientX)
  }
  const onMouseMove = (ev: MouseEvent) => move(ev.clientX)
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', up)
  window.addEventListener('touchcancel', up)
  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', up)
  cleanup = () => {
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', up)
    window.removeEventListener('touchcancel', up)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', up)
  }
}

/** 重置为未验证状态（获取验证码成功后调用，下次需重新滑动） */
function reset() {
  progress.value = 0
  dragging.value = false
  emit('update:modelValue', false)
}

defineExpose({ reset })
</script>

<template>
  <div class="slider-verify" :class="{ verified: modelValue }">
    <div
      class="slider-bar"
      ref="barRef"
      @touchstart.stop="onDown"
      @mousedown="onDown"
      @pointerdown.stop="onDown"
    >
      <div class="slider-fill" :style="{ width: progress + '%' }"></div>
      <div class="slider-thumb" :class="{ dragging }" :style="{ left: thumbLeft }">
        <van-icon :name="modelValue ? 'success' : 'arrow'" />
      </div>
      <span class="slider-text">
        {{ modelValue ? '验证通过，可获取验证码' : '拖动滑块到最右侧完成验证' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.slider-verify {
  padding: 12px 16px 4px;
}
.slider-bar {
  position: relative;
  height: 44px;
  border-radius: 22px;
  background: #eef0f3;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  cursor: grab;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.08);
}
.slider-bar:active {
  cursor: grabbing;
}
.slider-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(215, 25, 32, 0.22), rgba(215, 25, 32, 0.34));
  border-radius: 22px 0 0 22px;
  transition: background 0.2s;
  pointer-events: none;
}
.slider-thumb {
  position: absolute;
  top: 3px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e23b3b, #d71920);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  touch-action: none;
  box-shadow: 0 2px 8px rgba(215, 25, 32, 0.35);
  transition:
    background 0.2s,
    box-shadow 0.2s,
    transform 0.1s;
}
.slider-thumb.dragging {
  cursor: grabbing;
  transform: scale(1.05);
}
.slider-text {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  letter-spacing: 1px;
  color: #9aa0a6;
  pointer-events: none;
}
.slider-verify.verified .slider-bar {
  background: #e6f7ec;
  box-shadow: inset 0 1px 4px rgba(7, 193, 96, 0.15);
}
.slider-verify.verified .slider-fill {
  background: linear-gradient(90deg, rgba(7, 193, 96, 0.22), rgba(7, 193, 96, 0.34));
}
.slider-verify.verified .slider-thumb {
  background: linear-gradient(135deg, #25c771, #07c160);
  box-shadow: 0 2px 8px rgba(7, 193, 96, 0.35);
}
.slider-verify.verified .slider-text {
  color: #07c160;
}
</style>
