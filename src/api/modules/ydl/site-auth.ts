/**
 * 站点（旧站）登录 / 权限 / 登出 接口定义。
 *
 * 接口契约来自 `md/ydl/站点登录开发文档.md` 与 `md/ydl/getUserPermissionByToken.json`。
 * 所有请求经 siteClient（ydlFormat 适配器 + /site-api 前缀）。
 */
import { siteGet, sitePost } from './site-client'

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
}

// ==================== 企业微信登录 ====================
export function getAuthUrl(params: { wxAppId: string; redirect: string; getPrivateInfo?: any }) {
  return siteGet<SiteAuthUrlResult>('/cp/wxAuth/getAuthUrl', params)
}

export function getWxUserInfo(params: { wxAppId: string; code: string }) {
  return sitePost<SiteWxUserInfoResult>('/cp/wxAuth/getWxUserInfo', params)
}

// ==================== 普通登录 ====================
/** 图形验证码（base64 + 缓存 key） */
export function getCaptchaImg() {
  return siteGet<{ img: string; captchaKey: string }>('/sys/captchaImage')
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
