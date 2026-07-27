/**
 * 我的保源 —— 销售结果（MyInsuranceResult）Mock 数据 —— ydl（JeecgBoot 风格）
 *
 * 由 mock 插件挂载在 /ydl-api 前缀下拦截（对应 ydlClient 的 baseURL）。
 * 响应统一为 JeecgBoot 包络：{ success, code, message, result, timestamp }。
 *
 * 接口（不含 /ydl-api 前缀）：
 *   GET  /data/policyInfo/list              — 销售结果分页列表
 *   POST /data/policyInfo/add               — 新增销售结果
 *   PUT  /data/policyInfo/edit              — 编辑销售结果
 *   GET  /data/policyInfo/queryById         — 销售结果回显
 *   GET  /data/policyInfo/getInsureOrderInfo— 保单号自动带出（录入时 blur 触发）
 *   POST /data/policyInfo/delete            — 删除销售结果
 */
import type { MockRoute } from './types'

function ok<T>(result: T) {
  return { success: true, code: 200, message: '操作成功', result, timestamp: Date.now() }
}
function fail(message: string, code = 500) {
  return { success: false, code, message, result: null, timestamp: Date.now() }
}
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
function qs(req: any): URLSearchParams {
  return new URL(req.url!, 'http://localhost').searchParams
}

// ==================== 种子数据（按 sourceId 隔离） ====================
function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

interface SaleResult {
  id: string
  sourceId: string
  realName: string
  saleFlag: string
  saleType: number
  policyNo: string
  policyFee: string
  createTime: string
  isSelfData: boolean
}

const saleMap = new Map<string, SaleResult[]>()

const REALNAMES = ['张经理', '李主管', '王总监', '赵专员', '陈业务员']

function dt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 带边界保护的数组取值（避免 noUncheckedIndexedAccess 下出现 string | undefined）
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!
}

function seedSale(sourceId: string) {
  if (saleMap.has(sourceId)) return
  const m = 2 + (sourceId.charCodeAt(0) % 2) // 2~3 条
  const sales: SaleResult[] = Array.from({ length: m }, (_, i) => {
    const flag = i % 2 === 0 ? 'Y' : 'N'
    const d = new Date()
    d.setDate(d.getDate() - i * 5)
    const createTime = dt(d)
    return {
      id: `SR${sourceId}-${i}`,
      sourceId,
      realName: pick(REALNAMES, i),
      saleFlag: flag,
      saleType: flag === 'Y' ? i % 3 : 0,
      policyNo: flag === 'Y' ? `PICC${pad(2026000 + i, 7)}` : '',
      policyFee: flag === 'Y' ? `${((i + 1) * 3500).toFixed(2)}` : '',
      createTime,
      isSelfData: i % 2 === 0,
    }
  })
  saleMap.set(sourceId, sales)
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // ===== 销售结果列表 =====
  {
    url: '/data/policyInfo/list',
    method: 'GET',
    response: async (req) => {
      await delay(500)
      const sp = qs(req)
      const sourceId = sp.get('sourceId') || ''
      const pageNo = parseInt(sp.get('pageNo') || '1', 10)
      const pageSize = parseInt(sp.get('pageSize') || '10', 10)
      seedSale(sourceId)
      const all = [...(saleMap.get(sourceId) || [])]
      all.sort((a, b) => (a.createTime < b.createTime ? 1 : -1))
      const total = all.length
      const start = (pageNo - 1) * pageSize
      const records = all.slice(start, start + pageSize)
      return ok({
        records,
        current: pageNo,
        size: pageSize,
        total,
        pages: Math.ceil(total / pageSize) || 1,
      })
    },
  },
  {
    url: '/data/policyInfo/add',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const sourceId = b.sourceId || ''
      seedSale(sourceId)
      const item: SaleResult = {
        id: `SR${sourceId}-${Date.now()}`,
        sourceId,
        realName: b.realName || '',
        saleFlag: b.saleFlag || 'N',
        saleType: Number(b.saleType) || 0,
        policyNo: b.policyNo || '',
        policyFee: b.policyFee || '',
        createTime: b.createTime || dt(new Date()),
        isSelfData: true,
      }
      saleMap.get(sourceId)!.unshift(item)
      return ok(item)
    },
  },
  {
    url: '/data/policyInfo/edit',
    method: 'PUT',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const list = saleMap.get(b.sourceId) || []
      const idx = list.findIndex((x) => x.id === b.id)
      if (idx === -1) return fail('未找到该销售结果记录', 404)
      list[idx] = { ...list[idx]!, ...b, createTime: b.createTime || dt(new Date()) }
      return ok(list[idx])
    },
  },
  // 销售结果回显（编辑）
  {
    url: '/data/policyInfo/queryById',
    method: 'GET',
    response: (req) => {
      const id = new URL(req.url!, 'http://localhost').searchParams.get('id') || ''
      for (const list of saleMap.values()) {
        const item = list.find((x) => x.id === id)
        if (item) return ok(item)
      }
      return fail('未找到该销售结果记录', 404)
    },
  },
  // 保单号自动带出（录入销售结果时 blur 触发）
  {
    url: '/data/policyInfo/getInsureOrderInfo',
    method: 'GET',
    response: (req) => {
      const policyNo =
        new URL(req.url!, 'http://localhost').searchParams.get('policyNo') || '' || ''
      if (!policyNo) return fail('保单号不能为空', 400)
      const info = {
        policyNo,
        sumnetpremium: 52000.0,
        riskTypeCode: '02',
        riskCategoryName: '雇主责任险',
        channelTypeName: '直销',
        bgnDate: '2026-07-20',
        endDate: '2027-07-19',
        renewFlag: '2',
        insuredIdCode: '91330000XXXXXXXXXX',
      }
      return ok(info)
    },
  },
  {
    url: '/data/policyInfo/delete',
    method: 'POST',
    response: async (req) => {
      await delay(300)
      const b = await parseBody(req)
      const id = b.id || ''
      for (const list of saleMap.values()) {
        const i = list.findIndex((x) => x.id === id)
        if (i !== -1) {
          list.splice(i, 1)
          return ok(true)
        }
      }
      return fail('未找到该销售结果记录', 404)
    },
  },
]

export default routes
