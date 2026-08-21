/**
 * 保险报案表单（Claim）Mock 数据
 *
 * 接口（均带 /demo 前缀，避免与正式项目冲突）：
 *   GET  /demo/claim   — 报案单详情查询（编辑回填）
 *   POST /demo/claim   — 新增报案单
 *   PUT  /demo/claim   — 编辑报案单
 *
 * 说明：图片字段（身份证 / 驾驶证 / 病历 / 发票）在服务端以「相对访问地址」返回，
 *       例如 /demo-upload/seed-idcard-front.svg，由 mock 静态服务（见 mock/index.ts）映射到
 *       src/assets/demo-upload/ 目录下的实体文件。前端拿到相对地址后，拼接本地根目录
 *       （window.location.origin）得到可预览的绝对地址。
 *       这些种子图片由 ensureSeedImage() 在首次加载时写入磁盘（若文件已存在则不覆盖），
 *       也可在 src/assets/demo-upload/ 下预先放置同名实体文件。
 */
import fs from 'node:fs'
import path from 'node:path'
import type { MockRoute } from './types'

// 上传文件目录（与 demo-upload.ts 保持一致，便于直接复用其 /demo-upload 静态服务）
const UPLOAD_DIR = path.resolve('src/assets/demo-upload')

/** 确保上传目录存在 */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

/**
 * 生成占位 SVG 图片并写入磁盘（仅当文件不存在时），返回相对访问地址 /demo-upload/xxx.svg
 * 这样「编辑回填」时前端拿到的就是与上传返回格式一致的相对地址，可直接拼接本地根目录预览。
 */
function ensureSeedImage(filename: string, label: string, bg: string): string {
  ensureUploadDir()
  const filePath = path.join(UPLOAD_DIR, filename)
  if (!fs.existsSync(filePath)) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='50%' fill='#fff' font-size='20' text-anchor='middle' dominant-baseline='middle'>${label}</text></svg>`
    fs.writeFileSync(filePath, svg)
  }
  return `/demo-upload/${filename}`
}

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
    insurer: '中国保保财险',
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
    idCardFront: ensureSeedImage('seed-idcard-front.svg', '身份证人像面', '#4096ff'),
    idCardBack: ensureSeedImage('seed-idcard-back.svg', '身份证国徽面', '#fa8c16'),
    driverLicense: ensureSeedImage('seed-driver-license.svg', '驾驶证', '#07c160'),
    medicalRecord: ensureSeedImage('seed-medical-record.svg', '病历资料', '#7232dd'),
    invoice: [
      ensureSeedImage('seed-invoice-1.svg', '医疗发票 1', '#1989fa'),
      ensureSeedImage('seed-invoice-2.svg', '医疗发票 2', '#1989fa'),
    ],
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
