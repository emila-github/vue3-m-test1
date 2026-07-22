import type { ResponseAdapter, PaginationAdapter } from './types'

/* ============================================================
 * 内置响应适配器 —— 覆盖项目已知的后端格式。
 * 新增模块目录（如未来第三种格式）只需在此追加一个 adapter，
 * 无需改动核心逻辑。
 * ============================================================ */

/**
 * vant 模块默认格式：
 *   { code, data, message }   成功：code === 0 | 200
 */
export const vantFormat: ResponseAdapter = {
  isSuccess: (r) => !!r && (r.code === 0 || r.code === 200),
  extractData: (r) => r?.data,
  extractMessage: (r) => r?.message ?? '请求失败',
  extractCode: (r) => r?.code,
}

/**
 * ydl 模块（JeecgBoot 风格）响应适配器，站点（旧站 / 学幼专区）共用同一套格式。
 *
 * 包络：{ success, message, code, result, timestamp }   业务数据在 result 字段。
 *
 * 旧站有两套成功语义（此处统一兼容）：
 *   - 鉴权类接口（企业微信 getWxUserInfo 等）：{ code: 0, result }
 *   - 业务类接口（登录 / 权限 / 登出）：{ success: true, code: 200, result }
 * 统一把 code===0 || code===200 || success===true 都视为成功。
 *
 * 注意：getWxUserInfo 内层的 result.code==='00' 属业务判定（成功 / 未绑定 / 未注册），
 * 由 composable 在拿到 result 后再判，不要塞进适配器。
 */
export const ydlFormat: ResponseAdapter = {
  isSuccess: (r) => !!r && (r.success === true || r.code === 0 || r.code === 200),
  extractData: (r) => r?.result,
  extractMessage: (r) => r?.message ?? '请求失败',
  extractCode: (r) => r?.code,
}

/* ============================================================
 * 内置分页适配器
 * ============================================================ */

/**
 * ydl 分页约定：
 *   请求：current / size
 *   响应：records / total / current / size / pages
 */
export const ydlPagination: PaginationAdapter = {
  toParams: (p) => ({ current: p.page, size: p.pageSize }),
  fromResult: (raw) => ({
    list: raw?.records ?? [],
    total: raw?.total ?? 0,
    page: raw?.current ?? 1,
    pageSize: raw?.size ?? raw?.pageSize ?? 10,
  }),
}

/**
 * 通用分页（vant 等）：请求与响应同构 { page, pageSize, list, total }。
 * 不传 pagination 时工厂内部使用它作为兜底。
 */
export const defaultPagination: PaginationAdapter = {
  toParams: (p) => ({ ...p }),
  fromResult: (raw) => ({
    list: raw?.list ?? [],
    total: raw?.total ?? 0,
    page: raw?.page ?? 1,
    pageSize: raw?.pageSize ?? 10,
  }),
}
