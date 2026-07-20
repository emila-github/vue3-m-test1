/** API 层公共类型 */

/** 分页请求参数（通用约定，各后端差异由 PaginationAdapter 转换） */
export interface PageParams {
  page: number
  pageSize: number
}

/** 分页响应（通用约定，所有模块统一返回此结构） */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * vant 默认响应包络类型。
 * 注意：其它模块（如 ydl）的后端包络不同，请勿在通用层强依赖此结构，
 * 解析逻辑走各自 ResponseAdapter。
 */
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}
