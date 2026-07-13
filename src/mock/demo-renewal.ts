/**
 * 保源信息维护（车险续保保源）Mock 数据
 *
 * 接口（均带 /demo 前缀，避免与正式项目冲突）：
 *   GET  /demo/renewal/list        — 列表查询（搜索 / 分页 / 多条件过滤）
 *   GET  /demo/renewal             — 详情查询
 *   POST /demo/renewal             — 新增保源
 *   PUT  /demo/renewal             — 编辑保源
 *   DEL  /demo/renewal             — 删除保源
 *   GET  /demo/renewal/insurers    — 承保公司联想
 */
import type { MockRoute } from './types'

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
  // 列表查询
  {
    url: '/demo/renewal/list',
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
      const page = parseInt(sp.get('page') || '1', 10)
      const pageSize = parseInt(sp.get('pageSize') || '10', 10)

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
      const start = (page - 1) * pageSize
      const list = filtered.slice(start, start + pageSize)

      return { code: 200, data: { list, total, page, pageSize }, message: 'ok' }
    },
  },

  // 承保公司联想
  {
    url: '/demo/renewal/insurers',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const kw = (u.searchParams.get('keyword') || '').toLowerCase()
      const list = INSURERS.filter((n) => n.toLowerCase().includes(kw)).map((n) => ({
        text: n,
        value: n,
      }))
      return { code: 200, data: list, message: 'ok' }
    },
  },

  // 详情
  {
    url: '/demo/renewal',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const id = parseInt(u.searchParams.get('id') || '0', 10)
      const item = data.find((d) => d.id === id)
      if (!item) return { code: 404, data: null, message: '未找到该保源' }
      return { code: 200, data: item, message: 'ok' }
    },
  },

  // 新增
  {
    url: '/demo/renewal',
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
      return { code: 200, data: item, message: '新增成功' }
    },
  },

  // 编辑
  {
    url: '/demo/renewal',
    method: 'PUT',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该保源' }

      const existing = data[idx]
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
      return { code: 200, data: updated, message: '更新成功' }
    },
  },

  // 删除
  {
    url: '/demo/renewal',
    method: 'DELETE',
    response: async (req) => {
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该保源' }
      data.splice(idx, 1)
      return { code: 200, data: null, message: '删除成功' }
    },
  },
]

export default routes
