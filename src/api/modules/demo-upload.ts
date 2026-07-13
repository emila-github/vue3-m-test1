import { post, get } from '../request'

// ==================== 上传类型 ====================
export interface UploadParams {
  fileName: string
  base64: string
  type?: 'idcard' | 'image' | 'file' | 'excel'
}

export interface UploadResult {
  url: string
  fileName: string
  /** 原始 base64（上传时回传，便于按需选择保存 base64 而非 url） */
  base64: string
}

export interface ExcelParseResult {
  data: any[][]
}

// ==================== 文件上传 API ====================

/** 通用文件上传（根据 type 自动路由到不同接口） */
export function uploadFile(data: UploadParams) {
  const type = data.type || 'file'
  const endpointMap: Record<string, string> = {
    idcard: '/demo/upload-file/idcard',
    image: '/demo/upload-file/image',
    file: '/demo/upload-file/file',
    excel: '/demo/upload-file/excel',
  }
  const endpoint = endpointMap[type] || endpointMap.file
  return post<UploadResult>(endpoint, data as Record<string, any>)
}

/** 上传 Excel 并解析 */
export function uploadExcel(data: UploadParams) {
  return post<UploadResult>('/demo/upload-file/excel', data as Record<string, any>)
}

/** 解析已上传的 Excel */
export function parseExcel(data: { fileName: string }) {
  return get<ExcelParseResult>('/demo/upload-file/excel/parse', data as Record<string, any>)
}
