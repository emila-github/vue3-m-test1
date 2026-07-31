// 回放器（replay.ts）单测：覆盖除 picker 拖拽（见 replay-picker*.spec.ts）外的
// 全部事件类型与机制 —— input/change/submit/scroll/page_view 还原、滑块 pointer 拖拽、
// 定位失败提示（onHint）、以及 play/pause/stop 控制流。
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

describe('input / change 回放', () => {
  it('input 事件回填值并派发 input + change', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    let inputFired = false
    let changeFired = false
    input.addEventListener('input', () => (inputFired = true))
    input.addEventListener('change', () => (changeFired = true))
    const handle = replayTrackEvents(
      [{ type: 'input', t: 0, path: '/x', selector: 'input', value: '张三' } as any],
      { root: document, minStep: 1 },
    )
    handle.play()
    expect(input.value).toBe('张三')
    expect(inputFired).toBe(true)
    expect(changeFired).toBe(true)
  })

  it('checkbox 的 change 回填勾选态并派发 change/input', () => {
    const cb = document.createElement('input')
    cb.setAttribute('type', 'checkbox')
    document.body.appendChild(cb)
    let changeFired = false
    cb.addEventListener('change', () => (changeFired = true))
    replayTrackEvents(
      [{ type: 'change', t: 0, path: '/x', selector: 'input', checked: true } as any],
      { root: document, minStep: 1 },
    ).play()
    expect(cb.checked).toBe(true)
    expect(changeFired).toBe(true)
  })

  it('select 的 change 回填选中值', () => {
    const sel = document.createElement('select')
    sel.innerHTML = '<option value="a">A</option><option value="b">B</option>'
    document.body.appendChild(sel)
    replayTrackEvents(
      [{ type: 'change', t: 0, path: '/x', selector: 'select', value: 'b' } as any],
      { root: document, minStep: 1 },
    ).play()
    expect(sel.value).toBe('b')
  })
})

describe('submit 回放', () => {
  it('form 的 submit 调用 requestSubmit', () => {
    const spy = vi.fn()
    ;(HTMLFormElement.prototype as any).requestSubmit = spy
    const form = document.createElement('form')
    form.id = 'f'
    document.body.appendChild(form)
    replayTrackEvents([{ type: 'submit', t: 0, path: '/x', selector: '#f' } as any], {
      root: document,
      minStep: 1,
    }).play()
    expect(spy).toHaveBeenCalled()
  })

  it('非 form 元素 submit 派发 submit 事件', () => {
    const div = document.createElement('div')
    div.id = 'd'
    document.body.appendChild(div)
    let fired = false
    div.addEventListener('submit', () => (fired = true))
    replayTrackEvents([{ type: 'submit', t: 0, path: '/x', selector: '#d' } as any], {
      root: document,
      minStep: 1,
    }).play()
    expect(fired).toBe(true)
  })
})

describe('scroll 回放', () => {
  it('window 滚动调用 window.scrollTo 还原位置', () => {
    const spy = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now() + 1e6)
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    window.scrollTo = vi.fn() as any
    ;(window.scrollTo as any).mockImplementation(spy)

    replayTrackEvents([{ type: 'scroll', t: 0, path: '/x', scrollX: 0, scrollY: 500 } as any], {
      root: document,
      minStep: 1,
    }).play()
    expect(spy).toHaveBeenCalledWith(0, 500)
  })
})

describe('page_view 回放', () => {
  it('page_view 触发 navigate 回调并传入 fullPath', () => {
    const nav = vi.fn()
    replayTrackEvents([{ type: 'page_view', t: 0, path: '/vant/target' } as any], {
      root: document,
      minStep: 1,
      navigate: nav,
    }).play()
    expect(nav).toHaveBeenCalledWith('/vant/target')
  })
})

