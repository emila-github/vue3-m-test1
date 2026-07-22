/**
 * 站点（旧站 / JeecgBoot）登录 / 权限 / 登出 Mock 数据。
 *
 * 由 mock 插件挂载在 /site-api 前缀下拦截（对应 siteClient 的 baseURL）。
 * 响应统一为 JeecgBoot 包络：{ success, message, code, result, timestamp }，
 * 鉴权类接口用 code:0，业务类接口用 code:200（见 ydlFormat 适配器，与 ydl 共用）。
 *
 * 权限数据直接复用样例文件 getUserPermissionByToken.json 的 result 字段。
 */
import type { MockRoute } from './types'
// 直接复用样例权限数据结构（对齐真实后端返回；放在 src 内以便类型检查）
import permRaw from './ydl-site-perm.json'

// ==================== JeecgBoot 包络 ====================
function ok<T>(result: T, extra: Record<string, any> = {}) {
  return { success: true, code: 200, message: '操作成功', result, timestamp: Date.now(), ...extra }
}
function authOk<T>(result: T) {
  // 鉴权类接口（企业微信）用 code:0 表示外层成功
  return { success: false, code: 0, message: 'ok', result, timestamp: Date.now() }
}

/** 解析 query 中的某个参数 */
function queryParam(req: any, key: string): string {
  const url = new URL(req.url || '', 'http://localhost')
  return url.searchParams.get(key) || ''
}

const permResult = (permRaw as any).result

const routes: MockRoute[] = [
  // 企业微信：授权地址（演示：直接回跳带 code）
  {
    url: '/cp/wxAuth/getAuthUrl',
    method: 'GET',
    response: (req) => {
      // redirect 由前端传入（encodeURIComponent 后的回跳地址）；演示时拼上 code 直接回跳
      const redirect = queryParam(req, 'redirect') || ''
      const back = decodeURIComponent(redirect)
      const sep = back.includes('?') ? '&' : '?'
      return authOk(back ? back + sep + 'code=MOCK_WX_CODE' : '/ydl/login?code=MOCK_WX_CODE')
    },
  },
  // 企业微信：用 code 换 token（演示：内层 code '00' 表示成功）
  {
    url: '/cp/wxAuth/getWxUserInfo',
    method: 'POST',
    response: authOk({
      code: '00',
      token: 'mock_site_token_' + Date.now(),
      socialId: '',
      wxAuthId: '',
      msg: '登录成功',
    }),
  },
  // 普通登录：图形验证码
  {
    url: '/sys/captchaImage',
    method: 'GET',
    response: ok({ img: '', captchaKey: 'mock_captcha_key' }),
  },
  // 普通登录：账号密码登录（演示：任意账号密码通过）
  {
    url: '/sys/social/wxLogin',
    method: 'POST',
    response: ok({ token: 'mock_site_token_' + Date.now() }),
  },
  // 登录后拉权限（直接返回样例 JSON 的 result）
  {
    url: '/sys/permission/getUserPermissionByToken',
    method: 'GET',
    response: ok(permResult),
  },
  // 登出
  {
    url: '/sys/logout',
    method: 'POST',
    response: ok(null, { message: '已退出登录' }),
  },
]

export default routes
