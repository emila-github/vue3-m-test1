/**
 * 登录 Mock 数据
 *
 * 接口（均不带 /api 前缀，由 mock 插件在 /api 下挂载）：
 *   GET  /login/config            — 登录方式配置
 *   POST /login/sms-code          — 发送短信验证码
 *   POST /login/sms               — 验证码登录
 *   POST /login/password          — 密码登录
 *   GET  /login/wechat/authorize  — 获取微信扫码授权地址（真实 / 演示降级）
 *   GET  /login/wechat/callback   — 微信 OAuth 回调（node 端换票 + 拉真实用户信息）
 *   POST /login/wechat            — 微信登录（redirect 模式，传 code 换用户信息）
 *   GET  /login/wecom/authorize   — 获取企业微信扫码授权地址
 *   GET  /login/wecom/callback    — 企业微信 OAuth 回调
 *   POST /login/wecom             — 企业微信登录（redirect 模式）
 *
 * ⭐ 真实打通：微信 / 企业微信走完整的 OAuth 授权码流程。
 *    凭证（appid / secret 等）由 node 端从 .env 读取，不会下发到浏览器。
 *    配置好 WECHAT_APPID/WECHAT_SECRET 或 WECOM_CORPID/WECOM_CORPSECRET 后即真实调用
 *    微信 / 企业微信接口并返回真实用户信息；未配置则自动进入「演示降级」模式。
 */
import type { MockRoute } from './types'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

// ==================== 登录方式配置（演示「可配置」） ====================
const loginConfig = {
  enabledMethods: ['sms', 'password', 'wechat', 'wecom'],
  defaultMethod: 'wecom' as const,
  title: '中国人保财险',
  subtitle: 'PICC 移动展业平台',
}

// ==================== 内存态：短信验证码 ====================
interface SmsRecord {
  code: string
  expireAt: number
}
const smsStore = new Map<string, SmsRecord>()

// ==================== 内存态：图形验证码（密码登录） ====================
interface CaptchaRecord {
  code: string
  expireAt: number
}
const captchaStore = new Map<string, CaptchaRecord>()

// ==================== 内存态：账号密码（让「找回 → 重置 → 登录」闭环） ====================
const pwdStore = new Map<string, string>()

// ============ 生成图形验证码（SVG，纯 node 端渲染，无需额外依赖） ============
const CAPTCHA_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // 去除易混淆字符 0/O/1/I/L
function randomCaptchaText(n = 4): string {
  let s = ''
  for (let i = 0; i < n; i++) s += CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]
  return s
}
function genCaptchaSvg(text: string): string {
  const w = 110
  const h = 40
  const colors = ['#d71920', '#1a5fc4', '#07c160', '#e69000', '#7a3fb5']
  const rc = () => colors[Math.floor(Math.random() * colors.length)]
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
  svg += `<rect width="${w}" height="${h}" fill="#f2f4f7" rx="4"/>`
  // 干扰线
  for (let i = 0; i < 4; i++) {
    svg += `<line x1="${(Math.random() * w).toFixed(1)}" y1="${(Math.random() * h).toFixed(1)}" x2="${(
      Math.random() * w
    ).toFixed(1)}" y2="${(Math.random() * h).toFixed(1)}" stroke="${rc()}" stroke-width="1" opacity="0.4"/>`
  }
  // 字符
  for (let i = 0; i < text.length; i++) {
    const x = 16 + i * 22
    const y = 28 + (Math.random() * 6 - 3)
    const rot = Math.floor(Math.random() * 30 - 15)
    const size = 22 + Math.floor(Math.random() * 4)
    svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="Arial" font-size="${size}" font-weight="bold" fill="${rc()}" transform="rotate(${rot} ${x.toFixed(
      1,
    )} ${y.toFixed(1)})">${text[i]}</text>`
  }
  // 干扰点
  for (let i = 0; i < 14; i++) {
    svg += `<circle cx="${(Math.random() * w).toFixed(1)}" cy="${(Math.random() * h).toFixed(
      1,
    )}" r="${(Math.random() * 1.5 + 0.5).toFixed(1)}" fill="#bbb" opacity="0.5"/>`
  }
  svg += `</svg>`
  return svg
}

