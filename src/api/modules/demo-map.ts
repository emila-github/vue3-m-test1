/**
 * 字段映射演示 API 模块
 *
 * 后端为「异构命名」：列表接口返回 { records, totalCount, currPage, pageSize }，
 * 并接受入参 current/size。接口函数只负责发请求，字段映射由 useCrudList 的
 * responseMap / requestMap 完成（见 VantListMapDemo.vue）。
 * 导出名统一加 Demo 前缀，避免与正式环境的接口冲突。
 */
import { get, post, put, del } from '../request'
import type { PageParams } from '../types'

// ==================== 数据模型 ====================

/** 列表项 */
export interface DemoMapItem {
  id: number
  name: string // 姓名
  dept: string // 部门
  score: number // 绩效分
  status: string // 状态：在职 / 试用期 / 离职
}

/** 列表查询条件 */
export interface DemoMapQuery {
  keyword?: string // 姓名模糊
  dept?: string // 部门
  status?: string // 状态
  page?: number
  pageSize?: number
}

/** 新增 / 编辑 表单 */
export interface DemoMapForm {
  id?: number
  name: string
  dept: string
  score: number
  status: string
}

// ==================== 领域选项 ====================
export const DEMO_MAP_DEPTS = [
  { text: '全部部门', value: '' },
  { text: '技术部', value: '技术部' },
  { text: '财务部', value: '财务部' },
  { text: '市场部', value: '市场部' },
  { text: '运营部', value: '运营部' },
  { text: '人事部', value: '人事部' },
]

export const DEMO_MAP_STATUS = [
  { text: '全部状态', value: '' },
  { text: '在职', value: '在职' },
  { text: '试用期', value: '试用期' },
  { text: '离职', value: '离职' },
]

/** 初始查询条件（reset 可复位） */
export const DEMO_DEFAULT_MAP_QUERY: DemoMapQuery = {
  keyword: '',
  dept: '',
  status: '',
}

/** 新增表单初始值 */
export const DEMO_DEFAULT_MAP_FORM: DemoMapForm = {
  name: '',
  dept: '技术部',
  score: 80,
  status: '在职',
}

// ==================== API 函数 =================

/**
 * 员工列表查询（异构后端：响应 records/totalCount，入参 current/size）。
 * 返回类型按后端实际结构声明；字段到组件内部 list/total 的映射在 useCrudList 完成。
 */
export function getDemoMapList(params: DemoMapQuery & PageParams) {
  return get<{ records: DemoMapItem[]; totalCount: number; currPage: number; pageSize: number }>(
    '/demo/map/list',
    params as Record<string, any>,
  )
}

/** 详情 */
export function getDemoMapDetail(id: number) {
  return get<DemoMapItem>('/demo/map', { id } as Record<string, any>)
}

/** 新增 */
export function createDemoMap(data: DemoMapForm) {
  return post<DemoMapItem>('/demo/map', data as Record<string, any>)
}

/** 编辑（表单自带 id） */
export function updateDemoMap(data: DemoMapForm) {
  return put<DemoMapItem>('/demo/map', data as Record<string, any>)
}

/** 删除 */
export function deleteDemoMap(id: number) {
  return del<void>('/demo/map', { id } as Record<string, any>)
}
