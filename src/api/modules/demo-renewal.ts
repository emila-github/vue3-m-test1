/**
 * 保源信息维护（车险续保保源管理）API 模块
 *
 * 主题：车险续保保源（Renewal）的查询 / 新增 / 编辑 / 删除 / 详情 / 承保公司联想
 * 请求经 /api 前缀由 src/mock/demo-renewal.ts 拦截，无需真实后端。
 * 路径统一加 /demo 前缀，避免与正式项目接口冲突。
 */
import { get, post, put, del } from '../request'
import type { PageParams, PageResult } from '../types'

// ==================== 数据模型 ====================

/** 保源（车险续保保源）列表项 */
export interface Renewal {
  id: number
  policyNo: string // 保单号
  applicant: string // 投保人
  plateNo: string // 车牌号
  insurer: string // 承保公司
  region: string // 归属机构（树，叶子节点 value）
  channel: string // 业务渠道
  insuranceTypes: string[] // 险种（多选）
  tags: Array<string | number> // 业务标签（树多选）
  status: string // 保源状态
  isNew: string // 是否新车（新车 / 旧车）
  level: number // 客户等级（1-5）
  premium: number // 保费（元）
  followCount: number // 跟进次数
  expireDate: string // 保单到期日 YYYY-MM-DD
  followMonth: string // 跟进账期 YYYY-MM
  remark: string // 备注
  attach?: string[] // 附件（图片 url 列表）
}

/** 列表查询条件（与 VantList #filters 插槽字段一一对应） */
export interface RenewalQuery {
  keyword?: string // 投保人 / 车牌 / 保单号 模糊
  policyNo?: string // 保单号模糊
  status?: string // 保源状态
  insurer?: string // 承保公司
  region?: string // 归属机构（叶子 value）
  channel?: string // 业务渠道
  insuranceTypes?: string[] // 险种（多选，需全部命中）
  tags?: Array<string | number> // 业务标签（多选，命中其一）
  isNew?: string // 是否新车
  premiumMin?: number | string // 保费下限
  premiumMax?: number | string // 保费上限
  followCountMin?: number // 跟进次数下限
  levelMin?: number // 客户等级下限
  expireRange?: string[] // 到期日区间 [start, end]
  followMonth?: string // 跟进账期 YYYY-MM
  onlyExpiring?: boolean // 仅看临期（到期日 <= 2026-08-31）
  page?: number
  pageSize?: number
}

/** 新增 / 编辑 表单 */
export interface RenewalForm {
  id?: number
  policyNo: string
  applicant: string
  plateNo: string
  insurer: string
  region: string
  channel: string
  insuranceTypes: string[]
  tags: Array<string | number>
  expireDate: string
  premium: number
  level: number
  status: string
  remark: string
  attach?: string[]
}

// ==================== 领域选项 / 树数据 ====================

/** 承保公司可选项（同时供 VantSearchField / VantSearch 联想） */
export const INSURERS = ['人保财险', '平安产险', '太平洋产险', '国寿财险', '中华联合', '大地保险']

/** 业务渠道可选项 */
export const CHANNELS = ['电销', '直销', '4S 店', '代理', '网销']

/** 险种可选项（VantSelectMultipleField） */
export const INSURANCE_TYPE_OPTIONS = [
  { text: '交强险', value: '交强险' },
  { text: '车损险', value: '车损险' },
  { text: '第三者责任险', value: '三者险' },
  { text: '车上人员险', value: '车上人员险' },
  { text: '玻璃单独破碎险', value: '玻璃险' },
  { text: '不计免赔', value: '不计免赔' },
]

/** 保源状态可选项（首条 value='' 表示全部，仅供查询使用） */
export const STATUS_OPTIONS = [
  { text: '全部状态', value: '' },
  { text: '待跟进', value: '待跟进' },
  { text: '已联系', value: '已联系' },
  { text: '已续保', value: '已续保' },
  { text: '已流失', value: '已流失' },
]

