// 插件装配入口（index.ts）单测：createTrackPlugin 安装、useTrack 单例获取、
// enabled 自动开启、全局暴露（window.$track / $track）、未安装时 useTrack 抛错。
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/api/request', () => ({
  post: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/core/token', () => ({
  getUserInfo: vi.fn(() => ({ userId: 'U10086', name: '源管理员' })),
}))

import { createTrackPlugin, useTrack } from '../index'

/** 构造最小 App 桩，满足 install 所需的 config.globalProperties 形状 */
function fakeApp() {
  return { config: { globalProperties: {} } } as any
}

describe('track 插件装配', () => {
  it('未安装插件时 useTrack 抛错提示', () => {
    // 本文件首个用例，模块级 recorder 仍为 null
    expect(() => useTrack()).toThrow(/插件尚未安装/)
  })

  it('install 后 useTrack 可获取同一单例，并挂到 window / globalProperties', () => {
    const app = fakeApp()
    createTrackPlugin().install(app)
    const t = useTrack()
    expect(t).toBeTruthy()
    expect((window as any).__track).toBe(t)
    expect(app.config.globalProperties.$track).toBe(t)
    // 默认不自动开启
    expect(t.isEnabled()).toBe(false)
  })

  it('enabled=true 时安装即开始记录', () => {
    const app = fakeApp()
    createTrackPlugin({ enabled: true }).install(app)
    expect(useTrack().isEnabled()).toBe(true)
    useTrack().disable()
  })

  it('enabled=false 时安装但不自动开启记录', () => {
    const app = fakeApp()
    createTrackPlugin({ enabled: false }).install(app)
    expect(useTrack().isEnabled()).toBe(false)
  })

  it('插件安装后 window.__track 即录制器实例（运行时调试入口可用）', () => {
    const app = fakeApp()
    createTrackPlugin().install(app)
    expect((window as any).__track).toBe(useTrack())
  })
})
