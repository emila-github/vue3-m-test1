/**
 * Mock 统一入口
 *
 * 新增 mock：
 *   1. 在 src/mock/ 下新建文件，export default routes 即可
 *   2. 在本文件底部添加静态 import 并合并到 allRoutes
 *   3. 无需修改 vite.config.ts
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MockRoute } from './types'
import type { Plugin } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

import permissionRoutes from './permission'
import uploadRoutes from './demo-upload'
import renewalRoutes from './demo-renewal'

// ===== 上传文件目录（相对于项目根目录，demo 前缀避免与正式项目冲突） =====
const UPLOAD_DIR = path.resolve('src/assets/demo-upload')
const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
}

// ===== 合并所有 mock 路由（新增文件后在这里加 import 并展开） =====
const allRoutes: MockRoute[] = [...permissionRoutes, ...uploadRoutes, ...renewalRoutes]

// ===== 匹配并返回响应 =====
function matchRoute(url: string, method: string | undefined) {
  // 去除 query 参数
  const path = url.split('?')[0]!
  // 选出所有方法一致且路径以 route.url 开头的候选
  const candidates = allRoutes.filter((r) => r.method === method && path.startsWith(r.url))
  if (candidates.length === 0) return undefined
  // 按 URL 长度降序：最长（最具体）的优先 → 子路由不会被父路由吞掉
  candidates.sort((a, b) => b.url.length - a.url.length)
  return candidates[0]
}

async function handleMock(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const { url, method } = req
  if (!url) return false

  const route = matchRoute(url, method)
  if (!route) return false

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  const data = typeof route.response === 'function' ? await route.response(req) : route.response
  res.end(JSON.stringify(data))
  return true
}

// ===== Vite 插件 =====
export function mockPlugin(): Plugin {
  return {
    name: 'mock-api',
    configureServer(server) {
      console.log('[mock] 插件已加载，共 %d 条路由', allRoutes.length)
      allRoutes.forEach((r) => console.log('  %s %s', r.method, r.url))

      // ===== 静态文件服务：映射 /demo-upload/xxx → src/assets/demo-upload/xxx =====
      server.middlewares.use('/demo-upload', (req, res, next) => {
        const filePath = path.join(UPLOAD_DIR, req.url!)
        // 安全检查：防止路径穿越
        if (!filePath.startsWith(UPLOAD_DIR)) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }
        try {
          const stat = fs.statSync(filePath)
          if (stat.isFile()) {
            const ext = path.extname(filePath).toLowerCase()
            res.setHeader('Content-Type', MIME_MAP[ext] || 'application/octet-stream')
            res.setHeader('Content-Length', stat.size)
            res.setHeader('Cache-Control', 'public, max-age=31536000')
            fs.createReadStream(filePath).pipe(res)
            return
          }
        } catch {
          // 文件不存在，放行到下一个中间件
        }
        next()
      })

      server.middlewares.use('/api', async (req, res, next) => {
        try {
          console.log('[mock] 收到请求: %s %s', req.method, req.url)
          const matched = await handleMock(req, res)
          if (matched) {
            console.log('[mock] ✅ 已拦截 %s %s', req.method, req.url)
          } else {
            console.log('[mock] ❌ 未匹配 %s %s，放行', req.method, req.url)
            next()
          }
        } catch {
          next()
        }
      })
    },
  }
}
