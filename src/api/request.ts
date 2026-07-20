/**
 * 默认 API 客户端（vant 模块格式：{ code, data, message }）。
 *
 * 通过 core/createClient + vantFormat 构建，导出与旧版完全一致的
 * get/post/put/del/instance/BizError，保证已有 vant 模块零改动。
 *
 * 其它模块目录（src/views/<dir>）的后端格式不同，请各自创建：
 *   src/api/modules/<dir>/client.ts  —— createClient({ adapter, pagination, baseURL })
 * 详见 src/api/README.md
 */
import { createClient } from './core/http'
import { vantFormat } from './core/adapters'

const client = createClient({
  adapter: vantFormat,
  withTimestamp: true,
})

export const instance = client.instance
export const get = client.get
export const post = client.post
export const put = client.put
export const del = client.del

export { BizError } from './core/http'
export type { ApiResponse } from './types'

export default instance
