/**
 * 找回密码（useForgotPassword）
 * ---------------------------------------------------------------
 * 弹窗流程：手机号 → 滑块校验 → 获取短信验证码（60s 倒计时）→ 输入 6 位验证码
 *           → 输入 8-20 位新密码 → submit → resetPassword → 关闭弹窗并切到密码登录。
 *
 * 关键状态：showForgot / resetForm / resetSliderVerified / resetCountdown / resetSending
 * 模板需绑定 ref="resetSliderComp"（发送成功后 .reset() 复位）。
 * goPassword：重置成功后由外部切回密码登录方式。
 */
import { ref, computed } from 'vue'
import { showLoadingToast, closeToast } from 'vant'
import { sendSmsCode, resetPassword } from '@/api/modules/login'
import type { LoginCore } from './useLoginCore'
import type VantSliderVerify from '@/components/VantSliderVerify.vue'

export interface ForgotOptions {
  /** 重置成功后切回密码登录 */
  goPassword: () => void
}

export function useForgotPassword(core: LoginCore, opts: ForgotOptions) {
  const showForgot = ref(false)
  const resetForm = ref({ phone: '', code: '', newPassword: '' })
  const resetSliderVerified = ref(false)
  const resetSliderComp = ref<InstanceType<typeof VantSliderVerify> | null>(null)
  const resetCountdown = ref(0)
  const resetSending = ref(false)
  let resetTimer: ReturnType<typeof setInterval> | null = null

  const resetPhoneValid = computed(() => /^1[3-9]\d{9}$/.test(resetForm.value.phone))
  const resetCodeDisabled = computed(
    () =>
      resetCountdown.value > 0 ||
      resetSending.value ||
      !resetSliderVerified.value ||
      !resetPhoneValid.value,
  )
  const resetCodeReason = computed(() => {
    if (!resetPhoneValid.value) return '请先输入正确格式的手机号'
    if (!resetSliderVerified.value) return '请先拖动滑块完成验证'
    return ''
  })

  async function onSendResetCode() {
    if (resetCountdown.value > 0) {
      core.toast(`请 ${resetCountdown.value}s 后再获取验证码`)
      return
    }
    if (resetSending.value) return
    if (resetCodeReason.value) {
      core.toast(resetCodeReason.value)
      return
    }
    resetSending.value = true
    try {
      const res = await sendSmsCode(resetForm.value.phone)
      core.toast(`验证码已发送${res.devCode ? `（演示码：${res.devCode}）` : ''}`)
      resetCountdown.value = 60
      resetTimer = setInterval(() => {
        resetCountdown.value -= 1
        if (resetCountdown.value <= 0 && resetTimer) {
          clearInterval(resetTimer)
          resetTimer = null
        }
      }, 1000)
      resetSliderComp.value?.reset()
    } catch (e: any) {
      core.toast(e?.message || '发送失败')
    } finally {
      resetSending.value = false
    }
  }

  async function onResetSubmit() {
    if (!resetPhoneValid.value) {
      core.toast('请输入正确的手机号')
      return
    }
    if (!resetSliderVerified.value) {
      core.toast('请先拖动滑块完成验证')
      return
    }
    if (!/^\d{6}$/.test(resetForm.value.code)) {
      core.toast('请输入 6 位验证码')
      return
    }
    if (!/^\S{8,20}$/.test(resetForm.value.newPassword)) {
      core.toast('新密码需为 8-20 位')
      return
    }
    if (core.loading.value) return
    core.loading.value = true
    showLoadingToast({ message: '提交中...', forbidClick: true, duration: 0 })
    try {
      await resetPassword(resetForm.value.phone, resetForm.value.code, resetForm.value.newPassword)
      closeToast()
      core.toast('密码已重置，请使用新密码登录')
      showForgot.value = false
      resetForm.value = { phone: '', code: '', newPassword: '' }
      resetSliderComp.value?.reset()
      // 重置成功后切到密码登录页
      opts.goPassword()
    } catch (e: any) {
      closeToast()
      core.toast(e?.message || '重置失败')
    } finally {
      core.loading.value = false
    }
  }

  return {
    showForgot,
    resetForm,
    resetSliderVerified,
    resetSliderComp,
    resetCountdown,
    resetCodeDisabled,
    resetCodeReason,
    onSendResetCode,
    onResetSubmit,
  }
}
