/**
 * 保险报案表单（Claim）API 模块
 *
 * 主题：保险报案单的详情查询（编辑回填）/ 新增 / 编辑。
 * 请求经 /api 前缀由 src/mock/demo-claim.ts 拦截，无需真实后端。
 * 路径统一加 /demo 前缀，避免与正式项目接口冲突。
 */
import { get, post, put } from '../request'

// ==================== 数据模型 ====================

/** 报案单完整数据（详情 / 提交表单共用） */
export interface Claim {
  id?: number
  // 报案人信息
  reporterName: string
  phone: string
  gender: string
  idCard: string
  relationship: string | number
  // 保单信息
  policyNo: string
  insurer: string | number
  insuranceType: string | number
  extraCoverage: Array<string | number>
  effectiveDate: string
  // 出险信息
  accidentCause: string | number
  accidentDate: string
  accidentTime: string
  region: string | number
  hospital: string | number
  accidentType: Array<string | number>
  isHospitalized: boolean
  injuredCount: number
  severity: number
  lossItems: Array<string | number>
  description: string
  agree: boolean
  // 出险地点（定位打卡）
  checkin: Record<string, any> | null
  // 资料上传
  idCardFront: string
  idCardBack: string
  driverLicense: string
  medicalRecord: string
  invoice: string[]
}

// ==================== API 函数 ====================

/** 报案单详情（编辑回填），默认取种子数据 id=1 */
export function getClaimDetail(id = 1) {
  return get<Claim>('/demo/claim', { id } as Record<string, any>)
}

/** 新增报案单 */
export function createClaim(data: Claim) {
  return post<Claim>('/demo/claim', data as unknown as Record<string, any>)
}

/** 编辑报案单（表单自带 id） */
export function updateClaim(data: Claim) {
  return put<Claim>('/demo/claim', data as unknown as Record<string, any>)
}
