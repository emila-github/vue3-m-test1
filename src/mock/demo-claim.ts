/**
 * 保险报案表单（Claim）Mock 数据
 *
 * 接口（均带 /demo 前缀，避免与正式项目冲突）：
 *   GET  /demo/claim   — 报案单详情查询（编辑回填）
 *   POST /demo/claim   — 新增报案单
 *   PUT  /demo/claim   — 编辑报案单
 *
 * 说明：图片字段（身份证 / 驾驶证 / 病历 / 发票）在服务端以离线 SVG data URI 返回，
 *       避免依赖网络与静态资源，前端拿到后可直接预览。
 */
import type { MockRoute } from './types'

// ==================== 数据模型 ====================
interface Claim {
  id: number
  // 报案人信息
  reporterName: string
  phone: string
  gender: string
  idCard: string
  relationship: string | number
  // 保单信息
  policyNo: string
  insurer: string | number
  insuranceType: string | number
  extraCoverage: Array<string | number>
  effectiveDate: string
  // 出险信息
  accidentCause: string | number
  accidentDate: string
  accidentTime: string
  region: string | number
  hospital: string | number
  accidentType: Array<string | number>
  isHospitalized: boolean
  injuredCount: number
  severity: number
  lossItems: Array<string | number>
  description: string
  agree: boolean
  // 出险地点（定位打卡）
  checkin: Record<string, any> | null
  // 资料上传
  idCardFront: string
  idCardBack: string
  driverLicense: string
  medicalRecord: string
  invoice: string[]
}

// ==================== 离线占位图（服务端生成 SVG data URI） ====================
function svgImg(label: string, bg: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
    <rect width='100%' height='100%' fill='${bg}'/>
    <text x='50%' y='50%' fill='#fff' font-size='20' text-anchor='middle' dominant-baseline='middle'>${label}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// ==================== 种子数据（id=1，供编辑回填演示） ====================
let SEQ = 1000

function seedClaim(): Claim {
  return {
    id: 1,
    reporterName: '张三',
    phone: '13800138000',
    gender: 'male',
    idCard: '110101199003071234',
    relationship: 'self',
    policyNo: 'PICC2026-000123',
    insurer: '中国人保财险',
    insuranceType: 'auto',
    extraCoverage: ['glass', 'nolicense'],
    effectiveDate: '2026-01-01',
    accidentCause: 'collision',
    accidentDate: '2026-07-16',
    accidentTime: '14:30',
    region: 'xh',
    hospital: '北京协和医院',
    accidentType: ['traffic', 'car'],
    isHospitalized: true,
    injuredCount: 2,
    severity: 4,
    lossItems: ['vehicle', 'medical'],
    description: '车辆在路口与前方车辆发生追尾，造成两车受损及人员轻伤，已报警并送医治疗。',
    agree: true,
    checkin: {
      lat: 39.98412,
      lng: 116.30748,
      address: '北京市朝阳区建国路 88 号 SOHO 现代城',
      timestamp: '2026-07-16T14:30:00+08:00',
      time: '2026-07-16 14:30:00',
      isFirst: true,
      firstTime: '2026-07-16 14:30:00',
    },
    idCardFront: svgImg('身份证人像面', '#4096ff'),
    idCardBack: svgImg('身份证国徽面', '#fa8c16'),
    driverLicense: svgImg('驾驶证', '#07c160'),
    medicalRecord: svgImg('病历资料', '#7232dd'),
    invoice: [svgImg('医疗发票 1', '#1989fa'), svgImg('医疗发票 2', '#1989fa')],
  }
}

// 内存库：预置一条 id=1 的报案单
const data: Claim[] = [seedClaim()]

// ==================== 工具 ====================
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

/** 把请求体合并为一条完整 Claim（字段缺省时给出安全默认值） */
function normalize(body: Record<string, any>, id: number): Claim {
  return {
    id,
    reporterName: body.reporterName || '',
    phone: body.phone || '',
    gender: body.gender || 'male',
    idCard: body.idCard || '',
    relationship: body.relationship ?? '',
    policyNo: body.policyNo || '',
    insurer: body.insurer ?? '',
    insuranceType: body.insuranceType ?? '',
    extraCoverage: body.extraCoverage ?? [],
    effectiveDate: body.effectiveDate || '',
    accidentCause: body.accidentCause ?? '',
    accidentDate: body.accidentDate || '',
    accidentTime: body.accidentTime || '',
    region: body.region ?? '',
    hospital: body.hospital ?? '',
    accidentType: body.accidentType ?? [],
    isHospitalized: !!body.isHospitalized,
    injuredCount: Number(body.injuredCount) || 0,
    severity: Number(body.severity) || 0,
    lossItems: body.lossItems ?? [],
    description: body.description || '',
    agree: !!body.agree,
    checkin: body.checkin ?? null,
    idCardFront: body.idCardFront || '',
    idCardBack: body.idCardBack || '',
    driverLicense: body.driverLicense || '',
    medicalRecord: body.medicalRecord || '',
    invoice: body.invoice ?? [],
  }
}

// ==================== 路由 ====================
const routes: MockRoute[] = [
  // 报案单详情（编辑回填）
  {
    url: '/demo/claim',
    method: 'GET',
    response: async (req) => {
      await delay(600)
      const u = new URL(req.url!, 'http://localhost')
      const id = parseInt(u.searchParams.get('id') || '1', 10)
      const item = data.find((d) => d.id === id)
      if (!item) return { code: 404, data: null, message: '未找到该报案单' }
      return { code: 200, data: item, message: 'ok' }
    },
  },

  // 新增报案单
  {
    url: '/demo/claim',
    method: 'POST',
    response: async (req) => {
      await delay(500)
      const body = await parseBody(req)
      const item = normalize(body, ++SEQ)
      data.push(item)
      return { code: 200, data: item, message: '报案提交成功' }
    },
  },

  // 编辑报案单
  {
    url: '/demo/claim',
    method: 'PUT',
    response: async (req) => {
      await delay(500)
      const body = await parseBody(req)
      const id = Number(body.id)
      const idx = data.findIndex((d) => d.id === id)
      if (idx === -1) return { code: 404, data: null, message: '未找到该报案单' }
      data[idx] = normalize({ ...data[idx], ...body }, id)
      return { code: 200, data: data[idx], message: '报案更新成功' }
    },
  },
]

export default routes
