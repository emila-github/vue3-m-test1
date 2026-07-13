/**
 * Mock 路由定义
 *
 * 新增接口只需在 src/mock/ 下新建文件，导出一个 routes 数组即可。
 * 无需修改 vite.config.ts。
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

export interface MockRoute {
  /** 匹配 URL（支持 startsWith） */
  url: string
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 响应数据，也可以是函数 (req) => data */
  response:
    | Record<string, any>
    | ((req: IncomingMessage) => Record<string, any> | Promise<Record<string, any>>)
}