/** 归属机构树（VantTreeSelectField，value 为叶子节点） */
export const ORG_TREE = [
  {
    text: '浙江分公司',
    value: 'zj',
    children: [
      { text: '杭州中心支公司', value: 'zj-hz' },
      { text: '宁波中心支公司', value: 'zj-nb' },
      { text: '温州中心支公司', value: 'zj-wz' },
    ],
  },
  {
    text: '江苏分公司',
    value: 'js',
    children: [
      { text: '南京中心支公司', value: 'js-nj' },
      { text: '苏州中心支公司', value: 'js-sz' },
    ],
  },
]

/** 业务标签树（VantTreeTagsField） */
export const TAG_TREE = [
  {
    text: '客户价值',
    value: 'v',
    children: [
      { text: '高价值', value: 'v-high' },
      { text: '潜力客户', value: 'v-mid' },
    ],
  },
  {
    text: '风险等级',
    value: 'r',
    children: [
      { text: '低风险', value: 'r-low' },
      { text: '高风险', value: 'r-high' },
    ],
  },
]

/** 机构 value → 中文名（列表 / 详情回显） */
export const ORG_NAME: Record<string, string> = {
  'zj-hz': '杭州',
  'zj-nb': '宁波',
  'zj-wz': '温州',
  'js-nj': '南京',
  'js-sz': '苏州',
}

/** 初始查询条件（reset 可复位，含全部筛选字段） */
export const DEFAULT_RENEWAL_QUERY: RenewalQuery = {
  keyword: '',
  policyNo: '',
  status: '',
  insurer: '',
  region: '',
  channel: '',
  insuranceTypes: [],
  tags: [],
  isNew: '',
  premiumMin: '',
  premiumMax: 20000,
  followCountMin: 0,
  levelMin: 0,
  expireRange: [],
  followMonth: '',
  onlyExpiring: false,
}

/** 新增表单初始值 */
export const DEFAULT_RENEWAL_FORM: RenewalForm = {
  applicant: '',
  plateNo: '',
  policyNo: '',
  insurer: '',
  region: '',
  channel: '',
  insuranceTypes: [],
  tags: [],
  expireDate: '',
  premium: 2000,
  level: 3,
  status: '待跟进',
  remark: '',
  attach: [],
}

// ==================== API 函数 ====================

/** 保源列表查询（分页 + 多条件过滤） */
export function getRenewalList(params: RenewalQuery & PageParams) {
  return get<PageResult<Renewal>>('/demo/renewal/list', params as Record<string, any>)
}

/** 保源详情 */
export function getRenewalDetail(id: number) {
  return get<Renewal>('/demo/renewal', { id } as Record<string, any>)
}

/** 新增保源 */
export function createRenewal(data: RenewalForm) {
  return post<Renewal>('/demo/renewal', data as Record<string, any>)
}

/** 编辑保源（表单自带 id） */
export function updateRenewal(data: RenewalForm) {
  return put<Renewal>('/demo/renewal', data as Record<string, any>)
}

/** 删除保源 */
export function deleteRenewal(id: number) {
  return del<void>('/demo/renewal', { id } as Record<string, any>)
}

/** 承保公司远程联想（VantSearchField / VantSearch 的 fetch） */
export function searchInsurers(keyword: string) {
  return get<Array<{ text: string; value: string }>>('/demo/renewal/insurers', {
    keyword,
  } as Record<string, any>)
}

/**
 * 投保人核验：提交前校验投保人是否已建档（演示「投保人验证」门禁）。
 * 返回 { verified, applicant? }；未建档时 verified=false，需先确认姓名或新建客户。
 */
export function verifyApplicant(name: string) {
  return get<{ verified: boolean; applicant?: string }>('/demo/renewal/verify-applicant', {
    name,
  } as Record<string, any>)
}
