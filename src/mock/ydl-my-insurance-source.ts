/**
 * 我的保源（MyInsuranceSource）Mock 数据 —— ydl（JeecgBoot 风格）
 *
 * 由 mock 插件挂载在 /ydl-api 前缀下拦截（对应 ydlClient 的 baseURL）。
 * 响应统一为 JeecgBoot 包络：{ success, code, message, result, timestamp }。
 *
 * 接口（不含 /ydl-api 前缀，由 mock 插件在 /ydl-api 下挂载）：
 *   GET /data/insuraceSourceDistribution/querySelf  — 我的保源分页列表
 *   GET /data/insuraceSource/queryDetailById         — 保源详情
 *   GET /system/sysUserGroup/hasGroup                — 团队校验
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

/** 解析请求体（POST/PUT） */
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
interface SourceRecord {
  id: string
  customerName: string
  customerAddress: string
  contactsName: string
  contactsPhone: string
  waitComments: number
  updateTime: string
  /** 是否本人数据（供 isSelf 过滤） */
  isSelf: boolean
  /** 统一社会信用码（编辑回显 / 提交） */
  socialCreditCode: string
  /** 产品线 id 数组（列表项直接携带，供内置编辑回填） */
  productLine: string[]
  /** 保源标签 id 数组 */
  customerLabel: string[]
}

// 新增 / 编辑 用下拉选项（产品线 / 标签）
const PRODUCT_LINE_OPTIONS: { id: string; name: string }[] = [
  { id: 'PL01', name: '团财险' },
  { id: 'PL02', name: '车险' },
  { id: 'PL03', name: '农险' },
  { id: 'PL04', name: '意健险' },
]
const LABEL_OPTIONS: { id: string; name: string }[] = [
  { id: 'LB01', name: '重点客户' },
  { id: 'LB02', name: '续保客户' },
  { id: 'LB03', name: '高潜力' },
  { id: 'LB04', name: '需回访' },
]

// 产品线 → 对应推荐险种（详情「已保险种 / 推荐险种」按所选产品线生成，保证与列表选择一致）
const PL_RISKY: Record<string, string[]> = {
  PL01: ['财产综合险', '雇主责任险', '公众责任险'],
  PL02: ['机动车损失险', '第三者责任险'],
  PL03: ['种植业保险', '养殖业保险'],
  PL04: ['意外伤害险', '健康险'],
}
// 城市 → 区号（详情单位电话按所属城市生成，更真实）
const CITY_AREA: Record<string, string> = {
  杭州市: '0571',
  宁波市: '0574',
  温州市: '0577',
  南京市: '025',
  苏州市: '0512',
  上海市: '021',
}
const BRANCHES = [
  '杭州分公司',
  '宁波分公司',
  '温州分公司',
  '南京分公司',
  '苏州分公司',
  '上海分公司',
]

// ==================== 种子数据 ====================
const CITIES = ['杭州市', '宁波市', '温州市', '南京市', '苏州市', '上海市']
const STREETS = ['科技大道', '解放路', '中山北路', '人民广场', '滨江大道', '文一西路']
const SURNAMES = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴']
const COMPANY_SUFFIX = [
  '科技有限公司',
  '贸易有限公司',
  '建筑工程公司',
  '物流有限公司',
  '餐饮管理公司',
]

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

// 本周一 00:00（作为 updateTime 基准，保证"近期"(本周)过滤稳定有数据，与前端 ydlThisWeekRange 同口径）
function weekMonday(): Date {
  const n = new Date()
  const wd = n.getDay() || 7 // 周日 0 → 7
  const m = new Date(n)
  m.setDate(n.getDate() - wd + 1)
  m.setHours(0, 0, 0, 0)
  return m
}
const WEEK_MONDAY = weekMonday()

