/**
 * 数据统计模块 Mock（ydl，JeecgBoot 风格）
 *
 * 对应需求文档 §3：数据汇总 / 跟踪统计 / 劳效统计。
 * 均为数组返回（首行 departName='合计'），不分页。
 */
import type { MockRoute } from './types'

const analysisRows = [
  {
    departName: '合计',
    newCount: 120,
    visitCount: 340,
    doorVisitCount: 210,
    commentCount: 272,
    commentCountPercent: '80.00%',
    successCount: 88,
    policyFee: 1258000.0,
    noAddDay: 0,
    totalCount: 5600,
    distributeCount: 4200,
    distributeCountPercent: '75.00%',
    visitSourceCount: 3100,
    visitSourceCountPercent: '73.81%',
    trackCount: 900,
  },
  {
    departName: '福州市分公司',
    newCount: 45,
    visitCount: 130,
    doorVisitCount: 80,
    commentCount: 104,
    commentCountPercent: '80.00%',
    successCount: 32,
    policyFee: 468000.0,
    noAddDay: 2,
    totalCount: 2100,
    distributeCount: 1500,
    distributeCountPercent: '71.43%',
    visitSourceCount: 1100,
    visitSourceCountPercent: '73.33%',
    trackCount: 320,
  },
  {
    departName: '泉州市分公司',
    newCount: 38,
    visitCount: 110,
    doorVisitCount: 70,
    commentCount: 90,
    commentCountPercent: '81.82%',
    successCount: 30,
    policyFee: 422000.0,
    noAddDay: 1,
    totalCount: 1900,
    distributeCount: 1400,
    distributeCountPercent: '73.68%',
    visitSourceCount: 1300,
    visitSourceCountPercent: '74.29%',
    trackCount: 360,
  },
]

const userSummaryRows = [
  {
    departName: '合计',
    visitCount: 340,
    memberCount: 60,
    visitMemberCount: 52,
    memberVisitCountPercent: '86.67%',
    visitPerUser: 6.5,
    visitSourceCount: 310,
    successCount: 88,
    visitSuccessPercent: '28.39%',
    policyCount: 90,
    policyCountPerUser: 1.73,
    policyFee: 1258000.0,
    policyFeePerUser: 24192.31,
  },
  {
    departName: '福州市分公司',
    visitCount: 130,
    memberCount: 22,
    visitMemberCount: 20,
    memberVisitCountPercent: '90.91%',
    visitPerUser: 6.5,
    visitSourceCount: 118,
    successCount: 32,
    visitSuccessPercent: '27.12%',
    policyCount: 33,
    policyCountPerUser: 1.65,
    policyFee: 468000.0,
    policyFeePerUser: 23400.0,
  },
]

const trackSummaryRows = [
  {
    departName: '合计',
    newCount: 120,
    visitCount: 340,
    doorVisitCount: 210,
    commentCount: 272,
    commentCountPercent: '80.00%',
    successCount: 88,
    policyFee: 1258000.0,
  },
  {
    departName: '福州市分公司',
    newCount: 45,
    visitCount: 130,
    doorVisitCount: 80,
    commentCount: 104,
    commentCountPercent: '80.00%',
    successCount: 32,
    policyFee: 468000.0,
  },
]

function ok(result: unknown) {
  return {
    success: true,
    code: 200,
    message: '成功',
    result,
    timestamp: Date.now(),
  }
}

