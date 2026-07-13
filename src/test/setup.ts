import { vi } from 'vitest'

// 仅 VantUpload 在脚本中 `import { showToast } from 'vant'`，其余 van-* 标签均由
// shallowMount 的 global.stubs 接管。单元测试无需加载真实的 vant 运行库，故全局 mock。
vi.mock('vant', () => ({
  default: {},
  showToast: vi.fn(),
  showSuccessToast: vi.fn(),
  showFailToast: vi.fn(),
  showLoadingToast: vi.fn(),
  closeToast: vi.fn(),
}))
