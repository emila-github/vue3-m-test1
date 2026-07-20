/**
 * 车险续保保源（Renewal）Mock 数据 —— ydl（JeecgBoot 风格）
 *
 * 与 demo-renewal.ts 数据/逻辑完全一致，但：
 *   - 由 mock 插件挂载在 /ydl-api 前缀下拦截（对应 ydlClient 的 baseURL）
 *   - 响应统一为 JeecgBoot 包络：{ success, code, message, result, timestamp }
 *   - 列表 result 为分页对象：{ records, current, size, total, pages }
 *
 * 接口（不含 /ydl-api 前缀，由 mock 插件在 /ydl-api 下挂载）：
 *   GET  /data/renewal/list        — 列表查询（搜索 / 分页 / 多条件过滤）
 *   GET  /data/renewal             — 详情查询
 *   POST /data/renewal             — 新增保源
 *   PUT  /data/renewal             — 编辑保源
 *   DEL  /data/renewal             — 删除保源
 *   GET  /data/renewal/insurers    — 承保公司联想
 *   GET  /data/renewal/verify-applicant — 投保人核验
 */
import type { MockRoute } from './types'

// ==================== JeecgBoot 包络 ====================
function ok<T>(result: T) {
  return { success: true, code: 200, message: '操作成功', result, timestamp: Date.now() }
}
function fail(message: string, code = 500) {
  return { success: false, code, message, result: null, timestamp: Date.now() }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 解析请求体（POST/PUT/DELETE） */
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

// ==================== 数据模型 ====================
interface Renewal {
  id: number
  policyNo: string
  applicant: string
  plateNo: string
  insurer: string
  region: string
  channel: string
  insuranceTypes: string[]
  tags: Array<string | number>
  status: string
  isNew: string
  level: number
  premium: number
  followCount: number
  expireDate: string
  followMonth: string
  remark: string
  attach?: string[]
}

// ==================== 领域常量 ====================
const INSURERS = ['人保财险', '平安产险', '太平洋产险', '国寿财险', '中华联合', '大地保险']
const CHANNELS = ['电销', '直销', '4S 店', '代理', '网销']
const STATUSES = ['待跟进', '已联系', '已续保', '已流失']

// ==================== 种子数据 ====================
let SEQ = 1000

const REGIONS = ['zj-hz', 'zj-nb', 'zj-wz', 'js-nj', 'js-sz']
const PREMIUMS = [1980, 2680, 3200, 4500, 5800, 8200]

function buildRecord(i: number): Renewal {
  const day = String((i % 28) + 1).padStart(2, '0')
  const month = String((i % 12) + 1).padStart(2, '0')
  return {
    id: ++SEQ,
    policyNo: `PICC${2026}${String(100000 + i)}`,
    applicant: `客户${String(i + 1).padStart(3, '0')}`,
    plateNo: `浙A·${String(10000 + i * 7).slice(-5)}`,
    insurer: INSURERS[i % INSURERS.length] ?? '人保财险',
    region: REGIONS[i % REGIONS.length] ?? 'zj-hz',
    channel: CHANNELS[i % CHANNELS.length] ?? '电销',
    insuranceTypes: i % 2 === 0 ? ['交强险', '车损险', '三者险'] : ['交强险', '三者险'],
    tags: i % 3 === 0 ? ['v-high'] : i % 3 === 1 ? ['v-mid', 'r-low'] : ['r-high'],
    status: STATUSES[i % STATUSES.length] ?? '待跟进',
    isNew: i % 4 === 0 ? '新车' : '旧车',
    level: (i % 5) + 1,
    premium: PREMIUMS[i % PREMIUMS.length] ?? 2680,
    followCount: i % 6,
    expireDate: `2026-${month}-${day}`,
    followMonth: `2026-${month}`,
    remark: '',
    attach: [],
  }
}

const data: Renewal[] = Array.from({ length: 42 }, (_, i) => buildRecord(i))

/** 已建档投保人集合（用于「投保人核验」快速命中） */
const APPLICANTS = new Set(data.map((d) => d.applicant))

// ==================== 查询参数解析 ====================
function getStr(sp: URLSearchParams, key: string): string {
  return sp.get(key) || ''
}
/** 兼容 axios 默认数组序列化（key[]=a&key[]=b）与逗号拼接两种形式 */
function getArr(sp: URLSearchParams, key: string): string[] {
  const bracket = sp.getAll(key + '[]')
  if (bracket.length) return bracket
  const raw = sp.get(key)
  return raw ? raw.split(',').filter(Boolean) : []
}
function getNum(sp: URLSearchParams, key: string): number {
  const v = sp.get(key)
  return v ? Number(v) : 0
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // 列表查询
  {
    url: '/data/renewal/list',
    method: 'GET',
    response: async (req) => {
      await delay(800)
      const u = new URL(req.url!, 'http://localhost')
      const sp = u.searchParams

      const keyword = getStr(sp, 'keyword')
      const policyNo = getStr(sp, 'policyNo')
      const status = getStr(sp, 'status')
      const insurer = getStr(sp, 'insurer')
      const region = getStr(sp, 'region')
      const channel = getStr(sp, 'channel')
      const insuranceTypes = getArr(sp, 'insuranceTypes')
      const tags = getArr(sp, 'tags')
      const isNew = getStr(sp, 'isNew')
      const premiumMin = getNum(sp, 'premiumMin')
      const premiumMax = getNum(sp, 'premiumMax')
      const followCountMin = getNum(sp, 'followCountMin')
      const levelMin = getNum(sp, 'levelMin')
      const expireRange = getArr(sp, 'expireRange')
      const followMonth = getStr(sp, 'followMonth')
      const onlyExpiring = sp.get('onlyExpiring') === 'true'
      // ydl 后端分页入参为 current / size（VantList requestMap 已映射）
      const pageNo = parseInt(sp.get('current') || sp.get('page') || '1', 10)
      const pageSize = parseInt(sp.get('size') || sp.get('pageSize') || '10', 10)

      let filtered = [...data]

      if (keyword) {
        const kw = keyword.toLowerCase()
        filtered = filtered.filter(
          (r) =>
            r.applicant.toLowerCase().includes(kw) ||
            r.plateNo.toLowerCase().includes(kw) ||
            r.policyNo.toLowerCase().includes(kw),
        )
      }
      if (policyNo) filtered = filtered.filter((r) => r.policyNo.includes(policyNo))
      if (status) filtered = filtered.filter((r) => r.status === status)
      if (insurer) filtered = filtered.filter((r) => r.insurer === insurer)
      if (region) filtered = filtered.filter((r) => r.region === region)
      if (channel) filtered = filtered.filter((r) => r.channel === channel)
      if (isNew) filtered = filtered.filter((r) => r.isNew === isNew)
      if (insuranceTypes.length) {
        filtered = filtered.filter((r) => insuranceTypes.every((t) => r.insuranceTypes.includes(t)))
      }
      if (tags.length) {
        filtered = filtered.filter((r) => tags.some((t) => r.tags.includes(t)))
      }
      if (premiumMin) filtered = filtered.filter((r) => r.premium >= premiumMin)
      if (premiumMax) filtered = filtered.filter((r) => r.premium <= premiumMax)
      if (followCountMin) filtered = filtered.filter((r) => r.followCount >= followCountMin)
      if (levelMin) filtered = filtered.filter((r) => r.level >= levelMin)
      if (expireRange.length === 2) {
        const [s, e] = expireRange
        filtered = filtered.filter((r) => r.expireDate >= s && r.expireDate <= e)
      }
      if (followMonth) filtered = filtered.filter((r) => r.followMonth === followMonth)
      if (onlyExpiring) filtered = filtered.filter((r) => r.expireDate <= '2026-08-31')

      const total = filtered.length
      const start = (pageNo - 1) * pageSize
      const records = filtered.slice(start, start + pageSize)
      const pages = Math.ceil(total / pageSize) || 1

      return ok({ records, current: pageNo, size: pageSize, total, pages })
    },
  },

  // 承保公司联想
  {
    url: '/data/renewal/insurers',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const kw = (u.searchParams.get('keyword') || '').toLowerCase()
      const list = INSURERS.filter((n) => n.toLowerCase().includes(kw)).map((n) => ({
        text: n,
        value: n,
      }))
      return ok(list)
    },
  },

  // 投保人核验：提交前校验投保人是否已建档
  {
    url: '/data/renewal/verify-applicant',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const name = (u.searchParams.get('name') || '').trim()
      const verified = !!name && APPLICANTS.has(name)
      return ok({ verified, applicant: verified ? name : undefined })
    },
  },

  // 详情
  {
    url: '/data/renewal',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const id = parseInt(u.searchParams.get('id') || '0', 10)
      const item = data.find((d) => d.id === id)
      if (!item) return fail('未找到该保源', 404)
      return ok(item)
    },
  },

  // 新增
  {
    url: '/data/renewal',
    method: 'POST',
    response: async (req) => {
      const body = await parseBody(req)
      const item: Renewal = {
        id: ++SEQ,
        policyNo: body.policyNo || `PICC2026${100000 + data.length}`,
        applicant: body.applicant || '',
        plateNo: body.plateNo || '',
        insurer: body.insurer || '',
        region: body.region || '',
        channel: body.channel || '',
        insuranceTypes: body.insuranceTypes ?? [],
        tags: body.tags ?? [],
        status: body.status || '待跟进',
        isNew: body.isNew || '旧车',
        level: Number(body.level) || 1,
        premium: Number(body.premium) || 0,
        followCount: 0,
        expireDate: body.expireDate || '',
        followMonth: body.expireDate ? body.expireDate.slice(0, 7) : '2026-07',
        remark: body.remark || '',
        attach: body.attach ?? [],
      }
      data.unshift(item)
      return ok(item)
    },
  },

  // 编辑
  {
    url: '/data/renewal',
    method: 'PUT',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return fail('未找到该保源', 404)

      const existing = data[idx]!
      const updated: Renewal = {
        ...existing,
        policyNo: body.policyNo ?? existing.policyNo,
        applicant: body.applicant ?? existing.applicant,
        plateNo: body.plateNo ?? existing.plateNo,
        insurer: body.insurer ?? existing.insurer,
        region: body.region ?? existing.region,
        channel: body.channel ?? existing.channel,
        insuranceTypes: body.insuranceTypes ?? existing.insuranceTypes,
        tags: body.tags ?? existing.tags,
        status: body.status ?? existing.status,
        isNew: body.isNew ?? existing.isNew,
        level: body.level != null ? Number(body.level) : existing.level,
        premium: body.premium != null ? Number(body.premium) : existing.premium,
        expireDate: body.expireDate ?? existing.expireDate,
        followMonth:
          body.expireDate && !body.followMonth
            ? body.expireDate.slice(0, 7)
            : (body.followMonth ?? existing.followMonth),
        remark: body.remark ?? existing.remark,
        attach: body.attach ?? existing.attach,
      }
      data[idx] = updated
      return ok(updated)
    },
  },

  // 删除
  {
    url: '/data/renewal',
    method: 'DELETE',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return fail('未找到该保源', 404)
      data.splice(idx, 1)
      return ok(null)
    },
  },
]

export default routes
