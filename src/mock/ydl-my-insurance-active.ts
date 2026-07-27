/**
 * 我的保源 —— 活动量（MyInsuranceActive）Mock 数据 —— ydl（JeecgBoot 风格）
 *
 * 由 mock 插件挂载在 /ydl-api 前缀下拦截（对应 ydlClient 的 baseURL）。
 * 响应统一为 JeecgBoot 包络：{ success, code, message, result, timestamp }。
 *
 * 接口（不含 /ydl-api 前缀）：
 *   GET  /data/visitTracks/queryVisitList  — 活动量分页列表
 *   POST /data/visitTracks/add             — 新增活动量
 *   PUT  /data/visitTracks/edit            — 编辑活动量
 *   GET  /data/visitTracks/queryById       — 活动量回显（编辑/点评/详情）
 *   PUT  /data/visitTracks/comments        — 活动量点评（领导）
 *   POST /data/visitTracks/delete          — 删除活动量
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

interface VisitTrack {
  id: string
  sourceId: string
  realName: string
  visitTypeCode: number
  visitProcess: number
  visitTime: string
  updateTime: string
  remark: string
  commentsLv: number
  comments: string
  signInImgUrl: string
  signInPosAddr: string
  signInTime?: string
  mriskTypeCode?: string
  bussinessBelong?: number
  bussinessBelongOther?: string
  insuranceCondition?: string
  planDate?: string
  planAmount?: number
  planSumamount?: number
  continueFlag?: number
  upFlag?: string
  upContent?: string
  targetName?: string
  targetPosition?: string
  targetPhone?: string
  nextVisitTime?: string
  isSelfData: boolean
}

const visitMap = new Map<string, VisitTrack[]>()

const REALNAMES = ['张经理', '李主管', '王总监', '赵专员', '陈业务员']
const VISIT_TYPES = [0, 1, 2]
const PROCESSES = [0, 1, 2, 3]
const COMMENTS = [
  '客户意向明确，建议本周跟进签单。',
  '需补充材料后再跟进。',
  '已签单，等待出单。',
  '',
]
const ADDRS = ['杭州市滨江区科技大道 1 号', '宁波市鄞州区中山北路 8 号', '温州市鹿城区人民路 12 号']
const RISK_CODES = ['PP1001', 'PP200101', 'PP200401', 'PP201101', 'PP3001', 'PP201501']

function dt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 带边界保护的数组取值（避免 noUncheckedIndexedAccess 下出现 string | undefined）
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!
}

function seedVisit(sourceId: string) {
  if (visitMap.has(sourceId)) return
  const n = 3 + (sourceId.charCodeAt(sourceId.length - 1) % 3) // 3~5 条
  const visits: VisitTrack[] = Array.from({ length: n }, (_, i) => {
    const vt = pick(VISIT_TYPES, i + 1)
    const proc = pick(PROCESSES, i)
    const d = new Date()
    d.setDate(d.getDate() - i * 3)
    const visitTime = dt(d)
    const isDoor = vt === 2
    return {
      id: `VT${sourceId}-${i}`,
      sourceId,
      realName: pick(REALNAMES, i),
      visitTypeCode: vt,
      visitProcess: proc,
      visitTime,
      updateTime: visitTime,
      remark: pick(COMMENTS, i),
      commentsLv: i % 4 === 3 ? 0 : (i % 3) + 1, // 末条模拟「待点评」
      comments: i % 4 === 3 ? '' : pick(COMMENTS, i),
      signInImgUrl: isDoor && i % 2 === 0 ? 'https://example.com/signin.jpg' : '',
      signInPosAddr: isDoor ? pick(ADDRS, i) : '',
      signInTime: visitTime,
      mriskTypeCode: pick(RISK_CODES, i),
      bussinessBelong: proc === 2 ? i % 9 : undefined,
      bussinessBelongOther: proc === 2 && i % 9 === 9 ? '其他同业公司' : undefined,
      insuranceCondition: proc === 2 ? '承保条件待进一步确认。' : undefined,
      planDate: proc === 1 ? `2026-0${(i % 2) + 7}-1${i % 9}` : undefined,
      planAmount: proc === 1 ? (i + 1) * 5000 : undefined,
      planSumamount: proc === 1 ? (i + 1) * 8000 : undefined,
      continueFlag: 1,
      upFlag: i % 2 === 0 ? 'Y' : 'N',
      upContent: i % 2 === 0 ? '建议总公司提供产品培训支持。' : undefined,
      targetName: `${pick(REALNAMES, i).slice(0, 1)}总`,
      targetPosition: '采购总监',
      targetPhone: `138${pad((i * 137) % 100000000, 8)}`,
      nextVisitTime: i % 4 === 3 ? undefined : `2026-08-0${(i % 2) + 1} 10:00:00`,
      isSelfData: i % 2 === 0,
    }
  })
  visitMap.set(sourceId, visits)
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // ===== 活动量列表 =====
  {
    url: '/data/visitTracks/queryVisitList',
    method: 'GET',
    response: async (req) => {
      await delay(500)
      const sp = qs(req)
      const sourceId = sp.get('sourceId') || ''
      const pageNo = parseInt(sp.get('pageNo') || '1', 10)
      const pageSize = parseInt(sp.get('pageSize') || '10', 10)
      seedVisit(sourceId)
      const all = [...(visitMap.get(sourceId) || [])]
      all.sort((a, b) => (a.updateTime < b.updateTime ? 1 : -1))
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
    url: '/data/visitTracks/add',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const sourceId = b.sourceId || ''
      seedVisit(sourceId)
      const now = new Date()
      const item: VisitTrack = {
        id: `VT${sourceId}-${Date.now()}`,
        sourceId,
        realName: b.realName || '当前用户',
        visitTypeCode: Number(b.visitTypeCode) || 0,
        visitProcess: Number(b.visitProcess) || 0,
        visitTime: b.visitTime || dt(now),
        updateTime: dt(now),
        remark: b.remark || '',
        commentsLv: Number(b.commentsLv) || 0,
        comments: b.comments || '',
        signInImgUrl: b.signInImgUrl || '',
        signInPosAddr: b.signInPosAddr || '',
        signInTime: b.signInTime || dt(now),
        mriskTypeCode: b.mriskTypeCode,
        bussinessBelong: b.bussinessBelong != null ? Number(b.bussinessBelong) : undefined,
        bussinessBelongOther: b.bussinessBelongOther,
        insuranceCondition: b.insuranceCondition,
        planDate: b.planDate,
        planAmount: b.planAmount != null ? Number(b.planAmount) : undefined,
        planSumamount: b.planSumamount != null ? Number(b.planSumamount) : undefined,
        continueFlag: b.continueFlag != null ? Number(b.continueFlag) : 1,
        upFlag: b.upFlag || 'N',
        upContent: b.upContent,
        targetName: b.targetName,
        targetPosition: b.targetPosition,
        targetPhone: b.targetPhone,
        nextVisitTime: b.nextVisitTime,
        isSelfData: true,
      }
      visitMap.get(sourceId)!.unshift(item)
      return ok(item)
    },
  },
  {
    url: '/data/visitTracks/edit',
    method: 'PUT',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const list = visitMap.get(b.sourceId) || []
      const idx = list.findIndex((x) => x.id === b.id)
      if (idx === -1) return fail('未找到该活动量记录', 404)
      list[idx] = { ...list[idx]!, ...b, updateTime: dt(new Date()) }
      return ok(list[idx])
    },
  },
  // 活动量回显（编辑/点评/详情）
  {
    url: '/data/visitTracks/queryById',
    method: 'GET',
    response: (req) => {
      const id = new URL(req.url!, 'http://localhost').searchParams.get('id') || ''
      for (const list of visitMap.values()) {
        const item = list.find((x) => x.id === id)
        if (item) return ok(item)
      }
      return fail('未找到该活动量记录', 404)
    },
  },
  // 活动量点评（领导）：仅更新 comments / commentsLv / nextVisitTime
  {
    url: '/data/visitTracks/comments',
    method: 'PUT',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      for (const list of visitMap.values()) {
        const idx = list.findIndex((x) => x.id === b.id)
        if (idx !== -1) {
          const cur = list[idx]!
          list[idx] = {
            ...cur,
            comments: b.comments || '',
            commentsLv: Number(b.commentsLv) || 0,
            nextVisitTime: b.nextVisitTime || '',
            updateTime: dt(new Date()),
          }
          return ok(list[idx])
        }
      }
      return fail('未找到该活动量记录', 404)
    },
  },
  {
    url: '/data/visitTracks/delete',
    method: 'POST',
    response: async (req) => {
      await delay(300)
      const b = await parseBody(req)
      const id = b.id || ''
      for (const list of visitMap.values()) {
        const i = list.findIndex((x) => x.id === id)
        if (i !== -1) {
          list.splice(i, 1)
          return ok(true)
        }
      }
      return fail('未找到该活动量记录', 404)
    },
  },
]

export default routes
