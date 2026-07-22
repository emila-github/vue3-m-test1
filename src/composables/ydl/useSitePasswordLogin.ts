/**
 * 站点（旧站）普通登录 composable（账号 + 图形验证码 + md5 密码）。
 * ydl 独立，不动 vant 侧。
 *
 * 流程：refreshCaptcha() 取图形验证码 → submit() 把密码 md5 后调 userLogin 拿 token
 * → setToken + 拉权限。
 */
import md5 from 'md5'
import { ref } from 'vue'
import { getCaptchaImg, userLogin } from '@/api/modules/ydl/site-auth'
import { setToken } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'

export function useSitePasswordLogin() {
  const captchaUrl = ref('')
  const loading = ref(false)
  let captchaKey = ''
  const { loadPermissionsByToken } = usePermission()

  /** 刷新图形验证码 */
  async function refreshCaptcha() {
    const { img, captchaKey: key } = await getCaptchaImg()
    // 后端返回 gif 的 base64（可能带 data: 前缀，也可能不带）
    captchaUrl.value = img.startsWith('data:') ? img : 'data:image/gif;base64,' + img
    captchaKey = key
  }

  /** 提交登录：password 走 md5（旧站约定） */
  async function submit(form: {
    username: string
    password: string
    captcha: string
    socialId?: string
  }) {
    loading.value = true
    try {
      const { token } = await userLogin({
        username: form.username,
        password: md5(form.password),
        captcha: form.captcha,
        captchaKey,
        socialId: form.socialId,
      })
      setToken(token)
      await loadPermissionsByToken(token)
      return token
    } finally {
      loading.value = false
    }
  }

  return { captchaUrl, loading, refreshCaptcha, submit }
}
