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

// ==================== 图形验证码（Mock 生成） ====================
// 生成 base64 SVG（带可读字符），对齐真实后端 result.img 格式，
// 便于联调前端 <img :src="data:..."> 渲染路径。SVG 为文本格式，
// 浏览器/Node 均可正常解码，且必定含有可读验证码文字。登录校验据此比对（见 wxLogin）。
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CAPTCHA_COLORS = ['#d71920', '#1565c0', '#1b5e20', '#e65100']

/** 环境自适应 base64：浏览器用 btoa，Node 用 Buffer（mock 插件两种环境都可能跑） */
function toBase64(s: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(s).toString('base64')
  return btoa(unescape(encodeURIComponent(s)))
}

/** XML 转义，避免字符破坏 SVG 结构 */
function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '&' ? '&amp;' : c === "'" ? '&apos;' : '&quot;',
  )
}

let currentCaptcha = ''

function makeCaptchaSvg(): string {
  // 生成 4 位验证码字符
  let code = ''
  for (let i = 0; i < 4; i++)
    code += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  currentCaptcha = code

  const W = 100
  const H = 40
  let texts = ''
  for (let i = 0; i < 4; i++) {
    const x = 16 + i * 22
    const y = 30
    const rot = (Math.random() * 30 - 15).toFixed(1)
    const color = CAPTCHA_COLORS[i % CAPTCHA_COLORS.length]
    texts +=
      `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="26" ` +
      `font-weight="bold" fill="${color}" text-anchor="middle" ` +
      `transform="rotate(${rot} ${x} ${y})">${escapeXml(code[i] ?? '')}</text>`
  }
  // 两条干扰线
  const lines =
    `<line x1="0" y1="12" x2="100" y2="16" stroke="#d71920" stroke-opacity="0.3" stroke-width="1.2"/>` +
    `<line x1="0" y1="30" x2="100" y2="26" stroke="#1565c0" stroke-opacity="0.3" stroke-width="1"/>`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="#f5f5f5"/>${lines}${texts}</svg>`
  return toBase64(svg)
}

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
  // 普通登录：图形验证码（返回 base64 SVG 图，对齐真实后端 result.img 格式）
  {
    url: '/sys/captchaImage',
    method: 'GET',
    response: () =>
      ok({ img: makeCaptchaSvg(), captchaKey: 'mock_captcha_key' }, { message: '验证码生成成功' }),
  },
  // 普通登录：账号密码登录（演示：任意账号密码，但需验证码正确）
  {
    url: '/sys/social/wxLogin',
    method: 'POST',
    response: (req: any) => {
      let body: any = req.body
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body)
        } catch {
          body = {}
        }
      }
      if (
        body?.captcha &&
        currentCaptcha &&
        body.captcha.toUpperCase() !== currentCaptcha.toUpperCase()
      ) {
        return {
          success: false,
          code: 500,
          message: '验证码错误',
          result: null,
          timestamp: Date.now(),
        }
      }
      return ok({ token: 'mock_site_token_' + Date.now() })
    },
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
