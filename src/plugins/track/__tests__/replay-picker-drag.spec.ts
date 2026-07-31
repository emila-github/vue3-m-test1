// 验证修复：城市下拉（Vant Picker 列）录制为 drag 时，回放应
// 1) 不被「滑块兜底」劫持到 .slider-bar；
// 2) 用带 touches 的 TouchEvent 异步驱动 PickerColumn 滚动并真正选中选项；
// 3) 全程不触发滑块的 pointer 逻辑。
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { replayTrackEvents } from '../replay'

// jsdom 无 Touch / TouchEvent，补最小实现以便回放构造真实 touch 事件
beforeAll(() => {
  const g = globalThis as any
  if (typeof g.Touch === 'undefined') {
    g.Touch = class {
      identifier: number
      target: EventTarget
      clientX: number
      clientY: number
      constructor(init: any) {
        this.identifier = init.identifier
        this.target = init.target
        this.clientX = init.clientX
        this.clientY = init.clientY
      }
    }
  }
  if (typeof g.TouchEvent === 'undefined') {
    g.TouchEvent = class extends Event {
      touches: any[]
      targetTouches: any[]
      changedTouches: any[]
      constructor(type: string, init: any) {
        super(type, init)
        this.touches = init.touches || []
        this.targetTouches = init.targetTouches || []
        this.changedTouches = init.changedTouches || []
      }
    }
  }
})

describe('replay picker drag (城市下拉)', () => {
  it('用 touch 回放 picker 列拖拽并选中，且不劫持滑块', async () => {
    document.body.innerHTML = `
      <input id="track-city" />
      <div class="slider-bar"><div class="slider-thumb"></div></div>
      <div class="custom-picker">
        <ul>
          <li>北京</li>
          <li>上海</li>
          <li>广州</li>
        </ul>
      </div>
    `
    const column = document.querySelector('.custom-picker') as HTMLElement
    const slider = document.querySelector('.slider-bar') as HTMLElement
    const options = Array.from(column.querySelectorAll('li'))

    // 模拟 Vant PickerColumn 的「touch -> 选中」语义：向下拖使索引减小
    const OPT_H = 44
    let startIndex = 2 // 打开时停在「广州」
    let offset = -startIndex * OPT_H
    let startOffsetLocal = offset
    let startY = 0
    const touchLog: string[] = []
    let selectedText = (options[startIndex] as HTMLElement).textContent

    column.addEventListener('touchstart', (e: any) => {
      touchLog.push('touchstart')
      startOffsetLocal = offset
      startY = e.touches[0].clientY
    })
    column.addEventListener('touchmove', (e: any) => {
      touchLog.push('touchmove')
      offset = startOffsetLocal + (e.touches[0].clientY - startY)
    })
    column.addEventListener('touchend', () => {
      touchLog.push('touchend')
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(-offset / OPT_H)))
      selectedText = (options[idx] as HTMLElement).textContent
    })

    // 滑块不应被触发
    const sliderSpy = vi.fn()
    slider.addEventListener('pointerdown', sliderSpy)
    slider.addEventListener('touchstart', sliderSpy)

    const events = [
      { type: 'click', ts: 0, t: 0, path: '/x', selector: 'input#track-city', tag: 'input', text: '' },
      {
        type: 'drag',
        ts: 0,
        t: 100,
        path: '/x',
        selector: '.custom-picker > ul > li:nth-child(3)',
        tag: 'li',
        fromX: 267,
        fromY: 639,
        toX: 246,
        toY: 762,
      },
    ]

    await new Promise<void>((resolve) => {
      const handle = replayTrackEvents(events, {
        root: document,
        minStep: 10,
        onDone: () => resolve(),
      })
      handle.play(0)
    })

    // 1) 走了 touch 路径（Vant 只认 touch）
    expect(touchLog[0]).toBe('touchstart')
    expect(touchLog.filter((t) => t === 'touchmove').length).toBeGreaterThan(0)
    expect(touchLog[touchLog.length - 1]).toBe('touchend')
    // 2) 拖拽真正驱动了选择（从广州变为其它项，证明列被滚动）
    expect(selectedText).not.toBe('广州')
    // 3) 滑块未被劫持
    expect(sliderSpy).not.toHaveBeenCalled()
  })
})
