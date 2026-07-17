/**
 * 字段映射演示 Mock 数据
 *
 * 本模块刻意使用一个「命名与项目约定不同」的异构后端，用于演示 VantList 的
 * responseMap / requestMap 字段映射能力：
 *   - 请求分页参数：page → current，pageSize → size
 *   - 响应列表字段：list → records
 *   - 响应总数字段：total → totalCount
 *   - 响应页码字段：page → currPage（仅回显，前端仍以自身 page 为准）
 *
 * 接口（均带 /demo 前缀，避免与正式项目冲突）：
 *   GET  /demo/map/list   — 列表查询（分页，入参 current/size，响应 records/totalCount）
 *   GET  /demo/map         — 详情
 *   POST /demo/map         — 新增
 *   PUT  /demo/map         — 编辑
 *   DEL  /demo/map         — 删除
 */
import type { MockRoute } from './types'

// ==================== 数据模型 ====================
interface MapItem {
  id: number
  name: string // 姓名
  dept: string // 部门
  score: number // 绩效分
  status: string // 状态：在职 / 试用期 / 离职
}

// ==================== 领域常量 ====================
const DEPTS = ['技术部', '财务部', '市场部', '运营部', '人事部']
const STATUS = ['在职', '试用期', '离职']

// ==================== 种子数据（43 条，足够分页演示） ====================
let SEQ = 3000

function buildRecord(i: number): MapItem {
  return {
    id: ++SEQ,
    name: `员工${String(i + 1).padStart(3, '0')}`,
    dept: DEPTS[i % DEPTS.length] ?? '技术部',
    score: 60 + (i % 40),
    status: STATUS[i % STATUS.length] ?? '在职',
  }
}

const data: MapItem[] = Array.from({ length: 43 }, (_, i) => buildRecord(i))

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
  // 列表查询（异构后端：入参 current/size，响应 records/totalCount/currPage/pageSize）
  {
    url: '/demo/map/list',
    method: 'GET',
    response: async (req) => {
      await delay(600)
      const u = new URL(req.url!, 'http://localhost')
      const sp = u.searchParams

      // 注意：此处读取的是「请求映射后的参数名」current / size
      const current = getNum(sp, 'current') || 1
      const size = getNum(sp, 'size') || 10
      const keyword = getStr(sp, 'keyword')
      const dept = getStr(sp, 'dept')
      const status = getStr(sp, 'status')

      let filtered = [...data]
      if (keyword) {
        const kw = keyword.toLowerCase()
        filtered = filtered.filter((r) => r.name.toLowerCase().includes(kw))
      }
      if (dept) filtered = filtered.filter((r) => r.dept === dept)
      if (status) filtered = filtered.filter((r) => r.status === status)

      const totalCount = filtered.length
      const start = (current - 1) * size
      const records = filtered.slice(start, start + size)

      // 异构响应字段：records / totalCount / currPage / pageSize
      return {
        code: 200,
        data: { records, totalCount, currPage: current, pageSize: size },
        message: 'ok',
      }
    },
  },

  // 详情
  {
    url: '/demo/map',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const id = parseInt(u.searchParams.get('id') || '0', 10)
      const item = data.find((d) => d.id === id)
      if (!item) return { code: 404, data: null, message: '未找到该员工' }
      return { code: 200, data: item, message: 'ok' }
    },
  },

  // 新增
  {
    url: '/demo/map',
    method: 'POST',
    response: async (req) => {
      const body = await parseBody(req)
      const item: MapItem = {
        id: ++SEQ,
        name: body.name || '',
        dept: body.dept || '技术部',
        score: Number(body.score) || 0,
        status: body.status || '在职',
      }
      data.unshift(item)
      return { code: 200, data: item, message: '新增成功' }
    },
  },

  // 编辑
  {
    url: '/demo/map',
    method: 'PUT',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该员工' }

      const existing = data[idx]
      const updated: MapItem = {
        ...existing,
        name: body.name ?? existing.name,
        dept: body.dept ?? existing.dept,
        score: body.score != null ? Number(body.score) : existing.score,
        status: body.status ?? existing.status,
      }
      data[idx] = updated
      return { code: 200, data: updated, message: '更新成功' }
    },
  },

  // 删除
  {
    url: '/demo/map',
    method: 'DELETE',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该员工' }
      data.splice(idx, 1)
      return { code: 200, data: null, message: '删除成功' }
    },
  },
]

export default routes
