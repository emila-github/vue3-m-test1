/**
 * 车险续保保源（Renewal）API 模块 —— ydl（JeecgBoot 风格）
 *
 * 与 demo-renewal.ts 功能完全一致（列表 / 新增 / 编辑 / 删除 / 详情 / 承保公司联想 / 投保人核验），
 * 但全部走 ydlClient（baseURL 默认 /ydl-api），对接 JeecgBoot 风格后端：
 *   - 响应包络：{ success, code, message, result, timestamp }
 *   - 分页 result：{ records, current, size, total, pages }
 *
 * mock 由 src/mock/ydl-renewal.ts 在 /ydl-api 前缀下拦截，无需真实后端。
 * 列表接口通过 ydlPagination 适配器把 records/current/size/total 转回通用 PageResult<YdlRenewal>，
 * 调用方（VantList / useCrudList）拿到的仍是统一结构，与后端格式解耦。
 */
import { ydlGet, ydlPost, ydlPut, ydlDel, ydlPagination, type YdlPageResult } from './client'
import type { PageParams, PageResult } from '../../types'

// ==================== 数据模型 ====================

/** 车险续保保源列表项（result.records 单条） */
export interface YdlRenewal {
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
export interface YdlRenewalQuery {
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
export interface YdlRenewalForm {
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

// ==================== 领域选项 / 树数据（非 §1.6 枚举，属业务选项，保留在 API 服务层） ====================

/** 承保公司可选项（同时供 VantSearchField / VantSearch 联想） */
export const YDL_INSURERS = [
  '保保财险',
  '平安产险',
  '太平洋产险',
  '国寿财险',
  '中华联合',
  '大地保险',
]

/** 业务渠道可选项 */
export const YDL_CHANNELS = ['电销', '直销', '4S 店', '代理', '网销']

/** 险种可选项（VantSelectMultipleField） */
export const YDL_INSURANCE_TYPE_OPTIONS = [
  { text: '交强险', value: '交强险' },
  { text: '车损险', value: '车损险' },
  { text: '第三者责任险', value: '三者险' },
  { text: '车上人员险', value: '车上人员险' },
  { text: '玻璃单独破碎险', value: '玻璃险' },
  { text: '不计免赔', value: '不计免赔' },
]

/** 保源状态可选项（首条 value='' 表示全部，仅供查询使用） */
export const YDL_STATUS_OPTIONS = [
  { text: '全部状态', value: '' },
  { text: '待跟进', value: '待跟进' },
  { text: '已联系', value: '已联系' },
  { text: '已续保', value: '已续保' },
  { text: '已流失', value: '已流失' },
]

/** 归属机构树（VantTreeSelectField，value 为叶子节点） */
export const YDL_ORG_TREE = [
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
export const YDL_TAG_TREE = [
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
export const YDL_ORG_NAME: Record<string, string> = {
  'zj-hz': '杭州',
  'zj-nb': '宁波',
  'zj-wz': '温州',
  'js-nj': '南京',
  'js-sz': '苏州',
}

/** 初始查询条件（reset 可复位，含全部筛选字段） */
export const YDL_DEFAULT_RENEWAL_QUERY: YdlRenewalQuery = {
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
export const YDL_DEFAULT_RENEWAL_FORM: YdlRenewalForm = {
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

/**
 * 保源列表查询（分页 + 多条件过滤）。
 * 入参含 page/pageSize（来自 useCrudList，经 VantList requestMap 映射为 current/size 发给 ydl 后端），
 * ydlGet 解包出 result（records/current/size/total），再由 ydlPagination 转回通用 PageResult。
 */
export function getYdlRenewalList(params: YdlRenewalQuery & PageParams) {
  return ydlGet<YdlPageResult<YdlRenewal>>(
    '/data/renewal/list',
    params as Record<string, any>,
  ).then((res) => ydlPagination.fromResult(res) as PageResult<YdlRenewal>)
}

/** 保源详情 */
export function getYdlRenewalDetail(id: number) {
  return ydlGet<YdlRenewal>('/data/renewal', { id })
}

/** 新增保源 */
export function createYdlRenewal(data: YdlRenewalForm) {
  return ydlPost<YdlRenewal>('/data/renewal', data as Record<string, any>)
}

/** 编辑保源（表单自带 id） */
export function updateYdlRenewal(data: YdlRenewalForm) {
  return ydlPut<YdlRenewal>('/data/renewal', data as Record<string, any>)
}

/** 删除保源（DELETE 携带 body，mock 从请求体读取 id） */
export function deleteYdlRenewal(id: number) {
  return ydlDel<void>('/data/renewal', { data: { id } } as Record<string, any>)
}

/** 承保公司远程联想（VantSearchField / VantSearch 的 fetch） */
export function searchYdlInsurers(keyword: string) {
  return ydlGet<Array<{ text: string; value: string }>>('/data/renewal/insurers', {
    keyword,
  })
}

/**
 * 投保人核验：提交前校验投保人是否已建档（演示「投保人验证」门禁）。
 * 返回 { verified, applicant? }；未建档时 verified=false，需先确认姓名或新建客户。
 */
export function verifyYdlApplicant(name: string) {
  return ydlGet<{ verified: boolean; applicant?: string }>('/data/renewal/verify-applicant', {
    name,
  })
}