// ==================== 工具 ====================
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseBody(req: any): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
  })
}

function genToken(method: string): string {
  return `mock_${method}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildResult(method: string, userInfo: Record<string, any>) {
  return {
    token: genToken(method),
    userInfo,
    method,
    expireAt: Date.now() + 2 * 60 * 60 * 1000,
  }
}

// ==================== 真实 OAuth 凭证（node 端读取，不暴露浏览器） ====================
// 兼容 .env 手动读取（某些环境下 process.env 可能未及时注入）
function loadDotEnv(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const f of ['.env', '.env.development', '.env.local']) {
    const p = path.resolve(process.cwd(), f)
    if (!fs.existsSync(p)) continue
    const txt = fs.readFileSync(p, 'utf-8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (m) {
        let v = m[2].trim()
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1)
        }
        if (!(m[1] in map)) map[m[1]] = v
      }
    }
  }
  return map
}
const dotEnv = loadDotEnv()
function env(...names: string[]): string {
  for (const n of names) {
    if (process.env[n]) return process.env[n] as string
    if (dotEnv[n]) return dotEnv[n]
  }
  return ''
}

const WECHAT_APPID = env('WECHAT_APPID', 'VITE_WECHAT_APPID')
const WECHAT_SECRET = env('WECHAT_SECRET', 'VITE_WECHAT_SECRET')
const WECOM_CORPID = env('WECOM_CORPID', 'VITE_WECOM_CORPID')
const WECOM_CORPSECRET = env('WECOM_CORPSECRET', 'VITE_WECOM_CORPSECRET')
const WECOM_AGENTID = env('WECOM_AGENTID', 'VITE_WECOM_AGENTID')
const OAUTH_REDIRECT_BASE = env('OAUTH_REDIRECT_BASE', 'VITE_OAUTH_REDIRECT_BASE')
const OAUTH_DEV_FALLBACK = env('OAUTH_DEV_FALLBACK', 'VITE_OAUTH_DEV_FALLBACK') !== 'false'

const wechatReal = !!(WECHAT_APPID && WECHAT_SECRET)
const wecomReal = !!(WECOM_CORPID && WECOM_CORPSECRET)

function redirectBase(req: any): string {
  if (OAUTH_REDIRECT_BASE) return OAUTH_REDIRECT_BASE.replace(/\/$/, '')
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  const host = req.headers.host || 'localhost'
  return `${proto}://${host}`
}
function randomState(): string {
  return Math.random().toString(36).slice(2, 10)
}

// ===== node 端 HTTPS GET JSON（真实调用微信 / 企业微信接口） =====
function httpGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (resp) => {
      let raw = ''
      resp.on('data', (c: Buffer) => (raw += c.toString()))
      resp.on('end', () => {
        try {
          const json = JSON.parse(raw)
          if (json.errcode && json.errcode !== 0) {
            reject(new Error(json.errmsg || `微信接口错误(${json.errcode})`))
          } else {
            resolve(json)
          }
        } catch {
          reject(new Error('解析微信响应失败: ' + raw))
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => req.destroy(new Error('微信接口请求超时')))
  })
}

