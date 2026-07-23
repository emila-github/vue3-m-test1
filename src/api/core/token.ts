/**
 * 登录 token / 用户信息 存取 + 请求头字段名（可配置）
 * ---------------------------------------------------------------
 * - 请求头字段名：VITE_TOKEN_HEADER（默认 X-Access-Token）
 * - 本地存储 key：  VITE_TOKEN_STORAGE_KEY（默认 app_token）
 * - 登录成功后由 useLoginCore / useOAuthLogin 写入；
 *   请求拦截器（core/http.ts）读取 token 并注入请求头；
 *   「我的」页读取 userInfo 展示登录用户信息。
 *
 * 这样「带什么请求头字段传 token」完全由环境变量决定，不写死在代码里。
 */
import type { UserInfo } from '../modules/login'

const TOKEN_HEADER = (import.meta.env.VITE_TOKEN_HEADER as string) || 'X-Access-Token'
const TOKEN_STORAGE_KEY = (import.meta.env.VITE_TOKEN_STORAGE_KEY as string) || 'app_token'
/** 用户信息本地存储 key（跟随 token key 派生，避免再加一个环境变量） */
const USER_STORAGE_KEY = `${TOKEN_STORAGE_KEY}_user`

/** 读取当前 token（无则返回空串） */
export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/** 写入 token（登录成功时调用） */
export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

/** 清除 token（登出时调用） */
export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 读取当前登录用户信息（无则返回 null） */
export function getUserInfo(): UserInfo | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

/** 写入登录用户信息（登录成功时调用） */
export function setUserInfo(user: UserInfo): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    /* ignore */
  }
}

/** 清除登录用户信息 */
export function clearUserInfo(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** 是否已登录（有 token 即视为登录态） */
export function isLoggedIn(): boolean {
  return !!getToken()
}

/** 统一登出：清除 token + 用户信息 */
export function clearAuth(): void {
  clearToken()
  clearUserInfo()
}

export { TOKEN_HEADER, TOKEN_STORAGE_KEY, USER_STORAGE_KEY }