function buildRecord(i: number): SourceRecord {
  const surname = SURNAMES[i % SURNAMES.length] ?? '王'
  const city = CITIES[i % CITIES.length] ?? '杭州市'
  const street = STREETS[i % STREETS.length] ?? '科技大道'
  // 更新时间分布在本周 周一~周日（i%7 → 0~6 天偏移），确保"近期"过滤有数据
  const d = new Date(WEEK_MONDAY)
  d.setDate(WEEK_MONDAY.getDate() + (i % 7))
  const updateTime = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(9 + (i % 8))}:${pad((i * 7) % 60)}:00`
  // waitComments：约 1/3 为待点评(1)，1/6 为新增(2)，其余 0
  const waitComments = i % 3 === 0 ? 1 : i % 6 === 5 ? 2 : 0
  // 产品线 / 标签：模拟勾选 1~3 / 1~2 项（数组形式，供内置编辑回填）
  const plCount = (i % 3) + 1
  const lbCount = (i % 2) + 1
  const productLine = PRODUCT_LINE_OPTIONS.slice(0, plCount).map((o) => o.id)
  const customerLabel = LABEL_OPTIONS.slice(0, lbCount).map((o) => o.id)
  return {
    id: `IS${pad(202600 + i, 8)}`,
    customerName: `${city.slice(0, 2)}${surname}氏${COMPANY_SUFFIX[i % COMPANY_SUFFIX.length]}`,
    customerAddress: `${city}${street}${(i % 200) + 1}号`,
    contactsName: `${surname}${['经理', '主管', '总监', '专员'][i % 4]}`,
    contactsPhone: `1${['3', '5', '7', '8', '9'][i % 5]}${pad((i * 137) % 100000000, 9)}`.slice(
      0,
      11,
    ),
    waitComments,
    updateTime,
    isSelf: i % 2 === 0,
    socialCreditCode: `9133${pad((i * 999983) % 100000000000000, 14)}`.slice(0, 18),
    productLine,
    customerLabel,
  }
}

const data: SourceRecord[] = Array.from({ length: 34 }, (_, i) => buildRecord(i))

// ==================== 详情构造（列表项 → 完整详情） ====================
const INDUSTRIES = ['批发和零售业', '制造业', '建筑业', '交通运输业', '住宿和餐饮业']

function buildDetail(item: SourceRecord) {
  const idx = data.indexOf(item)
  // 产品线 / 标签 / 险种：全部以该记录实际勾选的数组为准（避免与列表选择脱节）
  const plNames = item.productLine
    .map((id) => PRODUCT_LINE_OPTIONS.find((o) => o.id === id)?.name)
    .filter(Boolean)
  const lbNames = item.customerLabel
    .map((id) => LABEL_OPTIONS.find((o) => o.id === id)?.name)
    .filter(Boolean)
  const riskys: string[] = item.productLine.flatMap((id) => PL_RISKY[id] ?? [])
  const city = item.customerAddress.slice(0, 3)
  const area = CITY_AREA[city] ?? '0571'
  return {
    socialCreditCode: item.socialCreditCode,
    customerName: item.customerName,
    customerAddress: item.customerAddress,
    industryTypeName: INDUSTRIES[idx % INDUSTRIES.length],
    registerCapital: `${(idx % 20) * 50 + 100}万元`,
    companyPhone: `${area}-8${pad((idx * 7919) % 1000000, 7)}`.slice(0, 13),
    contactsDepartment: ['行政部', '财务部', '业务部', '综合办'][idx % 4],
    contactsPosition: ['经理', '主管', '总监', '专员'][idx % 4],
    contactsName: item.contactsName,
    contactsPhone: item.contactsPhone,
    productLineStr: plNames.join('、'),
    yriskyTypeStr: riskys.join('、'),
    remark: idx % 4 === 0 ? '客户有较强续保意向，建议一周内跟进。' : '',
    labelList: lbNames.map((labelName, li) => ({
      id: `${item.id}-L${li}`,
      labelName,
    })),
    recommends: riskys.slice(0, 3).map((riskyName, ri) => ({
      id: `${item.id}-R${ri}`,
      riskyName,
      fee: `${(ri + 1) * 1200 + (idx % 5) * 300}`,
    })),
  }
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // 我的保源分页列表
  {
    url: '/data/insuraceSourceDistribution/querySelf',
    method: 'GET',
    response: async (req) => {
      await delay(600)
      const u = new URL(req.url!, 'http://localhost')
      const sp = u.searchParams
      const pageNo = parseInt(sp.get('pageNo') || '1', 10)
      const pageSize = parseInt(sp.get('pageSize') || '10', 10)
      const customerName = sp.get('customerName') || ''
      const isSelf = sp.get('isSelf') === 'true'
      const isWaitComments = sp.get('isWaitComments') === '1'
      const begin = sp.get('updateTimeBegin') || ''
      const end = sp.get('updateTimeEnd') || ''

      let filtered = [...data]
      if (customerName) filtered = filtered.filter((r) => r.customerName.includes(customerName))
      if (isSelf) filtered = filtered.filter((r) => r.isSelf)
      if (isWaitComments)
        filtered = filtered.filter((r) => r.waitComments === 1 || r.waitComments === 2)
      if (begin) filtered = filtered.filter((r) => r.updateTime.slice(0, 10) >= begin)
      if (end) filtered = filtered.filter((r) => r.updateTime.slice(0, 10) <= end)

      // 按 updateTime 倒序
      filtered.sort((a, b) => (a.updateTime < b.updateTime ? 1 : -1))

      const total = filtered.length
      const start = (pageNo - 1) * pageSize
      const records = filtered.slice(start, start + pageSize)
      const pages = Math.ceil(total / pageSize) || 1

      return ok({ records, current: pageNo, size: pageSize, total, pages })
    },
  },

  // 保源详情
  {
    url: '/data/insuraceSource/queryDetailById',
    method: 'GET',
    response: (req) => {
      const u = new URL(req.url!, 'http://localhost')
      const id = u.searchParams.get('id') || ''
      const item = data.find((d) => d.id === id)
      if (!item) return fail('未找到该保源', 404)
      return ok(buildDetail(item))
    },
  },

  // 团队校验（true=有团队）
  {
    url: '/system/sysUserGroup/hasGroup',
    method: 'GET',
    response: () => ok(true),
  },

  // 产品线下拉
  {
    url: '/arch/productLineType/pullDown',
    method: 'GET',
    response: () => ok(PRODUCT_LINE_OPTIONS),
  },

  // 保源标签下拉
  {
    url: '/data/labelType/pullDownAll',
    method: 'GET',
    response: () => ok(LABEL_OPTIONS),
  },

  // 客户名称重名检测：返回疑似重复列表（非空即疑似重复）
  {
    url: '/data/insuraceSource/addCheck',
    method: 'GET',
    response: (req) => {
      const name = (
        new URL(req.url!, 'http://localhost').searchParams.get('customerName') || ''
      ).trim()
      if (!name) return ok([])
      const matched = data.filter((d) => d.customerName.includes(name))
      const result = matched.map((d) => ({
        departName: BRANCHES[String(d.id).length % BRANCHES.length],
        taskUserRealName: d.contactsName,
      }))
      return ok(result)
    },
  },

  // 新增保源
  {
    url: '/data/insuraceSource/add',
    method: 'POST',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const now = new Date()
      const updateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`
      const item: SourceRecord = {
        id: `IS${Date.now()}`,
        customerName: b.customerName || '',
        customerAddress: b.customerAddress || '',
        contactsName: b.contactsName || '',
        contactsPhone: b.contactsPhone || '',
        waitComments: 2,
        updateTime,
        isSelf: true,
        socialCreditCode: b.socialCreditCode || '',
        productLine: Array.isArray(b.productLine)
          ? b.productLine
          : b.productLine
            ? String(b.productLine).split(',')
            : [],
        customerLabel: Array.isArray(b.customerLabel)
          ? b.customerLabel
          : b.customerLabel
            ? String(b.customerLabel).split(',')
            : [],
      }
      data.unshift(item)
      return ok(item)
    },
  },

  // 编辑保源
  {
    url: '/data/insuraceSource/edit',
    method: 'PUT',
    response: async (req) => {
      await delay(400)
      const b = await parseBody(req)
      const idx = data.findIndex((d) => d.id === b.id)
      if (idx === -1) return fail('未找到该保源', 404)
      const cur = data[idx]!
      const now = new Date()
      const updateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`
      const updated: SourceRecord = {
        ...cur,
        socialCreditCode: b.socialCreditCode ?? cur.socialCreditCode,
        customerName: b.customerName ?? cur.customerName,
        customerAddress: b.customerAddress ?? cur.customerAddress,
        contactsName: b.contactsName ?? cur.contactsName,
        contactsPhone: b.contactsPhone ?? cur.contactsPhone,
        productLine: Array.isArray(b.productLine)
          ? b.productLine
          : b.productLine
            ? String(b.productLine).split(',')
            : cur.productLine,
        customerLabel: Array.isArray(b.customerLabel)
          ? b.customerLabel
          : b.customerLabel
            ? String(b.customerLabel).split(',')
            : cur.customerLabel,
        updateTime,
      }
      data[idx] = updated
      return ok(updated)
    },
  },
]

export default routes
