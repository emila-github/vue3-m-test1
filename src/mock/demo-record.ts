// 屏幕录屏 - mock 后端
//
// 仅用于本地无后端联调（npm run dev:mock）。真实环境由后端落盘并提供查询接口。
// 上传以 base64(JSON) 形式接收，解码后写入 src/assets/demo-upload/ 并返回可访问 URL。
import fs from 'node:fs'
import path from 'node:path'
import type { MockRoute } from './types'

// 本地定义（mock 运行于 node，避免跨模块类型解析；字段与 @/plugins/record/types 的 ScreenRecordListItem 保持一致）
interface StoredRecord {
  fileId: string
  fileName: string
  url: string
  size: number
  mimeType: string
  durationMs: number
  createdAt: number
  sessionId: string
  title?: string
  bizType?: string
  userId?: string
}

const UPLOAD_DIR = path.resolve('src/assets/demo-upload')

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

function base64ToBuffer(base64: string): { buffer: Buffer; ext: string } {
  const match = base64.match(/^data:(.+?);base64,(.+)$/)
  let mime = 'application/octet-stream'
  let data = base64
  if (match) {
    mime = match[1]!
    data = match[2]!
  }
  const extMap: Record<string, string> = {
    'video/webm': '.webm',
    'video/mp4': '.mp4',
    'video/ogg': '.ogv',
    'video/x-matroska': '.mkv',
  }
  return { buffer: Buffer.from(data, 'base64'), ext: extMap[mime] || '.webm' }
}

function parseBody(req: any): Promise<any> {
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

const records: StoredRecord[] = []

export const screenRecordMockRoutes: MockRoute[] = [
  // 上传一段屏幕录屏
  {
    method: 'POST',
    url: '/demo/screen-record/upload',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const { buffer, ext } = base64ToBuffer(body.base64 || '')
      const timestamp = Date.now()
      const rawName = (body.fileName || `screen-record-${timestamp}`).replace(/[^\w.\-]/g, '_')
      const filename = `${path.parse(rawName).name}-${timestamp}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      const fileUrl = `/demo-upload/${filename}`
      console.log('[mock] 录屏已保存:', filePath, `${(buffer.length / 1024).toFixed(1)}KB`)
      const item: StoredRecord = {
        fileId: `REC${timestamp}`,
        fileName: filename,
        url: fileUrl,
        size: buffer.length,
        mimeType: body.mimeType || 'video/webm',
        durationMs: Number(body.durationMs) || 0,
        createdAt: timestamp,
        sessionId: body.sessionId || '',
        title: body.title,
        bizType: body.bizType,
        userId: body.userId || '',
      }
      records.unshift(item)
      return {
        code: 200,
        data: { url: fileUrl, fileId: item.fileId, fileName: filename, size: buffer.length },
        message: '上传成功',
      }
    },
  },
  // 已上传录屏列表
  {
    method: 'GET',
    url: '/demo/screen-record/list',
    response: (req: any) => {
      const url = new URL(req.url ?? '', 'http://localhost')
      const userId = url.searchParams.get('userId') || ''
      const list = records
        .filter((r) => (userId ? r.userId === userId : true))
        .map((r) => ({ ...r }))
      return { code: 200, data: { list }, message: 'ok' }
    },
  },
  // 表单操作录屏上传（关联表单数据，meta 记录）
  {
    method: 'POST',
    url: '/demo/form-record/upload',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const timestamp = Date.now()
      const fileId = `FREC${timestamp}`

      // 如果有 base64 数据，写入磁盘
      let fileUrl = `/demo-upload/form-record-${timestamp}.webm`
      let size = Number(body.size) || 0
      let mimeType = body.mimeType || 'video/webm'
      let fileName = `form-record-${timestamp}.webm`

      if (body.base64) {
        const { buffer, ext } = base64ToBuffer(body.base64)
        const rawName = (body.fileName || `form-record-${timestamp}`).replace(/[^\w.\-]/g, '_')
        fileName = `${path.parse(rawName).name}-${timestamp}${ext}`
        const filePath = path.join(UPLOAD_DIR, fileName)
        fs.writeFileSync(filePath, buffer)
        fileUrl = `/demo-upload/${fileName}`
        size = buffer.length
        mimeType = body.mimeType || 'video/webm'
        console.log('[mock] 表单录屏已保存:', filePath, `${(buffer.length / 1024).toFixed(1)}KB`)
      }

      const item: StoredRecord = {
        fileId,
        fileName,
        url: fileUrl,
        size,
        mimeType,
        durationMs: Number(body.durationMs) || 0,
        createdAt: timestamp,
        sessionId: body.sessionId || '',
        title: body.title || '表单操作录屏',
        bizType: body.bizType || 'form-operation',
        userId: body.userId || '',
      }
      Object.assign(item, body.formData ? { title: `${body.title || '表单录屏'}（${JSON.stringify(body.formData).slice(0, 40)}...）` } : {})
      records.unshift(item)
      console.log('[mock] 表单录屏已记录:', fileId)
      return {
        code: 200,
        data: { url: fileUrl, fileId: item.fileId, fileName, size },
        message: '表单录屏上传成功',
      }
    },
  },
]
