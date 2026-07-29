/**
 * 数据统计模块 API（ydl，JeecgBoot 风格）
 *
 * 对应需求文档 §3 数据统计模块：
 *   - 3.1 数据汇总   GET /data/mainPageData/mainPage
 *   - 3.2 跟踪统计   GET /data/mainPageData/trackSummary
 *   - 3.3 劳效统计   GET /data/mainPageData/getUserSummary
 *
 * 三类均为「机构维度统计」，返回**数组**（首行 index=0 为合计行），不分页。
 * mock 由 src/mock/ydl-statistics.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet } from './client'

// ==================== 公共查询条件 ====================
/** 数据统计通用查询条件（机构树 / 统计时间 / 渠道 / 标签） */
export interface YdlStatQuery {
  /** 分支公司（机构树叶子 orgCode；空=全部） */
  orgCode?: string
  /** 统计时间起 YYYY-MM-DD */
  begin?: string
  /** 统计时间止 YYYY-MM-DD */
  end?: string
  /** 归属渠道（字典 source_channel 的 value） */
  sourceChannel?: string
  /** 保源标签（isLabelTypePullDownNode 的 id） */
  labelName?: string
}

// ==================== 3.1 数据汇总 ====================
/** 数据汇总行（机构维度，首行为合计） */
export interface YdlAnalysisRow {
  departName: string
  newCount: number
  visitCount: number
  doorVisitCount: number
  commentCount: number
  commentCountPercent: string
  successCount: number
  policyFee: number
  noAddDay: number
  totalCount: number
  distributeCount: number
  distributeCountPercent: string
  visitSourceCount: number
  visitSourceCountPercent: string
  trackCount: number
}

/** 数据汇总：GET /data/mainPageData/mainPage */
export function getYdlAnalysis(params: YdlStatQuery) {
  return ydlGet<YdlAnalysisRow[]>('/data/mainPageData/mainPage', params)
}

// ==================== 3.3 劳效统计 ====================
/** 劳效统计行（机构维度，首行为合计） */
export interface YdlUserSummaryRow {
  departName: string
  visitCount: number
  memberCount: number
  visitMemberCount: number
  memberVisitCountPercent: string
  visitPerUser: number
  visitSourceCount: number
  successCount: number
  visitSuccessPercent: string
  policyCount: number
  policyCountPerUser: number
  policyFee: number
  policyFeePerUser: number
}

/** 劳效统计：GET /data/mainPageData/getUserSummary */
export function getYdlUserSummary(params: YdlStatQuery) {
  return ydlGet<YdlUserSummaryRow[]>('/data/mainPageData/getUserSummary', params)
}

// ==================== 3.2 跟踪统计 ====================
/** 跟踪统计行（机构维度，首行为合计；渠道拆分字段以后端为准，用宽松类型） */
export interface YdlTrackSummaryRow {
  departName: string
  newCount?: number
  visitCount?: number
  doorVisitCount?: number
  commentCount?: number
  commentCountPercent?: string
  successCount?: number
  policyFee?: number
  [key: string]: any
}

/** 跟踪统计：GET /data/mainPageData/trackSummary */
export function getYdlTrackSummary(params: YdlStatQuery) {
  return ydlGet<YdlTrackSummaryRow[]>('/data/mainPageData/trackSummary', params)
}

// ==================== 3.4 拜访明细 ====================
/** 拜访明细行（字段众多，宽松类型 + 关键字段显式声明） */
export interface YdlVisitTrackRow {
  id: number
  parentOrg: string
  createOrg: string
  customerName: string
  customerAddress: string
  contactsName: string
  contactsPhone: string
  industryName: string
  distributeTime: string
  realName: string
  mriskTypeName: string
  yriskTypeName: string
  visitTime: string
  createTime: string
  visitTypeCode: number | string
  visitProcess: number | string
  customerProjectName: string
  planDate: string
  planAmount: number
  remark: string
  reviewer: string
  comments: string
  commentsLv: number | string
  upFlag: string
  upContent: string
  nextVisitTime: string
  updateTime: string
  labelName: string
  [key: string]: any
}

/** 拜访明细：GET /data/visitTracks/queryVisitAllList（分页，range → begin/end） */
export function getYdlVisitTrackList(params: Record<string, any>) {
  const q = { ...params }
  const range = q.visitTimeRange as string[] | undefined
  delete q.visitTimeRange
  const [b, e] = range || []
  if (b) q.visitTime_begin = b
  if (e) q.visitTime_end = e
  return ydlGet<{ records: YdlVisitTrackRow[]; total: number; size: number }>(
    '/data/visitTracks/queryVisitAllList',
    q,
  )
}

/** 拜访明细导出推送：GET /data/visitTracks/exportXlsNewWx（后端推送，非直接下载） */
export function exportYdlVisitTracks(params: Record<string, any>) {
  const q = { ...params }
  const range = q.visitTimeRange as string[] | undefined
  delete q.visitTimeRange
  const [b, e] = range || []
  if (b) q.visitTime_begin = b
  if (e) q.visitTime_end = e
  return ydlGet<{ success: boolean; message: string }>('/data/visitTracks/exportXlsNewWx', q)
}

/** 拜访汇总推送：GET /data/visitTracks/exportXlsWx（拜访汇总页的结果推送） */
export function exportYdlVisitTracksWx(params: Record<string, any>) {
  return ydlGet<{ success: boolean; message: string }>('/data/visitTracks/exportXlsWx', params)
}

// ==================== 3.5 签单明细 ====================
/** 签单明细行 */
export interface YdlPolicySummaryRow {
  id: number
  parentName: string
  departName: string
  taskUserRealName: string
  customerName: string
  policyNo: string
  renewFlag: number
  policyFee: number
  createTime: string
  bgnDate: string
  applicantName: string
  insuredName: string
  isCustomerMatch: number
  [key: string]: any
}

/** 签单明细：GET /data/mainPageData/policySummary（分页） */
export function getYdlPolicySummary(params: Record<string, any>) {
  return ydlGet<{ records: YdlPolicySummaryRow[]; total: number; size: number }>(
    '/data/mainPageData/policySummary',
    params,
  )
}

/** 签单明细导出推送：GET /data/mainPageData/policySummaryExportWx */
export function exportYdlPolicySummary(params: Record<string, any>) {
  return ydlGet<{ success: boolean; message: string }>(
    '/data/mainPageData/policySummaryExportWx',
    params,
  )
}
