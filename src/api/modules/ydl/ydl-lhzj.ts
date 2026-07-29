/**
 * 领航足迹（ydl 模块，需求文档 §8 `/lhzj`）
 * 拜访记录 列表 / 新增 / 编辑 / 删除。
 *   - 列表 GET /lhzj/lhVisitInfo/list
 *   - 详情 GET /lhzj/lhVisitInfo/queryById
 *   - 新增 POST /lhzj/lhVisitInfo/add
 *   - 编辑 POST /lhzj/lhVisitInfo/edit
 *   - 删除 DELETE /lhzj/lhVisitInfo/delete
 * 客户分类下拉复用 useYdlDict.loadLhzjCustomerType（GET /lhzj/lhVisitInfo/customerType）。
 * mock 由 src/mock/ydl-lhzj.ts 在 /ydl-api 前缀下拦截。
 */
import { ydlGet, ydlPost, ydlDel } from './client'

/** 领航拜访记录 */
export interface YdlLhzjVisit {
  id: number | string
  comdname: string
  comzcode?: string
  comzname?: string
  visitName: string
  /** 拜访人职务（提交时 id 数组 → name 逗号串） */
  visitPosition: string
  visitTime: string
  customerName: string
  customerTypeId?: string
  customerTypeName?: string
  targetName: string
  targetPosition: string
  visitContent: string
  btnStatus?: number
  [key: string]: any
}

/** 列表：GET /lhzj/lhVisitInfo/list */
export function getYdlLhzjList(params: Record<string, any>) {
  return ydlGet<{ records: YdlLhzjVisit[]; total: number; size: number }>(
    '/lhzj/lhVisitInfo/list',
    params,
  )
}

/** 详情：GET /lhzj/lhVisitInfo/queryById */
export function getYdlLhzjById(id: number | string) {
  return ydlGet<YdlLhzjVisit>('/lhzj/lhVisitInfo/queryById', { id })
}

/** 新增：POST /lhzj/lhVisitInfo/add */
export function addYdlLhzj(data: Partial<YdlLhzjVisit>) {
  return ydlPost<{ success: boolean; message: string }>('/lhzj/lhVisitInfo/add', data)
}

/** 编辑：POST /lhzj/lhVisitInfo/edit */
export function updateYdlLhzj(data: Partial<YdlLhzjVisit>) {
  return ydlPost<{ success: boolean; message: string }>('/lhzj/lhVisitInfo/edit', data)
}

/** 删除：DELETE /lhzj/lhVisitInfo/delete */
export function deleteYdlLhzj(id: number | string) {
  return ydlDel<{ success: boolean; message: string }>('/lhzj/lhVisitInfo/delete', {
    params: { id },
  })
}