describe('滑块拖拽（pointer 正向路径）', () => {
  it('落在 .slider-bar 内的 drag 走 pointer 回放（pointerdown 在滑块、move/up 在 window）', () => {
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

describe('定位失败提示（onHint）', () => {
  it('click 选择器失效且无文本兜底时调用 onHint 而非静默跳过', async () => {
    vi.useRealTimers() // 防御：本用例依赖真实 setTimeout 完成 waitForTarget 兜底
    const hints: string[] = []
    replayTrackEvents([{ type: 'click', t: 0, path: '/x', selector: '#not-exist' } as any], {
      root: document,
      minStep: 1,
      targetWaitMs: 50,
      onHint: (_, m) => hints.push(m),
    }).play()
    // play() 触发的是异步 step()：waitForTarget(50ms) 等不到目标后才兜底调用 onHint，需真实等待
    await new Promise((res) => setTimeout(res, 120))
    expect(hints.length).toBe(1)
    expect(hints[0]).toContain('已执行操作')
  })
})

describe('播放控制流（play / pause / stop）', () => {
  it('play 后处于 playing，pause 停止，stop 复位索引', () => {
    vi.useFakeTimers()
    const a = document.createElement('button')
    a.id = 'a'
    const b = document.createElement('button')
    b.id = 'b'
    document.body.appendChild(a)
    document.body.appendChild(b)

    const handle = replayTrackEvents(
      [
        { type: 'click', t: 0, path: '/x', selector: '#a' } as any,
        { type: 'click', t: 100, path: '/x', selector: '#b' } as any,
      ],
      { root: document, minStep: 50 },
    )
    handle.play()
    // 首事件已同步处理，第二事件待定时器；此时仍在播放
    expect(handle.playing).toBe(true)
    expect(handle.index).toBe(1)
    handle.pause()
    expect(handle.playing).toBe(false)
    handle.stop()
    expect(handle.index).toBe(0)
    expect(handle.playing).toBe(false)
  })

  it('onDone 在全部事件回放完毕后触发', async () => {
    const done = vi.fn()
    const btn = document.createElement('button')
    btn.id = 'a'
    document.body.appendChild(btn)
    await new Promise<void>((resolve) => {
      replayTrackEvents([{ type: 'click', t: 0, path: '/x', selector: '#a' } as any], {
        root: document,
        minStep: 1,
        onDone: () => {
          done()
          resolve()
        },
      }).play()
    })
    expect(done).toHaveBeenCalled()
  })
})

describe('页面跳转后的操作回放（核心修复）', () => {
  it('page_view 后等待目标页 DOM 真正就绪再回放其后续操作', async () => {
    // 模拟「点击」目标元素在导航之后才异步挂载出现
    setTimeout(() => {
      const btn = document.createElement('button')
      btn.id = 'arrived'
      document.body.appendChild(btn)
    }, 150)

    const nav = vi.fn(() => Promise.resolve())
    let clicked = false
    document.addEventListener(
      'click',
      (e) => {
        if ((e.target as HTMLElement).id === 'arrived') clicked = true
      },
      true,
    )

    await new Promise<void>((resolve) => {
      replayTrackEvents(
        [
          { type: 'page_view', t: 0, path: '/other' } as any,
          { type: 'click', t: 50, path: '/other', selector: '#arrived' } as any,
        ],
        { root: document, minStep: 1, navigate: nav, onDone: () => resolve() },
      ).play()
    })

    // 导航被触发，且「跳转后」的点击确实命中了异步出现的元素
    expect(nav).toHaveBeenCalledWith('/other')
    expect(clicked).toBe(true)
  })

  it('navigate 返回被 reject 的 Promise 时不中断整个回放', async () => {
    const nav = vi.fn(() => Promise.reject(new Error('重复导航')))
    let clicked = false
    const btn = document.createElement('button')
    btn.id = 'after'
    document.body.appendChild(btn)
    btn.addEventListener('click', () => (clicked = true))

    await new Promise<void>((resolve) => {
      replayTrackEvents(
        [
          { type: 'page_view', t: 0, path: '/dup' } as any,
          { type: 'click', t: 50, path: '/dup', selector: '#after' } as any,
        ],
        { root: document, minStep: 1, navigate: nav, onDone: () => resolve() },
      ).play()
    })

    expect(nav).toHaveBeenCalledWith('/dup')
    expect(clicked).toBe(true)
  })
})

describe('下拉项就绪确认（不立即兜底提示）', () => {
  it('点击打开弹层后、选项尚未渲染时等待其就绪再点击，而非直接兜底提示', async () => {
    // 模拟「点击字段 -> 弹出浮层 -> 浮层内选项延迟挂载」的真实 picker 场景
    const open = document.createElement('button')
    open.id = 'open'
    document.body.appendChild(open)
    open.addEventListener('click', () => {
      // 弹层与选项在 120ms 后才挂载（Vant picker 渲染时机）
      setTimeout(() => {
        const popup = document.createElement('div')
        popup.className = 'van-popup'
        const opt = document.createElement('button')
        opt.id = 'opt'
        opt.textContent = '广州'
        popup.appendChild(opt)
        document.body.appendChild(popup)
      }, 120)
    })

    let optClicked = false
    document.addEventListener(
      'click',
      (e) => {
        if ((e.target as HTMLElement).id === 'opt') optClicked = true
      },
      true,
    )
    const hints: string[] = []
    await new Promise<void>((resolve) => {
      replayTrackEvents(
        [
          { type: 'click', t: 0, path: '/x', selector: '#open' } as any,
          { type: 'click', t: 50, path: '/x', selector: '#opt', text: '广州' } as any,
        ],
        { root: document, minStep: 1, onHint: (_, m) => hints.push(m), onDone: () => resolve() },
      ).play()
    })

    // 选项被真实点击命中，且全程没有「已执行操作」兜底提示
    expect(optClicked).toBe(true)
    expect(hints.length).toBe(0)
  })

  it('目标确实永远找不到时才兜底提示（而非静默跳过）', async () => {
    const hints: string[] = []
    replayTrackEvents([{ type: 'click', t: 0, path: '/x', selector: '#never' } as any], {
      root: document,
      minStep: 1,
      targetWaitMs: 200,
      onHint: (_, m) => hints.push(m),
    }).play()
    // 200ms 等待后仍找不到 -> 兜底提示命中
    await new Promise((r) => setTimeout(r, 350))
    expect(hints.length).toBe(1)
    expect(hints[0]).toContain('已执行操作')
  })
})
