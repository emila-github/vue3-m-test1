/**
 * 客户名单（不分页）API 模块
 *
 * 主题：客户名单的查询 / 新增 / 编辑 / 删除 / 详情。
 * 请求经 /api 前缀由 src/mock/demo-customer.ts 拦截（内存 Mock，无需真实后端）。
 * 列表接口「不分页」，前端通过足够大的 pageSize 让 VantList 在首次加载后 finished。
 * 导出名统一加 Demo 前缀，避免与正式环境的接口冲突。
 */
import { get, post, put, del } from '../request'
import type { PageParams } from '../types'

// ==================== 数据模型 ====================

/** 客户列表项 */
export interface DemoCustomer {
  id: number
  name: string // 姓名
  phone: string // 电话
  company: string // 公司
  type: string // 客户类型：普通 / 会员 / VIP
  city: string // 城市
  level: number // 客户等级 1-5
  amount: number // 累计消费（元）
  remark: string // 备注
}

/** 列表查询条件 */
export interface DemoCustomerQuery {
  keyword?: string // 姓名 / 电话 / 公司 模糊
  type?: string // 客户类型
  city?: string // 城市
  levelMin?: number // 等级下限
  page?: number
  pageSize?: number
}

/** 新增 / 编辑 表单 */
export interface DemoCustomerForm {
  id?: number
  name: string
  phone: string
  company: string
  type: string
  city: string
  level: number
  amount: number
  remark: string
}

// ==================== 领域选项 ====================
/** 客户类型可选项（首条 value='' 表示全部，仅供查询使用） */
export const DEMO_CUSTOMER_TYPES = [
  { text: '全部类型', value: '' },
  { text: '普通客户', value: '普通' },
  { text: '会员客户', value: '会员' },
  { text: 'VIP 客户', value: 'VIP' },
]

/** 城市可选项 */
export const DEMO_CITIES = [
  { text: '全部城市', value: '' },
  { text: '杭州', value: '杭州' },
  { text: '宁波', value: '宁波' },
  { text: '温州', value: '温州' },
  { text: '南京', value: '南京' },
  { text: '苏州', value: '苏州' },
]

/** 初始查询条件（reset 可复位） */
export const DEMO_DEFAULT_CUSTOMER_QUERY: DemoCustomerQuery = {
  keyword: '',
  type: '',
  city: '',
  levelMin: 0,
}

/** 新增表单初始值 */
export const DEMO_DEFAULT_CUSTOMER_FORM: DemoCustomerForm = {
  name: '',
  phone: '',
  company: '',
  type: '普通',
  city: '杭州',
  level: 3,
  amount: 0,
  remark: '',
}

// ==================== API 函数 ====================

/** 客户列表查询（不分页：mock 直接把 list 数组放进 data 返回，无需分页结构） */
export function getDemoCustomerList(params: DemoCustomerQuery & PageParams) {
  return get<DemoCustomer[]>('/demo/customer/list', params as Record<string, any>)
}

/** 客户详情 */
export function getDemoCustomerDetail(id: number) {
  return get<DemoCustomer>('/demo/customer', { id } as Record<string, any>)
}

/** 新增客户 */
export function createDemoCustomer(data: DemoCustomerForm) {
  return post<DemoCustomer>('/demo/customer', data as Record<string, any>)
}

/** 编辑客户（表单自带 id） */
export function updateDemoCustomer(data: DemoCustomerForm) {
  return put<DemoCustomer>('/demo/customer', data as Record<string, any>)
}

/** 删除客户 */
export function deleteDemoCustomer(id: number) {
  return del<void>('/demo/customer', { id } as Record<string, any>)
}