// ===== 真实换票 + 拉取用户信息 =====
async function exchangeWechat(code: string): Promise<Record<string, any>> {
  const tok = await httpGetJson(
    `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APPID}&secret=${WECHAT_SECRET}&code=${code}&grant_type=authorization_code`,
  )
  const u = await httpGetJson(
    `https://api.weixin.qq.com/sns/userinfo?access_token=${tok.access_token}&openid=${tok.openid}&lang=zh_CN`,
  )
  return {
    userId: u.openid,
    name: u.nickname || '微信用户',
    avatar: u.headimgurl,
    openid: u.openid,
    unionid: u.unionid,
    raw: { ...u, _real: true },
  }
}
async function exchangeWecom(code: string): Promise<Record<string, any>> {
  const tok = await httpGetJson(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${WECOM_CORPID}&corpsecret=${WECOM_CORPSECRET}`,
  )
  const info = await httpGetJson(
    `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${tok.access_token}&code=${code}`,
  )
  if (info.userid) {
    const u = await httpGetJson(
      `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${tok.access_token}&userid=${info.userid}`,
    )
    return {
      userId: u.userid,
      name: u.name || info.userid,
      avatar: u.avatar,
      phone: u.mobile,
      dept: Array.isArray(u.department) ? u.department.join(',') : u.department,
      email: u.email,
      openid: info.openid,
      raw: { ...u, _real: true },
    }
  }
  // 非企业成员（仅能拿到 openid）
  return { userId: info.openid, name: '微信用户', openid: info.openid, raw: { ...info, _real: true } }
}

// ===== 演示降级用户（未配置凭证时） =====
function mockWechatUser() {
  return {
    userId: 'wx_dev_' + randomState(),
    name: '微信用户(演示)',
    avatar: '',
    openid: 'oDev_OPENID',
    unionid: 'uDev_UNIONID',
    raw: { _real: false },
  }
}
function mockWecomUser() {
  return {
    userId: 'wecom_dev_' + randomState(),
    name: '企业微信用户(演示)',
    avatar: '',
    phone: '13800001000',
    dept: '展业一部',
    raw: { _real: false },
  }
}

// ===== OAuth 回调页：把结果 postMessage 给 opener 并关闭弹窗 =====
function callbackHtml(result: any, errMsg: string | null): string {
  const payload = errMsg
    ? { type: 'oauth-error', message: errMsg }
    : { type: 'oauth-success', result }
  const tip = errMsg ? '授权失败：' + errMsg : '登录成功，正在关闭…'
  return `<!doctype html><html><head><meta charset="utf-8"><title>授权中</title>
  <style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#333;font-size:15px}</style></head>
  <body><div>${tip}</div>
  <script>
    (function(){
      var data = ${JSON.stringify(payload)};
      var hasOpener = false;
      try { hasOpener = !!(window.opener && !window.opener.closed); } catch(e){}
      if (hasOpener) {
        // 弹窗模式：postMessage 回父窗口并关闭
        try { window.opener.postMessage(data, '*'); } catch(e){}
        setTimeout(function(){ window.close(); }, 900);
      } else {
        // 整页跳转模式（移动端）：结果存 sessionStorage 后跳回登录页
        try { sessionStorage.setItem('oauth_result', JSON.stringify(data)); } catch(e){}
        var back = '/';
        try { back = sessionStorage.getItem('oauth_return') || '/'; } catch(e){}
        location.replace(back);
      }
    })();
  </script></body></html>`
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // 登录方式配置
  {
    url: '/login/config',
    method: 'GET',
    response: {
      code: 200,
      data: loginConfig,
      message: 'ok',
    },
  },

  // 发送短信验证码
  {
    url: '/login/sms-code',
    method: 'POST',
    response: async (req) => {
      await delay(300)
      const body = await parseBody(req)
      const phone = String(body.phone || '')
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return { code: 400, data: null, message: '手机号格式不正确' }
      }
      const code = String(Math.floor(100000 + Math.random() * 900000))
      smsStore.set(phone, { code, expireAt: Date.now() + 5 * 60 * 1000 })
      return { code: 200, data: { sent: true, devCode: code }, message: '验证码已发送' }
    },
  },

  // 验证码登录
  {
    url: '/login/sms',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const body = await parseBody(req)
      const phone = String(body.phone || '')
      const inputCode = String(body.code || '')
      const record = smsStore.get(phone)
      if (!record || record.code !== inputCode) {
        return { code: 400, data: null, message: '验证码错误或已过期' }
      }
      if (record.expireAt < Date.now()) {
        return { code: 400, data: null, message: '验证码已过期，请重新获取' }
      }
      smsStore.delete(phone)
      return { code: 200, data: buildResult('sms', {
        userId: 'U10086', name: '测试用户', phone, dept: '展业一部', role: 'agent',
      }), message: '登录成功' }
    },
  },

  // 获取图形验证码（密码登录前置）
  {
    url: '/login/captcha',
    method: 'GET',
    response: () => {
      const code = randomCaptchaText(4)
      const captchaId = 'cap_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
      captchaStore.set(captchaId, { code, expireAt: Date.now() + 5 * 60 * 1000 })
      return { code: 200, data: { captchaId, svg: genCaptchaSvg(code), devCode: code }, message: 'ok' }
    },
  },

  // 密码登录（需校验图形验证码）
  {
    url: '/login/password',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const body = await parseBody(req)
      const account = String(body.account || '').trim()
      const password = String(body.password || '')
      const captcha = String(body.captcha || '').trim().toUpperCase()
      const captchaId = String(body.captchaId || '')
      // 校验图形验证码
      const cap = captchaStore.get(captchaId)
      if (!cap || cap.expireAt < Date.now()) {
        return { code: 400, data: null, message: '图形验证码已过期，请点击刷新' }
      }
      if (cap.code !== captcha) {
        captchaStore.delete(captchaId)
        return { code: 400, data: null, message: '图形验证码错误' }
      }
      captchaStore.delete(captchaId)
      if (!account || password.length < 6) {
        return { code: 401, data: null, message: '账号或密码错误' }
      }
      // 校验密码（若存在记录，需一致；否则 demo 放行）
      const stored = pwdStore.get(account)
      if (stored && stored !== password) {
        return { code: 401, data: null, message: '账号或密码错误' }
      }
      return { code: 200, data: buildResult('password', {
        userId: 'U10086', name: '测试用户', phone: '13800001000', dept: '展业一部', role: 'agent',
      }), message: '登录成功' }
    },
  },

  // 找回密码：手机号 + 短信验证码 + 新密码
  {
    url: '/login/reset-password',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const body = await parseBody(req)
      const phone = String(body.phone || '')
      const code = String(body.code || '')
      const newPassword = String(body.newPassword || '')
      if (!/^1[3-9]\d{9}$/.test(phone)) {
        return { code: 400, data: null, message: '手机号格式不正确' }
      }
      if (!/^\d{6}$/.test(code)) {
        return { code: 400, data: null, message: '验证码格式不正确' }
      }
      if (!/^\S{8,20}$/.test(newPassword)) {
        return { code: 400, data: null, message: '新密码需为 8-20 位' }
      }
      const record = smsStore.get(phone)
      if (!record || record.code !== code) {
        return { code: 400, data: null, message: '验证码错误或已过期' }
      }
      if (record.expireAt < Date.now()) {
        return { code: 400, data: null, message: '验证码已过期，请重新获取' }
      }
      smsStore.delete(phone)
      pwdStore.set(phone, newPassword)
      return { code: 200, data: { ok: true }, message: '密码已重置，请使用新密码登录' }
    },
  },

  // ===== 微信：获取扫码授权地址 =====
  {
    url: '/login/wechat/authorize',
    method: 'GET',
    response: (req) => {
      const base = redirectBase(req)
      const state = randomState()
      const demo = new URL(req.url || '', 'http://localhost').searchParams.get('demo') === '1'
      console.log('[oauth][wechat] demo=%s wechatReal=%s base=%s', demo, wechatReal, base)
      if (!demo && wechatReal) {
        const redirectUri = encodeURIComponent(`${base}/api/login/wechat/callback`)
        const url =
          `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APPID}` +
          `&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`
        console.log('[oauth][wechat] authorize url:', url)
        console.log('[oauth][wechat] → 需在微信开放平台登记的回调域名:', base)
        return { code: 200, data: { url, real: true }, message: 'ok' }
      }
      if (OAUTH_DEV_FALLBACK) {
        const url = `${base}/api/login/wechat/callback?dev=1&state=${state}`
        console.log('[oauth][wechat] 演示降级 url:', url)
        return { code: 200, data: { url, real: false }, message: 'ok（演示降级）' }
      }
      return { code: 500, data: null, message: '未配置微信登录凭证(WECHAT_APPID/WECHAT_SECRET)' }
    },
  },

  // ===== 微信：OAuth 回调（node 端真实换票 + 拉用户信息） =====
  {
    url: '/login/wechat/callback',
    method: 'GET',
    response: async (req) => {
      const { searchParams } = new URL(req.url || '', 'http://localhost')
      const dev = searchParams.get('dev')
      const code = searchParams.get('code') || ''
      try {
        const userInfo = dev ? mockWechatUser() : await exchangeWechat(code)
        return { __html: callbackHtml(buildResult('wechat', userInfo), null) }
      } catch (e: any) {
        return { __html: callbackHtml(null, e?.message || '微信登录失败') }
      }
    },
  },

  // 微信登录（redirect 模式：携带 code 直接换用户信息）
  {
    url: '/login/wechat',
    method: 'POST',
    response: async (req) => {
      const body = await parseBody(req)
      const code = String(body.code || '')
      if (!code) return { code: 400, data: null, message: '缺少 code' }
      try {
        const userInfo = await exchangeWechat(code)
        return { code: 200, data: buildResult('wechat', userInfo), message: '登录成功' }
      } catch (e: any) {
        return { code: 500, data: null, message: e?.message || '微信登录失败' }
      }
    },
  },

  // ===== 企业微信：获取扫码授权地址 =====
  {
    url: '/login/wecom/authorize',
    method: 'GET',
    response: (req) => {
      const base = redirectBase(req)
      const state = randomState()
      const demo = new URL(req.url || '', 'http://localhost').searchParams.get('demo') === '1'
      console.log('[oauth][wecom] demo=%s wecomReal=%s base=%s', demo, wecomReal, base)
      if (!demo && wecomReal) {
        const redirectUri = encodeURIComponent(`${base}/api/login/wecom/callback`)
        const url =
          `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${WECOM_CORPID}` +
          `&agentid=${WECOM_AGENTID}&redirect_uri=${redirectUri}&state=${state}`
        console.log('[oauth][wecom] authorize url:', url)
        console.log('[oauth][wecom] → 需在企业微信后台登记的回调域名:', base)
        return { code: 200, data: { url, real: true }, message: 'ok' }
      }
      if (OAUTH_DEV_FALLBACK) {
        const url = `${base}/api/login/wecom/callback?dev=1&state=${state}`
        console.log('[oauth][wecom] 演示降级 url:', url)
        return { code: 200, data: { url, real: false }, message: 'ok（演示降级）' }
      }
      return { code: 500, data: null, message: '未配置企业微信凭证(WECOM_CORPID/WECOM_CORPSECRET)' }
    },
  },

  // ===== 企业微信：OAuth 回调（node 端真实换票 + 拉用户信息） =====
  {
    url: '/login/wecom/callback',
    method: 'GET',
    response: async (req) => {
      const { searchParams } = new URL(req.url || '', 'http://localhost')
      const dev = searchParams.get('dev')
      const code = searchParams.get('code') || ''
      try {
        const userInfo = dev ? mockWecomUser() : await exchangeWecom(code)
        return { __html: callbackHtml(buildResult('wecom', userInfo), null) }
      } catch (e: any) {
        return { __html: callbackHtml(null, e?.message || '企业微信登录失败') }
      }
    },
  },

  // 企业微信登录（redirect 模式）
  {
    url: '/login/wecom',
    method: 'POST',
    response: async (req) => {
      const body = await parseBody(req)
      const code = String(body.code || '')
      if (!code) return { code: 400, data: null, message: '缺少 code' }
      try {
        const userInfo = await exchangeWecom(code)
        return { code: 200, data: buildResult('wecom', userInfo), message: '登录成功' }
      } catch (e: any) {
        return { code: 500, data: null, message: e?.message || '企业微信登录失败' }
      }
    },
  },
]

export default routes
