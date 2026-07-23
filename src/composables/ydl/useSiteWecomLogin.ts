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
import {
  getAuthUrl,
  getWxUserInfo,
  getSiteUserInfo,
  type SiteWxUserInfoResult,
  type SiteUserInfo,
} from '@/api/modules/ydl/site-auth'
import { setToken, setUserInfo, type UserInfo } from '@/api/core/token'
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

/**
 * 把后端返回的用户档案（可能是内联字段、userInfo 对象，或 getSiteUserInfo 返回）
 * 归一化为统一的 UserInfo，供「我的」页回显。字段名容错多种写法。
 */
function toUserInfo(
  inline: SiteWxUserInfoResult,
  profile?: SiteUserInfo | null,
): UserInfo {
  const src: Record<string, any> = { ...(inline as any), ...(profile || {}) }
  const pick = (...keys: string[]) =>
    keys.map((k) => src[k]).find((v) => v !== undefined && v !== null && v !== '')
  const depart =
    typeof src.depart === 'object'
      ? src.depart?.departName || src.depart?.departName_dictText
      : src.departName || src.depart
  const post =
    typeof src.post === 'object' ? src.post?.name || src.post?.postName : src.post
  const name = (pick('realname', 'name', 'username') as string) || '企业微信用户'
  return {
    userId: (pick('id', 'username') as string) || '',
    name,
    phone: (src.phone as string) || '',
    dept: (depart as string) || '',
    role: (post as string) || '',
    avatar: (src.avatar as string) || '',
  }
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
      // 登录后要去的业务页：优先取当前 URL 上的 redirect；避免把带 query 的整串再塞进去
      const appRedirect = (route.query.redirect as string) || '/ydl'
      const q = `redirect=${encodeURIComponent(appRedirect)}&wxAppId=${WX_APP_ID}`
      // 回调基准域名：优先固定可信域名（OAUTH_REDIRECT_BASE），否则用当前来源（cpolar / localhost）。
      // 注意：路径固定为登录页，且【不能】叠加 location.search（其已含 redirect，会造成重复参数）。
      const base = (OAUTH_REDIRECT_BASE || location.origin).replace(/\/$/, '')
      const callbackUrl = `${base}${location.pathname}?${q}`
      const redirect = encodeURIComponent(callbackUrl)
      const authUrl = await getAuthUrl({ wxAppId: WX_APP_ID, redirect, getPrivateInfo })
      location.href = authUrl // result 即跳转 URL 字符串（真实联调时为微信授权地址）
      return { ok: false } // 整页跳转，不会走到这里
    }

    // 2) 带 code → 换 token
    const res = await getWxUserInfo({ wxAppId: WX_APP_ID, code })
    if (res.code === '00' && res.token) {
      setToken(res.token)
      // 回显用户：优先用 getWxUserInfo 内联/内嵌的用户字段；缺失时再单独拉档案。
      // 用 getSiteUserInfo 失败不致命（降级为默认名），不影响登录态。
      let profile: SiteUserInfo | null = null
      if (!res.userInfo && !res.realname && !res.username && !res.name) {
        try {
          profile = await getSiteUserInfo(res.token)
        } catch {
          profile = null
        }
      }
      setUserInfo(toUserInfo(res, profile)) // 持久化用户档案 → 我的页读取
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
