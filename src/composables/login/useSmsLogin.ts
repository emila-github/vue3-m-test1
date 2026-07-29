/**
 * 短信验证码登录（useSmsLogin）
 * ---------------------------------------------------------------
 * 流程：
 *   1. 输入手机号（1[3-9]\d{9}）
 *   2. 拖动滑块完成人机校验（VantSliderVerify）
 *   3. 点击「获取验证码」→ sendSmsCode，进入 60s 倒计时，发送后重置滑块
 *   4. 输入 6 位验证码 → 提交 → loginBySms → doLogin 派发 success
 *
 * 关键状态：smsForm / sliderVerified / countdown / sending
 * 模板需绑定 ref="sliderComp"（发送成功后调用 .reset() 复位滑块）。
 */
import { ref, computed } from 'vue'
import { sendSmsCode, loginBySms } from '@/api/modules/login'
import type { LoginCore } from './useLoginCore'
import type VantSliderVerify from '@/components/VantSliderVerify.vue'

export function useSmsLogin(core: LoginCore, countdownSeconds: number) {
  const smsForm = ref({ phone: '', code: '' })
  const sliderVerified = ref(false)
  const sliderComp = ref<InstanceType<typeof VantSliderVerify> | null>(null)
  const countdown = ref(0)
  const sending = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const phoneValid = computed(() => /^1[3-9]\d{9}$/.test(smsForm.value.phone))

  /** 获取验证码按钮禁用态 + 禁用原因（点击时给出提示） */
  const codeBtnDisabled = computed(
    () => countdown.value > 0 || sending.value || !sliderVerified.value || !phoneValid.value,
  )
  const codeBtnReason = computed(() => {
    if (!phoneValid.value) return '请先输入正确格式的手机号'
    if (!sliderVerified.value) return '请先拖动滑块完成验证'
    return ''
  })

  async function onSendCode() {
    if (countdown.value > 0) {
      core.toast(`请 ${countdown.value}s 后再获取验证码`)
      return
    }
    if (sending.value) return
    if (codeBtnReason.value) {
      core.toast(codeBtnReason.value)
      return
    }
    sending.value = true
    try {
      const res = await sendSmsCode(smsForm.value.phone)
      core.toast(`验证码已发送${res.devCode ? `（演示码：${res.devCode}）` : ''}`)
      countdown.value = countdownSeconds
      timer = setInterval(() => {
        countdown.value -= 1
        if (countdown.value <= 0 && timer) {
          clearInterval(timer)
          timer = null
        }
      }, 1000)
      // 发送成功后重置滑块，下次获取需重新滑动验证
      sliderComp.value?.reset()
    } catch (e: any) {
      core.toast(e?.message || '发送失败')
    } finally {
      sending.value = false
    }
  }

  async function onSmsSubmit() {
    if (!phoneValid.value) {
      core.toast('请输入正确的手机号')
      return
    }
    if (!/^\d{6}$/.test(smsForm.value.code)) {
      core.toast('请输入 6 位验证码')
      return
    }
    await core.doLogin(() => loginBySms(smsForm.value.phone, smsForm.value.code), 'sms')
  }

  return {
    smsForm,
    sliderVerified,
    sliderComp,
    countdown,
    codeBtnDisabled,
    codeBtnReason,
    onSendCode,
    onSmsSubmit,
  }
}
