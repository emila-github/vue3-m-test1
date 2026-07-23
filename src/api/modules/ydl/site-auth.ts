/**
 * 站点（旧站）登录 / 权限 / 登出 接口定义。
 *
 * 接口契约来自 `md/ydl/站点登录开发文档.md` 与 `md/ydl/getUserPermissionByToken.json`。
 * 所有请求经 siteClient（ydlFormat 适配器 + /site-api 前缀）。
 */
import { siteGet, sitePost, siteWxGet, siteWxPost } from './site-client'

// ==================== 权限数据结构（对齐 getUserPermissionByToken.json） ====================
export interface SiteAuthItem {
  action: string
  describe?: string
  type?: string
  status?: string
}

export interface SiteMenuNode {
  path: string
  name: string
  component?: string
  redirect?: string | null
  hidden?: boolean
  route?: string
  meta?: { title?: string; icon?: string; keepAlive?: boolean }
  children?: SiteMenuNode[]
  id?: string
}

export interface SitePermissionResult {
  allAuth: SiteAuthItem[]
  auth: SiteAuthItem[]
  menu: SiteMenuNode[]
}

/** 企业微信授权地址响应（result 为跳转 URL 字符串） */
export type SiteAuthUrlResult = string

/** 企业微信换 token 响应（内层 result.code 需 composable 再判） */
export interface SiteWxUserInfoResult {
  code: string // 业务码：'00' 成功、'01' 未绑定、'02' 未注册
  token?: string
  socialId?: string
  wxAuthId?: string
  msg?: string
  /**
   * 真实后端在已绑定时通常会把登录用户主表一并返回（JeecgBoot 常见约定），
   * 用于「我的」页回显。字段位置可能内联也可能包在 userInfo 里，composable 兼容两种。
   */
  userInfo?: SiteUserInfo
  realname?: string
  username?: string
  name?: string
  phone?: string
  avatar?: string
  departName?: string
  depart?: string | { departName?: string; departName_dictText?: string }
  post?: string | { name?: string; postName?: string }
}

/**
 * 站点登录用户档案（「我的」页回显来源）。
 * 来自 getWxUserInfo 的内联/内嵌字段，或单独的 getSiteUserInfo 接口。
 * 字段容错：真实后端字段名可能不同，故全部可选。
 */
export interface SiteUserInfo {
  id?: string
  username?: string
  realname?: string
  name?: string
  phone?: string
  avatar?: string
  orgCode?: string
  departName?: string
  depart?: string | { departName?: string; departName_dictText?: string }
  post?: string | { name?: string; postName?: string }
  [key: string]: any
}

// ==================== 企业微信登录（走 wx 根路径，/cp/... 前缀） ====================
export function getAuthUrl(params: { wxAppId: string; redirect: string; getPrivateInfo?: any }) {
  return siteWxGet<SiteAuthUrlResult>('/cp/wxAuth/getAuthUrl', params)
}

export function getWxUserInfo(params: { wxAppId: string; code: string }) {
  return siteWxPost<SiteWxUserInfoResult>('/cp/wxAuth/getWxUserInfo', params)
}

/**
 * 登录后拉取当前登录用户档案（用于「我的」页回显）。
 * 文档中已定义但主流程未使用；真实联调时企业微信登录成功后调用，
 * 携带 X-Access-Token（siteWxClient 自动注入）换取用户主表。
 */
export function getSiteUserInfo(token: string) {
  return siteWxPost<SiteUserInfo>('/cp/wxAuth/getUserInfo', { token })
}

// ==================== 普通登录 ====================
/** 图形验证码：真实后端返回 base64 图（img）；mock 返回字符（code）。两者并存以兼容两种模式 */
export function getCaptchaImg() {
  return siteGet<{ img?: string; code?: string; captchaKey: string }>('/sys/captchaImage')
}

/** 账号密码登录（密码需 md5，旧站约定） */
export function userLogin(data: {
  username: string
  password: string
  captcha: string
  captchaKey: string
  socialId?: string
}) {
  return sitePost<{ token: string }>('/sys/social/wxLogin', data)
}

// ==================== 登录后拉权限 ====================
export function getUserPermissionByToken(token: string) {
  return siteGet<SitePermissionResult>('/sys/permission/getUserPermissionByToken', { token })
}

// ==================== 登出 ====================
// 登出接口标记 __skipAuthFail：登出本就跳登录页，且本地已先清 token，
// 不应再让 onAuthFail 抢跳（避免带错误 redirect 回跳 mine 造成抖动/死循环）。
export function siteLogout() {
  return sitePost<any>('/sys/logout', {}, { __skipAuthFail: true } as Record<string, any>)
}
