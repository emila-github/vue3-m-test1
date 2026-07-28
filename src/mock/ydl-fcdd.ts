/**
 * 非车待续保跟踪 Mock（ydl 工作台模块 §4.2）
 * 列表分页 + 详情（保单 + 历史反馈）+ 反馈提交。
 */
import type { MockRoute } from './types'

const policys = Array.from({ length: 17 }, (_, i) => {
  const n = i + 1
  const feedback = n % 3 === 0 ? 1 : n % 3 === 1 ? 2 : 0
  const renewal = n % 4 === 0 ? 1 : n % 5 === 0 ? 2 : 0
  return {
    id: 2000 + n,
    policyno: `PDDD2025${String(100000 + n)}`,
    appliname: `某某${['制造', '贸易', '科技', '物流', '建筑'][i % 5]}公司`,
    riskcname: ['企财险', '机器损坏险', '公众责任险', '货运险', '工程险'][i % 5],
    enddate: `2026-${String(((n % 12) + 1)).padStart(2, '0')}-${String(((n * 3) % 27) + 1).padStart(2, '0')}`,
    coinsnetpremium: 30000 + n * 4200,
    feedbackflag: feedback,
    renewalstatus: renewal,
  }
})

const feedbackHistory: Record<string, { id: number; reason: string; content: string; feedbackTime: string }[]> = {
  '2003': [
    { id: 1, reason: '1', content: '客户续保意向强，已安排专人跟进', feedbackTime: '2026-07-20 10:00:00' },
  ],
}

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
    url: '/data/fcddPolicyMain/list',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const page = Number(q.page || q.current || 1)
      const size = Number(q.pageSize || q.size || 10)
      let list = policys.slice()
      const pn = q.policyno
      if (pn) list = list.filter((p) => p.policyno.includes(pn))
      if (q.feedbackflag !== undefined && q.feedbackflag !== '')
        list = list.filter((p) => String(p.feedbackflag) === q.feedbackflag)
      if (q.renewalstatus !== undefined && q.renewalstatus !== '')
        list = list.filter((p) => String(p.renewalstatus) === q.renewalstatus)
      if (q.dayType && q.dayType !== '0') {
        // 按到期天数简单筛选（演示）：1→30内 2→60内 3→90内
        const limit = Number(q.dayType) * 30
        const now = new Date('2026-07-28').getTime()
        list = list.filter((p) => {
          const d = new Date(p.enddate).getTime() - now
          return d >= 0 && d <= limit * 86400000
        })
      }
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, current: page, size })
    },
  },
  {
    url: '/data/fcddPolicyMain/detail',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const policy = policys.find((p) => String(p.id) === String(q.id)) || policys[0]
      return ok({
        policy,
        feedbackList: feedbackHistory[String(q.id)] || [],
      })
    },
  },
  {
    url: '/data/fcddPolicyMain/feedBack',
    method: 'POST',
    response: () => ok({ message: '反馈提交成功' }),
  },
]

export default routes
