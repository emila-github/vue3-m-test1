/**
 * 我的保源 —— 详情子功能（活动量 / 销售结果）API 模块 —— ydl（JeecgBoot 风格）
 *
 * 对应需求文档：md/v2/MyInsuranceSource开发文档.md（二、保源详情 §2.2 活动量 / §2.3 销售结果）
 * 请求经 ydlClient（baseURL 默认 /ydl-api）发出，mock 模式下由 src/mock/ydl-my-insurance-active.ts
 * （活动量）与 src/mock/ydl-my-insurance-result.ts（销售结果）分别拦截。
 *
 * 两套数据均以「保源 id（sourceId）」为主键过滤，入口来自 MyInsuranceSource 列表「更多项」跳转。
 *
 * 权限（与 vue2 后端约定一致，mock 已授予）：
 *   活动量   permissionPrefix="visitTracks"，create 后缀映射为 add → visitTracks:add / visitTracks:edit / visitTracks:view / visitTracks:delete
 *   销售结果 permissionPrefix="visitTracks"，create 后缀映射为 result → visitTracks:result（录入）；其余用 freeActions 放开演示
 */
import { ydlGet, ydlPost, ydlPut, type YdlPageResult } from './client'

// ==================== 枚举字典（统一收敛到 src/enums/ydl，见需求文档 §1.6） ====================
export {
  YDL_VISIT_TYPE,
  YDL_VISIT_PROCESS,
  YDL_COMMENT_LEVEL,
  YDL_SALES_RESULT,
  YDL_SALE_TYPE,
  YDL_BUSSINESS_BELONG,
  ydlCommentColor,
} from '@/enums/ydl'
/** 销售结果标签颜色：成功绿 / 失败红 */
export function ydlSalesResultColor(flag: string | undefined | null): string {
  return flag === 'Y' ? '#07c160' : flag === 'N' ? '#ee0a24' : '#c8c9cc'
}

// ==================== 活动量（VisitTrack） ====================

/** 活动量列表项 */
export interface YdlVisitTrack {
  id: string
  /** 所属保源 id */
  sourceId?: string
  /** 业务员 */
  realName: string
  /** 拜访类型 code：0/1/2 */
  visitTypeCode: number
  /** 拜访进程 code：0/1/2/3 */
  visitProcess: number
  /** 拜访时间（YYYY-MM-DD HH:mm:ss） */
  visitTime: string
  /** 更新时间（排序用，文档固定 updateTime desc） */
  updateTime: string
  /** 备注 / 拜访情况 */
  remark: string
  /** 领导点评等级：1/2/3 */
  commentsLv: number
  /** 点评内容 */
  comments: string
  /** 打卡照片地址（visitTypeCode=2 时有效） */
  signInImgUrl: string
  /** 打卡定位地址（visitTypeCode=2 时有效） */
  signInPosAddr: string
  /** 打卡时间（编辑态只读展示，文档 4.1.4） */
  signInTime?: string
  /** 目标险种 code（录入用，回显仅展示用） */
  mriskTypeCode?: string
  /** 业务去向（同业投保时） */
  bussinessBelong?: number
  /** 其他同业投保主体 */
  bussinessBelongOther?: string
  /** 其他主体承保条件 */
  insuranceCondition?: string
  /** 预计签单时间（跟进中时） */
  planDate?: string
  /** 预估保费（跟进中时） */
  planAmount?: number | string
  /** 预估保额（跟进中时） */
  planSumamount?: number | string
  /** 是否可持续跟踪 1/0 */
  continueFlag?: number
  /** 是否上级支持 Y/N */
  upFlag?: string
  /** 上级支持内容 */
  upContent?: string
  /** 拜访对象 */
  targetName?: string
  /** 拜访对象职务 */
  targetPosition?: string
  /** 拜访对象联系方式 */
  targetPhone?: string
  /** 下次拜访时间（点评用） */
  nextVisitTime?: string
  /** 是否本人数据：控制行内编辑/删除显隐 */
  isSelfData: boolean
}

/** 活动量新增 / 编辑 表单（字段严格对应文档 §4.1.4，不含业务员 realName） */
export interface YdlVisitTrackForm {
  id?: string
  sourceId: string
  visitTypeCode: number | null
  visitProcess: number | null
  visitTime: string
  remark: string
  commentsLv: number | null
  comments: string
  mriskTypeCode?: string
  signInImgUrl?: string
  signInPosAddr?: string
  signInTime?: string
  bussinessBelong?: number | null
  bussinessBelongOther?: string
  insuranceCondition?: string
  planDate?: string
  planAmount?: number | string
  planSumamount?: number | string
  continueFlag?: number
  upFlag?: string
  upContent?: string
  targetName?: string
  targetPosition?: string
  targetPhone?: string
  nextVisitTime?: string
}

/** 活动量分页查询条件（sourceId 固定入参，其余由 VantList 注入 page/pageSize） */
export interface YdlVisitTrackQuery {
  sourceId: string
  page?: number
  pageSize?: number
}

