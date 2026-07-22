import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ClientOptions, ApiClient } from './types'
import type { PageParams, PageResult } from '../types'
import { defaultPagination } from './adapters'
import { getToken, TOKEN_HEADER } from './token'

/** 业务异常（统一抛出，便于上层 catch 区分） */
export class BizError extends Error {
  code: number
  raw?: any
  constructor(code: number, message: string, raw?: any) {
    super(message)
    this.name = 'BizError'
    this.code = code
    this.raw = raw
  }
}

/**
 * 创建一个 API 客户端。
 *
 * 工厂统一负责：axios 实例、请求/响应拦截器、便捷方法（get/post/put/del）、
 * 分页方法（paginate）。各模块目录只需通过 ClientOptions.adapter 描述「后端长什么样」。
 *
 * @example
 *   // vant（默认）
 *   createClient({ adapter: vantFormat })
 *   // ydl（JeecgBoot）
 *   createClient({ adapter: ydlFormat, pagination: ydlPagination, baseURL: '/ydl-api' })
 */
export function createClient(options: ClientOptions): ApiClient {
  const adapter = options.adapter
  const pagination = options.pagination ?? defaultPagination

  const instance: AxiosInstance = axios.create({
    baseURL: options.baseURL ?? (import.meta.env.VITE_API_BASE_URL as string) ?? '/api',
    timeout: options.timeout ?? 15000,
    headers: { 'Content-Type': 'application/json' },
  })

  // ==================== 请求拦截器 ====================
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (options.withTimestamp !== false) {
      config.params = { ...config.params, t: Date.now() }
    }
    // 注入登录 token：字段名可配置（见 core/token.ts 的 TOKEN_HEADER）
    const token = getToken()
    if (token) {
      config.headers = config.headers ?? {}
      config.headers[TOKEN_HEADER] = token
    }
    options.onRequest?.(config)
    return config
  })

  // ==================== 响应拦截器 ====================
  instance.interceptors.response.use(
    (res: AxiosResponse): any => {
      const raw = res.data

      if (adapter.isSuccess(raw)) {
        return adapter.extractData(raw)
      }

      const code = adapter.extractCode(raw)
      const message = adapter.extractMessage(raw)

      if (code === 401 || code === 403 || code === 510) {
        // 允许单次请求标记 __skipAuthFail：例如登出接口，目标本就是登录页，
        // 无需 onAuthFail 抢跳，避免与本地清理/跳转竞争导致闪烁或错误回跳。
        if (!(res.config as any).__skipAuthFail) {
          options.onAuthFail?.(code)
        }
      }
      return Promise.reject(new BizError(code ?? -1, message, raw))
    },
    (err) => {
      const data = err?.response?.data
      const message =
        data?.message ?? data?.msg ?? err?.message ?? '网络异常'
      return Promise.reject(new BizError(err?.response?.status ?? -1, message, data))
    },
  )

  // ==================== 便捷方法 ====================
  const get = <T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig,
  ): Promise<T> => instance.get(url, { params, ...config }) as any

  const post = <T = any>(
    url: string,
    data?: Record<string, any>,
    config?: AxiosRequestConfig,
  ): Promise<T> => instance.post(url, data, config) as any

  const put = <T = any>(
    url: string,
    data?: Record<string, any>,
    config?: AxiosRequestConfig,
  ): Promise<T> => instance.put(url, data, config) as any

  const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    instance.delete(url, config) as any

  // ==================== 分页方法 ====================
  const paginate = <T = any>(
    url: string,
    pageParams: PageParams,
    config?: AxiosRequestConfig,
  ): Promise<PageResult<T>> =>
    get<any>(url, pagination.toParams(pageParams), config).then((data) =>
      pagination.fromResult(data),
    ) as any

  return { instance, get, post, put, del, paginate }
}
