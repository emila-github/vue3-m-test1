// 回放器 drag 分支补充单测：
//  - 命中元素但缺失坐标时，提示「滑块验证：缺少坐标，无法模拟」（而非静默跳过）；
//  - 命中滑块(.slider-bar)内的 drag 走 pointer 回放（与 replay-core 的滑块用例形成对照）。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { replayTrackEvents } from '../replay'

const origClick = HTMLElement.prototype.click
beforeEach(() => {
  document.body.innerHTML = ''
  HTMLElement.prototype.click = origClick
  vi.useRealTimers()
})
afterEach(() => {
  HTMLElement.prototype.click = origClick
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('drag 回放提示分支', () => {
  it('drag 命中元素但缺少坐标时调用 onHint 提示滑块验证无法模拟', () => {
    const el = document.createElement('div')
    el.id = 'd'
    document.body.appendChild(el)
    const hints: string[] = []
    replayTrackEvents([{ type: 'drag', t: 0, path: '/x', selector: '#d' } as any], {
      root: document,
      minStep: 1,
      onHint: (_, m) => hints.push(m),
    }).play()
    expect(hints.length).toBe(1)
    expect(hints[0]).toContain('滑块验证')
    expect(hints[0]).toContain('缺少坐标')
  })

  it('命中 .slider-bar 的 drag 派发 pointerdown/move/up', () => {
    const slider = document.createElement('div')
    slider.className = 'slider-bar'
    document.body.appendChild(slider)
    const down = vi.fn()
    const move = vi.fn()
    const up = vi.fn()
    slider.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)

    replayTrackEvents(
      [
        {
          type: 'drag',
          t: 0,
          path: '/x',
          selector: '.slider-bar',
          fromX: 10,
          fromY: 10,
          toX: 200,
          toY: 10,
        } as any,
      ],
      { root: document, minStep: 1 },
    ).play()

    expect(down).toHaveBeenCalled()
    expect(move).toHaveBeenCalled()
    expect(up).toHaveBeenCalled()
  })
})
