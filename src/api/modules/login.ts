/**
 * 登录相关 API
 *
 * 接口（遵循项目约定，baseURL 为 /api，mock 在 src/mock/login.ts）：
 *   GET  /login/config            — 登录方式配置（可用方式 + 默认方式）
 *   POST /login/sms-code          — 发送短信验证码
 *   POST /login/sms               — 验证码登录
 *   POST /login/password          — 密码登录
 *   GET  /login/wechat/authorize  — 获取微信扫码授权地址（真实 / 演示降级）
 *   GET  /login/wecom/authorize   — 获取企业微信扫码授权地址
 *   POST /login/wechat            — 微信登录（传 code，node 端真实换用户信息）
 *   POST /login/wecom             — 企业微信登录（传 code）
 *
 * 微信 / 企业微信走真实 OAuth：前端拿到 authorize 地址后弹窗扫码，回调由 node 端
 * 用 code 换 token 并拉取真实用户信息（见 src/mock/login.ts）。
 */
import { get, post } from '../request'

export type LoginMethod = 'sms' | 'password' | 'wechat' | 'wecom'

export interface UserInfo {
  userId: string
  name: string
  phone?: string
  dept?: string
  role?: string
  avatar?: string
  /** 微信 openid */
  openid?: string
  /** 微信 unionid */
  unionid?: string
  /** 企业微信邮箱 */
  email?: string
  /** 第三方返回的原始用户信息 */
  raw?: Record<string, any>
}

export interface LoginResult {
  token: string
  userInfo: UserInfo
  method: LoginMethod
  expireAt: number
}

export interface LoginConfig {
  /** 可用的登录方式 */
  enabledMethods: LoginMethod[]
  /** 默认选中的登录方式 */
  defaultMethod: LoginMethod
  /** 登录页标题 */
  title: string
  /** 登录页副标题 */
  subtitle: string
}

export function getLoginConfig() {
  return get<LoginConfig>('/login/config')
}

export function sendSmsCode(phone: string) {
  return post<{ sent: boolean; devCode?: string }>('/login/sms-code', { phone })
}

export function loginBySms(phone: string, code: string) {
  return post<LoginResult>('/login/sms', { phone, code })
}

/** 获取图形验证码（密码登录前置校验） */
export function getCaptcha() {
  return get<{ captchaId: string; svg: string; devCode?: string }>('/login/captcha')
}

/**
 * 密码登录（需同时校验图形验证码）
 * @param captcha    用户输入的验证码
 * @param captchaId  验证码标识（与 getCaptcha 返回对应）
 */
export function loginByPassword(
  account: string,
  password: string,
  captcha: string,
  captchaId: string,
) {
  return post<LoginResult>('/login/password', { account, password, captcha, captchaId })
}

/** 找回密码：手机号 + 短信验证码 + 8-20 位新密码 重置 */
export function resetPassword(phone: string, code: string, newPassword: string) {
  return post<{ ok: boolean }>('/login/reset-password', { phone, code, newPassword })
}

export function loginByWechat(code?: string) {
  return post<LoginResult>('/login/wechat', { code })
}

export function loginByWecom(code?: string) {
  return post<LoginResult>('/login/wecom', { code })
}

/** 微信扫码授权地址（真实或演示降级由后端决定；demo=true 强制演示降级） */
export function getWechatAuthorizeUrl(demo = false) {
  return get<{ url: string; real: boolean }>(`/login/wechat/authorize${demo ? '?demo=1' : ''}`)
}

/** 企业微信扫码授权地址 */
export function getWecomAuthorizeUrl(demo = false) {
  return get<{ url: string; real: boolean }>(`/login/wecom/authorize${demo ? '?demo=1' : ''}`)
}
