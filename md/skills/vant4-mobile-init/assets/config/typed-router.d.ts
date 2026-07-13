/* 占位声明：vue-router 5 在首次 pnpm dev / build 时会自动生成真实类型并覆盖本文件。
 * 运行前请勿对 'vue-router/auto-routes' 做类型依赖，dev 后会自动补全。 */
declare module 'vue-router/auto-routes' {
  import type { RouteRecordRaw } from 'vue-router'
  export const routes: RouteRecordRaw[]
  export function handleHotUpdate(router: import('vue-router').Router): void
}
