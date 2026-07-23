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
  // 真实后端：base64 图（不含 data: 前缀）；mock：字符 + 每个字符的视觉样式（回退用）
  const captchaImg = ref('')
  const captchaCode = ref('')
  const captchaItems = ref<{ ch: string; color: string; rotate: number }[]>([])
  const loading = ref(false)
  let captchaKey = ''
  const { loadPermissionsByToken } = usePermission()

  const captchaPalette = ['#c41230', '#0d47a1', '#1b5e20', '#e65100']

  /** 刷新图形验证码：优先用真实后端 base64 图，无图时（mock）回退到字符渲染 */
  async function refreshCaptcha() {
    const res = await getCaptchaImg()
    captchaKey = res.captchaKey
    if (res.img) {
      // 真实后端：base64 图，模板拼 `data:image/gif;base64,` 渲染
      captchaImg.value = res.img
      captchaCode.value = ''
      captchaItems.value = []
    } else {
      // mock 回退：字符型验证码，内联 DOM 渲染
      captchaCode.value = res.code || ''
      captchaItems.value = (res.code || '').split('').map((ch) => ({
        ch,
        color: captchaPalette[Math.floor(Math.random() * captchaPalette.length)],
        rotate: Math.random() * 30 - 15,
      }))
      captchaImg.value = ''
    }
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

  return { captchaImg, captchaCode, captchaItems, loading, refreshCaptcha, submit }
}
