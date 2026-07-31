// 录制器缓冲与上报策略补充单测：
//  - maxBatch 边界：缓冲区达到阈值即自动 flush 上报，上报后清空；
//  - 未达阈值时不自动上报，仅在「离开页面」(disable/flush force) 时一次性发出；
//  - setRouter 在 enable 之后调用也能补挂 afterEach 守卫，记录后续页面切换。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TrackRecorder } from '../recorder'

vi.mock('@/api/request', () => ({
  post: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/api/core/token', () => ({
  getUserInfo: vi.fn(() => ({ userId: 'U10086', name: '源动力管理员' })),
}))

import { post } from '@/api/request'

let rec: TrackRecorder | null = null

beforeEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})
afterEach(() => {
  rec?.disable()
  rec = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('缓冲区自动上报（maxBatch）', () => {
  it('缓冲区达到 maxBatch 即自动 flush 上报并清空', () => {
    rec = new TrackRecorder({ maxBatch: 5, uploadOnInteractionOnly: false })
    rec.enable()
    vi.mocked(post).mockClear()
    for (let i = 0; i < 5; i++) {
      const b = document.createElement('button')
      document.body.appendChild(b)
      b.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    expect(post).toHaveBeenCalled()
    // 达到 maxBatch 即触发上报并清空；此后最后一次 click 又入账 1 条，故最终长度为 1（< maxBatch，证明已清空、未无限堆积）
    expect(rec!.snapshot().length).toBeLessThan(5)
  })

  it('未达 maxBatch 不自动上报；离开页面（disable）时 force flush 一次性发出', () => {
    rec = new TrackRecorder({ maxBatch: 10, uploadOnInteractionOnly: false })
    rec.enable()
    vi.mocked(post).mockClear()
    const b = document.createElement('button')
    document.body.appendChild(b)
    b.dispatchEvent(new MouseEvent('click', { bubbles: true })) // 1 click + 初始 page_view = 2 条 < 10
    expect(rec!.snapshot().length).toBeLessThan(10)
    expect(post).not.toHaveBeenCalled()
    rec!.disable() // 离开页面 -> flush(true)
    expect(post).toHaveBeenCalled()
  })
})

describe('setRouter 补挂守卫', () => {
  it('enable 时未挂载 router，setRouter 后仍能记录后续路由切换 page_view', () => {
    rec = new TrackRecorder({})
    rec.enable() // 此时无 router
    let guard: ((to: any) => void) | null = null
    const router = {
      afterEach: (fn: any) => {
        guard = fn
        return () => {}
      },
    }
    rec.setRouter(router)
    expect(guard).toBeTruthy()
    guard!({ fullPath: '/vant/b', meta: { title: 'B' } })
    const pvs = rec!.snapshot().filter((e) => e.type === 'page_view')
    expect(pvs.some((e) => e.path === '/vant/b')).toBe(true)
  })
})
