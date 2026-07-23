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
/**
 * 开发期预置 token（VITE_DEV_TOKEN）。
 * 用于「后端不可用但想跳过登录、直接拿真实 token 联调」的场景：
 * 在 .env.development 配一个真实 token，应用启动时自动写入本地存储。
 * 一旦配置，它即为「强制 token」：setToken 不会覆盖它，getToken 始终返回它，
 * 因此所有请求（含企业微信登录成功后 /cp 走 mock 时）都带 VITE_DEV_TOKEN，
 * 不会被 mock / 真实登录返回的 token 顶替。生产环境不应配置本变量。
 */
const DEV_TOKEN = (import.meta.env.VITE_DEV_TOKEN as string) || ''

/** 读取当前 token（无则返回空串）。预置了 VITE_DEV_TOKEN 时强制返回它，不被登录流程覆盖。 */
export function getToken(): string {
  if (DEV_TOKEN) return DEV_TOKEN
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/** 写入 token（登录成功时调用）。预置了 VITE_DEV_TOKEN 时为 no-op，保留强制 token。 */
export function setToken(token: string): void {
  if (DEV_TOKEN) return
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

/**
 * 预置开发 token：应用启动时调用（见 main.ts）。
 * 仅当配置了 VITE_DEV_TOKEN 且本地当前无 token 时写入，使后续请求自动携带、
 * 跳过登录流程。已登录（本地有 token）时不覆盖。
 */
export function initDevToken(): void {
  if (!DEV_TOKEN) return
  try {
    if (!localStorage.getItem(TOKEN_STORAGE_KEY)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, DEV_TOKEN)
    }
  } catch {
    /* localStorage 不可用时静默降级 */
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