/** 活动量分页列表：GET /data/visitTracks/queryVisitList（排序固定 updateTime desc） */
export function getYdlVisitTracks(params: YdlVisitTrackQuery) {
  const { sourceId, page = 1, pageSize = 10 } = params
  return ydlGet<YdlPageResult<YdlVisitTrack>>('/data/visitTracks/queryVisitList', {
    sourceId,
    pageNo: page,
    pageSize,
    column: 'updateTime',
    order: 'desc',
  })
}
/** 活动量回显（编辑/点评/详情）：GET /data/visitTracks/queryById */
export function getYdlVisitTrackById(id: string) {
  return ydlGet<YdlVisitTrack>('/data/visitTracks/queryById', { id })
}
/** 新增活动量：POST /data/visitTracks/add */
export function addYdlVisitTrack(data: YdlVisitTrackForm) {
  return ydlPost('/data/visitTracks/add', data)
}
/** 编辑活动量：PUT /data/visitTracks/edit */
export function updateYdlVisitTrack(data: YdlVisitTrackForm) {
  return ydlPut('/data/visitTracks/edit', data)
}
/** 活动量点评（领导）：PUT /data/visitTracks/comments（仅 comments / commentsLv / nextVisitTime） */
export function updateYdlVisitTrackComments(data: {
  id: string
  comments: string
  commentsLv: number
  nextVisitTime: string
}) {
  return ydlPut('/data/visitTracks/comments', data)
}
/** 删除活动量：POST /data/visitTracks/delete */
export function deleteYdlVisitTrack(id: string | number) {
  return ydlPost('/data/visitTracks/delete', { id })
}

// ==================== 销售结果（Policy / SaleResult） ====================

/** 销售结果列表项 */
export interface YdlSalesResult {
  id: string
  sourceId?: string
  /** 业务员 */
  realName: string
  /** 销售结果：Y=成功 N=失败 */
  saleFlag: string
  /** 销售归属：0=团险 1=个险 2=农险（saleFlag=Y 时有效） */
  saleType: number
  /** 保单号（saleFlag=Y 时有效） */
  policyNo: string
  /** 保费（saleFlag=Y 时有效） */
  policyFee: string
  /** 录入时间 */
  createTime: string
  /** 是否本人数据：控制行内编辑/删除显隐 */
  isSelfData: boolean
}

/** 销售结果新增 / 编辑 表单（saleFlag 恒为 Y，见 4.1.3）。字段严格对应文档：销售归属 / 保单号 / 保费 */
export interface YdlSalesResultForm {
  id?: string
  sourceId: string
  /** 销售结果：恒为 Y（仅成功录入） */
  saleFlag: string
  /** 销售归属（saleType，单选必填） */
  saleType: number | null
  /** 保单号（必填，blur 自动带出保费） */
  policyNo: string
  /** 保费由保单号自动带出（getInsureOrderInfo），只读 */
  policyFee: string
  /** 录入时间由后端/ mock 自动填充，非表单录入项 */
  createTime?: string
}

/** 保单号自动带出信息（录入销售结果时 getInsureOrderInfo 返回） */
export interface YdlInsureOrderInfo {
  policyNo: string
  /** 我方净保费（回填 policyFee） */
  sumnetpremium: number | string
  riskTypeCode?: string
  riskCategoryName?: string
  channelTypeName?: string
  bgnDate?: string
  endDate?: string
  renewFlag?: string
  insuredIdCode?: string
}

/** 销售结果分页查询条件 */
export interface YdlSalesResultQuery {
  sourceId: string
  page?: number
  pageSize?: number
}

/** 销售结果分页列表：GET /data/policyInfo/list（排序固定 createTime desc） */
export function getYdlPolicyInfoList(params: YdlSalesResultQuery) {
  const { sourceId, page = 1, pageSize = 10 } = params
  return ydlGet<YdlPageResult<YdlSalesResult>>('/data/policyInfo/list', {
    sourceId,
    pageNo: page,
    pageSize,
    column: 'createTime',
    order: 'desc',
  })
}
/** 销售结果回显（编辑）：GET /data/policyInfo/queryById */
export function getYdlPolicyInfoById(id: string) {
  return ydlGet<YdlSalesResult>('/data/policyInfo/queryById', { id })
}
/** 保单号自动带出（录入销售结果时，blur 触发）：GET /data/policyInfo/getInsureOrderInfo */
export function getInsureOrderInfo(policyNo: string) {
  return ydlGet<YdlInsureOrderInfo>('/data/policyInfo/getInsureOrderInfo', { policyNo })
}
/** 新增销售结果：POST /data/policyInfo/add */
export function addYdlPolicyInfo(data: YdlSalesResultForm) {
  return ydlPost('/data/policyInfo/add', data)
}
/** 编辑销售结果：PUT /data/policyInfo/edit */
export function updateYdlPolicyInfo(data: YdlSalesResultForm) {
  return ydlPut('/data/policyInfo/edit', data)
}
/** 删除销售结果：POST /data/policyInfo/delete */
export function deleteYdlPolicyInfo(id: string) {
  return ydlPost('/data/policyInfo/delete', { id })
}
