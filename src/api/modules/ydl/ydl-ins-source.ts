/**
 * 我的保源（MyInsuranceSource）API 模块 —— ydl（JeecgBoot 风格）
 *
 * 对应需求文档：md/ydl/MyInsuranceSource开发文档.md
 * 请求经 ydlClient（baseURL 默认 /ydl-api）发出，mock 模式下由 src/mock/ydl-ins-source.ts 拦截。
 *
 * 命名约定：模块内 API 统一以 ydl- 前缀的文件承载，导出函数以 ydl 前缀区分。
 *
 * 后端响应包络：{ success, code, message, result, timestamp }（由 ydlFormat 适配器解包为 result）。
 * 列表 result 为分页对象：{ records, current, size, total, pages }。
 */
import { ydlGet, ydlPost, ydlPut } from './client'

// ==================== 分页返回结构（JeecgBoot） ====================

/** ydl 后端分页结构（result） */
export interface YdlPageResult<T> {
  records: T[]
  current: number
  size: number
  total: number
  pages: number
}

// ==================== 数据模型 ====================

/** 我的保源列表项（result.records 单条）。
 *  productLine / customerLabel 直接以数组形式携带，供 VantList 内置 openEdit 一步回填表单。 */
export interface YdlInsSource {
  id: string
  socialCreditCode: string
  customerName: string
  customerAddress: string
  contactsName: string
  contactsPhone: string
  productLine: string[]
  customerLabel: string[]
  /** 待点评标记：1=待点评 2=新增 */
  waitComments: number
  updateTime: string
}

/** 推荐险种 */
export interface YdlRecommend {
  id: string
  riskyName: string
  fee: string
}

/** 保源标签 */
export interface YdlSourceLabel {
  id: string
  labelName: string
}

/** 保源详情（queryDetailById 返回 result 对象） */
export interface YdlInsSourceDetail {
  socialCreditCode: string
  customerName: string
  customerAddress: string
  industryTypeName: string
  registerCapital: string
  companyPhone: string
  contactsDepartment: string
  contactsPosition: string
  contactsName: string
  contactsPhone: string
  productLineStr: string
  yriskyTypeStr: string
  remark: string
  labelList: YdlSourceLabel[]
  recommends: YdlRecommend[]
}

/** 列表查询条件（与 VantList #filters 插槽字段一一对应） */
export interface YdlInsSourceQuery {
  /** 客户名称模糊搜索（作为 VantList keyword） */
  customerName?: string
  /** 仅本人保源 */
  isSelf?: boolean
  /** 是否近期代办（开启时隐藏时间区间，自动按本周一~本周日） */
  isNear?: boolean
  /** 待点评筛选：1=勾选 0=不勾选 */
  isWaitComments?: number
  /** 更新时间区间 [begin, end]（YYYY-MM-DD），isNear 开启时忽略 */
  updateTimeRange?: string[]
  page?: number
  pageSize?: number
}

// ==================== 枚举字典（dataConfig） ====================

/** 待点评（WAIT_COMMENTS）：1=待点评 2=新增 */
export const YDL_WAIT_COMMENTS: Record<number, string> = {
  1: '待点评',
  2: '新增',
}

/** 取待点评文案（仅 1/2 有值） */
export function ydlWaitCommentsText(v: number | undefined | null): string {
  return v != null ? (YDL_WAIT_COMMENTS[v] ?? '') : ''
}

// ==================== 工具：本周一 ~ 本周日 ====================

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 计算本周一 ~ 本周日（等价 moment().day(1)/day(7)） */
export function ydlThisWeekRange(): { begin: string; end: string } {
  const now = new Date()
  const weekday = now.getDay() || 7 // 周日 0 → 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - weekday + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { begin: fmtDate(monday), end: fmtDate(sunday) }
}

// ==================== API 函数 ====================

/**
 * 我的保源分页列表。
 *
 * 入参来自 VantList / useCrudList（含 query + page/pageSize），
 * 这里统一映射为后端约定的 pageNo/pageSize/column/order + 业务筛选参数；
 * isNear 开启时自动用本周区间覆盖 updateTimeBegin/End。
 * 返回后端分页对象（records/total/size...），由 VantList 的 responseMap 解析。
 */
