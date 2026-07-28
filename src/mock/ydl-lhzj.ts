/**
 * 领航足迹 Mock（ydl 模块 §8）
 * 拜访记录 列表 / 详情 / 新增 / 编辑 / 删除 + 客户分类下拉。
 */
import type { MockRoute } from './types'
import dictData from './ydl-dict-data.json'

const visits = Array.from({ length: 12 }, (_, i) => ({
  id: 5000 + i,
  comdname: ['福州', '泉州', '厦门'][i % 3],
  comzcode: ['350101', '350201', '350301'][i % 3],
  comzname: ['鼓楼支公司', '鲤城支公司', '思明支公司'][i % 3],
  visitName: ['李领航', '王领航', '陈领航'][i % 3],
  visitPosition: i % 2 ? '市公司部门经理' : '支公司经理室',
  visitTime: `2026-07-${String(((i % 27) + 1)).padStart(2, '0')}`,
  customerName: `某某${['集团', '科技', '制造'][i % 3]}公司`,
  customerTypeId: ['T01', 'T02'][i % 2],
  customerTypeName: i % 2 ? '中小企业' : '大型企业',
  targetName: ['赵总', '钱总', '孙总'][i % 3],
  targetPosition: ['董事长', '总经理', '财务总监'][i % 3],
  visitContent: '洽谈XX项目合作，推动项目储备落地',
  btnStatus: i % 2 === 0 ? 2 : 1,
}))

function ok<T>(result: T) {
  return { success: true, code: 200, message: '成功', result, timestamp: Date.now() }
}

function parseQuery(url = ''): Record<string, string> {
  const qs = url.split('?')[1] || ''
  const o: Record<string, string> = {}
  qs.split('&').forEach((p) => {
    const idx = p.indexOf('=')
    if (idx < 0) return
    const k = decodeURIComponent(p.slice(0, idx))
    const v = decodeURIComponent(p.slice(idx + 1))
    if (k) o[k] = v
  })
  return o
}

const routes: MockRoute[] = [
  {
    url: '/lhzj/lhVisitInfo/list',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const page = Number(q.page || q.current || 1)
      const size = Number(q.pageSize || q.size || 10)
      let list = visits.slice()
      const cn = q.customerName
      const vn = q.visitName
      if (cn) list = list.filter((v) => (v.customerName ?? '').includes(cn))
      if (vn) list = list.filter((v) => (v.visitName ?? '').includes(vn))
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, current: page, size })
    },
  },
  {
    url: '/lhzj/lhVisitInfo/queryById',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const v = visits.find((x) => String(x.id) === String(q.id)) || visits[0]!
      return ok({ ...v })
    },
  },
  {
    url: '/lhzj/lhVisitInfo/add',
    method: 'POST',
    response: () => ok({ message: '新增成功' }),
  },
  {
    url: '/lhzj/lhVisitInfo/edit',
    method: 'POST',
    response: () => ok({ message: '编辑成功' }),
  },
  {
    url: '/lhzj/lhVisitInfo/delete',
    method: 'DELETE',
    response: () => ok({ message: '删除成功' }),
  },
  {
    url: '/lhzj/lhVisitInfo/customerType',
    method: 'GET',
    response: () => ok(dictData.lhzjCustomerType),
  },
]

export default routes
