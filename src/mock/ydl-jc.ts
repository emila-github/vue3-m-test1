/**
 * 千万级企业决策 Mock（ydl 模块 §5）
 * 客户渗透率 / 新续企业增量保费，均为一次全量 records（按分支公司）。
 */
import type { MockRoute } from './types'

const branches = [
  '福州市分公司',
  '泉州市分公司',
  '漳州市分公司',
  '厦门市分公司',
  '莆田市分公司',
  '三明市分公司',
  '龙岩市分公司',
  '南平市分公司',
  '宁德市分公司',
]

const itemRows = branches.map((b, i) => ({
  comzname: b,
  enterCount: 800 + i * 120,
  enterRateHasbf: Number((0.5 + i * 0.03).toFixed(2)),
  enterRateHasbfFc: Number((0.32 + i * 0.02).toFixed(2)),
  enterRateHasbfTwo: Number((0.45 + i * 0.025).toFixed(2)),
  enterRateHasbfTwoFc: Number((0.28 + i * 0.02).toFixed(2)),
  enterCountHasbf: 400 + i * 60,
}))

const riskRows = branches.map((b, i) => ({
  comzname: b,
  newEnterCount: 120 + i * 12,
  renewEnterCount: 200 + i * 18,
  newPolicyFee: 1200000 + i * 150000,
  renewPolicyFee: 2400000 + i * 200000,
  incrementFee: 3600000 + i * 350000,
}))

function ok<T>(result: T) {
  return { success: true, code: 200, message: '成功', result, timestamp: Date.now() }
}

const routes: MockRoute[] = [
  {
    url: '/policy/jcEnterpriseItem/list',
    method: 'GET',
    response: () => ok(itemRows),
  },
  {
    url: '/policy/jcEnterpriseRisk/list',
    method: 'GET',
    response: () => ok(riskRows),
  },
]

export default routes
