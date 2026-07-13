/**
 * 按业务模块拆分 API
 *
 * 目录约定：
 *   src/api/
 *     request.ts   — axios 实例（拦截器 / 通用配置）
 *     types.ts      — 公共类型
 *     modules/      — 按业务拆分的 API
 *       user.ts
 *       ...
 *     index.ts      — 统一导出
 */
export type { ApiResponse, BizError } from './request'
export { get, post, put, del } from './request'
export * from './modules/permission'
export * from './modules/demo-renewal'
export * from './modules/demo-upload'
