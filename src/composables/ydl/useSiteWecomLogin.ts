/**
 * 站点（旧站）企业微信登录 composable（ydl 独立，不动 vant 侧）。
 *
 * 流程（对齐旧站站点登录开发文档）：
 *   1. 当前 URL 无 code → 调 getAuthUrl 拿跳转地址 → 整页 location.href 跳企业微信授权
 *   2. 企业微信回跳带 code → 调 getWxUserInfo 用 code 换 token
 *   3. 内层 result.code === '00' 才成功；'01' 未绑定（带 socialId 走普通登录）；
 *      '02' / 406 未注册。
 *
 * 成功后：setToken + 拉权限（loadPermissionsByToken）。
 */
import { useRoute } from 'vue-router'
import { getAuthUrl, getWxUserInfo } from '@/api/modules/ydl/site-auth'
import { setToken } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'

const WX_APP_ID = (import.meta.env.VITE_SITE_WX_APP_ID as string) || ''

// 企业微信 OAuth 回调基准域名（与 vant 侧一致）。
// 真实联调时 redirect_uri 必须是后台登记的「可信固定域名」，不能用 location.href。
// 优先 ydl 专用配置，回退通用 OAUTH_REDIRECT_BASE；两者皆空则回退当前地址（仅演示/dev 用）。
const OAUTH_REDIRECT_BASE =
  (import.meta.env.VITE_SITE_OAUTH_REDIRECT_BASE as string) ||
  (import.meta.env.VITE_OAUTH_REDIRECT_BASE as string) ||
  ''

export interface WecomLoginResult {
  ok: boolean
  code?: string
  socialId?: string
  wxAuthId?: string
  msg?: string
}

export function useSiteWecomLogin() {
  const route = useRoute()
  const { loadPermissionsByToken } = usePermission()

  /** 启动企业微信登录：无 code 跳授权；带 code 换 token */
  async function start(getPrivateInfo?: any): Promise<WecomLoginResult> {
    const url = new URL(location.href)
    const code = url.searchParams.get('code')

    // 1) 无 code → 取授权地址并整页跳转
    if (!code) {
      // 企业微信要求 redirect_uri 为后台登记的「可信固定域名」，不能用 location.href
      // （含动态 query/hash、且 dev 的 localhost 无法登记）。优先用 OAUTH_REDIRECT_BASE，
      // 否则回退当前页面地址（仅演示 / dev 用）。
      const appRedirect = (route.query.redirect as string) || '/ydl'
      const q = `redirect=${encodeURIComponent(appRedirect)}&wxAppId=${WX_APP_ID}`
      let callbackUrl: string
      if (OAUTH_REDIRECT_BASE) {
        const base = OAUTH_REDIRECT_BASE.replace(/\/$/, '')
        // 回调页即本站登录页（前端直达模式），保留登录后跳转目标 redirect
        callbackUrl = `${base}${location.pathname}?${q}`
      } else {
        // 演示 / dev 降级：用当前页面地址（localhost 等），不强制跳公网域名
        callbackUrl =
          location.origin + location.pathname + (location.search ? location.search + '&' : '?') + q
      }
      const redirect = encodeURIComponent(callbackUrl)
      const authUrl = await getAuthUrl({ wxAppId: WX_APP_ID, redirect, getPrivateInfo })
      location.href = authUrl // result 即跳转 URL 字符串（真实联调时为微信授权地址）
      return { ok: false } // 整页跳转，不会走到这里
    }

    // 2) 带 code → 换 token
    const res = await getWxUserInfo({ wxAppId: WX_APP_ID, code })
    if (res.code === '00' && res.token) {
      setToken(res.token)
      await loadPermissionsByToken(res.token) // 登录后立即拉权限
      return { ok: true }
    }

    // 失败分支：未绑定 / 未注册（带 socialId 供普通登录绑定）
    return {
      ok: false,
      code: res.code,
      socialId: res.socialId,
      wxAuthId: res.wxAuthId,
      msg: res.msg,
    }
  }

  return { start }
}
