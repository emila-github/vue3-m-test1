/**
 * 密码登录（usePasswordLogin）
 * ---------------------------------------------------------------
 * 流程：
 *   1. 输入账号（手机号 / 工号）
 *   2. 输入密码（≥6 位）
 *   3. 输入图形验证码（refreshCaptcha 拉取，点击图片可刷新）
 *   4. 提交 → loginByPassword（验证码转大写 + captchaId 一并提交）→ doLogin 派发
 *
 * 关键状态：pwdForm / captchaId / captchaSvg
 * 图形验证码在组件挂载时自动拉取一次。
 */
import { ref } from 'vue'
import { getCaptcha, loginByPassword } from '@/api/modules/login'
import type { LoginCore } from './useLoginCore'

export function usePasswordLogin(core: LoginCore) {
  const pwdForm = ref({ account: '', password: '', captcha: '' })
  const captchaId = ref('')
  const captchaSvg = ref('')

  /** 拉取图形验证码（密码登录前置校验） */
  async function refreshCaptcha() {
    try {
      const res = await getCaptcha()
      captchaId.value = res.captchaId
      captchaSvg.value = res.svg
    } catch {
      /* 忽略获取失败 */
    }
  }

  async function onPasswordSubmit() {
    if (!pwdForm.value.account.trim()) {
      core.toast('请输入账号')
      return
    }
    if (pwdForm.value.password.length < 6) {
      core.toast('密码至少 6 位')
      return
    }
    if (!pwdForm.value.captcha.trim()) {
      core.toast('请输入图形验证码')
      return
    }
    await core.doLogin(
      () =>
        loginByPassword(
          pwdForm.value.account.trim(),
          pwdForm.value.password,
          pwdForm.value.captcha.trim().toUpperCase(),
          captchaId.value,
        ),
      'password',
    )
  }

  return { pwdForm, captchaId, captchaSvg, refreshCaptcha, onPasswordSubmit }
}
