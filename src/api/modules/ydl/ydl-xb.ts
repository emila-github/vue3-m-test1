/**
 * 续保管理（非车）模块 API（ydl，需求文档 §6）
 * 我的续保 / 问题项目 / 项目终止 共用 /xb/xbExtendInfo/* 接口族。
 *   - 列表：renewedList / questionList / endList
 *   - 反馈：renewedQuestionInput(问题反馈) / endInput(终止反馈) / questionInput
 * 分页约定：请求 page/pageSize，响应 records/total/size。
 * mock 由 src/mock/ydl-xb.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet, ydlPost } from './client'

/** 续保保单（非车）行（三类列表共用基础字段） */
export interface YdlXbRow {
  id: number | string
  /** 续保/问题/终止 状态，字段名由具体列表决定 */
  renewedStatus?: number
  questionStatus?: number
  endStatus?: number
  comdname: string
  comzname: string
  appliname: string
  policyno: string
  coinsnetpremium: number
  riskcname: string
  enddate: string
  contactsName?: string
  [key: string]: any
}

export interface YdlXbListResult {
  records: YdlXbRow[]
  total: number
  size: number
}

// ==================== 我的续保 ====================
export function getYdlXbRenewedList(params: Record<string, any>) {
  return ydlGet<YdlXbListResult>('/xb/xbExtendInfo/renewedList', params)
}
// ==================== 问题项目 ====================
export function getYdlXbQuestionList(params: Record<string, any>) {
  return ydlGet<YdlXbListResult>('/xb/xbExtendInfo/questionList', params)
}
// ==================== 项目终止 ====================
export function getYdlXbEndList(params: Record<string, any>) {
  return ydlGet<YdlXbListResult>('/xb/xbExtendInfo/endList', params)
}

// ==================== 反馈提交（共用形状，按 type 区分业务） ====================
export function postYdlXbFeedback(
  url: string,
  data: { id: number | string; type?: string; content: string; resolve?: number },
) {
  return ydlPost<{ success: boolean; message: string }>(url, data)
}

export const XB_FEEDBACK_API = {
  /** 问题项目反馈 */
  question: '/xb/xbExtendInfo/questionInput',
  /** 终止项目反馈 */
  end: '/xb/xbExtendInfo/endInput',
  /** 续保反馈（我的续保） */
  renewed: '/xb/xbFeedbackData/add',
}
