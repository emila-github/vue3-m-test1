/**
 * 车险续保管理（ydl 模块，需求文档 §7）
 * 我的续保 GET /xb/xbExtendInfoCar/renewedList（分页 records/total/size）。
 * 续保反馈（EditModalFeedback）提交 /xb/xbExtendInfoCar/renewedInput（renewedStart+feedback+dayFlag）。
 * 详情 GET /xb/xbExtendInfoCar/renewedSearchByPolicyNo（需求 §7.1 详情·基本信息 tab）。
 * mock 由 src/mock/ydl-xb-car.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet, ydlPost } from './client'

/** 车险续保保单行 */
export interface YdlXbCarRow {
  id: number | string
  showStatus: number
  comdname: string
  comzname: string
  dutyName: string
  licenseno: string
  frameno: string
  energyflag: number
  appliname: string
  insuredname: string
  coinsnetpremium: number
  startdate: string
  enddate: string
  policyno: string
  endBtnStatus: number
  [key: string]: any
}

/** 列表：GET /xb/xbExtendInfoCar/renewedList */
export function getYdlXbCarRenewedList(params: Record<string, any>) {
  return ydlGet<{ records: YdlXbCarRow[]; total: number; size: number }>(
    '/xb/xbExtendInfoCar/renewedList',
    params,
  )
}

/** 续保反馈回显：GET /xb/xbFeedbackData/getCurrentFeedbackCarData（需求 §7.1 续保反馈，result.feedbackContent / result.dayFlag 决定弹层标题） */
export function getYdlXbCarCurrentFeedback(params: { policyNo: string }) {
  return ydlGet<{ feedbackContent?: string; dayFlag?: number }>(
    '/xb/xbFeedbackData/getCurrentFeedbackCarData',
    params,
  )
}

/** 详情（基本信息 tab）：GET /xb/xbExtendInfoCar/renewedSearchByPolicyNo（需求 §7.1 详情） */
export function getYdlXbCarRenewedSearchByPolicyNo(params: { policyNo: string }) {
  return ydlGet<YdlXbCarRow>('/xb/xbExtendInfoCar/renewedSearchByPolicyNo', params)
}

/** 项目终止提交：POST /xb/xbExtendInfoCar/endInput（权限 RenewedEndInput & endBtnStatus===1） */
export function postYdlXbCarEndInput(data: { id: any; type: string; content: string }) {
  return ydlPost<unknown>('/xb/xbExtendInfoCar/endInput', data)
}

/** 取消终止：POST /xb/xbExtendInfoCar/endPass（参数 { pass:3, id }，权限 RenewedEndInput & endBtnStatus===2） */
export function postYdlXbCarEndPass(params: { pass: number; id: any }) {
  return ydlPost<unknown>('/xb/xbExtendInfoCar/endPass', params)
}

/** 退回业务：POST /xb/xbExtendInfoCar/back（权限 RenewedBack） */
export function postYdlXbCarBack(data: { id: any; content: string }) {
  return ydlPost<unknown>('/xb/xbExtendInfoCar/back', data)
}

/**
 * 续保反馈提交：POST /xb/xbExtendInfoCar/renewedInput（需求 §7.1 EditModalFeedback）
 * 字段：renewedStart(预计签单时间) + feedback + dayFlag。
 */
export function postYdlXbCarRenewedInput(data: {
  id: any
  renewedPolicyNo?: string
  renewedStart?: string
  renewedEnd?: string
  renewedFee?: string | number
  feedback?: string
  /** 续保反馈提交携带（需求 §7.1）：dayFlag>=0 脱保，负=到期前天数 */
  dayFlag?: number
}) {
  return ydlPost<unknown>('/xb/xbExtendInfoCar/renewedInput', data)
}
