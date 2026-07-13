/**
 * 文件上传 Mock 路由
 *
 * 模拟文件上传到磁盘并返回可访问 URL
 * 文件保存到 src/assets/demo-upload/ 目录（demo 前缀，避免与正式项目冲突）
 */
import type { MockRoute } from './types'
import fs from 'node:fs'
import path from 'node:path'

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
    'image/svg+xml': '.svg',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'text/csv': '.csv',
    'text/plain': '.txt',
  }
  return { buffer: Buffer.from(data, 'base64'), ext: extMap[mime] || '.bin' }
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

/** 模拟 Excel 解析数据 */
function generateMockExcelData(fileName: string): any[][] {
  return [
    ['姓名', '年龄', '部门', '职位', '入职日期'],
    ['张三', 28, '技术部', '前端工程师', '2023-01-15'],
    ['李四', 32, '产品部', '产品经理', '2022-06-20'],
    ['王五', 26, '设计部', 'UI 设计师', '2024-02-10'],
    ['赵六', 35, '市场部', '市场总监', '2020-09-01'],
    ['陈七', 29, '技术部', '后端工程师', '2023-05-18'],
    ['周八', 31, '财务部', '会计', '2021-11-30'],
  ]
}

const routes: MockRoute[] = [
  // ===== 通用文件上传 =====
  {
    url: '/demo/upload-file/file',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const { buffer, ext } = base64ToBuffer(body.base64 || '')
      const timestamp = Date.now()
      const filename = `file-${timestamp}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      const fileUrl = `/demo-upload/${filename}`
      console.log('[mock] 文件已保存:', filePath)
      return {
        code: 200,
        data: { url: fileUrl, fileName: body.fileName, base64: body.base64 },
        message: '上传成功',
      }
    },
  },

  // ===== 图片上传 =====
  {
    url: '/demo/upload-file/image',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const { buffer, ext } = base64ToBuffer(body.base64 || '')
      const timestamp = Date.now()
      const filename = `image-${timestamp}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      const fileUrl = `/demo-upload/${filename}`
      console.log('[mock] 图片已保存:', filePath)
      return {
        code: 200,
        data: { url: fileUrl, fileName: body.fileName, base64: body.base64 },
        message: '上传成功',
      }
    },
  },

  // ===== 身份证上传 =====
  {
    url: '/demo/upload-file/idcard',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const { buffer, ext } = base64ToBuffer(body.base64 || '')
      const timestamp = Date.now()
      const filename = `idcard-${timestamp}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      const fileUrl = `/demo-upload/${filename}`
      console.log('[mock] 身份证已保存:', filePath)
      return {
        code: 200,
        data: { url: fileUrl, fileName: body.fileName, base64: body.base64 },
        message: '上传成功',
      }
    },
  },

  // ===== Excel 上传 =====
  {
    url: '/demo/upload-file/excel',
    method: 'POST',
    response: async (req: any) => {
      const body = await parseBody(req)
      ensureUploadDir()
      const { buffer, ext } = base64ToBuffer(body.base64 || '')
      const timestamp = Date.now()
      const filename = `excel-${timestamp}${ext}`
      const filePath = path.join(UPLOAD_DIR, filename)
      fs.writeFileSync(filePath, buffer)
      const fileUrl = `/demo-upload/${filename}`
      console.log('[mock] Excel 已保存:', filePath)
      return {
        code: 200,
        data: { url: fileUrl, fileName: body.fileName, base64: body.base64 },
        message: '上传成功',
      }
    },
  },

  // ===== Excel 解析（模拟） =====
  {
    url: '/demo/upload-file/excel/parse',
    method: 'GET',
    response: (req: any) => {
      const url = new URL(req.url, 'http://localhost')
      const fileName = url.searchParams.get('fileName') || 'data.xlsx'
      const data = generateMockExcelData(fileName)
      console.log('[mock] Excel 解析:', fileName, `→ ${data.length} 行`)
      return { code: 200, data: { data }, message: '解析成功' }
    },
  },
]

export default routes
