import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

/** 统一响应格式 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

/** 业务异常 */
export class BizError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'BizError'
    this.code = code
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ==================== 请求拦截器 ====================
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // 自动追加时间戳（防缓存）
  config.params = { ...config.params, t: Date.now() }

  console.log(
    '[axios] → %s %s',
    config.method?.toUpperCase(),
    (config.baseURL ?? '') + (config.url ?? ''),
  )
  return config
})

// ==================== 响应拦截器 ====================
instance.interceptors.response.use(
  (res: AxiosResponse<ApiResponse>): any => {
    console.log(
      '[axios] ← %s %s | status=%d | body=',
      res.config.method?.toUpperCase(),
      res.config.url,
      res.status,
      res.data,
    )
    const { code, data, message } = res.data

    // 业务成功
    if (code === 0 || code === 200) return data

    // 业务异常
    switch (code) {
      case 401:
        console.warn('[401] 未登录')
        break
      case 403:
        console.warn('[403] 无权限')
        break
    }

    return Promise.reject(new BizError(code!, message || '请求失败'))
  },
  (err) => {
    const msg = err?.response?.data?.message || err.message || '网络异常'
    console.error('[axios] ✗ %s | %s', err?.response?.status || 'NETWORK', msg)
    return Promise.reject(err)
  },
)

// ==================== 便捷方法 ====================
export function get<T = any>(
  url: string,
  params?: Record<string, any>,
  config?: AxiosRequestConfig,
): Promise<T> {
  return instance.get(url, { params, ...config }) as any
}

export function post<T = any>(
  url: string,
  data?: Record<string, any>,
  config?: AxiosRequestConfig,
): Promise<T> {
  return instance.post(url, data, config) as any
}

export function put<T = any>(
  url: string,
  data?: Record<string, any>,
  config?: AxiosRequestConfig,
): Promise<T> {
  return instance.put(url, data, config) as any
}

export function del<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return instance.delete(url, config) as any
}

export default instance
