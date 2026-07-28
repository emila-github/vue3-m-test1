/**
 * 续保管理（非车）Mock（ydl 模块 §6）
 * 我的续保 / 问题项目 / 项目终止 三类列表 + 反馈提交。
 */
import type { MockRoute } from './types'

function base(i: number, extra: Record<string, any> = {}) {
  return {
    id: 3000 + i,
    comdname: ['福州', '泉州', '厦门'][i % 3],
    comzname: ['鼓楼支公司', '鲤城支公司', '思明支公司'][i % 3],
    appliname: `某某${['物流', '制造', '科技', '贸易'][i % 4]}公司`,
    policyno: `PDAA2025${String(100000 + i)}`,
    coinsnetpremium: 60000 + i * 3200,
    riskcname: ['企财险', '货运险', '机器损坏险', '公众责任险'][i % 4],
    enddate: `2026-${String(((i % 12) + 1)).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`,
    contactsName: ['李服务', '王服务', '陈服务'][i % 3],
    ...extra,
  }
}

const renewedList = Array.from({ length: 14 }, (_, i) =>
  base(i, { renewedStatus: i % 3 }),
)
const questionList = Array.from({ length: 11 }, (_, i) =>
  base(i, {
    questionStatus: i % 3,
    questionType: (i % 4) + 1,
    questionDelayStatus: i % 2,
    teamFlag: i % 2,
    dutyName: ['张经理', '李经理', '王经理'][i % 3],
    auditContent: i % 2 ? '建议优先跟进' : '正常推进',
    remainDay: 5 + (i % 10),
    questionContent: `客户对${['价格', '承保条件', '同业竞争', '客户流失'][i % 4]}存在疑虑`,
    questionFeedback: i % 2 ? '已电话沟通，持续跟进' : '',
  }),
)
const endList = Array.from({ length: 9 }, (_, i) =>
  base(i, {
    endStatus: i % 3,
    endType: (i % 3) + 1,
    endDelayStatus: i % 2,
    teamFlag: i % 2,
    dutyName: ['张经理', '李经理', '王经理'][i % 3],
    auditContent: i % 2 ? '建议优先跟进' : '正常推进',
    endCommitDate: `2026-${String(((i % 12) + 1)).padStart(2, '0')}-${String(((i * 5) % 27) + 1).padStart(2, '0')}`,
    remainDay: 3 + (i % 12),
    endContent: `客户因${['经营调整', '预算缩减', '转投同业'][i % 3]}申请终止`,
  }),
)

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

function pageOf(records: any[], req: any) {
  const q = parseQuery(req.url)
  const page = Number(q.page || q.current || 1)
  const size = Number(q.pageSize || q.size || 10)
  const start = (page - 1) * size
  return ok({ records: records.slice(start, start + size), total: records.length, current: page, size })
}

const routes: MockRoute[] = [
  { url: '/xb/xbExtendInfo/renewedList', method: 'GET', response: (req) => pageOf(renewedList, req) },
  { url: '/xb/xbExtendInfo/questionList', method: 'GET', response: (req) => pageOf(questionList, req) },
  { url: '/xb/xbExtendInfo/endList', method: 'GET', response: (req) => pageOf(endList, req) },
  { url: '/xb/xbExtendInfo/questionInput', method: 'POST', response: () => ok({ message: '问题反馈提交成功' }) },
  { url: '/xb/xbExtendInfo/endInput', method: 'POST', response: () => ok({ message: '终止反馈提交成功' }) },
  { url: '/xb/xbFeedbackData/add', method: 'POST', response: () => ok({ message: '续保反馈提交成功' }) },
]

export default routes
