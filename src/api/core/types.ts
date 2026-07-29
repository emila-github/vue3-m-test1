import type { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import type { PageParams, PageResult } from '../types'

/**
 * 响应适配器：把「任意后端响应包络」统一拆成「业务数据」。
 * 不同模块目录（vant / ydl / 未来新模块）的后端格式不同，
 * 只需提供各自的 adapter，其余逻辑（拦截器、便捷方法）完全通用。
 */
export interface ResponseAdapter {
  /** 是否业务成功 */
  isSuccess: (raw: any) => boolean
  /** 从原始响应中取出业务数据（可能嵌套在 data / result 等字段） */
  extractData: (raw: any) => any
  /** 取出错误提示文案 */
  extractMessage: (raw: any) => string
  /** 取出业务 code（用于 401/403 等特殊处理） */
  extractCode: (raw: any) => number | undefined
}

/**
 * 分页适配器：通用 PageParams / PageResult  <->  后端实际分页结构。
 * 入参：把通用 { page, pageSize } 转成后端要的 { current, size } 等；
 * 出参：把后端返回的 records/total/current 等转回通用 { list, total, page, pageSize }。
 */
export interface PaginationAdapter {
  toParams: (p: PageParams) => Record<string, any>
  fromResult: (raw: any) => PageResult<any>
}

/** 创建一个 API 客户端所需的全部配置 */
export interface ClientOptions {
  /** 响应适配器（必填，决定如何解析后端包络） */
  adapter: ResponseAdapter
  /** 分页适配器（可选；不填则按通用 {page,pageSize,list,total} 处理） */
  pagination?: PaginationAdapter
  /** 基础路径；缺省取 VITE_API_BASE_URL，再缺省 /api */
  baseURL?: string
  /** 超时 ms，默认 15000 */
  timeout?: number
  /** 是否自动追加 t 时间戳防缓存，默认 true */
  withTimestamp?: boolean
  /** 请求前钩子（如注入 token / 租户号） */
  onRequest?: (config: InternalAxiosRequestConfig) => void
  /** 鉴权失败（401/403）钩子，默认仅 console.warn */
  onAuthFail?: (code: number) => void
}

/** 一个 API 客户端对外暴露的方法集合 */
export interface ApiClient {
  instance: AxiosInstance
  get: <T = any>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig,
  ) => Promise<T>
  post: <T = any>(
    url: string,
    data?: Record<string, any>,
    config?: AxiosRequestConfig,
  ) => Promise<T>
  put: <T = any>(url: string, data?: Record<string, any>, config?: AxiosRequestConfig) => Promise<T>
  del: <T = any>(url: string, config?: AxiosRequestConfig) => Promise<T>
  /** 分页请求，自动按 pagination adapter 转换出入参，返回通用 PageResult<T> */
  paginate: <T = any>(
    url: string,
    pageParams: PageParams,
    config?: AxiosRequestConfig,
  ) => Promise<PageResult<T>>
}
