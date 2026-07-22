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
  // 验证码字符 + 每个字符的视觉样式（内联 DOM 渲染，避免图片不显示）
  const captchaCode = ref('')
  const captchaItems = ref<{ ch: string; color: string; rotate: number }[]>([])
  const loading = ref(false)
  let captchaKey = ''
  const { loadPermissionsByToken } = usePermission()

  const captchaPalette = ['#c41230', '#0d47a1', '#1b5e20', '#e65100']

  /** 刷新图形验证码 */
  async function refreshCaptcha() {
    const { code, captchaKey: key } = await getCaptchaImg()
    captchaCode.value = code
    // 为每个字符随机配色 + 旋转，模拟图形验证码观感
    captchaItems.value = code.split('').map((ch) => ({
      ch,
      color: captchaPalette[Math.floor(Math.random() * captchaPalette.length)],
      rotate: Math.random() * 30 - 15,
    }))
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

  return { captchaCode, captchaItems, loading, refreshCaptcha, submit }
}
