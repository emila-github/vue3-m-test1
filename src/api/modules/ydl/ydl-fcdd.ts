/**
 * 非车待续保跟踪（ydl 工作台模块，需求文档 §4.2）
 *
 * 列表 GET /data/fcddPolicyMain/list（分页 records/total/size）
 * 详情 GET /data/fcddPolicyMain/detail
 * 反馈 POST /data/fcddPolicyMain/feedBack
 *
 * mock 由 src/mock/ydl-fcdd.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet, ydlPost } from './client'

/** 待续保保单行 */
export interface YdlFcddPolicy {
  id: number | string
  policyno: string
  appliname: string
  riskcname: string
  enddate: string
  coinsnetpremium: number
  /** 反馈状态 0未反馈 1已反馈 2跟进中 */
  feedbackflag: number
  /** 保单状态 0待续保 1已续保 2已终止 */
  renewalstatus: number
  [key: string]: any
}

/** 历史反馈记录 */
export interface YdlFcddFeedbackRecord {
  id: number | string
  reason: string
  content: string
  feedbackTime: string
}

/** 列表：GET /data/fcddPolicyMain/list */
export function getYdlFcddList(params: Record<string, any>) {
  return ydlGet<{ records: YdlFcddPolicy[]; total: number; size: number }>(
    '/data/fcddPolicyMain/list',
    params,
  )
}

/** 详情：GET /data/fcddPolicyMain/detail?id= */
export function getYdlFcddDetail(id: number | string) {
  return ydlGet<{ policy: YdlFcddPolicy; feedbackList: YdlFcddFeedbackRecord[] }>(
    '/data/fcddPolicyMain/detail',
    { id },
  )
}

/** 反馈：POST /data/fcddPolicyMain/feedBack */
export function postYdlFcddFeedback(data: {
  id: number | string
  reason: string
  content: string
  expectDate?: string
}) {
  return ydlPost<{ success: boolean; message: string }>('/data/fcddPolicyMain/feedBack', data)
}
