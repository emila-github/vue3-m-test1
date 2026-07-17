/** 人像面识别结果 */
export interface DemoIdCardOcrFront {
  side: 'front'
  ocrStatus: string
  certNo: string
  name: string
  address: string
  birth: string
  gender: string
  nation: string
}

/** 国徽面识别结果 */
export interface DemoIdCardOcrBack {
  side: 'back'
  ocrStatus: string
  issueOrg: string
  validPeriod: string
}

export type DemoIdCardOcr = DemoIdCardOcrFront | DemoIdCardOcrBack

/** 合并接口响应（code / data / message），与 mock 服务返回结构一致 */
export interface DemoIdCardUploadResponse {
  code: number
  data: DemoIdCardOcr & { url?: string }
  message: string
}

/**
 * 生成统一身份证 OCR 模拟数据（按面返回对应字段，结构稳定可复现）。
 * 与 VantUpload 的 ocrField 配置一一对应：
 *   人像面(front) → certNo（证件号）/ name / address / birth / gender / nation
 *   国徽面(back)  → issueOrg（签发机关）/ validPeriod（有效期）
 * 用作前端联调 / 单测 / 离线演示的单一数据源（无 node 依赖，可进生产包，
 * 也可被 mock 文件直接引用，不会在配置加载期触发 request 的 import.meta.env）。
 * @param side 'front' 人像面 | 'back' 国徽面
 */
export function mockDemoIdCardOcr(side: 'front' | 'back'): DemoIdCardOcr {
  return side === 'front'
    ? {
        side: 'front',
        ocrStatus: 'success',
        certNo: '350123199001015836',
        name: '张三',
        address: '福建省厦门市思明区',
        birth: '1990-01-01',
        gender: '男',
        nation: '汉',
      }
    : {
        side: 'back',
        ocrStatus: 'success',
        issueOrg: '厦门市公安局',
        validPeriod: '2015.01.01-2035.01.01',
      }
}

/**
 * 生成完整「合并接口」响应（含图片地址），模拟后端一次返回 url + 识别结果。
 * 便于在单测 / 离线环境直接构造与真实后端一致的返回体。
 */
export function mockDemoIdCardUploadResponse(
  side: 'front' | 'back',
  fileUrl = 'https://demo.example.com/idcard.png',
): DemoIdCardUploadResponse {
  return { code: 200, data: { ...mockDemoIdCardOcr(side), url: fileUrl }, message: '识别成功' }
}

/** 身份证上传 + OCR 合并接口请求参数 */
export interface DemoIdCardUploadParams {
  /** 文件名 */
  fileName: string
  /** 文件 base64（含 data URI 前缀） */
  base64: string
  /** 上传的面：front 人像面 / back 国徽面（仅 idcard 类型传入，普通图片/文件不传） */
  side?: 'front' | 'back'
}

/**
 * 身份证上传 + OCR 识别（合并接口，一步到位）
 * POST /demo/id-card/upload
 * 上传落盘 → 一次返回图片 url 与全部识别字段（结构见 DemoIdCardOcr）。
 * 返回值为后端 data 对象（含 url），可直接回填 Vant4 表单。
 *
 * 注：request 采用函数内动态 import，避免在「配置加载期」（vite.config → mock 插件图）
 * 触发 request.ts 顶层的 import.meta.env，从而不影响 vite build / dev / vitest 启动。
 */
export async function uploadDemoIdCard(
  data: DemoIdCardUploadParams,
): Promise<DemoIdCardOcr & { url?: string }> {
  const { post } = await import('../request')
  return post<DemoIdCardOcr & { url?: string }>('/demo/id-card/upload', data as Record<string, any>)
}

/**
 * 异名字段后端示例（演示 fieldMap 适配不同后端字段名）
 * POST /demo/id-card/upload-alt
 * 返回字段：imgUrl / idNumber / userName / ...
 */
export async function uploadDemoIdCardAlt(data: DemoIdCardUploadParams): Promise<Record<string, any>> {
  const { post } = await import('../request')
  return post<Record<string, any>>('/demo/id-card/upload-alt', data as Record<string, any>)
}
