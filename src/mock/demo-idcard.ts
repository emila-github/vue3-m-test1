/**
 * 通用上传 + OCR 识别 Mock 路由（合并接口）
 *
 * 接口（带 /demo 前缀，避免与正式项目冲突）：
 *   POST /demo/id-card/upload
 *     - 入参：{ fileName, base64, side? }
 *     - 行为：模拟落盘到 src/assets/demo-upload
 *     - 返回：
 *         side='front' → 人像面：证件号 / 姓名 / 地址 / 出生 / 性别 / 民族
 *         side='back'  → 国徽面：签发机关 / 有效期
 *         无 side（普通图片 / 文件 / 证据）→ 仅返回图片地址 url
 *   一次调用即返回图片地址与识别结果，便于控件直接填充并传给后端。
 */
import type { MockRoute } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { mockIdCardOcr } from '../api/modules/demo-idcard'

const UPLOAD_DIR = path.resolve('src/assets/demo-upload')

/** 确保上传目录存在 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

/** 将 base64 data URI 解码为 Buffer */
function base64ToBuffer(base64: string): { buffer: Buffer; ext: string } {
  const match = base64.match(/^data:(.+?);base64,(.+)$/)
  let mime = 'application/octet-stream'
  let data = base64
  if (match) {
    mime = match[1]!
    data = match[2]!
  }
  const extMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/bmp': '.bmp',
  }
  return { buffer: Buffer.from(data, 'base64'), ext: extMap[mime] || '.jpg' }
}

/** 解析请求体 */
function parseBody(req: any): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: string) => (body += chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve({})
      }
    })
  })
}

/** 模拟落盘，返回可访问的图片/文件 URL */
async function saveAndGetUrl(body: Record<string, any>): Promise<string> {
  ensureUploadDir()
  const { buffer, ext } = base64ToBuffer(body.base64 || '')
  const filename = `idcard-${Date.now()}${ext}`
  const filePath = path.join(UPLOAD_DIR, filename)
  fs.writeFileSync(filePath, buffer)
  console.log('[mock] 已保存:', filePath)
  return `/demo-upload/${filename}`
}

const routes: MockRoute[] = [
  {
    url: '/demo/id-card/upload',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      const fileUrl = await saveAndGetUrl(body)
      await new Promise<void>((r) => setTimeout(r, 1000 + Math.random() * 800))
      // 统一身份证模拟数据生成器（与 api/modules/demo-idcard 单一数据源保持一致），
      // 合并接口一步到位：一次返回图片 url + 全部识别字段
      const side = body.side === 'back' ? 'back' : body.side === 'front' ? 'front' : null
      const data = side
        ? { ...mockIdCardOcr(side), url: fileUrl }
        : { url: fileUrl, ocrStatus: 'success' }
      return { code: 200, data, message: '识别成功' }
    },
  },

  // ===== 异名字段后端（演示 fieldMap 适配不同后端字段名） =====
  {
    url: '/demo/id-card/upload-alt',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      const fileUrl = await saveAndGetUrl(body)
      await new Promise<void>((r) => setTimeout(r, 1000 + Math.random() * 800))
      let data: Record<string, any>
      if (body.side === 'back') {
        data = {
          imgUrl: fileUrl,
          side: 'back',
          issueOrg: '厦门市公安局',
          validPeriod: '2015.01-2035.01',
        }
      } else if (body.side === 'front') {
        data = { imgUrl: fileUrl, side: 'front', idNumber: '350123199001015836', userName: '李四' }
      } else {
        // 普通图片 / 文件：异名后端只返回 imgUrl
        data = { imgUrl: fileUrl, ocrStatus: 'success' }
      }
      return {
        code: 200,
        data,
        message: '识别成功',
      }
    },
  },
]

export default routes
