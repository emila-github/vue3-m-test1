// 屏幕录屏 - API 模块
//
// 上传采用 base64(JSON) 方式，与本仓库 mock 后端（src/mock/demo-record.ts）一致；
// 生产环境若文件较大，可改为 FormData(multipart) 直传 OSS/MinIO，替换插件 uploader 即可。
import { post, get } from '@/api/request'
import type { ScreenRecordListItem, ScreenRecordUploadResult } from '@/plugins/record/types'

export interface UploadScreenRecordPayload {
  fileName: string
  /** 完整 data URI：data:<mime>;base64,<data> */
  base64: string
  mimeType: string
  size: number
  durationMs: number
  sessionId: string
  title?: string
  bizType?: string
  bizId?: string
  userId?: string
  userName?: string
}

/** 上传一段屏幕录屏，返回后端可访问地址 */
export async function uploadScreenRecord(payload: UploadScreenRecordPayload) {
  return post<ScreenRecordUploadResult>('/demo/screen-record/upload', payload)
}

/** 查询已上传的录屏列表（按 userId 可选过滤） */
export async function listScreenRecords(userId?: string) {
  return get<{ list: ScreenRecordListItem[] }>('/demo/screen-record/list', userId ? { userId } : {})
}

/** Blob → base64 data string（用于 JSON 上传，兼容本仓库 mock 后端） */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // 直接返回完整 data URI，mock 后端会按 data:<mime>;base64,<data> 解析
      resolve(reader.result as string)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// ---------- 表单操作录屏上传 ----------

export interface UploadFormRecordPayload {
  title: string
  bizType: string
  formData: Record<string, unknown>
  sessionId: string
  durationMs: number
  /** 表单 meta 额外信息 */
  userId?: string
  bizId?: string
}

export interface UploadFormRecordResult {
  url: string
  fileId: string
  fileName: string
  size: number
}

/** 表单操作录屏上传（关联表单数据元信息到后端） */
export async function uploadFormRecord(payload: UploadFormRecordPayload) {
  return post<UploadFormRecordResult>('/demo/form-record/upload', payload)
}
