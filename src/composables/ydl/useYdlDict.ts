/**
 * 公共下拉 / 字典数据源 composable（ydl 业务域）
 *
 * 对应需求文档 §1.4：机构树 / 字典项 / 保源标签 / 产品线 / 险种树 / 客户类型
 * 全站复用，统一收敛到本 composable 并带模块级缓存，避免各业务页面重复请求。
 *
 * 用法：
 *   const { deptTree, loadDeptTree } = useYdlDict()
 *   loadDeptTree().then(() => ... deptTree.value 已填充)
 *
 * 缓存策略：模块级单例缓存（Promise 级），首次加载后复用；可传 force=true 强制刷新。
 */
import { ref } from 'vue'
import {
  getYdlSysDepartTree,
  getYdlDictItems,
  getYdlLabelTypePullDownAll,
  getYdlLabelTypePullDownNode,
  getYdlProductLineTypes,
  getRiskTypeTree,
  getYdlCustomerTypePullDown,
  getYdlLhzjCustomerType,
  type DeptNode,
  type DictItem,
  type YdlOption,
  type RiskTypeNode,
  type CustomerTypeNode,
} from '@/api/modules/ydl/dict'

// ==================== 模块级缓存（单例） ====================
const deptTreeCache = ref<DeptNode[]>([])
const deptTreePromise: { p?: Promise<DeptNode[]> } = {}

const dictCache = new Map<string, DictItem[]>()
const dictPromise = new Map<string, Promise<DictItem[]>>()

const labelAllCache = ref<YdlOption[]>([])
const labelAllPromise: { p?: Promise<YdlOption[]> } = {}

const labelNodeCache = ref<YdlOption[]>([])
const labelNodePromise: { p?: Promise<YdlOption[]> } = {}

const productLineCache = ref<YdlOption[]>([])
const productLinePromise: { p?: Promise<YdlOption[]> } = {}

const riskTypeCache = ref<RiskTypeNode[]>([])
const riskTypePromise: { p?: Promise<RiskTypeNode[]> } = {}

const customerTypeCache = ref<CustomerTypeNode[]>([])
const customerTypePromise: { p?: Promise<CustomerTypeNode[]> } = {}

const lhzjCustomerTypeCache = ref<CustomerTypeNode[]>([])
const lhzjCustomerTypePromise: { p?: Promise<CustomerTypeNode[]> } = {}

// ==================== 对外 composable ====================
export function useYdlDict() {
  /** 机构 / 分支公司树（[{ orgCode, title, parentId, children }]） */
  function loadDeptTree(force = false): Promise<DeptNode[]> {
    if (!force && (deptTreePromise.p || deptTreeCache.value.length)) {
      return deptTreePromise.p ?? Promise.resolve(deptTreeCache.value)
    }
    deptTreePromise.p = getYdlSysDepartTree().then((data) => {
      deptTreeCache.value = data ?? []
      return deptTreeCache.value
    })
    return deptTreePromise.p
  }

  /** 通用字典项（[{ value, text }]），按 type 缓存 */
  function loadDictItems(type: string, force = false): Promise<DictItem[]> {
    if (!force && (dictPromise.get(type) || dictCache.get(type)?.length)) {
      return dictPromise.get(type) ?? Promise.resolve(dictCache.get(type) ?? [])
    }
    const p = getYdlDictItems(type).then((data) => {
      dictCache.set(type, data ?? [])
      return dictCache.get(type)!
    })
    dictPromise.set(type, p)
    return p
  }

  /** 保源标签（取 id）：[{ id, name }] */
  function loadLabelAll(force = false): Promise<YdlOption[]> {
    if (!force && (labelAllPromise.p || labelAllCache.value.length)) {
      return labelAllPromise.p ?? Promise.resolve(labelAllCache.value)
    }
    labelAllPromise.p = getYdlLabelTypePullDownAll().then((data) => {
      labelAllCache.value = data ?? []
      return labelAllCache.value
    })
    return labelAllPromise.p
  }

  /** 保源标签（id + 文字，树节点）：[{ id, name }] */
  function loadLabelNode(force = false): Promise<YdlOption[]> {
    if (!force && (labelNodePromise.p || labelNodeCache.value.length)) {
      return labelNodePromise.p ?? Promise.resolve(labelNodeCache.value)
    }
    labelNodePromise.p = getYdlLabelTypePullDownNode().then((data) => {
      labelNodeCache.value = data ?? []
      return labelNodeCache.value
    })
    return labelNodePromise.p
  }

  /** 产品线：[{ id, name }] */
  function loadProductLine(force = false): Promise<YdlOption[]> {
    if (!force && (productLinePromise.p || productLineCache.value.length)) {
      return productLinePromise.p ?? Promise.resolve(productLineCache.value)
    }
    productLinePromise.p = getYdlProductLineTypes().then((data) => {
      productLineCache.value = data ?? []
      return productLineCache.value
    })
    return productLinePromise.p
  }

  /** 目标险种树：[{ id, parentId, value, title, children }] */
  function loadRiskTypeTree(force = false): Promise<RiskTypeNode[]> {
    if (!force && (riskTypePromise.p || riskTypeCache.value.length)) {
      return riskTypePromise.p ?? Promise.resolve(riskTypeCache.value)
    }
    riskTypePromise.p = getRiskTypeTree().then((data) => {
      riskTypeCache.value = data ?? []
      return riskTypeCache.value
    })
    return riskTypePromise.p
  }

  /** 客户类型树（续保 / 企业）：[{ id, title, parentId, children }] */
  function loadCustomerType(force = false): Promise<CustomerTypeNode[]> {
    if (!force && (customerTypePromise.p || customerTypeCache.value.length)) {
      return customerTypePromise.p ?? Promise.resolve(customerTypeCache.value)
    }
    customerTypePromise.p = getYdlCustomerTypePullDown().then((data) => {
      customerTypeCache.value = data ?? []
      return customerTypeCache.value
    })
    return customerTypePromise.p
  }

  /** 客户类型（领航，树） */
  function loadLhzjCustomerType(force = false): Promise<CustomerTypeNode[]> {
    if (!force && (lhzjCustomerTypePromise.p || lhzjCustomerTypeCache.value.length)) {
      return lhzjCustomerTypePromise.p ?? Promise.resolve(lhzjCustomerTypeCache.value)
    }
    lhzjCustomerTypePromise.p = getYdlLhzjCustomerType().then((data) => {
      lhzjCustomerTypeCache.value = data ?? []
      return lhzjCustomerTypeCache.value
    })
    return lhzjCustomerTypePromise.p
  }

  return {
    deptTree: deptTreeCache,
    labelAll: labelAllCache,
    labelNode: labelNodeCache,
    productLine: productLineCache,
    riskTypeTree: riskTypeCache,
    customerType: customerTypeCache,
    lhzjCustomerType: lhzjCustomerTypeCache,
    loadDeptTree,
    loadDictItems,
    loadLabelAll,
    loadLabelNode,
    loadProductLine,
    loadRiskTypeTree,
    loadCustomerType,
    loadLhzjCustomerType,
  }
}
