import { post, get } from '../request'

// ==================== 上传类型 ====================
export interface DemoUploadParams {
  fileName: string
  base64: string
  type?: 'idcard' | 'image' | 'file' | 'excel'
}

export interface DemoUploadResult {
  url: string
  fileName: string
  /** 原始 base64（上传时回传，便于按需选择保存 base64 而非 url） */
  base64: string
}

export interface DemoExcelParseResult {
  data: any[][]
}

// ==================== 文件上传 API ====================

/** 通用文件上传（根据 type 自动路由到不同接口） */
export function uploadDemoFile(data: DemoUploadParams) {
  const type = data.type || 'file'
  const endpointMap: Record<string, string> = {
    idcard: '/demo/upload-file/idcard',
    image: '/demo/upload-file/image',
    file: '/demo/upload-file/file',
    excel: '/demo/upload-file/excel',
  }
  const endpoint = endpointMap[type] ?? (endpointMap.file as string)
  return post<DemoUploadResult>(endpoint, data as Record<string, any>)
}

/** 上传 Excel 并解析 */
export function uploadDemoExcel(data: DemoUploadParams) {
  return post<DemoUploadResult>('/demo/upload-file/excel', data as Record<string, any>)
}

/** 解析已上传的 Excel */
export function parseDemoExcel(data: { fileName: string }) {
  return get<DemoExcelParseResult>('/demo/upload-file/excel/parse', data as Record<string, any>)
}

/**
 * 异名后端上传（演示 fieldMap 适配）：请求字段名按后端要求定制为 fileData / name，
 * 响应字段名为 imgUrl / fileId / fileName。配合组件的 fieldMap 使用。
 */
export function uploadDemoFileAlt(data: { name: string; fileData: string }) {
  return post<DemoUploadResult>('/demo/upload-file/alt', data as Record<string, any>)
}