// ==================== 拜访明细（分页生成） ====================
const visitOrgs = [
  { parentOrg: '福州市分公司', createOrg: '鼓楼支公司' },
  { parentOrg: '福州市分公司', createOrg: '台江支公司' },
  { parentOrg: '泉州市分公司', createOrg: '鲤城支公司' },
  { parentOrg: '厦门市分公司', createOrg: '思明支公司' },
]
const industries = ['制造业', '批发零售', '建筑工程', '交通运输', '餐饮服务']
const riskTypes = ['企财险', '责任险', '货运险', '工程险']
const visitTypeText = ['', '电话拜访', '上门拜访', '微信拜访']
const visitProcessText = ['', '初次接洽', '需求确认', '方案报价', '促成签单']
const leaderCommentText = ['', '一般', '良好', '优秀']
const visitRecords = Array.from({ length: 23 }, (_, i) => {
  const n = i + 1
  const org = visitOrgs[i % visitOrgs.length]!!
  const isProject = n % 4 === 0
  return {
    id: n,
    parentOrg: org.parentOrg,
    createOrg: org.createOrg,
    customerName: `客户单位${String(n).padStart(3, '0')}号`,
    customerAddress: `${org.parentOrg}${org.createOrg}片区XX路${n}号`,
    contactsName: ['张三', '李四', '王五', '赵六'][i % 4],
    contactsPhone: `138${String(10000000 + n * 137).slice(0, 8)}`,
    industryName: industries[i % industries.length],
    distributeTime: `2026-07-01 09:00:00`,
    realName: ['李业务', '陈经理', '黄专员'][i % 3],
    mriskTypeName: riskTypes[i % riskTypes.length],
    yriskTypeName: riskTypes[(i + 1) % riskTypes.length],
    visitTime: `2026-07-${String((n % 27) + 1).padStart(2, '0')} 14:00:00`,
    createTime: `2026-07-${String((n % 27) + 1).padStart(2, '0')} 14:${String(n % 9)}0`,
    visitTypeCode: n % 3,
    visitProcess: (n % 4) + 1,
    customerProjectName: isProject ? `工程项目${n}` : '',
    planDate: `2026-08-${String((n % 27) + 1).padStart(2, '0')}`,
    planAmount: 20000 + n * 1500,
    remark: n % 2 ? '客户有意向，持续跟进' : '已初步接触',
    reviewer: '王经理',
    comments: '跟进及时',
    commentsLv: (n % 3) + 1,
    upFlag: n % 3 === 0 ? 'Y' : 'N',
    upContent: n % 3 === 0 ? '总公司专家支持' : '',
    nextVisitTime: `2026-07-${String(((n + 7) % 27) + 1).padStart(2, '0')}`,
    updateTime: `2026-07-${String((n % 27) + 1).padStart(2, '0')} 15:00:00`,
    labelName: n % 2 ? '重点客户' : '普通客户',
    projectArea: isProject ? '华东' : '',
    projectContent: isProject ? '厂房建设' : '',
    projectProgress: isProject ? '进行中' : '',
    projectUnit: isProject ? '建设单位' : '',
    projectParentUnit: isProject ? '集团总部' : '',
    projectLevel: isProject ? '1' : '',
  }
})

// ==================== 签单明细（分页生成） ====================
const policyRecords = Array.from({ length: 23 }, (_, i) => {
  const n = i + 1
  const org = visitOrgs[i % visitOrgs.length]!!
  const renew = (n % 3) + 1
  return {
    id: n,
    parentName: org.parentOrg,
    departName: org.createOrg,
    taskUserRealName: ['李业务', '陈经理', '黄专员'][i % 3],
    customerName: `客户单位${String(n).padStart(3, '0')}号`,
    policyNo: `PDAA2026${String(100000 + n)}`,
    renewFlag: renew,
    policyFee: 12000 + n * 2600,
    createTime: `2026-07-${String((n % 27) + 1).padStart(2, '0')} 10:00:00`,
    bgnDate: `2026-07-${String((n % 27) + 1).padStart(2, '0')}`,
    applicantName: `客户单位${String(n).padStart(3, '0')}号`,
    insuredName: `客户单位${String(n).padStart(3, '0')}号`,
    isCustomerMatch: n % 4 === 0 ? 0 : 1,
  }
})

// 解析 query（从 req.url）
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

function pageOf(records: any[], url = ''): unknown {
  const q = parseQuery(url)
  const page = Number(q.page || q.pageNo || 1)
  const size = Number(q.pageSize || q.size || 10)
  const start = (page - 1) * size
  return ok({
    records: records.slice(start, start + size),
    total: records.length,
    current: page,
    size,
  })
}

const routes: MockRoute[] = [
  {
    url: '/data/mainPageData/mainPage',
    method: 'GET',
    response: () => ok(analysisRows),
  },
  {
    url: '/data/mainPageData/getUserSummary',
    method: 'GET',
    response: () => ok(userSummaryRows),
  },
  {
    url: '/data/mainPageData/trackSummary',
    method: 'GET',
    response: () => ok(trackSummaryRows),
  },
  {
    url: '/data/visitTracks/queryVisitAllList',
    method: 'GET',
    response: (req) => pageOf(visitRecords, req.url),
  },
  {
    url: '/data/visitTracks/exportXlsNewWx',
    method: 'GET',
    response: () => ({
      success: true,
      code: 200,
      message: '导出任务已提交，结果将通过企业微信推送至您的账号',
      result: null,
      timestamp: Date.now(),
    }),
  },
  {
    url: '/data/mainPageData/policySummary',
    method: 'GET',
    response: (req) => pageOf(policyRecords, req.url),
  },
  {
    url: '/data/mainPageData/policySummaryExportWx',
    method: 'GET',
    response: () => ({
      success: true,
      code: 200,
      message: '导出任务已提交，结果将通过企业微信推送至您的账号',
      result: null,
      timestamp: Date.now(),
    }),
  },
]

export default routes
