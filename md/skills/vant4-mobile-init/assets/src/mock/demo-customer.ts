/**
 * 客户名单（不分页）Mock 数据
 *
 * 与 demo-renewal（分页）形成对照：本模块演示「不分页」数据场景。
 * 列表接口 /demo/customer/list 忽略 page/pageSize，**一次性返回全部筛选结果**，
 * 直接将 list 数组放进 data（不带 list/total/page/pageSize 分页结构），useCrudList
 * 识别到「返回值为数组」即置 finished，整页数据一次性渲染。
 *
 * 接口（均带 /demo 前缀，避免与正式项目冲突）：
 *   GET  /demo/customer/list   — 列表查询（搜索 / 多条件过滤，不分页，全量返回）
 *   GET  /demo/customer        — 详情（可选，VantList 点击列表进入详情）
 *   POST /demo/customer        — 新增客户
 *   PUT  /demo/customer        — 编辑客户
 *   DEL  /demo/customer        — 删除客户
 */
import type { MockRoute } from './types'

// ==================== 数据模型 ====================
interface Customer {
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

// ==================== 领域常量 ====================
const TYPES = ['普通', '会员', 'VIP']
const CITIES = ['杭州', '宁波', '温州', '南京', '苏州']

// ==================== 种子数据 ====================
let SEQ = 2000

function buildRecord(i: number): Customer {
  const types = TYPES[i % TYPES.length] ?? '普通'
  const cities = CITIES[i % CITIES.length] ?? '杭州'
  return {
    id: ++SEQ,
    name: `客户${String(i + 1).padStart(3, '0')}`,
    phone: `138${String(10000000 + i * 137).slice(-8)}`,
    company: `${cities}第${i + 1}纺织有限公司`,
    type: types,
    city: cities,
    level: (i % 5) + 1,
    amount: 800 + i * 460,
    remark: '',
  }
}

const data: Customer[] = Array.from({ length: 18 }, (_, i) => buildRecord(i))

// ==================== 查询参数解析 ====================
function getStr(sp: URLSearchParams, key: string): string {
  return sp.get(key) || ''
}
function getNum(sp: URLSearchParams, key: string): number {
  const v = sp.get(key)
  return v ? Number(v) : 0
}

async function parseBody(req: any): Promise<Record<string, any>> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
  })
}

// ==================== 路由 ====================
/** 模拟网络延迟（首次加载期间让骨架屏可见） */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const routes: MockRoute[] = [
  // 列表查询（不分页：忽略 page/pageSize，直接返回全部筛选结果）
  {
    url: '/demo/customer/list',
    method: 'GET',
    response: async (req) => {
      await delay(700)
      const u = new URL(req.url!, 'http://localhost')
      const sp = u.searchParams

      const keyword = getStr(sp, 'keyword')
      const type = getStr(sp, 'type')
      const city = getStr(sp, 'city')
      const levelMin = getNum(sp, 'levelMin')

      let filtered = [...data]

      if (keyword) {
        const kw = keyword.toLowerCase()
        filtered = filtered.filter(
          (r) =>
            r.name.toLowerCase().includes(kw) ||
            r.phone.toLowerCase().includes(kw) ||
            r.company.toLowerCase().includes(kw),
        )
      }
      if (type) filtered = filtered.filter((r) => r.type === type)
      if (city) filtered = filtered.filter((r) => r.city === city)
      if (levelMin) filtered = filtered.filter((r) => r.level >= levelMin)

      // 不分页：把筛选结果数组直接放进 data，不带 list/total/page/pageSize 分页结构
      return {
        code: 200,
        data: filtered,
        message: 'ok',
      }
    },
  },

  // 详情
  {
    url: '/demo/customer',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const id = parseInt(u.searchParams.get('id') || '0', 10)
      const item = data.find((d) => d.id === id)
      if (!item) return { code: 404, data: null, message: '未找到该客户' }
      return { code: 200, data: item, message: 'ok' }
    },
  },

  // 新增
  {
    url: '/demo/customer',
    method: 'POST',
    response: async (req) => {
      const body = await parseBody(req)
      const item: Customer = {
        id: ++SEQ,
        name: body.name || '',
        phone: body.phone || '',
        company: body.company || '',
        type: body.type || '普通',
        city: body.city || '杭州',
        level: Number(body.level) || 1,
        amount: Number(body.amount) || 0,
        remark: body.remark || '',
      }
      data.unshift(item)
      return { code: 200, data: item, message: '新增成功' }
    },
  },

  // 编辑
  {
    url: '/demo/customer',
    method: 'PUT',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该客户' }

      const existing = data[idx]
      const updated: Customer = {
        ...existing,
        name: body.name ?? existing.name,
        phone: body.phone ?? existing.phone,
        company: body.company ?? existing.company,
        type: body.type ?? existing.type,
        city: body.city ?? existing.city,
        level: body.level != null ? Number(body.level) : existing.level,
        amount: body.amount != null ? Number(body.amount) : existing.amount,
        remark: body.remark ?? existing.remark,
      }
      data[idx] = updated
      return { code: 200, data: updated, message: '更新成功' }
    },
  },

  // 删除
  {
    url: '/demo/customer',
    method: 'DELETE',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该客户' }
      data.splice(idx, 1)
      return { code: 200, data: null, message: '删除成功' }
    },
  },
]

export default routes
