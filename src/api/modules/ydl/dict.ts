/**
 * 公共下拉 / 字典数据源 API（需求文档 §1.4 公共下拉 / 字典数据源）
 *
 * 全站复用的字典 / 下拉接口统一收敛到本文件，避免各业务页面重复实现。
 * 统一走 ydlClient（baseURL 默认 /ydl-api），由 src/mock/ydl-dict.ts 拦截。
 *
 * 列表：
 *   - 机构/分支公司树      getYdlSysDepartTree        GET /sys/sysDepart/queryTreeListAll
 *   - 通用字典项           getYdlDictItems(type)      GET /sys/dict/getDictItems/{type}
 *   - 保源标签(取id)       getYdlLabelTypePullDownAll  GET /data/labelType/pullDownAll
 *   - 保源标签(树节点)     getYdlLabelTypePullDownNode GET /data/labelType/pullDownNode
 *   - 客户类型下拉         getYdlCustomerTypePullDown  GET /arch/customerType/pullDown
 *   - 产品线               getYdlProductLineTypes      GET /arch/productLineType/pullDown
 *   - 目标险种树           getRiskTypeTree             GET /arch/riskType/tree
 *   - 客户类型(领航,树)    getYdlLhzjCustomerType      GET /lhzj/lhVisitInfo/customerType
 *   - 报告日期下拉(渗透率) getYdlJcEnterpriseItemSelectDates GET /policy/jcEnterpriseItem/selectDates
 */
import { ydlGet } from './client'

// ==================== 类型 ====================

/** 机构/分支公司树节点（isSysDepartTree）：{ orgCode, title, parentId, children } */
export interface DeptNode {
  orgCode: string
  title: string
  parentId: string
  children?: DeptNode[] | null
}

/** 通用字典项（getYdlDictItems 返回）：{ value, text } */
export interface DictItem {
  value: string
  text: string
}

/** id/name 型下拉项（保源标签、产品线等） */
export interface YdlOption {
  id: string
  name: string
}

/** 客户类型树节点（isCustomerTypePullDown / lhzjCustomerType）：{ id, title, parentId, children } */
export interface CustomerTypeNode {
  id: string
  title: string
  parentId: string
  children?: CustomerTypeNode[] | null
}

/** 目标险种树节点（isRiskTypeTree）：{ id, parentId, value, title, children } */
export interface RiskTypeNode {
  id: string
  parentId: string
  value: string
  title: string
  children?: RiskTypeNode[] | null
}

/** 报告日期下拉（渗透率 selectDates）：日期数组 + 当前机构码 */
export interface JcSelectDates {
  dates: string[]
  currOrgCode: string
}

// ==================== API 函数 ====================

/** 机构/分支公司树：GET /sys/sysDepart/queryTreeListAll */
export function getYdlSysDepartTree() {
  return ydlGet<DeptNode[]>('/sys/sysDepart/queryTreeListAll')
}

/** 通用数据字典项：GET /sys/dict/getDictItems/{type} → [{ value, text }] */
export function getYdlDictItems(type: string) {
  return ydlGet<DictItem[]>(`/sys/dict/getDictItems/${type}`)
}

/** 保源标签（取 id）：GET /data/labelType/pullDownAll → [{ id, name }] */
export function getYdlLabelTypePullDownAll() {
  return ydlGet<YdlOption[]>('/data/labelType/pullDownAll')
}

/** 保源标签（id+文字，树节点）：GET /data/labelType/pullDownNode → [{ id, name }] */
export function getYdlLabelTypePullDownNode() {
  return ydlGet<YdlOption[]>('/data/labelType/pullDownNode')
}

/** 客户类型下拉：GET /arch/customerType/pullDown → 树 */
export function getYdlCustomerTypePullDown() {
  return ydlGet<CustomerTypeNode[]>('/arch/customerType/pullDown')
}

/** 产品线：GET /arch/productLineType/pullDown → [{ id, name }] */
export function getYdlProductLineTypes() {
  return ydlGet<YdlOption[]>('/arch/productLineType/pullDown')
}

/** 目标险种树：GET /arch/riskType/tree → 树（节点含 value / title / children） */
export function getRiskTypeTree() {
  return ydlGet<RiskTypeNode[]>('/arch/riskType/tree')
}

/** 客户类型（领航，树）：GET /lhzj/lhVisitInfo/customerType → 树 */
export function getYdlLhzjCustomerType() {
  return ydlGet<CustomerTypeNode[]>('/lhzj/lhVisitInfo/customerType')
}

/** 报告日期下拉（渗透率）：GET /policy/jcEnterpriseItem/selectDates → { dates, currOrgCode } */
export function getYdlJcEnterpriseItemSelectDates() {
  return ydlGet<JcSelectDates>('/policy/jcEnterpriseItem/selectDates')
}