export function getYdlInsSourceList(params: YdlInsSourceQuery) {
  const {
    page = 1,
    pageSize = 10,
    customerName,
    isSelf,
    isNear,
    isWaitComments,
    updateTimeRange,
  } = params

  const timeRange: { updateTimeBegin?: string; updateTimeEnd?: string } = {}
  if (isNear) {
    const { begin, end } = ydlThisWeekRange()
    timeRange.updateTimeBegin = begin
    timeRange.updateTimeEnd = end
  } else if (Array.isArray(updateTimeRange) && updateTimeRange.length === 2) {
    timeRange.updateTimeBegin = updateTimeRange[0]
    timeRange.updateTimeEnd = updateTimeRange[1]
  }

  return ydlGet<YdlPageResult<YdlInsSource>>('/data/insuraceSourceDistribution/querySelf', {
    pageNo: page,
    pageSize,
    column: 'updateTime',
    order: 'desc',
    customerName: customerName || undefined,
    isSelf: isSelf ? true : undefined,
    isNear: isNear ? true : undefined,
    isWaitComments: isWaitComments ? 1 : undefined,
    ...timeRange,
  })
}

/** 保源详情（按 id 查询完整信息） */
export function getYdlInsSourceDetail(id: string) {
  return ydlGet<YdlInsSourceDetail>('/data/insuraceSource/queryDetailById', { id })
}

// ==================== 新增 / 编辑 保源（MyInsuranceSourceAdd） ====================

/** 下拉选项（产品线下拉 / 标签下拉） */
export interface YdlOption {
  id: string
  name: string
}

/** 客户名称重名检测：返回疑似重复的已收录列表 */
export interface YdlDuplicateItem {
  departName: string
  taskUserRealName: string
}

/** 新增 / 编辑 表单（产品线 / 标签为数组，供 VantSelectMultipleField 直接绑定；
 *  提交时由 add / update 适配器拼成后端所需的逗号字符串） */
export interface YdlInsSourceForm {
  id?: string
  socialCreditCode: string
  customerName: string
  customerAddress: string
  contactsName: string
  contactsPhone: string
  productLine: string[]
  customerLabel: string[]
}

/** 新增 / 编辑 提交体（产品线 / 标签为逗号拼接字符串，与后端约定一致） */
export interface YdlInsSourceSubmit {
  id?: string
  socialCreditCode: string
  customerName: string
  customerAddress: string
  contactsName: string
  contactsPhone: string
  productLine: string
  customerLabel: string
}

/** 产品线下拉 */
export function getYdlProductLineTypes() {
  return ydlGet<YdlOption[]>('/arch/productLineType/pullDown')
}

/** 保源标签下拉 */
export function getYdlLabelTypePullDownAll() {
  return ydlGet<YdlOption[]>('/data/labelType/pullDownAll')
}

/** 客户名称重名检测（失焦触发）：返回疑似重复列表，非空即疑似重复 */
export function checkYdlInsSourceName(customerName: string) {
  return ydlGet<YdlDuplicateItem[]>('/data/insuraceSource/addCheck', { customerName })
}

/** 表单 → 提交体（数组拼成逗号字符串，适配后端） */
function toYdlInsSourceSubmit(d: YdlInsSourceForm): YdlInsSourceSubmit {
  return {
    id: d.id,
    socialCreditCode: d.socialCreditCode,
    customerName: d.customerName,
    customerAddress: d.customerAddress,
    contactsName: d.contactsName,
    contactsPhone: d.contactsPhone,
    productLine: Array.isArray(d.productLine) ? d.productLine.join(',') : (d.productLine || ''),
    customerLabel: Array.isArray(d.customerLabel)
      ? d.customerLabel.join(',')
      : (d.customerLabel || ''),
  }
}

/** 新增保源 */
export function addYdlInsSource(data: YdlInsSourceForm) {
  return ydlPost('/data/insuraceSource/add', toYdlInsSourceSubmit(data))
}

/** 编辑保源 */
export function updateYdlInsSource(data: YdlInsSourceForm) {
  return ydlPut('/data/insuraceSource/edit', toYdlInsSourceSubmit(data))
}

/**
 * 团队校验：当前用户是否属于团队。
 * 返回 false 表示无团队（页面挂载时校验，无团队弹窗提示）。
 */
export function checkYdlUserGroup() {
  return ydlGet<boolean>('/system/sysUserGroup/hasGroup')
}
