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
export * from './modules/ydl/client'
export * from './modules/ydl/ydl-my-insurance-source'
export * from './modules/ydl/ydl-my-insurance-detail'
export * from './modules/ydl/dict'
export * from './modules/ydl/ydl-renewal'
export * from './modules/ydl/ydl-statistics'
export { getYdlVisitTrackList } from './modules/ydl/ydl-statistics'
export * from './modules/ydl/ydl-fcdd'
export * from './modules/ydl/ydl-jc'
export * from './modules/ydl/ydl-xb'
export * from './modules/ydl/ydl-xb-car'
export * from './modules/ydl/ydl-lhzj'
export * from './modules/demo-renewal'
export * from './modules/demo-upload'
export * from './modules/demo-claim'
export * from './modules/demo-customer'
export * from './modules/demo-map'
export * from './modules/demo-idcard'
