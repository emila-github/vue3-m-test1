/**
 * 公共下拉 / 字典数据源 Mock（需求文档 §1.4）
 *
 * 数据直接引用 JSON（src/mock/ydl-dict-data.json / ydl-risk-type-tree.json），
 * 不在本文件内联配置，便于随数据源统一维护。
 *
 * 由 mock 插件挂载在 /ydl-api 前缀下拦截（对应 ydlClient 的 baseURL）。
 * 响应统一为 JeecgBoot 包络：{ success, code, message, result, timestamp }。
 *
 * 覆盖接口（不含前缀）：
 *   GET /sys/sysDepart/queryTreeListAll
 *   GET /sys/dict/getDictItems/{type}
 *   GET /data/labelType/pullDownAll
 *   GET /data/labelType/pullDownNode
 *   GET /arch/customerType/pullDown
 *   GET /arch/productLineType/pullDown
 *   GET /arch/riskType/tree
 *   GET /lhzj/lhVisitInfo/customerType
 *   GET /policy/jcEnterpriseItem/selectDates
 */
import type { MockRoute } from './types'
import riskTypeTree from './ydl-risk-type-tree.json'
import dictData from './ydl-dict-data.json'

function ok<T>(result: T) {
  return { success: true, code: 200, message: '操作成功', result, timestamp: Date.now() }
}

/** 从 /sys/dict/getDictItems/{type} 路径中提取字典 type */
function parseDictType(req: any): string {
  const path = (req.url || '').split('?')[0]!
  const prefix = '/sys/dict/getDictItems/'
  return path.startsWith(prefix) ? path.slice(prefix.length) : ''
}

const routes: MockRoute[] = [
  // ===== 目标险种树 =====
  {
    url: '/arch/riskType/tree',
    method: 'GET',
    response: () => ok(riskTypeTree.result),
  },
  // ===== 机构/分支公司树 =====
  {
    url: '/sys/sysDepart/queryTreeListAll',
    method: 'GET',
    response: () => ok(dictData.sysDepartTree),
  },
  // ===== 通用数据字典项 =====
  {
    url: '/sys/dict/getDictItems/',
    method: 'GET',
    response: (req) => ok(dictData.dictItems[parseDictType(req)] || []),
  },
  // ===== 保源标签（取 id） =====
  {
    url: '/data/labelType/pullDownAll',
    method: 'GET',
    response: () => ok(dictData.labelTypeAll),
  },
  // ===== 保源标签（id+文字，树节点） =====
  {
    url: '/data/labelType/pullDownNode',
    method: 'GET',
    response: () => ok(dictData.labelTypeNode),
  },
  // ===== 客户类型下拉 =====
  {
    url: '/arch/customerType/pullDown',
    method: 'GET',
    response: () => ok(dictData.customerType),
  },
  // ===== 产品线 =====
  {
    url: '/arch/productLineType/pullDown',
    method: 'GET',
    response: () => ok(dictData.productLine),
  },
  // ===== 客户类型（领航，树） =====
  {
    url: '/lhzj/lhVisitInfo/customerType',
    method: 'GET',
    response: () => ok(dictData.lhzjCustomerType),
  },
  // ===== 报告日期下拉（渗透率） =====
  {
    url: '/policy/jcEnterpriseItem/selectDates',
    method: 'GET',
    response: () => ok(dictData.jcDates),
  },
]

export default routes
