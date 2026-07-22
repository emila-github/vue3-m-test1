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
import { getAuthUrl, getWxUserInfo } from '@/api/modules/ydl/site-auth'
import { setToken } from '@/api/core/token'
import { usePermission } from '@/composables/usePermission'

const WX_APP_ID = (import.meta.env.VITE_SITE_WX_APP_ID as string) || ''

export interface WecomLoginResult {
  ok: boolean
  code?: string
  socialId?: string
  wxAuthId?: string
  msg?: string
}

export function useSiteWecomLogin() {
  const { loadPermissionsByToken } = usePermission()

  /** 启动企业微信登录：无 code 跳授权；带 code 换 token */
  async function start(getPrivateInfo?: any): Promise<WecomLoginResult> {
    const url = new URL(location.href)
    const code = url.searchParams.get('code')

    // 1) 无 code → 取授权地址并整页跳转
    if (!code) {
      const redirect = encodeURIComponent(location.href + (location.href.includes('?') ? '&' : '?') + 'wxAppId=' + WX_APP_ID)
      const authUrl = await getAuthUrl({ wxAppId: WX_APP_ID, redirect, getPrivateInfo })
      location.href = authUrl // result 即跳转 URL 字符串
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
