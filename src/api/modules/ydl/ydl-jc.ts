/**
 * 千万级企业决策（ydl 模块，需求文档 §5）
 * 客户渗透率 GET /policy/jcEnterpriseItem/list
 * 新续企业增量保费 GET /policy/jcEnterpriseRisk/list
 * 均为「一次全量」：reporttype(comdcode/reportdate/reporttype)，返回 records（不分页）。
 * mock 由 src/mock/ydl-jc.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet } from './client'

export interface YdlJcQuery {
  /** 分支公司（机构树 orgCode；空=全部） */
  comdcode?: string
  /** 报告日期 YYYYMM */
  reportdate?: string
  /** 产品线：全量 / 商团 */
  reporttype?: string
}

/** 客户渗透率行 */
export interface YdlJcItemRow {
  comzname: string
  enterCount: number
  enterRateHasbf: number
  enterRateHasbfFc: number
  enterRateHasbfTwo: number
  enterRateHasbfTwoFc: number
  enterCountHasbf: number
  [key: string]: any
}

/** 新续企业增量保费行 */
export interface YdlJcRiskRow {
  comzname: string
  newEnterCount: number
  renewEnterCount: number
  newPolicyFee: number
  renewPolicyFee: number
  incrementFee: number
  [key: string]: any
}

/** 客户渗透率：GET /policy/jcEnterpriseItem/list */
export function getYdlJcEnterpriseItem(params: YdlJcQuery) {
  return ydlGet<YdlJcItemRow[]>('/policy/jcEnterpriseItem/list', params)
}

/** 新续企业增量保费：GET /policy/jcEnterpriseRisk/list */
export function getYdlJcEnterpriseRisk(params: YdlJcQuery) {
  return ydlGet<YdlJcRiskRow[]>('/policy/jcEnterpriseRisk/list', params)
}
