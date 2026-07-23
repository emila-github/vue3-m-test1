/**
 * 站点（旧站 / JeecgBoot）API 客户端。
 *
 * 响应包络：{ success, message, code, result }
 *   - 业务接口 code===200 / success===true
 *   - 鉴权接口（微信）code===0
 * 共用 ydlFormat 适配器（兼容双语义）。
 *
 * baseURL 由 VITE_SITE_API_BASE_URL 决定（mock 用 /site-api，联调用真实地址）。
 *
 * 请求自动注入 X-Access-Token（见 core/token.ts 的 TOKEN_HEADER）。
 * onAuthFail：401 / 510 视为登录失效 → 清 token 并跳站点登录页。
 */
import { createClient } from '../../core/http'
import { ydlFormat } from '../../core/adapters'
import { clearAuth } from '../../core/token'
import router from '@/router'

// is 根路径：业务 & 登录/登出/权限/验证码等（siteClient，baseURL = VITE_SITE_API_BASE_URL）。
// 缺省回退 /site-api（mock 模式由 mock 中间件拦截 /site-api）。
const SITE_BASE = (import.meta.env.VITE_SITE_API_BASE_URL as string) || '/site-api'
const SITE_WX_BASE = (import.meta.env.VITE_SITE_WX_API_BASE_URL as string) || '/wx-api'

// 旧站 401（未登录）/ 510（登录失效）均清 token 跳登录（is、wx 两个客户端共用）
function onAuthFail(code: number) {
  if (code === 401 || code === 510) {
    clearAuth()
    const redirect = router.currentRoute.value.fullPath
    router.replace({ path: '/ydl/login', query: { redirect } })
  }
}

// is 根路径：业务 / 登录 / 权限 / 登出 / 验证码
export const siteClient = createClient({
  adapter: ydlFormat,
  baseURL: SITE_BASE,
  withTimestamp: true, // 旧站请求带 _t 时间戳
  onAuthFail,
})

// wx 根路径：企业微信鉴权（/cp/wxAuth/...）
export const siteWxClient = createClient({
  adapter: ydlFormat,
  baseURL: SITE_WX_BASE,
  withTimestamp: true,
  onAuthFail,
})

export const {
  instance: siteInstance,
  get: siteGet,
  post: sitePost,
  put: sitePut,
  del: siteDel,
  paginate: sitePaginate,
} = siteClient

export const { get: siteWxGet, post: siteWxPost } = siteWxClient

export default siteClient
