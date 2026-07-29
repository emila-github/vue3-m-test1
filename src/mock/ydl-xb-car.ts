/**
 * 车险续保管理 Mock（ydl 模块 §7）
 * 我的续保列表（分页）。反馈提交复用 ydl-xb 的 /xb/xbFeedbackData/add。
 */
import type { MockRoute } from './types'

const rows = Array.from({ length: 13 }, (_, i) => ({
  id: 4000 + i,
  showStatus: (i % 4) + 1,
  comdname: ['福州', '泉州', '厦门'][i % 3],
  comzname: ['鼓楼支公司', '鲤城支公司', '思明支公司'][i % 3],
  dutyName: ['王服务', '李服务', '陈服务'][i % 3],
  licenseno: `闽A${10000 + i * 37}`,
  frameno: `LFV${10000000000 + i}`,
  energyflag: i % 3 === 0 ? 1 : 0,
  renewedStatus: i % 3,
  appliname: ['张三', '李四', '王五', '赵六'][i % 4],
  insuredname: ['张三', '李四', '王五', '赵六'][i % 4],
  coinsnetpremium: 3200 + i * 280,
  startdate: `2025-08-01`,
  enddate: `2026-${String(((i % 12) + 1)).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
  policyno: `PDAM2025${String(100000 + i)}`,
  endBtnStatus: i % 2 === 0 ? 1 : 2,
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
    url: '/xb/xbExtendInfoCar/renewedList',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const page = Number(q.page || q.current || 1)
      const size = Number(q.pageSize || q.size || 10)
      let list = rows.slice()
      const pn = q.policyno
      const ln = q.licenseno
      if (pn) list = list.filter((r) => r.policyno.includes(pn))
      if (ln) list = list.filter((r) => r.licenseno.includes(ln))
      const fn = q.frameno ?? ''
      if (fn) list = list.filter((r) => r.frameno.includes(fn))
      if (q.energyflag !== undefined && q.energyflag !== '')
        list = list.filter((r) => String(r.energyflag) === q.energyflag)
      if (q.renewedStatus !== undefined && q.renewedStatus !== '')
        list = list.filter((r) => String(r.renewedStatus) === q.renewedStatus)
      if (q.showStatus !== undefined && q.showStatus !== '')
        list = list.filter((r) => String(r.showStatus) === q.showStatus)
      const start = (page - 1) * size
      return ok({ records: list.slice(start, start + size), total: list.length, current: page, size })
    },
  },
  {
    // 详情（基本信息）：GET /xb/xbExtendInfoCar/renewedSearchByPolicyNo?policyNo=xxx
    url: '/xb/xbExtendInfoCar/renewedSearchByPolicyNo',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      const row = rows.find((r) => r.policyno === q.policyNo) || rows[0]
      return ok({ ...row, usenature: '家庭自用,非营业' })
    },
  },
  {
    // 续保反馈回显（返回 result.feedbackContent / result.dayFlag，-dayFlag 表示到期前天数）
    url: '/xb/xbFeedbackData/getCurrentFeedbackCarData',
    method: 'GET',
    response: (req) => {
      const q = parseQuery(req.url)
      return ok({
        id: q.id || 'mock-id',
        policyNo: q.policyNo || '',
        feedbackContent: '客户暂未确认续保意向，持续跟进中',
        feedbackUsername: 'admin',
        feedbackRealname: '系统管理员',
        feedbackFlag: 0,
        isLastRecord: 1,
        dayFlag: -30,
        isDelay: 1,
      })
    },
  },
  {
    url: '/xb/xbExtendInfoCar/endInput',
    method: 'POST',
    response: () => ok({ message: '项目终止提交成功' }),
  },
  {
    url: '/xb/xbExtendInfoCar/endPass',
    method: 'POST',
    response: () => ok({ message: '取消终止成功' }),
  },
  {
    url: '/xb/xbExtendInfoCar/back',
    method: 'POST',
    response: () => ok({ message: '退回业务提交成功' }),
  },
  {
    url: '/xb/xbExtendInfoCar/renewedInput',
    method: 'POST',
    response: () => ok({ message: '提交成功' }),
  },
]

export default routes
