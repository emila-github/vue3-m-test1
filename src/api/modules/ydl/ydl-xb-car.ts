/**
 * 车险续保管理（ydl 模块，需求文档 §7）
 * 我的续保 GET /xb/xbExtendInfoCar/renewedList（分页 records/total/size）。
 * 反馈提交复用 /xb/xbFeedbackData/add（见 ydl-xb 的 XB_FEEDBACK_API.renewed）。
 * mock 由 src/mock/ydl-xb-car.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet } from './client'

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
