/**
 * ydl 模块 API 客户端（JeecgBoot 风格格式）。
 *
 * 响应包络：{ success, message, code, result, timestamp }
 * 分页约定：请求 current/size，响应 records/total/current/size/pages
 * 对应设计稿：ls/page.json
 *
 * ydl 模块内的 API 文件统一从此处导入 ydlGet / ydlPost / ydlPaginate 等。
 */
import { createClient } from '../../core/http'
import { ydlFormat, ydlPagination } from '../../core/adapters'

export { ydlFormat, ydlPagination }

/**
 * ydl 后端通用分页返回结构（JeecgBoot 风格 result）。
 * 各业务 API 复用此类型，勿在具体业务文件里重复定义。
 */
export interface YdlPageResult<T> {
  records: T[]
  current: number
  size: number
  total: number
  pages: number
}

export const ydlClient = createClient({
  adapter: ydlFormat,
  pagination: ydlPagination,
  baseURL: (import.meta.env.VITE_YDL_API_BASE_URL as string) || '/ydl-api',
  withTimestamp: true,
})

export const {
  instance: ydlInstance,
  get: ydlGet,
  post: ydlPost,
  put: ydlPut,
  del: ydlDel,
  paginate: ydlPaginate,
} = ydlClient

export default ydlClient
